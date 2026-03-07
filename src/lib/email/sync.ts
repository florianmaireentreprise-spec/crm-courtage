import { prisma } from "@/lib/prisma";
import { buildOAuth2Client, parseGmailMessage } from "@/lib/email/gmail";
import { buildAnalysisPrompt, parseAIResponse, type AIEmailAnalysis } from "@/lib/email/ai";
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

async function matchPrescripteurByEmail(emailAddress: string): Promise<string | null> {
  const addr = extractEmailAddress(emailAddress);
  const prescripteur = await prisma.prescripteur.findFirst({
    where: {
      email: { equals: addr, mode: "insensitive" },
    },
    select: { id: true },
  });
  return prescripteur?.id ?? null;
}

// ── Analyze a single email (no session needed, reusable) ──
export async function analyzeEmailById(emailId: string) {
  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: { client: true },
  });
  if (!email) return;

  await prisma.email.update({
    where: { id: emailId },
    data: { analyseStatut: "en_cours" },
  });

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

  await processAnalysisResultCron(emailId, email.clientId, result, email.expediteur);
}

async function processAnalysisResultCron(
  emailId: string,
  existingClientId: string | null,
  result: AIEmailAnalysis,
  expediteur: string,
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

  // 4. Auto-update prescripteur lead counter if email is from a prescripteur
  if (result.type === "prescripteur") {
    const prescripteurId = await matchPrescripteurByEmail(expediteur);
    if (prescripteurId) {
      await prisma.prescripteur.update({
        where: { id: prescripteurId },
        data: {
          dossiersEnvoyes: { increment: 1 },
          derniereRecommandation: new Date(),
        },
      });
    }
  }

  // 5. Update email with analysis results
  await prisma.email.update({
    where: { id: emailId },
    data: {
      resume: result.resume,
      actionsItems: JSON.stringify(result.actionItems),
      reponseProposee: result.draftReply,
      clientId: resolvedClientId,
      analyseStatut: "analyse",
      typeEmail: result.type,
      urgence: result.urgence,
      sentiment: result.sentiment,
      actionRequise: result.actionRequise,
      actionTraitee: false,
      analyseIA: JSON.stringify(result),
      dealUpdateSuggestion: result.dealUpdate ? JSON.stringify(result.dealUpdate) : null,
      produitsMentionnes: result.produitsMentionnes.length > 0 ? JSON.stringify(result.produitsMentionnes) : null,
    },
  });
}

// ── Main sync function for cron (no session needed) ──
export async function syncEmailsForUser(userId: string): Promise<{
  newCount: number;
  analyzed: number;
  errors: number;
}> {
  const connection = await prisma.gmailConnection.findUnique({ where: { userId } });
  if (!connection) return { newCount: 0, analyzed: 0, errors: 0 };

  const oauth2Client = buildOAuth2Client();
  oauth2Client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    expiry_date: connection.tokenExpiry.getTime(),
  });

  // Auto-refresh tokens
  oauth2Client.on("tokens", async (tokens) => {
    const updates: Record<string, unknown> = {
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : connection.tokenExpiry,
    };
    if (tokens.access_token) updates.accessToken = tokens.access_token;
    if (tokens.refresh_token) updates.refreshToken = tokens.refresh_token;
    await prisma.gmailConnection.update({ where: { userId }, data: updates });
  });

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
    const myAddr = connection.gmailEmail.toLowerCase();
    const direction = senderAddr === myAddr ? "sortant" : "entrant";

    const clientId = direction === "sortant"
      ? await matchClientByEmail(parsed.destinataires)
      : await matchClientByEmail(parsed.expediteur);

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

  // Auto-analyze client & important emails
  const emailsToAnalyze = await prisma.email.findMany({
    where: {
      userId,
      analyseStatut: { in: ["non_analyse", "erreur"] },
      pertinence: { in: ["client", "important"] },
    },
    select: { id: true },
  });

  let analyzed = 0;
  let errors = 0;

  for (const email of emailsToAnalyze) {
    try {
      await analyzeEmailById(email.id);
      analyzed++;
    } catch (err) {
      console.error(`Cron analyze failed for email ${email.id}:`, err);
      await prisma.email.update({
        where: { id: email.id },
        data: { analyseStatut: "erreur" },
      }).catch(() => {});
      errors++;
    }
  }

  return { newCount, analyzed, errors };
}

// ── Sync all connected users ──
export async function syncAllUsersEmails(): Promise<{
  users: number;
  totalNew: number;
  totalAnalyzed: number;
  totalErrors: number;
}> {
  const connections = await prisma.gmailConnection.findMany({
    select: { userId: true },
  });

  let totalNew = 0;
  let totalAnalyzed = 0;
  let totalErrors = 0;

  for (const conn of connections) {
    try {
      const result = await syncEmailsForUser(conn.userId);
      totalNew += result.newCount;
      totalAnalyzed += result.analyzed;
      totalErrors += result.errors;
    } catch (err) {
      console.error(`Cron email sync failed for user ${conn.userId}:`, err);
      totalErrors++;
    }
  }

  return {
    users: connections.length,
    totalNew,
    totalAnalyzed,
    totalErrors,
  };
}
