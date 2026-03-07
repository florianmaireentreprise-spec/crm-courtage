import { NextResponse } from "next/server";
import { buildOAuth2Client } from "@/lib/email/gmail";
import { auth } from "@/lib/auth";
import { GMAIL_SCOPES } from "@/app/(app)/emails/actions";

export const GET = auth(function GET(req) {
  const userId = req.auth?.user?.id;
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (!userId) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const oauth2Client = buildOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: GMAIL_SCOPES,
    prompt: "consent",
    state: userId,
  });

  return NextResponse.redirect(authUrl);
});
