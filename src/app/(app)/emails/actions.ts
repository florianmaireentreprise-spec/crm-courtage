"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { buildOAuth2Client, parseGmailMessage } from "@/lib/gmail";
import { buildAnalysisPrompt, parseAIResponse } from "@/lib/ai";
import { google } from "googleapis";
import Anthropic from "@anthropic-ai/sdk";

// ── Patterns to exclude (newsletters, automated, noreply) ──
const EXCLUDED_PATTERNS = [
  /noreply@/i,
  /no-reply@/i,
  /ne-pas-repondre@/i,
  /newsletter@/i,
  /notification@/i,
  /mailer-daemon@/i,
  /postmaster@/i,
  /unsubscribe/i,
  /feedback@/i,
  /marketing@/i,
  /promo@?/i,
];

const INSURANCE_KEYWORDS = [
  "contrat", "police", "sinistre", "devis", "cotisation", "prime",
  "résiliation", "avenant", "souscription", "adhésion", "garantie",
  "mutuelle", "prévoyance", "santé", "retraite", "assurance",
  "courtage", "compagnie", "indemnisation", "déclaration",
  "attestation", "carte verte", "tiers", "rcpro", "rcp",
  "multirisque", "habitation", "auto", "flotte", "responsabilité",
  "dommage", "protection juridique", "TNS", "madelin",
];

function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).toLowerCase().trim();
}

function isExcludedSender(from: string): boolean {
  return EXCLUDED_PATTERNS.some((pattern) => pattern.test(from));
}

function computeRelevanceScore(
  expediteur: string,
  destinataires: string,
  sujet: string,
  extrait: string | null,
  matchedClientId: string | null
): number {
  let score = 0;

  // Matched with an existing client → very relevant
  if (matchedClientId) score += 50;

  // Insurance keywords in subject
  const sujetLower = sujet.toLowerCase();
  for (const kw of INSURANCE_KEYWORDS) {
    if (sujetLower.includes(kw)) { score += 10; break; }
  }

  // Insurance keywords in body
  const extraitLower = (extrait ?? "").toLowerCase();
  for (const kw of INSURANCE_KEYWORDS) {
    if (extraitLower.includes(kw)) { score += 5; break; }
  }

  // Excluded sender → penalize heavily
  if (isExcludedSender(expediteur)) score -= 40;

  return Math.max(0, Math.min(100, score));
}

export async function startGmailOAuth() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const oauth2Client = buildOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
    prompt: "consent",
    state: session.user.id,
  });

  redirect(authUrl);
}

async function getConnection(userId: string) {
  return prisma.gmailConnection.findUnique({ where: { userId } });
}

async function buildAuthedClient(userId: string) {
  const connection = await getConnection(userId);
  if (!connection) throw new Error("Gmail non connecté");

  const oauth2Client = buildOAuth2Client();
  oauth2Client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    expiry_date: connection.tokenExpiry.getTime(),
  });

  oauth2Client.on("tokens", async (tokens) => {
    const updates: Record<string, unknown> = {
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : connection.tokenExpiry,
    };
    if (tokens.access_token) updates.accessToken = tokens.access_token;
    if (tokens.refresh_token) updates.refreshToken = tokens.refresh_token;
    await prisma.gmailConnection.update({ where: { userId }, data: updates });
  });

  return oauth2Client;
}

async function matchClientByEmail(emailAddress: string): Promise<string | null> {
  const addr = extractEmailAddress(emailAddress);
  // Try direct email match
  const client = await prisma.client.findFirst({
    where: {
      OR: [
        { email: { equals: addr, mode: "insensitive" } },
        { email: { contains: addr.split("@")[0], mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  return client?.id ?? null;
}

export async function syncEmails() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  const userId = session.user.id;
  const oauth2Client = await buildAuthedClient(userId);
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const [inbox, sent] = await Promise.all([
    gmail.users.messages.list({ userId: "me", maxResults: 30, labelIds: ["INBOX"] }),
    gmail.users.messages.list({ userId: "me", maxResults: 20, labelIds: ["SENT"] }),
  ]);

  const allMessages = [
    ...(inbox.data.messages ?? []),
    ...(sent.data.messages ?? []),
  ];

  let newCount = 0;
  let clientMatchCount = 0;

  for (const msg of allMessages) {
    if (!msg.id) continue;
    const existing = await prisma.email.findUnique({ where: { gmailId: msg.id } });
    if (existing) continue;

    const full = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
      format: "full",
    });

    const parsed = parseGmailMessage(full.data);

    // Skip excluded senders (noreply, newsletters, etc.)
    if (isExcludedSender(parsed.expediteur)) continue;

    // Auto-match with existing clients
    const clientId =
      (await matchClientByEmail(parsed.expediteur)) ??
      (await matchClientByEmail(parsed.destinataires));

    if (clientId) clientMatchCount++;

    await prisma.email.create({
      data: { ...parsed, userId, clientId },
    });
    newCount++;
  }

  revalidatePath("/emails");
  return { success: true, newCount, clientMatchCount };
}

export async function analyzeEmail(emailId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: { client: true },
  });
  if (!email) return { error: "Email introuvable" };

  await prisma.email.update({
    where: { id: emailId },
    data: { analyseStatut: "en_cours" },
  });

  try {
    const clients = await prisma.client.findMany({
      select: { id: true, raisonSociale: true, email: true, prenom: true, nom: true },
    });

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt = buildAnalysisPrompt(
      email.sujet,
      email.expediteur,
      email.extrait,
      clients
    );

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const firstBlock = response.content[0];
    const rawText = firstBlock.type === "text" ? firstBlock.text : "";
    const result = parseAIResponse(rawText);

    for (const item of result.actionItems) {
      await prisma.tache.create({
        data: {
          titre: item,
          type: "AUTRE",
          priorite: "normale",
          dateEcheance: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          clientId: result.clientId ?? email.clientId ?? null,
          emailId: emailId,
        },
      });
    }

    await prisma.email.update({
      where: { id: emailId },
      data: {
        resume: result.resume,
        actionsItems: JSON.stringify(result.actionItems),
        reponseProposee: result.draftReply,
        clientId: result.clientId ?? email.clientId ?? null,
        analyseStatut: "analyse",
      },
    });

    revalidatePath("/emails");
    revalidatePath("/relances");
    return { success: true };
  } catch (err) {
    console.error("Email analysis error:", err);
    await prisma.email.update({
      where: { id: emailId },
      data: { analyseStatut: "erreur" },
    });
    return { error: "Erreur lors de l'analyse" };
  }
}

export async function markEmailRead(emailId: string) {
  await prisma.email.update({ where: { id: emailId }, data: { lu: true } });
  revalidatePath("/emails");
}

export async function disconnectGmail() {
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.gmailConnection.delete({ where: { userId: session.user.id } }).catch(() => {});
  revalidatePath("/emails");
}
