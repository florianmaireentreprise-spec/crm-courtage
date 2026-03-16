import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withN8nAuth } from "../../middleware";

async function handler(req: Request) {
  const url = new URL(req.url);
  const mois = parseInt(url.searchParams.get("mois") ?? "6", 10);

  const dateLimite = new Date();
  dateLimite.setMonth(dateLimite.getMonth() - mois);

  const clientsActifs = await prisma.client.findMany({
    where: { statut: "client_actif", archived: false },
    select: {
      id: true,
      raisonSociale: true,
      email: true,
      taches: {
        where: { dateCreation: { gte: dateLimite } },
        select: { id: true },
        take: 1,
      },
      contrats: {
        where: { dateCreation: { gte: dateLimite } },
        select: { id: true },
        take: 1,
      },
    },
  });

  const clients = clientsActifs
    .filter((c) => c.taches.length === 0 && c.contrats.length === 0)
    .map((c) => ({
      clientId: c.id,
      raisonSociale: c.raisonSociale,
      email: c.email,
    }));

  return NextResponse.json({ clients });
}

export const GET = withN8nAuth(handler);
