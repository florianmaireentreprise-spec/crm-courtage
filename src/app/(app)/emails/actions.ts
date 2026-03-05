"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { buildOAuth2Client, parseGmailMessage } from "@/lib/gmail";
import { buildAnalysisPrompt, parseAIResponse } from "@/lib/ai";
import { google } from "googleapis";
import Anthropic from "@anthropic-ai/sdk";

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

  // Auto-refresh token and save if refreshed
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

export async function syncEmails() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifié" };

  const userId = session.user.id;
  const oauth2Client = await buildAuthedClient(userId);
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Fetch inbox + sent (last 30 messages each)
  const [inbox, sent] = await Promise.all([
    gmail.users.messages.list({ userId: "me", maxResults: 30, labelIds: ["INBOX"] }),
    gmail.users.messages.list({ userId: "me", maxResults: 20, labelIds: ["SENT"] }),
  ]);

  const allMessages = [
    ...(inbox.data.messages ?? []),
    ...(sent.data.messages ?? []),
  ];

  let newCount = 0;
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
    await prisma.email.create({
      data: { ...parsed, userId },
    });
    newCount++;
  }

  revalidatePath("/emails");
  return { success: true, newCount };
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
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const firstBlock = response.content[0];
    const rawText = firstBlock.type === "text" ? firstBlock.text : "";
    const result = parseAIResponse(rawText);

    // Create Tache for each action item
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
