"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { buildOAuth2Client, parseGmailMessage, sendGmailReply, createGmailDraft, updateGmailDraft, sendGmailDraft, GMAIL_SCOPES } from "@/lib/email/gmail";
import { callN8nWebhook } from "@/lib/n8n";
import { extraireSignauxCommerciaux, mettreAJourMemoireCommerciale } from "@/lib/scoring/signals";
import { detecterOpportunitesDepuisEmail } from "@/lib/opportunities/detection";

// ── Feedback IA tracking (fire-and-forget) ──

async function trackFeedback(
  emailId: string,
  userId: string,
  type: string,
  extra?: { champ?: string; valeurIA?: string; valeurUser?: string; metadata?: string }
) {
  try {
    await prisma.feedbackIA.create({
      data: { emailId, userId, type, ...extra },
    });
  } catch (err) {
    console.error("[trackFeedback] Error:", err);
    // Non-blocking — never fail the parent action
  }
}
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

const NON_COMMERCIAL_DOMAINS = [
  "railway.app", "github.com", "vercel.com", "noreply",
  "notifications", "support.google.com", "accounts.google.com",
  "linkedin.com", "figma.com", "notion.so", "slack.com",
];

function preClassifyNonCommercial(expediteur: string): string | null {
  const addr = extractEmailAddress(expediteur).toLowerCase();
  if (NON_COMMERCIAL_DOMAINS.some((d) => addr.includes(d))) return "autre";
  return null;
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

    // Pre-classify non-commercial emails
    const preType = preClassifyNonCommercial(parsed.expediteur);

    const email = await prisma.email.create({
      data: {
        ...parsed,
        userId,
        clientId,
        direction,
        pertinence,
        scoreRelevance,
        ...(preType ? { typeEmail: preType, analyseStatut: "analyse" } : {}),
      },
    });

    if (clientId) {
      await prisma.client.update({
        where: { id: clientId },
        data: { derniereInteraction: parsed.dateEnvoi },
      });
    }

    // Auto-close "Répondre" tasks when a sent email is detected
    if (direction === "sortant") {
      try {
        const destAddresses = JSON.parse(parsed.destinataires).map(
          (d: string) => extractEmailAddress(d).toLowerCase()
        );
        const openReplyTasks = await prisma.tache.findMany({
          where: {
            sourceAuto: "email_reponse_attendue",
            statut: { in: ["a_faire", "en_cours"] },
          },
          select: { id: true, titre: true },
        });
        for (const task of openReplyTasks) {
          const match = task.titre.match(/\(([^)]+@[^)]+)\)/);
          if (match && destAddresses.includes(match[1].toLowerCase())) {
            await prisma.tache.update({
              where: { id: task.id },
              data: { statut: "terminee", dateRealisation: parsed.dateEnvoi },
            });
          }
        }
      } catch { /* ignore */ }
    }

    // Skip analysis for pre-classified non-commercial emails
    if (preType) {
      newEmailIds.push(email.id);
      newCount++;
      continue;
    }

    // Direct AI analysis (async, non-blocking for sync)
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

  // Analysis is now handled by n8n WF05v2 (triggered automatically)
  // No direct AI calls from CRM

  // Update historyId for incremental push sync
  try {
    const profile = await gmail.users.getProfile({ userId: "me" });
    if (profile.data.historyId) {
      await prisma.gmailConnection.update({
        where: { userId },
        data: { historyId: String(profile.data.historyId) },
      });
    }
  } catch { /* non-blocking */ }

  revalidatePath("/emails");
  revalidatePath("/clients");
  revalidatePath("/relances");
  return { success: true, newCount, clientMatchCount };
}

// ── PUBLIC ACTIONS ──

export async function analyzeEmail(emailId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email) return { error: "Email non trouvé" };

  // Already analyzed — return immediately
  if (email.analyseStatut === "analyse") {
    return { success: true, alreadyAnalyzed: true };
  }

  const webhookBase = process.env.N8N_WEBHOOK_URL;
  if (!webhookBase) {
    return { error: "N8N_WEBHOOK_URL non configuré" };
  }

  // Mark as in progress
  await prisma.email.update({
    where: { id: emailId },
    data: { analyseStatut: "en_cours" },
  });

  // Trigger n8n analysis webhook
  const webhookUrl = (webhookBase.endsWith("/") ? webhookBase.slice(0, -1) : webhookBase) + "/webhook/email.received";
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-n8n-secret": process.env.N8N_WEBHOOK_SECRET ?? "",
      },
      body: JSON.stringify({
        emailId: email.id,
        sujet: email.sujet,
        expediteur: email.expediteur,
        direction: email.direction,
        extrait: email.extrait,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error("[analyzeEmail] webhook trigger failed:", err);
    await prisma.email.update({
      where: { id: emailId },
      data: { analyseStatut: "erreur" },
    }).catch(() => {});
    revalidatePath("/emails");
    return { error: "Impossible de contacter le service d'analyse. Réessayez." };
  }

  // Poll DB until analysis completes (n8n POSTs result to /api/n8n/emails)
  // Mistral Small typically takes 3-8 seconds
  const MAX_WAIT_MS = 30_000;
  const POLL_INTERVAL_MS = 1_500;
  const start = Date.now();

  while (Date.now() - start < MAX_WAIT_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const updated = await prisma.email.findUnique({
      where: { id: emailId },
      select: { analyseStatut: true, resume: true, typeEmail: true, urgence: true },
    });

    if (!updated) break;

    if (updated.analyseStatut === "analyse") {
      // Analysis completed — return result to UI
      revalidatePath("/emails");
      return {
        success: true,
        immediate: true,
        type: updated.typeEmail,
        urgence: updated.urgence,
        resume: updated.resume,
      };
    }

    if (updated.analyseStatut === "erreur") {
      revalidatePath("/emails");
      return { error: "L'analyse a échoué. Réessayez." };
    }
  }

  // Timeout — analysis still running in n8n, will complete in background
  revalidatePath("/emails");
  return {
    success: true,
    immediate: false,
    message: "Analyse en cours — le résultat apparaîtra dans quelques instants.",
  };
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
  revalidatePath("/emails/urgent");
  revalidatePath("/clients");
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

  // Reset stuck/errored emails to "non_analyse" — WF10 queue will pick them up
  const result = await prisma.email.updateMany({
    where: {
      userId: session.user.id,
      analyseStatut: { in: ["non_analyse", "erreur", "en_cours"] },
    },
    data: { analyseStatut: "non_analyse" },
  });

  revalidatePath("/emails");
  return { success: true, triggered: result.count, message: `${result.count} emails remis en file d'attente` };
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
      data: { actionTraitee: true, draftStatut: "envoye", gmailDraftId: null },
    });

    // Track feedback — was the reply edited from the AI suggestion?
    const wasEdited = email.reponseProposee && replyText !== email.reponseProposee;
    trackFeedback(emailId, session.user.id, wasEdited ? "reply_edited" : "reply_sent", {
      valeurIA: email.reponseProposee || undefined,
      metadata: wasEdited ? JSON.stringify({ edited: true }) : undefined,
    });

    // Auto-close "Répondre" task linked to this email
    await prisma.tache.updateMany({
      where: { emailId, sourceAuto: "email_reponse_attendue", statut: { in: ["a_faire", "en_cours"] } },
      data: { statut: "terminee", dateRealisation: new Date() },
    });

    revalidatePath("/emails");
    revalidatePath("/relances");
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

// ── EXECUTE a specific action from AI analysis ──

export async function executeEmailAction(emailId: string, actionIndex: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email || !email.analyseIA) return { error: "Email ou analyse non trouvé" };

  try {
    const analysis = JSON.parse(email.analyseIA);
    const actions = Array.isArray(analysis.actions) ? analysis.actions : [];
    const action = actions[actionIndex];
    if (!action) return { error: "Action non trouvée" };

    const ECHEANCE_JOURS: Record<string, number> = { haute: 1, normale: 7, basse: 14 };
    const echeance = ECHEANCE_JOURS[action.priorite] ?? 7;

    // Create task from this action
    await prisma.tache.create({
      data: {
        titre: action.titre,
        description: action.details || null,
        type: "RELANCE_PROSPECT",
        priorite: action.priorite || "normale",
        dateEcheance: new Date(Date.now() + echeance * 24 * 60 * 60 * 1000),
        clientId: email.clientId,
        emailId: emailId,
        autoGenerated: true,
        sourceAuto: `email_action_manuelle_${action.type}`,
      },
    });

    // Mark action as executed in the stored analysis
    actions[actionIndex] = { ...action, _executed: true };
    analysis.actions = actions;
    await prisma.email.update({
      where: { id: emailId },
      data: { analyseIA: JSON.stringify(analysis) },
    });


    // Track feedback
    trackFeedback(emailId, session.user.id, "action_executed", {
      valeurIA: action.titre,
      metadata: JSON.stringify({ actionIndex, actionType: action.type }),
    });

    revalidatePath("/emails");
    revalidatePath("/relances");
    return { success: true };
  } catch (err) {
    console.error("executeEmailAction error:", err);
    return { error: "Erreur lors de l'exécution de l'action" };
  }
}

// ── IGNORE a specific action from AI analysis ──

export async function ignoreEmailAction(emailId: string, actionIndex: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email || !email.analyseIA) return { error: "Email ou analyse non trouvé" };

  try {
    const analysis = JSON.parse(email.analyseIA);
    const actions = Array.isArray(analysis.actions) ? analysis.actions : [];
    if (!actions[actionIndex]) return { error: "Action non trouvée" };

    actions[actionIndex] = { ...actions[actionIndex], _ignored: true };
    analysis.actions = actions;
    await prisma.email.update({
      where: { id: emailId },
      data: { analyseIA: JSON.stringify(analysis) },
    });


    // Track feedback
    trackFeedback(emailId, session.user.id, "action_ignored", {
      valeurIA: actions[actionIndex]?.titre,
      metadata: JSON.stringify({ actionIndex }),
    });

    revalidatePath("/emails");
    return { success: true };
  } catch (err) {
    console.error("ignoreEmailAction error:", err);
    return { error: "Erreur lors de l'ignorance de l'action" };
  }
}

// ── CLOSE a task from email context ──

export async function closeTaskFromEmail(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  await prisma.tache.update({
    where: { id: taskId },
    data: {
      statut: "terminee",
      dateRealisation: new Date(),
    },
  });

  revalidatePath("/emails");
  revalidatePath("/relances");
  return { success: true };
}

// ── LINK email to an existing client ──

export async function linkEmailToClient(emailId: string, clientId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { raisonSociale: true },
  });
  if (!client) return { error: "Client non trouvé" };

  await prisma.email.update({
    where: { id: emailId },
    data: { clientId },
  });

  revalidatePath("/emails");
  revalidatePath("/clients");

  // Track feedback
  trackFeedback(emailId, session.user.id, "client_linked", {
    valeurUser: clientId,
    metadata: JSON.stringify({ clientName: client.raisonSociale }),
  });

  return { success: true, clientName: client.raisonSociale };
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

// ── CREATE PROSPECT + OPPORTUNITY from email (Stage 4) ──

export async function createProspectAndOpportunity(emailId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email) return { error: "Email non trouvé" };

  // 1. Resolve clientId (idempotent: 3 sequential checks)
  let clientId = email.clientId;
  let clientName = "";
  let clientCreated = false;

  if (!clientId) {
    // Check if a client already matches this sender email
    clientId = await matchClientByEmail(email.expediteur);
  }

  if (!clientId) {
    // Create prospect from sender info
    let expediteurNom = "";
    let expediteurEntreprise = "";
    if (email.analyseIA) {
      try {
        const analysis = JSON.parse(email.analyseIA);
        expediteurNom = analysis.expediteurNom || "";
        expediteurEntreprise = analysis.expediteurEntreprise || "";
      } catch { /* ignore */ }
    }

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

    clientId = client.id;
    clientName = client.raisonSociale;
    clientCreated = true;
  } else {
    // Fetch existing client name
    const existing = await prisma.client.findUnique({
      where: { id: clientId },
      select: { raisonSociale: true },
    });
    clientName = existing?.raisonSociale || "";
  }

  // 2. Link email to client (idempotent)
  if (email.clientId !== clientId) {
    await prisma.email.update({
      where: { id: emailId },
      data: { clientId },
    });
  }

  // 3. Parse analysis data for signal extraction
  let analysisData: {
    produitsMentionnes?: string[];
    sentiment?: string;
    urgence?: string;
    notes?: string;
    actions?: Array<{ type: string; titre: string; priorite?: string; details?: string }>;
    dealUpdate?: { etapeSuggeree?: string };
    type?: string;
    resume?: string;
  } = {};
  if (email.analyseIA) {
    try {
      analysisData = JSON.parse(email.analyseIA);
    } catch { /* ignore */ }
  }

  // 4. Extract signals (deterministic, no AI call)
  const signals = extraireSignauxCommerciaux({
    produitsMentionnes: analysisData.produitsMentionnes ?? null,
    sentiment: analysisData.sentiment ?? null,
    urgence: analysisData.urgence ?? email.urgence ?? null,
    notes: analysisData.notes ?? null,
    actions: analysisData.actions ?? [],
    dealUpdate: analysisData.dealUpdate ?? null,
    type: analysisData.type ?? email.typeEmail ?? null,
  });

  // 5. Update commercial memory (idempotent via emailId check)
  try {
    if (signals.length > 0) {
      await mettreAJourMemoireCommerciale(clientId, emailId, signals);
    }
  } catch (err) {
    console.error("[createProspectAndOpportunity] Signal persistence error:", err);
  }

  // 6. Detect opportunities (idempotent via dedupeKey)
  try {
    await detecterOpportunitesDepuisEmail({
      clientId,
      emailId,
      signals,
      emailAnalysis: {
        type: analysisData.type ?? email.typeEmail ?? null,
        sentiment: analysisData.sentiment ?? email.sentiment ?? null,
        urgence: analysisData.urgence ?? email.urgence ?? null,
        resume: analysisData.resume ?? email.resume ?? null,
        produitsMentionnes: analysisData.produitsMentionnes ?? null,
        notes: analysisData.notes ?? null,
        actions: analysisData.actions ?? [],
      },
    });
  } catch (err) {
    console.error("[createProspectAndOpportunity] Opportunity detection error:", err);
  }

  // 7. Count opportunities linked to this email
  const opportunitesCount = await prisma.opportuniteCommerciale.count({
    where: { clientId, sourceEmailId: emailId },
  });

  revalidatePath("/emails");
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);

  return {
    success: true as const,
    clientId,
    clientName,
    clientCreated,
    opportunitesCount,
  };
}

// ── CREATE TASK from email suggestion ──

export async function createTaskFromEmail(emailId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email) return { error: "Email non trouvé" };

  // Anti-doublon
  const existing = await prisma.tache.findFirst({
    where: { emailId, statut: { not: "terminee" } },
  });
  if (existing) return { success: true, taskId: existing.id };

  // Parse action suggestion
  let actionSuggeree = `Action requise — ${email.sujet}`;
  if (email.analyseIA) {
    try {
      const analysis = JSON.parse(email.analyseIA);
      if (analysis.actionSuggeree) actionSuggeree = analysis.actionSuggeree;
    } catch { /* ignore */ }
  }

  const tache = await prisma.tache.create({
    data: {
      titre: actionSuggeree,
      description: `Depuis l'email: "${email.sujet}" de ${email.expediteur}`,
      clientId: email.clientId,
      emailId: emailId,
      type: "RELANCE_PROSPECT",
      priorite: email.urgence === "haute" ? "haute" : "normale",
      dateEcheance: new Date(Date.now() + (email.urgence === "haute" ? 86400000 : 259200000)),
      statut: "a_faire",
      autoGenerated: true,
      sourceAuto: "email_action_manuelle",
    },
  });

  await prisma.email.update({
    where: { id: emailId },
    data: { actionTraitee: true },
  });

  revalidatePath("/emails");
  revalidatePath("/relances");
  return { success: true, taskId: tache.id };
}

// ── MARK email as processed (ignore actions) ──

export async function markEmailAsProcessed(emailId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  await prisma.email.update({
    where: { id: emailId },
    data: { actionTraitee: true },
  });
  revalidatePath("/emails");
  revalidatePath("/emails/urgent");
  return { success: true };
}

// ── BATCH: process all pending actions ──

export async function batchProcessAllPending() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  const pending = await prisma.email.findMany({
    where: { actionRequise: true, actionTraitee: false, userId: session.user.id },
  });

  let processed = 0;
  for (const email of pending) {
    try {
      await createTaskFromEmail(email.id);
      processed++;
    } catch { /* continue */ }
  }

  revalidatePath("/emails");
  revalidatePath("/relances");
  return { success: true, processed };
}

// ── GET pending action count (for sidebar badge) ──

export async function getPendingActionCount() {
  const session = await auth();
  if (!session?.user?.id) return 0;

  return prisma.email.count({
    where: { actionRequise: true, actionTraitee: false, userId: session.user.id },
  });
}

// ── SAVE DRAFT to Gmail ──

export async function saveDraft(emailId: string, draftText: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email) return { error: "Email non trouvé" };

  try {
    const { oauth2Client } = await buildAuthedClient(session.user.id);
    const toAddress = extractEmailAddress(email.expediteur);

    let draftId: string;
    if (email.gmailDraftId) {
      draftId = await updateGmailDraft(oauth2Client, email.gmailDraftId, toAddress, email.sujet, draftText, email.threadId);
    } else {
      draftId = await createGmailDraft(oauth2Client, toAddress, email.sujet, draftText, email.threadId);
    }

    await prisma.email.update({
      where: { id: emailId },
      data: { gmailDraftId: draftId, draftStatut: "brouillon", reponseProposee: draftText },
    });

    revalidatePath("/emails");
    return { success: true, draftId };
  } catch (err) {
    console.error("Save draft error:", err);
    const message = err instanceof Error ? err.message : "";
    if (message.includes("insufficient") || message.includes("scope") || message.includes("403")) {
      return { error: "Permissions insuffisantes. Reconnectez Gmail." };
    }
    return { error: "Erreur lors de la sauvegarde du brouillon" };
  }
}

// ── SEND DRAFT from Gmail ──

export async function sendDraft(emailId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email) return { error: "Email non trouvé" };
  if (!email.gmailDraftId) return { error: "Aucun brouillon à envoyer" };

  try {
    const { oauth2Client } = await buildAuthedClient(session.user.id);
    await sendGmailDraft(oauth2Client, email.gmailDraftId);

    await prisma.email.update({
      where: { id: emailId },
      data: { draftStatut: "envoye", actionTraitee: true, gmailDraftId: null },
    });

    // Auto-close "Répondre" task
    await prisma.tache.updateMany({
      where: { emailId, sourceAuto: "email_reponse_attendue", statut: { in: ["a_faire", "en_cours"] } },
      data: { statut: "terminee", dateRealisation: new Date() },
    });

    revalidatePath("/emails");
    revalidatePath("/relances");
    return { success: true };
  } catch (err) {
    console.error("Send draft error:", err);
    return { error: "Erreur lors de l'envoi du brouillon" };
  }
}

// ── CREATE CONTACT from email (prospect, client, or prescripteur) ──

export async function createContactFromEmail(
  emailId: string,
  contactType: "prospect" | "client" | "prescripteur",
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email) return { error: "Email non trouvé" };

  // Parse sender info from AI analysis
  let expediteurNom = "";
  let expediteurEntreprise = "";
  if (email.analyseIA) {
    try {
      const analysis = JSON.parse(email.analyseIA);
      expediteurNom = analysis.expediteurNom || "";
      expediteurEntreprise = analysis.expediteurEntreprise || "";
    } catch { /* ignore */ }
  }

  if (!expediteurNom) {
    const match = email.expediteur.match(/^([^<]+)\s*</);
    expediteurNom = match ? match[1].trim() : email.expediteur.split("@")[0];
  }

  const emailAddr = extractEmailAddress(email.expediteur);
  const nameParts = expediteurNom.split(" ");
  const prenom = nameParts[0] || expediteurNom;
  const nom = nameParts.slice(1).join(" ") || prenom;

  if (contactType === "prescripteur") {
    const prescripteur = await prisma.prescripteur.create({
      data: {
        prenom,
        nom,
        email: emailAddr,
        type: "partenaire",
        entreprise: expediteurEntreprise || undefined,
        notes: `Créé depuis l'email: "${email.sujet}"`,
        derniereRecommandation: email.dateEnvoi,
      },
    });
    revalidatePath("/emails");
    revalidatePath("/reseau");
    return { success: true, contactId: prescripteur.id, contactName: prescripteur.nom, contactType: "prescripteur" };
  }

  // Client or Prospect
  const statut = contactType === "client" ? "client_actif" : "prospect";
  const client = await prisma.client.create({
    data: {
      raisonSociale: expediteurEntreprise || expediteurNom,
      prenom,
      nom,
      email: emailAddr,
      statut,
      sourceAcquisition: "Email entrant",
      notes: `Créé depuis l'email: "${email.sujet}"`,
      derniereInteraction: email.dateEnvoi,
    },
  });

  await prisma.email.update({
    where: { id: emailId },
    data: { clientId: client.id },
  });

  revalidatePath("/emails");
  revalidatePath("/clients");
  return { success: true, contactId: client.id, contactName: client.raisonSociale, contactType };
}

// ── REGENERATE REPLY via n8n WF09 ──

export async function regenerateReply(emailId: string, instructions?: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email) return { error: "Email non trouvé" };

  const webhookUrl = process.env.N8N_GENERATE_REPLY_URL;
  if (!webhookUrl) return { error: "N8N_GENERATE_REPLY_URL non configuré" };

  try {
    const result = await callN8nWebhook(webhookUrl, { emailId, instructions }, 20000);
    const draftReply = (result as { draftReply?: string }).draftReply;

    if (draftReply) {
      await prisma.email.update({
        where: { id: emailId },
        data: { reponseProposee: draftReply },
      });

      // Update Gmail draft if one exists
      if (email.gmailDraftId) {
        try {
          const { oauth2Client } = await buildAuthedClient(session.user.id);
          const toAddress = extractEmailAddress(email.expediteur);
          await updateGmailDraft(oauth2Client, email.gmailDraftId, toAddress, email.sujet, draftReply, email.threadId);
        } catch (draftErr) {
          console.error("Failed to update Gmail draft:", draftErr);
          // Non-blocking: draft update failure shouldn't fail the whole action
        }
      }
    }

    revalidatePath("/emails");
    return { success: true, draftReply: draftReply || null };
  } catch (err) {
    console.error("regenerateReply error:", err);
    return { error: "Erreur lors de la génération IA. Réessayez." };
  }
}

// ── RATTACHER email à un client existant (alias enrichi de linkEmailToClient) ──

export async function rattacherEmailAuClient(emailId: string, clientId: string) {
  return linkEmailToClient(emailId, clientId);
}

// ── IGNORER un email (marquer comme non-pertinent) ──

export async function ignorerEmail(emailId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  await prisma.email.update({
    where: { id: emailId },
    data: { pertinence: "ignore", actionTraitee: true },
  });

  revalidatePath("/emails");
  return { success: true };
}

// ── AJOUTER UNE NOTE à un email ──

export async function ajouterNoteEmail(emailId: string, note: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  const email = await prisma.email.findUnique({
    where: { id: emailId },
    select: { notes: true },
  });
  if (!email) return { error: "Email non trouvé" };

  const existingNotes = email.notes || "";
  const timestamp = new Date().toLocaleDateString("fr-FR");
  const newNotes = existingNotes
    ? `${existingNotes}\n[${timestamp}] ${note}`
    : `[${timestamp}] ${note}`;

  await prisma.email.update({
    where: { id: emailId },
    data: { notes: newNotes },
  });

  revalidatePath("/emails");
  return { success: true };
}
