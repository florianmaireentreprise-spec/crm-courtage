import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withN8nAuth } from "../../middleware";

async function handler(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      contrats: {
        where: { statut: "actif" },
        select: {
          id: true,
          typeProduit: true,
          nomProduit: true,
          statut: true,
          primeAnnuelle: true,
          dateEcheance: true,
        },
      },
      deals: {
        where: { etape: { notIn: ["PERDU"] } },
        select: {
          id: true,
          titre: true,
          etape: true,
          montantEstime: true,
          produitsCibles: true,
          dateMaj: true,
        },
      },
      taches: {
        where: { statut: { in: ["a_faire", "en_cours"] } },
        select: {
          id: true,
          titre: true,
          type: true,
          priorite: true,
          statut: true,
          dateEcheance: true,
        },
        orderBy: { dateEcheance: "asc" },
        take: 20,
      },
      dirigeant: {
        select: {
          id: true,
          prenom: true,
          nom: true,
          email: true,
          telephone: true,
          statutProfessionnel: true,
        },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({ client });
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withN8nAuth((r) => handler(r, context))(req);
}
