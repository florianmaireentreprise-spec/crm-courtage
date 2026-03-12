import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withN8nAuth } from "../../middleware";

// POST /api/n8n/emails/status — Update email analysis status (used for error reporting)
// n8n calls this when AI analysis fails to mark the email as "erreur"
async function handler(req: Request) {
  const body = await req.json();
  const { emailId, status, error } = body as {
    emailId: string;
    status: "erreur" | "non_analyse";
    error?: string;
  };

  if (!emailId || !status) {
    return NextResponse.json(
      { error: "emailId and status are required" },
      { status: 400 },
    );
  }

  if (!["erreur", "non_analyse"].includes(status)) {
    return NextResponse.json(
      { error: "status must be 'erreur' or 'non_analyse'" },
      { status: 400 },
    );
  }

  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  await prisma.email.update({
    where: { id: emailId },
    data: {
      analyseStatut: status,
      ...(error ? { analyseIA: JSON.stringify({ lastError: error, errorAt: new Date().toISOString() }) } : {}),
    },
  });

  return NextResponse.json({ success: true, emailId, status });
}

export const POST = withN8nAuth(handler);
