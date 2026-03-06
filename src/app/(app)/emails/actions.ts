"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { buildOAuth2Client, parseGmailMessage } from "@/lib/gmail";
import { buildAnalysisPrompt, parseAIResponse, type AIEmailAnalysis } from "@/lib/ai";
import { google } from "googleapis";
import Anthropic from "@anthropic-ai/sdk";

// ── Patterns to exclude (newsletters, automated, noreply) ──
const EXCLUDED_PATTERNS = [
  /noreply@/i, /no-reply@/i, /ne-pas-repondre@/i,
  /newsletter@/i, /notification@/i, /mailer-daemon@/i,
  /postmaster@/i, /unsubscribe/i, /marketing@/i, /promo@/i,
];

const INSURANCE_KEYWORDS = [
  "contrat", "police", "sinistre", "devis", "cotisation", "prime",
  "résiliation", "avenant", "souscription", "adhésion", "garantie",
  "mutuelle", "prévoyance", "santé", "retraite", "assurance",
  "courtage", "indemnisation", "déclaration", "attestation",
  "rcpro", "multirisque", "protection juridique", "madelin",
  "urgent", "important", "signature", "rdv", "rendez-vous",
];

function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).toLowerCase().trim();
}

function isExcludedSender(from: string): boolean {
  return EXCLUDED_PATTERNS.some((p) => p.test(from));
}

function classifyPertinence(
  hasClient: boolean,
  sujet: string,
  extrait: string | null
): { pertinence: string; scoreRelevance: number } {
  let score = 0;
  if (hasClient) score += 50;

  const text = `${sujet} ${extrait ?? ""}`.toLowerCase();
  if (INSURANCE_KEYWORDS.some((kw) => text.includes(kw))) score += 20;

  let pertinence = "normal";
  if (hasClient) pertinence = "client";
  else if (score >= 20) pertinence = "important";

  return { pertinence, scoreRelevance: Math.min(100, score) };
}

// ── Auth helpers ──

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

async function buildAuthedClient(userId: string) {
  const connection = await prisma.gmailConnection.findUnique({ where: { userId } });
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

  return { oauth2Client, gmailEmail: connection.gmailEmail };
}

async function matchClientByEmail(emailAddress: string): Promise<string | null> {
  const addr = extractEmailAddress(emailAddress);
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

// ── SYNC ──

export async function syncEmails() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  const userId = session.user.id;
  const { oauth2Client, gmailEmail } = await buildAuthedClient(userId);
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
  const newEmailIds: string[] = [];

  for (const msg of allMessages) {
    if (!msg.id) continue;
    const existing = await prisma.email.findUnique({ where: { gmailId: msg.id } });
    if (existing) continue;

    const full = await gmail.users.messages.get({
      userId: "me", id: msg.id, format: "full",
    });

    const parsed = parseGmailMessage(full.data);

    if (isExcludedSender(parsed.expediteur)) continue;

    // Determine direction
    const senderAddr = extractEmailAddress(parsed.expediteur);
    const myAddr = gmailEmail.toLowerCase();
    const direction = senderAddr === myAddr ? "sortant" : "entrant";

    // Match client
    const clientId = direction === "sortant"
      ? await matchClientByEmail(parsed.destinataires)
      : await matchClientByEmail(parsed.expediteur);

    if (clientId) clientMatchCount++;

    // Classify pertinence
    const { pertinence, scoreRelevance } = classifyPertinence(
      !!clientId, parsed.sujet, parsed.extrait
    );

    const email = await prisma.email.create({
      data: {
        ...parsed,
        userId,
        clientId,
        direction,
        pertinence,
        scoreRelevance,
      },
    });

    // Update client's last interaction date
    if (clientId) {
      await prisma.client.update({
        where: { id: clientId },
        data: { derniereInteraction: parsed.dateEnvoi },
      });
    }

    newEmailIds.push(email.id);
    newCount++;
  }

  // Auto-process important/client emails
  const autoProcessed = await autoProcessEmails(userId, newEmailIds);

  revalidatePath("/emails");
  revalidatePath("/clients");
  revalidatePath("/relances");
  return { success: true, newCount, clientMatchCount, autoProcessed };
}

// ── AUTO-PROCESS: analyze client & important emails automatically ──

async function autoProcessEmails(userId: string, emailIds: string[]): Promise<number> {
  const emailsToProcess = await prisma.email.findMany({
    where: {
      id: { in: emailIds },
      analyseStatut: "non_analyse",
      pertinence: { in: ["client", "important"] },
    },
  });

  let processed = 0;

  for (const email of emailsToProcess) {
    try {
      await analyzeEmailInternal(email.id, userId);
      processed++;
    } catch (err) {
      console.error(`Auto-process failed for email ${email.id}:`, err);
    }
  }

  return processed;
}

// ── ANALYZE (internal, reusable) ──

async function analyzeEmailInternal(emailId: string, userId: string) {
  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: { client: true },
  });
  if (!email) throw new Error("Email introuvable");

  await prisma.email.update({
    where: { id: emailId },
    data: { analyseStatut: "en_cours" },
  });

  // Build enriched context
  const allClients = await prisma.client.findMany({
    select: { id: true, raisonSociale: true, email: true, prenom: true, nom: true },
  });

  let contextData: Parameters<typeof buildAnalysisPrompt>[5] = undefined;

  if (email.clientId) {
    const clientTaches = await prisma.tache.findMany({
      where: { clientId: email.clientId, statut: { in: ["a_faire", "en_cours"] } },
      select: { id: true, titre: true, statut: true, dateEcheance: true },
      orderBy: { dateEcheance: "asc" },
      take: 10,
    });

    const clientContrats = await prisma.contrat.findMany({
      where: { clientId: email.clientId, statut: "actif" },
      select: { id: true, typeProduit: true, nomProduit: true, statut: true },
      take: 10,
    });

    const recentEmails = await prisma.email.findMany({
      where: { clientId: email.clientId, id: { not: emailId } },
      select: { sujet: true, direction: true, dateEnvoi: true },
      orderBy: { dateEnvoi: "desc" },
      take: 5,
    });

    const matchedClient = allClients.find((c) => c.id === email.clientId);

    contextData = {
      clientMatched: matchedClient ? {
        ...matchedClient,
        taches: clientTaches,
        contrats: clientContrats,
      } : undefined,
      recentEmails,
    };
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const prompt = buildAnalysisPrompt(
    email.sujet,
    email.expediteur,
    email.extrait,
    email.direction,
    allClients,
    contextData,
  );

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const firstBlock = response.content[0];
  const rawText = firstBlock.type === "text" ? firstBlock.text : "";
  const result = parseAIResponse(rawText);

  await processAnalysisResult(emailId, email.clientId, result);
}

// ── PROCESS ANALYSIS RESULT: enrich CRM from AI output ──

async function processAnalysisResult(
  emailId: string,
  existingClientId: string | null,
  result: AIEmailAnalysis
) {
  const resolvedClientId = result.clientId ?? existingClientId;

  // 1. Create tasks from action items
  for (const item of result.actionItems) {
    await prisma.tache.create({
      data: {
        titre: item,
        type: "AUTRE",
        priorite: "normale",
        dateEcheance: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        clientId: resolvedClientId,
        emailId: emailId,
      },
    });
  }

  // 2. Close tasks identified by AI
  if (result.tachesAFermer.length > 0) {
    await prisma.tache.updateMany({
      where: {
        id: { in: result.tachesAFermer },
        statut: { in: ["a_faire", "en_cours"] },
      },
      data: {
        statut: "terminee",
        dateRealisation: new Date(),
      },
    });
  }

  // 3. Enrich client data
  if (resolvedClientId && result.enrichissementClient) {
    const updates: Record<string, unknown> = {};

    if (result.enrichissementClient.notes) {
      const currentClient = await prisma.client.findUnique({
        where: { id: resolvedClientId },
        select: { noteEmails: true },
      });
      const existing = currentClient?.noteEmails ?? "";
      const date = new Date().toISOString().slice(0, 10);
      const newNote = `[${date}] ${result.enrichissementClient.notes}`;
      // Keep last 5 notes (rolling summary)
      const lines = existing ? existing.split("\n") : [];
      lines.push(newNote);
      updates.noteEmails = lines.slice(-5).join("\n");
    }

    if (result.enrichissementClient.statutSuggere) {
      updates.statut = result.enrichissementClient.statutSuggere;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.client.update({
        where: { id: resolvedClientId },
        data: updates,
      });
    }
  }

  // 4. Update email with analysis results
  await prisma.email.update({
    where: { id: emailId },
    data: {
      resume: result.resume,
      actionsItems: JSON.stringify(result.actionItems),
      reponseProposee: result.draftReply,
      clientId: resolvedClientId,
      analyseStatut: "analyse",
    },
  });
}

// ── PUBLIC ACTIONS ──

export async function analyzeEmail(emailId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  try {
    await analyzeEmailInternal(emailId, session.user.id);
    revalidatePath("/emails");
    revalidatePath("/relances");
    revalidatePath("/clients");
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
