import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateN8nRequest } from "@/lib/n8n";
import type { CreateEmailAnalysisBody } from "@/lib/types/n8n-integration";

export async function POST(req: Request) {
  if (!validateN8nRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as CreateEmailAnalysisBody;

  if (!body.email_id || !body.action) {
    return NextResponse.json(
      { error: "email_id and action are required" },
      { status: 400 },
    );
  }

  // Verify email exists
  const email = await prisma.email.findUnique({
    where: { id: body.email_id },
    select: { id: true },
  });

  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  const analysis = await prisma.emailAnalysis.create({
    data: {
      emailId: body.email_id,
      action: body.action,
      priority: body.priority ?? "normale",
      summary: body.summary ?? null,
      replySuggestion: body.reply_suggestion ?? null,
    },
  });

  return NextResponse.json({
    id: analysis.id,
    email_id: analysis.emailId,
    action: analysis.action,
    priority: analysis.priority,
    summary: analysis.summary,
    reply_suggestion: analysis.replySuggestion,
    created_at: analysis.dateCreation.toISOString(),
  });
}
