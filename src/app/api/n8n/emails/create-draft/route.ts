import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withN8nAuth } from "../../middleware";
import { buildOAuth2Client, createGmailDraft } from "@/lib/email/gmail";
import { extractEmailAddress } from "@/lib/email/sync";

async function handler(req: Request) {
  const body = await req.json();
  const { emailId, replyText } = body as { emailId: string; replyText: string };

  if (!emailId || !replyText) {
    return NextResponse.json({ error: "emailId and replyText are required" }, { status: 400 });
  }

  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  const connection = await prisma.gmailConnection.findFirst({
    where: { userId: email.userId },
  });
  if (!connection) {
    return NextResponse.json({ error: "No Gmail connection for this user" }, { status: 400 });
  }

  try {
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
      await prisma.gmailConnection.update({
        where: { userId: email.userId },
        data: updates,
      });
    });

    const toAddress = extractEmailAddress(email.expediteur);
    const draftId = await createGmailDraft(
      oauth2Client,
      toAddress,
      email.sujet,
      replyText,
      email.threadId,
    );

    await prisma.email.update({
      where: { id: emailId },
      data: {
        gmailDraftId: draftId,
        draftStatut: "brouillon",
        reponseProposee: replyText,
      },
    });

    revalidatePath("/emails");

    return NextResponse.json({ success: true, draftId });
  } catch (err) {
    console.error(`[n8n] Failed to create draft for ${emailId}:`, err);
    return NextResponse.json(
      { error: "Failed to create Gmail draft", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 },
    );
  }
}

export const POST = withN8nAuth(handler);
