import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withN8nAuth } from "../../middleware";
import { buildAnalysisPrompt } from "@/lib/email/ai";

async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const emailId = searchParams.get("emailId");

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

  // Gather all context (same as analyzeEmailById in sync.ts)
  const allClients = await prisma.client.findMany({
    select: { id: true, raisonSociale: true, email: true, prenom: true, nom: true },
  });

  let contextData: Parameters<typeof buildAnalysisPrompt>[5] = undefined;

  if (email.clientId) {
    const clientTaches = await prisma.tache.findMany({
      where: { clientId: email.clientId, statut: { in: ["a_faire", "en_cours"] } },
      select: { id: true, titre: true, statut: true, dateEcheance: true },
      orderBy: { dateEcheance: "asc" },
      take: 10,
    });

    const clientContrats = await prisma.contrat.findMany({
      where: { clientId: email.clientId, statut: "actif" },
      select: { id: true, typeProduit: true, nomProduit: true, statut: true },
      take: 10,
    });

    const recentEmails = await prisma.email.findMany({
      where: { clientId: email.clientId, id: { not: emailId } },
      select: { sujet: true, direction: true, dateEnvoi: true },
      orderBy: { dateEnvoi: "desc" },
      take: 5,
    });

    const matchedClient = allClients.find((c) => c.id === email.clientId);

    contextData = {
      clientMatched: matchedClient
        ? { ...matchedClient, taches: clientTaches, contrats: clientContrats }
        : undefined,
      recentEmails,
    };
  }

  const prompt = buildAnalysisPrompt(
    email.sujet,
    email.expediteur,
    email.extrait,
    email.direction,
    allClients,
    contextData,
  );

  return NextResponse.json({ emailId, clientId: email.clientId, expediteur: email.expediteur, sujet: email.sujet, direction: email.direction, prompt });
}

export const GET = withN8nAuth(handler);
