import { NextResponse } from "next/server";
import { buildOAuth2Client } from "@/lib/email/gmail";
import { auth } from "@/lib/auth";

export const GET = auth(function GET(req) {
  const userId = req.auth?.user?.id;
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (!userId) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const oauth2Client = buildOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
    prompt: "consent",
    state: userId,
  });

  return NextResponse.redirect(authUrl);
});
