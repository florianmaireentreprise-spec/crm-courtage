import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withN8nAuth } from "../middleware";

async function handler() {
  const now = new Date();
  const debutSemaine = new Date(now);
  debutSemaine.setDate(now.getDate() - now.getDay() + 1); // Lundi
  debutSemaine.setHours(0, 0, 0, 0);

  const dans15j = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

  const [
    nouveauxProspects,
    dealsSgines,
    caRecurrent,
    tachesCompletees,
    tachesEnRetard,
    renouvellements,
    prescripteursActifs,
  ] = await Promise.all([
    // Nouveaux prospects cette semaine
    prisma.client.count({
      where: {
        statut: "prospect",
        dateCreation: { gte: debutSemaine },
      },
    }),
    // Deals signés cette semaine
    prisma.deal.count({
      where: {
        etape: "SIGNATURE",
        dateSignature: { gte: debutSemaine },
      },
    }),
    // CA récurrent actuel (somme commissions)
    prisma.contrat.aggregate({
      where: { statut: "actif" },
      _sum: { commissionAnnuelle: true },
    }),
    // Tâches complétées cette semaine
    prisma.tache.count({
      where: {
        statut: "terminee",
        dateRealisation: { gte: debutSemaine },
      },
    }),
    // Tâches en retard
    prisma.tache.count({
      where: {
        statut: { in: ["a_faire", "en_cours"] },
        dateEcheance: { lt: now },
      },
    }),
    // Renouvellements sous 15 jours
    prisma.contrat.count({
      where: {
        statut: "actif",
        dateEcheance: { lte: dans15j, gte: now },
      },
    }),
    // Prescripteurs actifs (avec activité cette semaine)
    prisma.prescripteur.count({
      where: {
        statut: "actif",
        derniereRecommandation: { gte: debutSemaine },
      },
    }),
  ]);

  return NextResponse.json({
    kpis: {
      nouveauxProspectsCetteSemaine: nouveauxProspects,
      dealsSignesCetteSemaine: dealsSgines,
      caRecurrentActuel: caRecurrent._sum.commissionAnnuelle ?? 0,
      tachesCompleteesCetteSemaine: tachesCompletees,
      tachesEnRetard,
      renouvellementsSous15j: renouvellements,
      prescripteursActifs,
    },
    generatedAt: now.toISOString(),
  });
}

export const GET = withN8nAuth(handler);
