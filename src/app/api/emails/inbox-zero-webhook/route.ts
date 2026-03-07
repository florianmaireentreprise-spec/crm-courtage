import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeEmailById } from "@/lib/email/sync";
import { buildOAuth2Client, extractBodyText } from "@/lib/email/gmail";
import { google } from "googleapis";

// ── Types ──

interface FlatPayload {
  from: string;
  subject: string;
  body?: string;
  messageId: string;
  threadId: string;
  label?: string;
  date?: string;
}

interface InboxZeroWebhookPayload {
  email: {
    from: string;
    subject: string;
    messageId: string;
    threadId: string;
    to?: string;
    cc?: string;
    bcc?: string;
    date?: string;
    headerMessageId?: string;
  };
  executedRule?: {
    id: string;
    name?: string;
    actions?: Array<{ type: string }>;
  };
}

interface NormalizedEmail {
  from: string;
  subject: string;
  body: string;
  messageId: string;
  threadId: string;
  to: string;
  label: string | null;
  date: string | null;
}

// ── Helpers ──

function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).toLowerCase().trim();
}

function extractSenderName(from: string): string {
  const match = from.match(/^([^<]+)\s*</);
  if (match) return match[1].trim();
  const emailMatch = from.match(/^([^@]+)@/);
  return emailMatch ? emailMatch[1] : from;
}

const INSURANCE_KEYWORDS = [
  "contrat", "police", "sinistre", "devis", "cotisation", "prime",
  "mutuelle", "prévoyance", "santé", "retraite", "assurance",
  "courtage", "résiliation", "avenant", "souscription", "adhésion",
  "garantie", "attestation", "rcpro", "protection juridique", "madelin",
];

function classifyPertinence(
  hasClient: boolean,
  sujet: string,
  extrait: string | null,
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

// ── Auth — accepts both header formats ──

function verifyAuth(req: NextRequest): boolean {
  const secret = process.env.INBOX_ZERO_WEBHOOK_SECRET;
  if (!secret) return false;

  // Format 1: Authorization: Bearer <token> (legacy / direct test)
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token === secret) return true;
  }

  // Format 2: X-Webhook-Secret: <token> (Inbox Zero native format)
  const webhookSecret = req.headers.get("x-webhook-secret");
  if (webhookSecret === secret) return true;

  return false;
}

// ── Normalize payload — auto-detect format ──

function normalizePayload(raw: Record<string, unknown>): NormalizedEmail | null {
  // Detect Inbox Zero format: nested { email: {...}, executedRule: {...} }
  if (raw.email && typeof raw.email === "object") {
    const payload = raw as unknown as InboxZeroWebhookPayload;
    const e = payload.email;
    if (!e.from || !e.subject || !e.messageId || !e.threadId) return null;

    return {
      from: e.from,
      subject: e.subject,
      body: "", // Inbox Zero does NOT send the email body
      messageId: e.messageId,
      threadId: e.threadId,
      to: e.to ?? "",
      label: null,
      date: e.date ?? null,
    };
  }

  // Flat format (legacy / direct test)
  const payload = raw as unknown as FlatPayload;
  if (!payload.from || !payload.subject || !payload.messageId || !payload.threadId) return null;

  return {
    from: payload.from,
    subject: payload.subject,
    body: payload.body ?? "",
    messageId: payload.messageId,
    threadId: payload.threadId,
    to: "",
    label: payload.label ?? null,
    date: payload.date ?? null,
  };
}

// ── Fetch email body via Gmail API (if OAuth connected) ──

async function fetchEmailBody(
  userId: string,
  gmailMessageId: string,
): Promise<string | null> {
  try {
    const connection = await prisma.gmailConnection.findFirst({
      where: { userId },
    });
    if (!connection) return null;

    const oauth2Client = buildOAuth2Client();
    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
      expiry_date: connection.tokenExpiry.getTime(),
    });

    oauth2Client.on("tokens", async (tokens) => {
      const updates: Record<string, unknown> = {
        tokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : connection.tokenExpiry,
      };
      if (tokens.access_token) updates.accessToken = tokens.access_token;
      if (tokens.refresh_token) updates.refreshToken = tokens.refresh_token;
      await prisma.gmailConnection.update({ where: { userId }, data: updates });
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const msg = await gmail.users.messages.get({
      userId: "me",
      id: gmailMessageId,
      format: "full",
    });

    if (msg.data.payload) {
      return extractBodyText(msg.data.payload) || null;
    }
    return null;
  } catch (err) {
    console.error("[webhook] Gmail body fetch failed:", err);
    return null;
  }
}

// ── GET healthcheck ──

export async function GET() {
  return NextResponse.json({ status: "ok", service: "inbox-zero-webhook" });
}

// ── POST webhook ──

export async function POST(req: NextRequest) {
  // 1. Auth
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse & normalize payload
  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const emailData = normalizePayload(raw);
  if (!emailData) {
    return NextResponse.json(
      { error: "Missing required fields: from, subject, messageId, threadId" },
      { status: 400 },
    );
  }

  // 3. Deduplicate by gmailId
  const existing = await prisma.email.findUnique({
    where: { gmailId: emailData.messageId },
  });
  if (existing) {
    return NextResponse.json({ status: "duplicate", emailId: existing.id });
  }

  // 4. Resolve userId
  const userId = process.env.DEFAULT_USER_ID;
  if (!userId) {
    return NextResponse.json(
      { error: "DEFAULT_USER_ID not configured" },
      { status: 500 },
    );
  }

  // 5. Match client by sender email
  const senderAddr = extractEmailAddress(emailData.from);
  const client = await prisma.client.findFirst({
    where: {
      OR: [
        { email: { equals: senderAddr, mode: "insensitive" } },
        { email: { contains: senderAddr.split("@")[0], mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  const matchedClientId = client?.id ?? null;

  // 6. If no body from payload, try fetching via Gmail API
  let body = emailData.body;
  let bodyFetched = false;
  if (!body) {
    const fetched = await fetchEmailBody(userId, emailData.messageId);
    if (fetched) {
      body = fetched;
      bodyFetched = true;
    }
  }

  const extrait = body ? body.substring(0, 2000) : null;

  // 7. Classify
  const { pertinence, scoreRelevance } = classifyPertinence(
    !!matchedClientId,
    emailData.subject,
    extrait,
  );

  // 8. Create email in DB
  const email = await prisma.email.create({
    data: {
      userId,
      gmailId: emailData.messageId,
      threadId: emailData.threadId,
      sujet: emailData.subject,
      expediteur: emailData.from,
      destinataires: emailData.to,
      dateEnvoi: emailData.date ? new Date(emailData.date) : new Date(),
      extrait,
      direction: "entrant",
      pertinence,
      scoreRelevance,
      clientId: matchedClientId,
      analyseStatut: extrait ? "pending" : "non_analyse",
    },
  });

  // 9. Update client last interaction
  if (matchedClientId) {
    await prisma.client.update({
      where: { id: matchedClientId },
      data: { derniereInteraction: email.dateEnvoi },
    });
  }

  // 10. Create urgent task if label "Urgent"
  if (emailData.label?.toLowerCase() === "urgent") {
    const senderName = extractSenderName(emailData.from);
    const tomorrow9am = new Date();
    tomorrow9am.setDate(tomorrow9am.getDate() + 1);
    tomorrow9am.setHours(9, 0, 0, 0);

    await prisma.tache.create({
      data: {
        titre: `URGENT — ${senderName} : ${emailData.subject}`,
        type: "RELANCE_PROSPECT",
        priorite: "haute",
        dateEcheance: tomorrow9am,
        clientId: matchedClientId,
        emailId: email.id,
        autoGenerated: true,
        sourceAuto: "auto_email_ia",
      },
    });
  }

  // 11. Increment prescripteur counter if label "Prescripteur"
  if (emailData.label?.toLowerCase() === "prescripteur") {
    const prescripteur = await prisma.prescripteur.findFirst({
      where: { email: { equals: senderAddr, mode: "insensitive" } },
      select: { id: true },
    });

    if (prescripteur) {
      await prisma.prescripteur.update({
        where: { id: prescripteur.id },
        data: {
          dossiersEnvoyes: { increment: 1 },
          derniereRecommandation: new Date(),
        },
      });
    }
  }

  // 12. Trigger AI analysis in background if we have content
  if (extrait) {
    analyzeEmailById(email.id).catch((err) => {
      console.error(`[webhook] AI analysis failed for ${email.id}:`, err);
    });
  }

  return NextResponse.json({
    status: "created",
    emailId: email.id,
    clientMatched: !!matchedClientId,
    label: emailData.label ?? null,
    bodyFetched,
  });
}
