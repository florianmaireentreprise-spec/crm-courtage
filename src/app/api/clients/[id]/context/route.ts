import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateN8nRequest } from "@/lib/n8n";
import type { ClientContextResponse } from "@/lib/types/n8n-integration";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!validateN8nRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    select: {
      id: true,
      notes: true,
      emails: {
        select: {
          id: true,
          sujet: true,
          expediteur: true,
          dateEnvoi: true,
          direction: true,
        },
        orderBy: { dateEnvoi: "desc" },
        take: 10,
      },
      taches: {
        where: { statut: { in: ["a_faire", "en_cours"] } },
        select: {
          id: true,
          titre: true,
          priorite: true,
          statut: true,
          dateEcheance: true,
        },
        orderBy: { dateEcheance: "asc" },
        take: 20,
      },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const response: ClientContextResponse = {
    recent_emails: client.emails.map((e) => ({
      id: e.id,
      subject: e.sujet,
      from: e.expediteur,
      date: e.dateEnvoi.toISOString(),
      direction: e.direction,
    })),
    open_tasks: client.taches.map((t) => ({
      id: t.id,
      title: t.titre,
      priority: t.priorite,
      status: t.statut,
      due_date: t.dateEcheance?.toISOString() ?? null,
    })),
    notes: client.notes,
  };

  return NextResponse.json(response);
}
