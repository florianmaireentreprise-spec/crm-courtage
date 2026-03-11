import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ clients: [], contrats: [], deals: [], prescripteurs: [], emails: [] });
  }

  const [clients, contrats, deals, prescripteurs, emails] = await Promise.all([
    prisma.client.findMany({
      where: {
        OR: [
          { raisonSociale: { contains: q, mode: "insensitive" } },
          { nom: { contains: q, mode: "insensitive" } },
          { prenom: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { ville: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, raisonSociale: true, nom: true, prenom: true, statut: true, ville: true },
      take: 5,
    }),
    prisma.contrat.findMany({
      where: {
        OR: [
          { nomProduit: { contains: q, mode: "insensitive" } },
          { client: { raisonSociale: { contains: q, mode: "insensitive" } } },
        ],
      },
      select: { id: true, typeProduit: true, nomProduit: true, client: { select: { raisonSociale: true } } },
      take: 5,
    }),
    prisma.deal.findMany({
      where: {
        OR: [
          { titre: { contains: q, mode: "insensitive" } },
          { client: { raisonSociale: { contains: q, mode: "insensitive" } } },
        ],
      },
      select: { id: true, titre: true, etape: true, client: { select: { raisonSociale: true } } },
      take: 5,
    }),
    prisma.prescripteur.findMany({
      where: {
        OR: [
          { nom: { contains: q, mode: "insensitive" } },
          { prenom: { contains: q, mode: "insensitive" } },
          { entreprise: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, nom: true, prenom: true, type: true, entreprise: true },
      take: 5,
    }),
    prisma.email.findMany({
      where: {
        OR: [
          { sujet: { contains: q, mode: "insensitive" } },
          { expediteur: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, sujet: true, expediteur: true, dateEnvoi: true },
      take: 5,
    }),
  ]);

  return NextResponse.json({ clients, contrats, deals, prescripteurs, emails });
}
