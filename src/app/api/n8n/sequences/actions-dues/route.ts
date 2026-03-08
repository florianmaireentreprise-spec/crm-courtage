import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withN8nAuth } from "../../middleware";

async function handler() {
  const inscriptions = await prisma.sequenceInscription.findMany({
    where: {
      statut: "en_cours",
      dateProchaineAction: { lte: new Date() },
    },
    include: {
      sequence: {
        select: { id: true, nom: true, etapes: true },
      },
      client: {
        select: {
          id: true,
          raisonSociale: true,
          prenom: true,
          nom: true,
          email: true,
        },
      },
    },
  });

  const result = inscriptions.map((insc) => {
    let etapes: Array<{
      jour: number;
      action: string;
      titre: string;
      type?: string;
      prompt?: string;
    }> = [];
    try {
      etapes = JSON.parse(insc.sequence.etapes);
    } catch {
      etapes = [];
    }

    const etapeCourante = etapes[insc.etapeActuelle] ?? null;

    return {
      inscriptionId: insc.id,
      sequenceId: insc.sequence.id,
      sequenceNom: insc.sequence.nom,
      clientId: insc.client.id,
      clientNom: insc.client.raisonSociale,
      clientEmail: insc.client.email,
      clientPrenom: insc.client.prenom,
      etapeActuelle: insc.etapeActuelle,
      etapeCourante,
      dateProchaineAction: insc.dateProchaineAction,
    };
  });

  return NextResponse.json({ actionsDues: result });
}

export const GET = withN8nAuth(handler);
