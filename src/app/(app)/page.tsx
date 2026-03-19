export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { detecterOpportunites } from "@/lib/scoring/opportunities";
import { calculerScoreProspect } from "@/lib/scoring/prospect";
import { calculerPotentielCA } from "@/lib/scoring/potentiel";
import { ETAPES_PIPELINE } from "@/lib/constants";
import { getCampagnesActives } from "@/lib/constants";
import { detecterPrescripteursARelancer } from "@/lib/prescripteurs";
import { computeMetrics } from "@/lib/objectifs";
import { auth } from "@/lib/auth";

async function getDashboardData() {
  try {
    return await getDashboardDataInternal();
  } catch (err) {
    console.error("Erreur chargement dashboard:", err);
    return getEmptyDashboard();
  }
}

function getEmptyDashboard() {
  return {
    kpis: {
      caRecurrentMensuel: 0, caRecurrentAnnuel: 0, nbClientsActifs: 0,
      nbContratsActifs: 0, pipelineEnCours: 0, nbTachesEnRetard: 0,
      nbPrescripteurs: 0, nbDirigeants: 0, panierMoyen: 0,
      tauxMultiEquipement: "0", contratsARenouveler30j: 0, totalPotentiel: 0,
      sequencesActives: 0,
    },
    objectifs: [] as { type: string; valeurCible: number; valeurActuelle: number; label: string; format: "currency" | "number" }[],
    caEvolution: [] as { mois: string; reel: number; theorique: number }[],
    contratsByType: [] as { typeProduit: string; _sum: { commissionAnnuelle: number | null }; _count: number }[],
    dealsByEtape: [] as { etape: string; _count: number; _sum: { montantEstime: number | null } }[],
    renewals: [] as never[],
    tachesAujourdhui: [] as never[],
    topProspects: [] as { id: string; raisonSociale: string; statut: string; score: number; potentiel: number }[],
    opportunites: [] as Awaited<ReturnType<typeof detecterOpportunites>>,
    campagnesActives: [] as ReturnType<typeof getCampagnesActives>,
    prescripteursAlertes: [] as Awaited<ReturnType<typeof detecterPrescripteursARelancer>>,
    emailsPending: [] as never[],
    emailsPendingCount: 0,
    urgentEmails: [] as never[],
    recentActivity: [] as { type: "email" | "contrat" | "deal" | "tache"; date: Date; title: string; detail?: string; clientId?: string; clientNom?: string }[],
    recentSignaux: [] as never[],
    intelligenceOpportunites: [] as never[],
    upcomingDeals: [] as never[],
    upcomingTaches: [] as never[],
    upcomingRelances: [] as never[],
  };
}

async function getDashboardDataInternal() {
  const [
    clientsActifs,
    contratsActifs,
    commissionsGestion,
    dealsOuverts,
    tachesEnRetard,
    contratsByType,
    dealsByEtape,
    renewals,
    tachesAujourdhui,
    nbPrescripteurs,
    nbDirigeants,
    allClients,
    contrats30j,
    emailsPending,
    emailsPendingCount,
    commissionsParMois,
    sequencesActives,
  ] = await Promise.all([
    prisma.client.count({ where: { statut: "client_actif", archived: false } }),
    prisma.contrat.count({ where: { statut: "actif" } }),
    prisma.commission.aggregate({
      _sum: { montant: true },
      where: { type: "GESTION" },
    }),
    prisma.deal.aggregate({
      _sum: { montantEstime: true },
      where: { etape: { notIn: ["SIGNATURE", "ONBOARDING", "DEVELOPPEMENT", "PERDU"] } },
    }),
    prisma.tache.count({
      where: {
        statut: { in: ["a_faire", "en_cours"] },
        dateEcheance: { lt: new Date() },
      },
    }),
    prisma.contrat.groupBy({
      by: ["typeProduit"],
      _sum: { commissionAnnuelle: true },
      _count: true,
      where: { statut: "actif" },
    }),
    prisma.deal.groupBy({
      by: ["etape"],
      _count: true,
      _sum: { montantEstime: true },
      where: { etape: { notIn: ["SIGNATURE", "ONBOARDING", "DEVELOPPEMENT", "PERDU"] } },
    }),
    prisma.contrat.findMany({
      where: {
        statut: "actif",
        dateEcheance: {
          gte: new Date(),
          lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      },
      include: { client: true, compagnie: true },
      orderBy: { dateEcheance: "asc" },
    }),
    prisma.tache.findMany({
      where: {
        statut: { in: ["a_faire", "en_cours"] },
        dateEcheance: {
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      include: { client: true },
      orderBy: [{ priorite: "asc" }, { dateEcheance: "asc" }],
      take: 10,
    }),
    prisma.prescripteur.count({ where: { statut: "actif", archived: false } }),
    prisma.dirigeant.count(),
    // Clients with contrats for scoring + opportunities
    prisma.client.findMany({
      where: { statut: { in: ["prospect", "client_actif"] }, archived: false },
      select: {
        id: true, raisonSociale: true, statut: true,
        nbSalaries: true, secteurActivite: true, sourceAcquisition: true, ville: true,
        contrats: { select: { typeProduit: true, statut: true, dateEcheance: true, commissionAnnuelle: true } },
      },
    }),
    prisma.contrat.count({
      where: {
        statut: "actif",
        dateEcheance: { gte: new Date(), lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      },
    }),
    // Emails en attente de reponse
    prisma.email.findMany({
      where: {
        direction: "entrant",
        actionRequise: true,
        actionTraitee: false,
      },
      include: { client: { select: { raisonSociale: true } } },
      orderBy: [{ urgence: "asc" }, { dateEnvoi: "desc" }],
      take: 5,
    }),
    prisma.email.count({
      where: {
        direction: "entrant",
        actionRequise: true,
        actionTraitee: false,
      },
    }),
    // Commissions des 12 derniers mois pour le graphe CA Evolution
    prisma.commission.findMany({
      where: {
        dateCreation: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1),
        },
      },
      select: {
        montant: true,
        statut: true,
        dateCreation: true,
      },
    }),
    // Sequences actives
    prisma.sequenceInscription.count({ where: { statut: "en_cours" } }),
  ]);

  // Fetch urgent emails and recent activity (non-blocking, after main queries)
  const session = await auth();
  const userId = session?.user?.id;

  const [urgentEmails, recentEmails, recentDeals, recentTaches, recentSignaux, intelligenceOpportunites, upcomingDeals, upcomingTaches, upcomingRelances] = await Promise.all([
    // Urgent emails: inbound + (haute urgence OR action required OR linked client)
    userId
      ? prisma.email.findMany({
          where: {
            userId,
            direction: "entrant",
            actionTraitee: false,
            OR: [
              { urgence: "haute" },
              { actionRequise: true },
              { clientId: { not: null } },
            ],
          },
          include: { client: { select: { id: true, raisonSociale: true } } },
          orderBy: { dateEnvoi: "desc" },
          take: 8,
        })
      : Promise.resolve([]),
    // Recent emails for activity feed (exclude system/junk emails)
    userId
      ? prisma.email.findMany({
          where: {
            userId,
            analyseStatut: "analyse",
            typeEmail: { notIn: ["autre", "newsletter", "spam"] },
            NOT: {
              expediteur: {
                contains: "noreply",
                mode: "insensitive",
              },
            },
          },
          select: {
            id: true, sujet: true, dateEnvoi: true, expediteur: true,
            client: { select: { id: true, raisonSociale: true } },
          },
          orderBy: { dateEnvoi: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
    // Recent deals
    prisma.deal.findMany({
      select: {
        id: true, titre: true, etape: true, dateMaj: true,
        client: { select: { id: true, raisonSociale: true } },
      },
      orderBy: { dateMaj: "desc" },
      take: 5,
    }),
    // Recent completed tasks
    prisma.tache.findMany({
      where: { statut: "terminee", dateRealisation: { not: null } },
      select: {
        id: true, titre: true, dateRealisation: true,
        client: { select: { id: true, raisonSociale: true } },
      },
      orderBy: { dateRealisation: "desc" },
      take: 5,
    }),
    // Recent commercial signals (last 30 days)
    prisma.signalCommercial.findMany({
      where: { dateSignal: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      include: { client: { select: { id: true, raisonSociale: true } } },
      orderBy: { dateSignal: "desc" },
      take: 10,
    }),
    // Active intelligence opportunities
    prisma.opportuniteCommerciale.findMany({
      where: { statut: { in: ["detectee", "qualifiee", "en_cours"] } },
      include: { client: { select: { id: true, raisonSociale: true } } },
      orderBy: { derniereActivite: "desc" },
      take: 8,
    }),
    // Upcoming deal closings (next 60 days)
    prisma.deal.findMany({
      where: {
        etape: { notIn: ["SIGNATURE", "ONBOARDING", "DEVELOPPEMENT", "PERDU"] },
        dateClosingPrev: { gte: new Date(), lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) },
      },
      select: {
        id: true, titre: true, etape: true, dateClosingPrev: true,
        client: { select: { id: true, raisonSociale: true } },
      },
      orderBy: { dateClosingPrev: "asc" },
      take: 10,
    }),
    // Upcoming tasks (next 14 days)
    prisma.tache.findMany({
      where: {
        statut: { in: ["a_faire", "en_cours"] },
        dateEcheance: { gte: new Date(), lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
      },
      select: {
        id: true, titre: true, type: true, dateEcheance: true, priorite: true,
        client: { select: { id: true, raisonSociale: true } },
      },
      orderBy: { dateEcheance: "asc" },
      take: 10,
    }),
    // Network relances (next 30 days)
    prisma.client.findMany({
      where: {
        archived: false,
        categorieReseau: { not: null },
        dateRelanceReseau: { gte: new Date(), lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      },
      select: {
        id: true, raisonSociale: true, categorieReseau: true, dateRelanceReseau: true,
      },
      orderBy: { dateRelanceReseau: "asc" },
      take: 10,
    }),
  ]);

  // Build activity feed
  type ActivityItem = { type: "email" | "contrat" | "deal" | "tache"; date: Date; title: string; detail?: string; clientId?: string; clientNom?: string };
  const recentActivity: ActivityItem[] = [];

  for (const e of recentEmails) {
    recentActivity.push({
      type: "email",
      date: e.dateEnvoi,
      title: e.sujet,
      detail: e.expediteur,
      clientId: e.client?.id,
      clientNom: e.client?.raisonSociale,
    });
  }
  for (const d of recentDeals) {
    const etapeConfig = ETAPES_PIPELINE.find((e) => e.id === d.etape);
    recentActivity.push({
      type: "deal",
      date: d.dateMaj,
      title: d.titre,
      detail: etapeConfig?.label ?? d.etape,
      clientId: d.client?.id,
      clientNom: d.client?.raisonSociale,
    });
  }
  for (const t of recentTaches) {
    recentActivity.push({
      type: "tache",
      date: t.dateRealisation!,
      title: t.titre,
      clientId: t.client?.id,
      clientNom: t.client?.raisonSociale,
    });
  }
  recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const topActivity = recentActivity.slice(0, 10);

  const caGestion = commissionsGestion._sum.montant ?? 0;

  // New KPIs
  const panierMoyen = clientsActifs > 0 ? Math.round(caGestion / clientsActifs) : 0;
  const tauxMultiEquipement = clientsActifs > 0 ? (contratsActifs / clientsActifs).toFixed(1) : "0";

  // Top 5 prospects by score
  const clientsWithScores = allClients.map((c) => ({
    ...c,
    score: calculerScoreProspect(c, c.contrats),
    potentiel: calculerPotentielCA(c, c.contrats),
  }));
  const topProspects = clientsWithScores
    .filter((c) => c.statut === "prospect")
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Opportunities
  const opportunites = detecterOpportunites(allClients);

  // Total potentiel pipeline
  const totalPotentiel = clientsWithScores
    .filter((c) => c.statut === "prospect")
    .reduce((sum, c) => sum + c.potentiel, 0);

  // Aggregation CA Evolution par mois (12 derniers mois)
  const now = new Date();
  const caEvolutionMap = new Map<string, { reel: number; theorique: number }>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    caEvolutionMap.set(key, { reel: 0, theorique: 0 });
  }
  for (const c of commissionsParMois) {
    const d = new Date(c.dateCreation);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = caEvolutionMap.get(key);
    if (entry) {
      entry.theorique += c.montant;
      if (c.statut === "verse") {
        entry.reel += c.montant;
      }
    }
  }
  const caEvolution = Array.from(caEvolutionMap.entries()).map(([mois, values]) => ({
    mois,
    reel: Math.round(values.reel),
    theorique: Math.round(values.theorique),
  }));

  // Campagnes saisonnieres actives
  const campagnesActives = getCampagnesActives();

  // Alertes prescripteurs
  let prescripteursAlertes: Awaited<ReturnType<typeof detecterPrescripteursARelancer>> = [];
  try {
    prescripteursAlertes = await detecterPrescripteursARelancer();
  } catch (err) {
    console.error("Erreur detection prescripteurs:", err);
  }

  // Objectifs annuels — fetch targets + compute actuals
  const annee = new Date().getFullYear();
  const [objectifsRows, metrics] = await Promise.all([
    prisma.objectif.findMany({ where: { annee, periode: "annuel" } }),
    computeMetrics(annee),
  ]);

  const OBJECTIF_LABELS: Record<string, { label: string; format: "currency" | "number" }> = {
    CA_ANNUEL: { label: "Primes nouvelles", format: "currency" },
    NB_CONTRATS: { label: "Deals signes", format: "number" },
    NB_CLIENTS: { label: "Clients actifs", format: "number" },
    PIPELINE: { label: "Commissions", format: "currency" },
  };

  const objectifs = objectifsRows.map((obj) => {
    const m = metrics[obj.type as keyof typeof metrics];
    const cfg = OBJECTIF_LABELS[obj.type] ?? { label: obj.type, format: "number" as const };
    return {
      type: obj.type,
      valeurCible: obj.valeurCible,
      valeurActuelle: m ? Math.round(m.valeur) : 0,
      label: cfg.label,
      format: cfg.format,
    };
  });

  return {
    kpis: {
      caRecurrentMensuel: Math.round(caGestion / 12),
      caRecurrentAnnuel: Math.round(caGestion),
      nbClientsActifs: clientsActifs,
      nbContratsActifs: contratsActifs,
      pipelineEnCours: Math.round(dealsOuverts._sum.montantEstime ?? 0),
      nbTachesEnRetard: tachesEnRetard,
      nbPrescripteurs,
      nbDirigeants,
      panierMoyen,
      tauxMultiEquipement,
      contratsARenouveler30j: contrats30j,
      totalPotentiel,
      sequencesActives,
    },
    objectifs,
    caEvolution,
    contratsByType,
    dealsByEtape,
    renewals,
    tachesAujourdhui,
    topProspects,
    opportunites: opportunites.slice(0, 8),
    campagnesActives,
    prescripteursAlertes,
    emailsPending,
    emailsPendingCount,
    urgentEmails,
    recentActivity: topActivity,
    recentSignaux,
    intelligenceOpportunites,
    upcomingDeals,
    upcomingTaches,
    upcomingRelances,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return <DashboardTabs data={data} />;
}
