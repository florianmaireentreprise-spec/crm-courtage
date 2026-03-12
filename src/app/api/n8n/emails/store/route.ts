import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withN8nAuth } from "../../middleware";
import {
  matchClientByEmail,
  extractEmailAddress,
  classifyPertinence,
  isExcludedSender,
  isJunkEmail,
} from "@/lib/email/sync";

async function handler(req: Request) {
  const body = await req.json();
  const {
    gmailId,
    threadId,
    sujet,
    expediteur,
    destinataires,
    dateEnvoi,
    extrait,
    direction,
  } = body as {
    gmailId: string;
    threadId: string;
    sujet: string;
    expediteur: string;
    destinataires: string | string[];
    dateEnvoi: string;
    extrait?: string;
    direction: string;
  };

  if (!gmailId || !sujet || !expediteur) {
    return NextResponse.json({ error: "gmailId, sujet, expediteur are required" }, { status: 400 });
  }

  // 1. Check duplicate
  const existing = await prisma.email.findUnique({ where: { gmailId } });
  if (existing) {
    return NextResponse.json({
      emailId: existing.id,
      clientId: existing.clientId,
      direction: existing.direction,
      pertinence: existing.pertinence,
      userId: existing.userId,
    });
  }

  // 2. Find userId (first user with GmailConnection)
  const connection = await prisma.gmailConnection.findFirst();
  if (!connection) {
    return NextResponse.json({ error: "Aucune connexion Gmail" }, { status: 400 });
  }

  // 3. Match client by email
  const contactEmail = direction === "sortant"
    ? (Array.isArray(destinataires) ? destinataires[0] : destinataires)
    : expediteur;
  const clientId = await matchClientByEmail(contactEmail);

  // 4. Classify pertinence
  let { pertinence, scoreRelevance } = classifyPertinence(!!clientId, sujet, extrait ?? null);

  // 5. Filter excluded senders
  if (isExcludedSender(expediteur)) {
    pertinence = "ignore";
  }

  // 6. Deterministic junk pre-filter — skip AI analysis entirely
  // Only applies to emails NOT matched to a known client
  const isJunk = !clientId && isJunkEmail(expediteur, sujet);
  if (isJunk) {
    pertinence = "ignore";
  }

  // 7. Insert into database
  const destStr = Array.isArray(destinataires) ? JSON.stringify(destinataires) : destinataires;

  const email = await prisma.email.create({
    data: {
      userId: connection.userId,
      gmailId,
      threadId: threadId || "",
      sujet,
      expediteur,
      destinataires: destStr,
      dateEnvoi: new Date(dateEnvoi),
      extrait: extrait ?? null,
      direction: direction || "entrant",
      pertinence,
      scoreRelevance,
      clientId,
      analyseStatut: isJunk ? "filtre" : "non_analyse",
      typeEmail: isJunk ? "autre" : null,
    },
  });

  // Update client last interaction
  if (clientId) {
    await prisma.client.update({
      where: { id: clientId },
      data: { derniereInteraction: new Date(dateEnvoi) },
    });
  }

  revalidatePath("/emails");

  return NextResponse.json({
    emailId: email.id,
    clientId,
    direction: email.direction,
    pertinence,
    userId: connection.userId,
    gmailId,
    sujet,
    expediteur,
    destinataires: destStr,
    dateEnvoi,
    extrait: extrait ?? null,
  });
}

export const POST = withN8nAuth(handler);
