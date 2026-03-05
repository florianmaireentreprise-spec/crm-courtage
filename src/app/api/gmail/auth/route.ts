import { NextResponse } from "next/server";
import { buildOAuth2Client } from "@/lib/gmail";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL!));
  }

  const oauth2Client = buildOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
    prompt: "consent",
    state: session.user.id,
  });

  return NextResponse.redirect(authUrl);
}
