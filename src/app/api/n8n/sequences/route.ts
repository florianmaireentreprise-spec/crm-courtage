import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withN8nAuth } from "../middleware";

async function handler(req: Request) {
  const body = await req.json();

  const { inscriptionId, etapeIndex, emailSujet, emailEnvoyeAt } = body as {
    inscriptionId: string;
    etapeIndex: number;
    emailSujet?: string;
    emailEnvoyeAt?: string;
  };

  if (!inscriptionId || etapeIndex === undefined) {
    return NextResponse.json(
      { error: "inscriptionId and etapeIndex are required" },
      { status: 400 },
    );
  }

  const inscription = await prisma.sequenceInscription.findUnique({
    where: { id: inscriptionId },
    include: { sequence: true },
  });

  if (!inscription) {
    return NextResponse.json(
      { error: "SequenceInscription not found" },
      { status: 404 },
    );
  }

  // Parse sequence steps
  let etapes: Array<{ jour: number }> = [];
  try {
    etapes = JSON.parse(inscription.sequence.etapes);
  } catch {
    etapes = [];
  }

  const nextEtape = etapeIndex + 1;
  const isTerminated = nextEtape >= etapes.length;

  // Calculate next action date
  let dateProchaineAction: Date | null = null;
  if (!isTerminated && etapes[nextEtape]) {
    const joursDepuisInscription = etapes[nextEtape].jour;
    dateProchaineAction = new Date(inscription.dateInscription);
    dateProchaineAction.setDate(
      dateProchaineAction.getDate() + joursDepuisInscription,
    );
  }

  await prisma.sequenceInscription.update({
    where: { id: inscriptionId },
    data: {
      etapeActuelle: nextEtape,
      statut: isTerminated ? "terminee" : "en_cours",
      dateProchaineAction,
    },
  });

  return NextResponse.json({
    success: true,
    inscriptionId,
    nextEtape,
    terminated: isTerminated,
    emailSujet: emailSujet ?? null,
    emailEnvoyeAt: emailEnvoyeAt ?? null,
  });
}

export const POST = withN8nAuth(handler);
