import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";
import { buildOAuth2Client, parseGmailMessage, getNewMessageIds } from "@/lib/email/gmail";
import { revalidatePath } from "next/cache";

// POST /api/gmail/push - Gmail Pub/Sub push notification receiver
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pubsubMessage = body.message;
    if (!pubsubMessage?.data) {
      return NextResponse.json({ error: "Invalid push" }, { status: 400 });
    }

    const decoded = JSON.parse(
      Buffer.from(pubsubMessage.data, "base64").toString("utf-8"),
    );
    const { emailAddress, historyId } = decoded as {
      emailAddress?: string;
      historyId?: string;
    };

    if (!emailAddress || !historyId) return NextResponse.json({ ok: true });

    const connection = await prisma.gmailConnection.findFirst({
      where: { gmailEmail: emailAddress },
    });
    if (!connection) return NextResponse.json({ ok: true });

    if (!connection.historyId) {
      await prisma.gmailConnection.update({
        where: { id: connection.id },
        data: { historyId },
      });
      return NextResponse.json({ ok: true });
    }

    const oauth2Client = buildOAuth2Client();
    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
      expiry_date: connection.tokenExpiry.getTime(),
    });

    oauth2Client.on("tokens", async (tokens) => {
      const updates: Record<string, unknown> = {};
      if (tokens.expiry_date) updates.tokenExpiry = new Date(tokens.expiry_date);
      if (tokens.access_token) updates.accessToken = tokens.access_token;
      if (tokens.refresh_token) updates.refreshToken = tokens.refresh_token;
      if (Object.keys(updates).length) {
        await prisma.gmailConnection.update({ where: { id: connection.id }, data: updates });
      }
    });

    const { messageIds, newHistoryId } = await getNewMessageIds(
      oauth2Client,
      connection.historyId,
    );

    await prisma.gmailConnection.update({
      where: { id: connection.id },
      data: { historyId: newHistoryId },
    });

    if (messageIds.length === 0) {
      return NextResponse.json({ ok: true, newMessages: 0 });
    }

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const gmailAddr = connection.gmailEmail.toLowerCase();
    let newCount = 0;

    for (const msgId of messageIds) {
      const existing = await prisma.email.findUnique({ where: { gmailId: msgId } });
      if (existing) continue;

      try {
        const full = await gmail.users.messages.get({ userId: "me", id: msgId, format: "full" });
        const parsed = parseGmailMessage(full.data);
        const senderAddr = extractEmailAddress(parsed.expediteur).toLowerCase();
        const direction = senderAddr === gmailAddr ? "sortant" : "entrant";

        const clientId = await matchClientByEmail(
          direction === "sortant" ? parsed.destinataires : parsed.expediteur,
        );

        const preType = preClassifyNonCommercial(parsed.expediteur);

        const email = await prisma.email.create({
          data: {
            ...parsed,
            userId: connection.userId,
            clientId,
            direction,
            pertinence: clientId ? "client" : "normal",
            scoreRelevance: clientId ? 50 : 0,
            ...(preType ? { typeEmail: preType, analyseStatut: "analyse" } : {}),
          },
        });

        if (clientId) {
          await prisma.client.update({
            where: { id: clientId },
            data: { derniereInteraction: parsed.dateEnvoi },
          });
        }

        if (direction === "sortant") {
          autoCloseReplyTasks(parsed);
        }

        if (!preType) {
          triggerAnalysis(email.id, parsed);
        }

        newCount++;
      } catch (err) {
        console.error("[gmail-push] Error processing message:", msgId, err);
      }
    }

    revalidatePath("/emails");
    revalidatePath("/relances");
    return NextResponse.json({ ok: true, newMessages: newCount });
  } catch (err) {
    console.error("[gmail-push] Error:", err);
    return NextResponse.json({ ok: true, error: "Internal error" });
  }
}

function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).toLowerCase().trim();
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

async function matchClientByEmail(emailOrJson: string): Promise<string | null> {
  const addr = extractEmailAddress(emailOrJson);
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

async function autoCloseReplyTasks(parsed: { destinataires: string; dateEnvoi: Date }) {
  try {
    const destAddresses = JSON.parse(parsed.destinataires).map(
      (d: string) => extractEmailAddress(d).toLowerCase(),
    );
    const openTasks = await prisma.tache.findMany({
      where: { sourceAuto: "email_reponse_attendue", statut: { in: ["a_faire", "en_cours"] } },
      select: { id: true, titre: true },
    });
    for (const task of openTasks) {
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

function triggerAnalysis(
  emailId: string,
  parsed: { sujet: string; expediteur: string; extrait: string | null },
) {
  const webhookBase = process.env.N8N_WEBHOOK_URL;
  if (!webhookBase) return;

  const url =
    (webhookBase.endsWith("/") ? webhookBase.slice(0, -1) : webhookBase) +
    "/webhook/email.received";

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-n8n-secret": process.env.N8N_WEBHOOK_SECRET ?? "",
    },
    body: JSON.stringify({
      emailId,
      sujet: parsed.sujet,
      expediteur: parsed.expediteur,
      direction: "entrant",
      extrait: parsed.extrait,
    }),
    signal: AbortSignal.timeout(30000),
  }).catch((err) => {
    console.error("[gmail-push] WF05v2 trigger error:", err);
  });
}
