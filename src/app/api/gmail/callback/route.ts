import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { buildOAuth2Client, watchGmail } from "@/lib/email/gmail";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXTAUTH_URL!;

  if (error || !code || !userId) {
    return NextResponse.redirect(new URL("/emails?error=oauth_failed", baseUrl));
  }

  try {
    const oauth2Client = buildOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    // Get Gmail email address via Gmail API (we already have gmail.readonly scope)
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const gmailEmail = profile.data.emailAddress ?? "inconnu";

    // Get initial historyId for incremental sync
    const initialHistoryId = profile.data.historyId
      ? String(profile.data.historyId)
      : null;

    // Setup Gmail push notifications (non-blocking)
    let pushExpiry: Date | null = null;
    try {
      if (process.env.GMAIL_PUBSUB_TOPIC) {
        const watch = await watchGmail(oauth2Client);
        pushExpiry = watch.expiration
          ? new Date(Number(watch.expiration))
          : null;
      }
    } catch (watchErr) {
      console.error("Gmail watch setup failed (non-blocking):", watchErr);
    }

    await prisma.gmailConnection.upsert({
      where: { userId },
      create: {
        userId,
        gmailEmail,
        accessToken: tokens.access_token ?? "",
        refreshToken: tokens.refresh_token ?? "",
        tokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : new Date(Date.now() + 3600 * 1000),
        historyId: initialHistoryId,
        pushExpiry,
      },
      update: {
        gmailEmail,
        accessToken: tokens.access_token ?? "",
        refreshToken: tokens.refresh_token
          ? tokens.refresh_token
          : undefined,
        tokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : new Date(Date.now() + 3600 * 1000),
        historyId: initialHistoryId,
        pushExpiry,
      },
    });

    return NextResponse.redirect(new URL("/emails?connected=1", baseUrl));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Gmail OAuth callback error:", message, err);
    return NextResponse.redirect(new URL(`/emails?error=${encodeURIComponent(message)}`, baseUrl));
  }
}
