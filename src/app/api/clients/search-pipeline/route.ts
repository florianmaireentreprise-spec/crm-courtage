import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    if (q.length < 2) {
      return NextResponse.json([]);
    }

    const clients = await prisma.client.findMany({
      where: {
        archived: false,
        OR: [
          { raisonSociale: { contains: q, mode: "insensitive" } },
          { nom: { contains: q, mode: "insensitive" } },
          { prenom: { contains: q, mode: "insensitive" } },
          { ville: { contains: q, mode: "insensitive" } },
          { secteurActivite: { contains: q, mode: "insensitive" } },
          { siret: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        raisonSociale: true,
        civilite: true,
        prenom: true,
        nom: true,
        formeJuridique: true,
        secteurActivite: true,
        nbSalaries: true,
        chiffreAffaires: true,
        ville: true,
        statut: true,
        scoreProspect: true,
        temperatureCommerciale: true,
        potentielCA: true,
        _count: {
          select: {
            deals: { where: { etape: { notIn: ["PERDU"] } } },
            contrats: { where: { statut: "actif" } },
          },
        },
      },
      orderBy: [{ scoreProspect: "desc" }, { raisonSociale: "asc" }],
      take: 15,
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error("[GET /api/clients/search-pipeline]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
