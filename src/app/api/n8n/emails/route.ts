import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withN8nAuth } from "../middleware";
import { matchClientByEmail } from "@/lib/email/sync";

// POST /api/n8n/emails — Store analysis result from n8n WF05v2
async function handler(req: Request) {
  const body = await req.json();
  const { emailId } = body as { emailId: string };

  if (!emailId) {
    return NextResponse.json({ error: "emailId is required" }, { status: 400 });
  }

  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  const {
    type, urgence, resume, sentiment, actionRequise, actionSuggeree,
    draftReply, clientMatch, produitsMentionnes, expediteurNom,
    expediteurEntreprise, contratMentionne,
  } = body as {
    type?: string; urgence?: string; resume?: string; sentiment?: string;
    actionRequise?: boolean; actionSuggeree?: string; draftReply?: string;
    clientMatch?: { found: boolean; clientId?: string; clientName?: string; confidence?: string };
    produitsMentionnes?: string[]; expediteurNom?: string;
    expediteurEntreprise?: string; contratMentionne?: string;
  };

  let resolvedClientId = email.clientId;
  if (clientMatch?.clientId) {
    resolvedClientId = clientMatch.clientId;
  } else if (!resolvedClientId) {
    resolvedClientId = await matchClientByEmail(email.expediteur);
  }

  await prisma.email.update({
    where: { id: emailId },
    data: {
      resume: resume ?? null,
      typeEmail: type ?? null,
      urgence: urgence ?? null,
      sentiment: sentiment ?? null,
      actionRequise: actionRequise ?? false,
      actionTraitee: false,
      reponseProposee: draftReply ?? null,
      analyseStatut: "analyse",
      clientId: resolvedClientId,
      analyseIA: JSON.stringify(body),
      produitsMentionnes: produitsMentionnes?.length ? JSON.stringify(produitsMentionnes) : null,
      actionsItems: actionSuggeree ? JSON.stringify([actionSuggeree]) : null,
    },
  });

  if (resolvedClientId) {
    await prisma.client.update({
      where: { id: resolvedClientId },
      data: { derniereInteraction: new Date() },
    });
  }

  revalidatePath("/emails");
  revalidatePath("/relances");
  revalidatePath("/clients");

  return NextResponse.json({ success: true, emailId, clientId: resolvedClientId, type: type ?? "autre" });
}

export const POST = withN8nAuth(handler);
