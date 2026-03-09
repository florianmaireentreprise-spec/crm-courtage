import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withN8nAuth } from "../../middleware";

async function handler(req: Request) {
  const url = new URL(req.url);
  const filtre = url.searchParams.get("filtre");

  if (!filtre) {
    return NextResponse.json(
      { error: "filtre query param is required (SANTE_COLLECTIVE, SANS_PER, PER_OU_AV)" },
      { status: 400 },
    );
  }

  let clients: { id: string; raisonSociale: string }[] = [];

  if (filtre === "SANTE_COLLECTIVE") {
    clients = await prisma.client.findMany({
      where: {
        statut: "client_actif",
        contrats: {
          some: { typeProduit: "SANTE_COLLECTIVE", statut: "actif" },
        },
      },
      select: { id: true, raisonSociale: true },
    });
  } else if (filtre === "SANS_PER") {
    clients = await prisma.client.findMany({
      where: {
        statut: "client_actif",
        contrats: { none: { typeProduit: "PER", statut: "actif" } },
      },
      select: { id: true, raisonSociale: true },
    });
  } else if (filtre === "PER_OU_AV") {
    clients = await prisma.client.findMany({
      where: {
        statut: "client_actif",
        contrats: {
          some: {
            typeProduit: { in: ["PER", "ASSURANCE_VIE"] },
            statut: "actif",
          },
        },
      },
      select: { id: true, raisonSociale: true },
    });
  } else {
    return NextResponse.json(
      { error: `Unknown filtre: ${filtre}` },
      { status: 400 },
    );
  }

  return NextResponse.json({
    clients: clients.map((c) => ({
      clientId: c.id,
      raisonSociale: c.raisonSociale,
    })),
  });
}

export const GET = withN8nAuth(handler);
