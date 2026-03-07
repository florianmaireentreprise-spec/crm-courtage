"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { buildOAuth2Client, parseGmailMessage, sendGmailReply, GMAIL_SCOPES } from "@/lib/email/gmail";
import { analyzeEmailById } from "@/lib/email/sync";
import { google } from "googleapis";

// ── Helpers (shared with sync.ts) ──

const EXCLUDED_PATTERNS = [
  /noreply@/i, /no-reply@/i, /ne-pas-repondre@/i,
  /newsletter@/i, /notifications?@/i, /mailer-daemon@/i,
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
    scope: GMAIL_SCOPES,
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

    const senderAddr = extractEmailAddress(parsed.expediteur);
    const myAddr = gmailEmail.toLowerCase();
    const direction = senderAddr === myAddr ? "sortant" : "entrant";

    const clientId = direction === "sortant"
      ? await matchClientByEmail(parsed.destinataires)
      : await matchClientByEmail(parsed.expediteur);

    if (clientId) clientMatchCount++;

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

    if (clientId) {
      await prisma.client.update({
        where: { id: clientId },
        data: { derniereInteraction: parsed.dateEnvoi },
      });
    }

    newEmailIds.push(email.id);
    newCount++;
  }

  // Reset stuck "en_cours" emails (stuck for more than 5 minutes)
  await prisma.email.updateMany({
    where: {
      userId,
      analyseStatut: "en_cours",
      dateMaj: { lt: new Date(Date.now() - 5 * 60 * 1000) },
    },
    data: { analyseStatut: "erreur" },
  });

  // Auto-analyze ALL new emails (not just client/important)
  const emailsToProcess = await prisma.email.findMany({
    where: {
      userId,
      analyseStatut: { in: ["non_analyse", "erreur"] },
    },
    select: { id: true },
    orderBy: { dateEnvoi: "desc" },
    take: 50,
  });

  let autoProcessed = 0;
  for (const email of emailsToProcess) {
    try {
      await analyzeEmailById(email.id);
      autoProcessed++;
    } catch (err) {
      console.error(`Auto-process failed for email ${email.id}:`, err);
    }
  }

  revalidatePath("/emails");
  revalidatePath("/clients");
  revalidatePath("/relances");
  return { success: true, newCount, clientMatchCount, autoProcessed };
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

export async function reanalyzeUnprocessed() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  const emailsToProcess = await prisma.email.findMany({
    where: {
      userId: session.user.id,
      analyseStatut: { in: ["non_analyse", "erreur"] },
    },
    orderBy: { dateEnvoi: "desc" },
    take: 50,
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

// ── SEND REPLY via Gmail ──

export async function sendReply(emailId: string, replyText: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email) return { error: "Email non trouvé" };

  try {
    const { oauth2Client } = await buildAuthedClient(session.user.id);

    const toAddress = extractEmailAddress(email.expediteur);
    await sendGmailReply(
      oauth2Client,
      toAddress,
      email.sujet,
      replyText,
      email.threadId,
    );

    await prisma.email.update({
      where: { id: emailId },
      data: { actionTraitee: true },
    });

    revalidatePath("/emails");
    return { success: true };
  } catch (err) {
    console.error("Send reply error:", err);
    const message = err instanceof Error ? err.message : "";
    if (message.includes("insufficient") || message.includes("scope") || message.includes("403")) {
      return { error: "Permissions insuffisantes. Deconnectez et reconnectez Gmail pour autoriser l'envoi d'emails." };
    }
    return { error: "Erreur lors de l'envoi de la reponse" };
  }
}

// ── CREATE DEAL from email ──

export async function createDealFromEmail(emailId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email) return { error: "Email non trouvé" };
  if (!email.clientId) return { error: "Rattachez d'abord un client a cet email" };

  const client = await prisma.client.findUnique({
    where: { id: email.clientId },
    select: { raisonSociale: true },
  });

  const produits: string[] = email.produitsMentionnes
    ? (() => { try { return JSON.parse(email.produitsMentionnes); } catch { return []; } })()
    : [];

  const PRODUCT_LABELS: Record<string, string> = {
    SANTE_COLLECTIVE: "Santé collective",
    PREVOYANCE_COLLECTIVE: "Prévoyance collective",
    PREVOYANCE_MADELIN: "Prévoyance Madelin",
    SANTE_MADELIN: "Santé Madelin",
    RCP_PRO: "RC Professionnelle",
    PER: "PER",
    ASSURANCE_VIE: "Assurance vie",
    PROTECTION_JURIDIQUE: "Protection juridique",
  };

  const mainProduct = produits[0] || "SANTE_COLLECTIVE";
  const productLabel = PRODUCT_LABELS[mainProduct] || mainProduct.replace(/_/g, " ");

  const deal = await prisma.deal.create({
    data: {
      clientId: email.clientId,
      titre: `${productLabel} — ${client?.raisonSociale || "Prospect"}`,
      etape: "PROSPECT_IDENTIFIE",
      produitsCibles: produits.join(", "),
      sourceProspect: "email",
      notes: `Créé depuis l'email: "${email.sujet}"`,
    },
  });

  revalidatePath("/pipeline");
  revalidatePath("/emails");
  return { success: true, dealId: deal.id };
}

// ── CREATE CLIENT from email data ──

export async function createClientFromEmail(emailId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email) return { error: "Email non trouvé" };

  // Parse analysis to get sender info
  let expediteurNom = "";
  let expediteurEntreprise = "";
  if (email.analyseIA) {
    try {
      const analysis = JSON.parse(email.analyseIA);
      expediteurNom = analysis.expediteurNom || "";
      expediteurEntreprise = analysis.expediteurEntreprise || "";
    } catch { /* ignore */ }
  }

  // Fallback: extract from expediteur header
  if (!expediteurNom) {
    const match = email.expediteur.match(/^([^<]+)\s*</);
    expediteurNom = match ? match[1].trim() : email.expediteur.split("@")[0];
  }

  const emailAddr = extractEmailAddress(email.expediteur);
  const nameParts = expediteurNom.split(" ");
  const prenom = nameParts[0] || expediteurNom;
  const nom = nameParts.slice(1).join(" ") || prenom;

  const client = await prisma.client.create({
    data: {
      raisonSociale: expediteurEntreprise || expediteurNom,
      prenom,
      nom,
      email: emailAddr,
      statut: "prospect",
      sourceAcquisition: "Email entrant",
      notes: `Créé depuis l'email: "${email.sujet}"`,
      derniereInteraction: email.dateEnvoi,
    },
  });

  // Link email to the new client
  await prisma.email.update({
    where: { id: emailId },
    data: { clientId: client.id },
  });

  revalidatePath("/emails");
  revalidatePath("/clients");
  return { success: true, clientId: client.id, clientName: client.raisonSociale };
}
