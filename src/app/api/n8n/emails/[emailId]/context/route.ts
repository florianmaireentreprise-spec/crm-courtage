import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withN8nAuth } from "../../../middleware";

async function handler(req: Request) {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  // Extract emailId from URL: /api/n8n/emails/[emailId]/context
  const emailIdIndex = segments.indexOf("emails") + 1;
  const emailId = segments[emailIdIndex];

  if (!emailId) {
    return NextResponse.json({ error: "emailId is required" }, { status: 400 });
  }

  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: { client: true },
  });

  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  let client = null;
  let openTasks: { titre: string; type: string; dateEcheance: Date }[] = [];

  if (email.clientId) {
    client = await prisma.client.findUnique({
      where: { id: email.clientId },
      include: { contrats: true, deals: true },
    });

    openTasks = await prisma.tache.findMany({
      where: {
        clientId: email.clientId,
        statut: { in: ["a_faire", "en_cours"] },
      },
      select: { titre: true, type: true, dateEcheance: true },
    });
  }

  // Recent emails from the same thread
  const recentEmails = await prisma.email.findMany({
    where: { threadId: email.threadId },
    orderBy: { dateEnvoi: "desc" },
    take: 5,
    select: { sujet: true, direction: true, dateEnvoi: true, extrait: true },
  });

  return NextResponse.json({
    email: {
      sujet: email.sujet,
      expediteur: email.expediteur,
      extrait: email.extrait,
      direction: email.direction,
      threadId: email.threadId,
    },
    client,
    recentEmails,
    openTasks,
    previousReply: email.reponseProposee,
  });
}

export const GET = withN8nAuth(handler);
