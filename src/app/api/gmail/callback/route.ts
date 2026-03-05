import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { buildOAuth2Client } from "@/lib/gmail";
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

    // Get Gmail email address
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const gmailEmail = userInfo.data.email ?? "inconnu";

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
      },
    });

    return NextResponse.redirect(new URL("/emails?connected=1", baseUrl));
  } catch (err) {
    console.error("Gmail OAuth callback error:", err);
    return NextResponse.redirect(new URL("/emails?error=token_exchange", baseUrl));
  }
}
