import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withN8nAuth } from "../../middleware";

async function handler() {
  const clientsAvecDirigeant = await prisma.client.findMany({
    where: {
      statut: "client_actif",
      dirigeant: { isNot: null },
    },
    select: {
      id: true,
      raisonSociale: true,
      dirigeant: { select: { prenom: true, nom: true } },
      contrats: {
        where: { statut: "actif" },
        select: { id: true, typeProduit: true },
      },
    },
  });

  const clients = clientsAvecDirigeant
    .filter((c) => c.contrats.length < 3)
    .map((c) => ({
      clientId: c.id,
      raisonSociale: c.raisonSociale,
      dirigeantNom: c.dirigeant
        ? `${c.dirigeant.prenom} ${c.dirigeant.nom}`
        : null,
      nbContratsActifs: c.contrats.length,
      typesCouverture: c.contrats.map((ct) => ct.typeProduit),
    }));

  return NextResponse.json({ clients });
}

export const GET = withN8nAuth(handler);
