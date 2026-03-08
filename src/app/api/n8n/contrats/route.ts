import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withN8nAuth } from "../middleware";

async function handler(req: Request) {
  const url = new URL(req.url);
  const joursAvant = parseInt(url.searchParams.get("joursAvant") ?? "60", 10);

  const dateLimite = new Date(Date.now() + joursAvant * 24 * 60 * 60 * 1000);

  const contrats = await prisma.contrat.findMany({
    where: {
      statut: "actif",
      dateEcheance: {
        lte: dateLimite,
        gte: new Date(),
      },
    },
    select: {
      id: true,
      typeProduit: true,
      nomProduit: true,
      dateEcheance: true,
      primeAnnuelle: true,
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
    orderBy: { dateEcheance: "asc" },
  });

  const result = contrats.map((c) => ({
    contratId: c.id,
    clientId: c.client.id,
    clientNom: c.client.raisonSociale,
    clientEmail: c.client.email,
    typeProduit: c.typeProduit,
    nomProduit: c.nomProduit,
    dateEcheance: c.dateEcheance,
    primeAnnuelle: c.primeAnnuelle,
    joursRestants: c.dateEcheance
      ? Math.floor(
          (c.dateEcheance.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        )
      : null,
  }));

  return NextResponse.json({ contrats: result });
}

export const GET = withN8nAuth(handler);
