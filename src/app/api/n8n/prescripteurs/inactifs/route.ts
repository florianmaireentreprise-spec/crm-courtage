import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withN8nAuth } from "../../middleware";

async function handler(req: Request) {
  const url = new URL(req.url);
  const semaines = parseInt(url.searchParams.get("semaines") ?? "8", 10);

  const dateLimite = new Date(
    Date.now() - semaines * 7 * 24 * 60 * 60 * 1000,
  );

  const prescripteurs = await prisma.prescripteur.findMany({
    where: {
      statut: "actif",
      OR: [
        { derniereRecommandation: null },
        { derniereRecommandation: { lt: dateLimite } },
      ],
    },
    select: {
      id: true,
      prenom: true,
      nom: true,
      entreprise: true,
      email: true,
      derniereRecommandation: true,
    },
  });

  const result = prescripteurs.map((p) => ({
    prescripteurId: p.id,
    prenom: p.prenom,
    nom: p.nom,
    entreprise: p.entreprise,
    email: p.email,
    derniereRecommandation: p.derniereRecommandation,
    joursDepuis: p.derniereRecommandation
      ? Math.floor(
          (Date.now() - p.derniereRecommandation.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null,
  }));

  return NextResponse.json({ prescripteurs: result });
}

export const GET = withN8nAuth(handler);
