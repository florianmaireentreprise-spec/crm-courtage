import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withN8nAuth } from "../../middleware";

async function handler(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");
  const threadId = url.searchParams.get("threadId");

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  const taches = await prisma.tache.findMany({
    where: {
      clientId,
      sourceAuto: "email_reponse_attendue",
      statut: { in: ["a_faire", "en_cours"] },
    },
    include: {
      email: { select: { threadId: true, sujet: true } },
    },
  });

  // If threadId provided, prioritize tasks from the same thread
  let sorted = taches;
  if (threadId) {
    sorted = [
      ...taches.filter((t) => t.email?.threadId === threadId),
      ...taches.filter((t) => t.email?.threadId !== threadId),
    ];
  }

  return NextResponse.json({
    taches: sorted.map((t) => ({
      id: t.id,
      titre: t.titre,
      emailId: t.emailId,
      email: t.email ? { threadId: t.email.threadId, sujet: t.email.sujet } : null,
    })),
  });
}

export const GET = withN8nAuth(handler);
