"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { buildOAuth2Client, parseGmailMessage } from "@/lib/gmail";
import { analyzeEmailById } from "@/lib/email-sync";
import { google } from "googleapis";

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

  // Auto-process important/client emails (new ones + any previously missed)
  const autoProcessed = await autoProcessEmails(userId, newEmailIds);

  // Also catch any previously unanalyzed client/important emails
  const missedEmails = await prisma.email.findMany({
    where: {
      userId,
      analyseStatut: "non_analyse",
      pertinence: { in: ["client", "important"] },
      id: { notIn: newEmailIds },
    },
    select: { id: true },
  });

  let missedProcessed = 0;
  for (const email of missedEmails) {
    try {
      await analyzeEmailById(email.id);
      missedProcessed++;
    } catch (err) {
      console.error(`Auto-process missed email ${email.id}:`, err);
    }
  }

  revalidatePath("/emails");
  revalidatePath("/clients");
  revalidatePath("/relances");
  return { success: true, newCount, clientMatchCount, autoProcessed: autoProcessed + missedProcessed };
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
      await analyzeEmailById(email.id);
      processed++;
    } catch (err) {
      console.error(`Auto-process failed for email ${email.id}:`, err);
    }
  }

  return processed;
}

// ── PUBLIC ACTIONS ──

export async function analyzeEmail(emailId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  try {
    await analyzeEmailById(emailId);
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

export async function markActionTraitee(emailId: string) {
  await prisma.email.update({
    where: { id: emailId },
    data: { actionTraitee: true },
  });
  revalidatePath("/emails");
}

export async function batchProcessEmails() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  // Find all analyzed emails with pending actions
  const pendingEmails = await prisma.email.findMany({
    where: {
      userId: session.user.id,
      analyseStatut: "analyse",
      actionRequise: true,
      actionTraitee: false,
    },
  });

  let processed = 0;
  for (const email of pendingEmails) {
    await prisma.email.update({
      where: { id: email.id },
      data: { actionTraitee: true },
    });
    processed++;
  }

  revalidatePath("/emails");
  return { success: true, processed };
}

// ── REANALYZE: process all unanalyzed client/important emails ──

export async function reanalyzeUnprocessed() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  const emailsToProcess = await prisma.email.findMany({
    where: {
      userId: session.user.id,
      analyseStatut: { in: ["non_analyse", "erreur"] },
      pertinence: { in: ["client", "important"] },
    },
    orderBy: { dateEnvoi: "desc" },
  });

  let processed = 0;
  let erreurs = 0;

  for (const email of emailsToProcess) {
    try {
      await analyzeEmailById(email.id);
      processed++;
    } catch (err) {
      console.error(`Reanalyze failed for email ${email.id}:`, err);
      erreurs++;
    }
  }

  revalidatePath("/emails");
  revalidatePath("/clients");
  revalidatePath("/relances");
  return { success: true, processed, erreurs, total: emailsToProcess.length };
}

export async function disconnectGmail() {
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.gmailConnection.delete({ where: { userId: session.user.id } }).catch(() => {});
  revalidatePath("/emails");
}
