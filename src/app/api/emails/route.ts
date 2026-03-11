import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateN8nRequest } from "@/lib/n8n";
import type { CreateEmailBody } from "@/lib/types/n8n-integration";

export async function POST(req: Request) {
  if (!validateN8nRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as CreateEmailBody;

  if (!body.client_id || !body.subject || !body.body) {
    return NextResponse.json(
      { error: "client_id, subject, and body are required" },
      { status: 400 },
    );
  }

  // Verify client exists
  const client = await prisma.client.findUnique({
    where: { id: body.client_id },
    select: { id: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const email = await prisma.email.create({
    data: {
      userId: "system",
      gmailId: `n8n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      threadId: body.thread_id ?? `thread-${Date.now()}`,
      sujet: body.subject,
      expediteur: body.source ?? "n8n",
      destinataires: "",
      dateEnvoi: new Date(),
      extrait: body.body.slice(0, 200),
      direction: "entrant",
      clientId: body.client_id,
      analyseStatut: "non_analyse",
    },
  });

  return NextResponse.json({
    id: email.id,
    client_id: email.clientId,
    subject: email.sujet,
    thread_id: email.threadId,
    created_at: email.dateCreation.toISOString(),
  });
}
