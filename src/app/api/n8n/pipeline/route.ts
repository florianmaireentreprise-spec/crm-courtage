import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withN8nAuth } from "../middleware";

async function handler(req: Request) {
  const url = new URL(req.url);
  const joursInactivite = parseInt(
    url.searchParams.get("joursInactivite") ?? "14",
    10,
  );

  const dateLimite = new Date(
    Date.now() - joursInactivite * 24 * 60 * 60 * 1000,
  );

  const deals = await prisma.deal.findMany({
    where: {
      etape: { notIn: ["PERDU", "DEVELOPPEMENT"] },
      dateMaj: { lt: dateLimite },
    },
    select: {
      id: true,
      titre: true,
      etape: true,
      montantEstime: true,
      produitsCibles: true,
      dateMaj: true,
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
    orderBy: { dateMaj: "asc" },
  });

  const result = deals.map((d) => ({
    dealId: d.id,
    titre: d.titre,
    etape: d.etape,
    montantEstime: d.montantEstime,
    produitsCibles: d.produitsCibles,
    derniereMaj: d.dateMaj,
    joursInactif: Math.floor(
      (Date.now() - d.dateMaj.getTime()) / (1000 * 60 * 60 * 24),
    ),
    clientId: d.client.id,
    clientNom: d.client.raisonSociale,
    clientEmail: d.client.email,
  }));

  return NextResponse.json({ deals: result });
}

export const GET = withN8nAuth(handler);
