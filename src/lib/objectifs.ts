import { prisma } from "@/lib/prisma";
import { differenceInWeeks } from "date-fns";

export type MetricsResult = {
  CA_ANNUEL: { valeur: number; velocite: number };
  NB_CLIENTS: { valeur: number; velocite: number };
  NB_CONTRATS: { valeur: number; velocite: number };
  PIPELINE: { valeur: number; velocite: number };
};

export async function computeMetrics(annee: number): Promise<MetricsResult> {
  const startOfYear = new Date(annee, 0, 1);
  const now = new Date();
  const weeksElapsed = Math.max(1, differenceInWeeks(now, startOfYear));

  const [
    caTotal,
    caThisYear,
    nbClients,
    newClientsThisYear,
    nbContrats,
    newContratsThisYear,
    openDeals,
  ] = await Promise.all([
    prisma.contrat.aggregate({
      _sum: { commissionAnnuelle: true },
      where: { statut: "actif" },
    }),
    prisma.contrat.aggregate({
      _sum: { commissionAnnuelle: true },
      where: { statut: "actif", dateCreation: { gte: startOfYear } },
    }),
    prisma.client.count({ where: { statut: "client_actif" } }),
    prisma.client.count({
      where: { statut: "client_actif", dateCreation: { gte: startOfYear } },
    }),
    prisma.contrat.count({ where: { statut: "actif" } }),
    prisma.contrat.count({
      where: { statut: "actif", dateCreation: { gte: startOfYear } },
    }),
    prisma.deal.findMany({
      where: {
        etape: { notIn: ["SIGNE", "PERDU"] },
        montantEstime: { not: null },
      },
      select: { montantEstime: true, probabilite: true },
    }),
  ]);

  const pipelineValue = openDeals.reduce(
    (sum, d) => sum + (d.montantEstime ?? 0) * ((d.probabilite ?? 50) / 100),
    0
  );

  return {
    CA_ANNUEL: {
      valeur: caTotal._sum.commissionAnnuelle ?? 0,
      velocite: (caThisYear._sum.commissionAnnuelle ?? 0) / weeksElapsed,
    },
    NB_CLIENTS: {
      valeur: nbClients,
      velocite: newClientsThisYear / weeksElapsed,
    },
    NB_CONTRATS: {
      valeur: nbContrats,
      velocite: newContratsThisYear / weeksElapsed,
    },
    PIPELINE: {
      valeur: pipelineValue,
      velocite: pipelineValue / weeksElapsed,
    },
  };
}

export type ForecastResult = {
  weeksRemaining: number | null;
  message: string;
  atteint: boolean;
};

export function computeForecast(
  valeurCible: number,
  valeurActuelle: number,
  velociteParSemaine: number
): ForecastResult {
  if (valeurActuelle >= valeurCible) {
    return { weeksRemaining: 0, message: "🎉 Objectif atteint !", atteint: true };
  }
  const remaining = valeurCible - valeurActuelle;
  if (velociteParSemaine <= 0) {
    return {
      weeksRemaining: null,
      message: "Pas assez de données pour prévoir",
      atteint: false,
    };
  }
  const weeks = Math.ceil(remaining / velociteParSemaine);
  if (weeks <= 1) {
    return { weeksRemaining: weeks, message: "À ce rythme : atteint cette semaine", atteint: false };
  }
  if (weeks <= 12) {
    return { weeksRemaining: weeks, message: `À ce rythme : atteint dans ${weeks} semaines`, atteint: false };
  }
  const months = Math.ceil(weeks / 4.33);
  return {
    weeksRemaining: weeks,
    message: `À ce rythme : atteint dans ~${months} mois`,
    atteint: false,
  };
}
