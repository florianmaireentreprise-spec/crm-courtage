import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { KPICards } from "@/components/dashboard/KPICards";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { CAEvolutionChart } from "@/components/dashboard/CAEvolutionChart";
import { PipelineChart } from "@/components/dashboard/PipelineChart";
import { ProductPieChart } from "@/components/dashboard/ProductPieChart";
import { RenewalsWidget } from "@/components/dashboard/RenewalsWidget";
import { TasksWidget } from "@/components/dashboard/TasksWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { detecterOpportunites } from "@/lib/opportunities";
import { calculerScoreProspect, getScoreColor } from "@/lib/scoring";
import { calculerPotentielCA } from "@/lib/potentiel";
import { TYPES_PRODUITS } from "@/lib/constants";
import { generateAutoTasks } from "@/lib/auto-tasks";
import { getCampagnesActives } from "@/lib/campagnes";
import { detecterPrescripteursARelancer } from "@/lib/prescripteur-tracking";
import { CampagnesWidget } from "@/components/dashboard/CampagnesWidget";
import { PrescripteursWidget } from "@/components/dashboard/PrescripteursWidget";

async function getDashboardData() {
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
    commissionsParMois,
  ] = await Promise.all([
    prisma.client.count({ where: { statut: "client_actif" } }),
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
    prisma.prescripteur.count({ where: { statut: "actif" } }),
    prisma.dirigeant.count(),
    // Clients with contrats for scoring + opportunities
    prisma.client.findMany({
      where: { statut: { in: ["prospect", "client_actif"] } },
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
  ]);

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

  // Generation automatique des taches (fire-and-forget, ne bloque pas le dashboard)
  generateAutoTasks().catch((err) =>
    console.error("Erreur auto-tasks sur dashboard:", err)
  );

  // Campagnes saisonnieres actives
  const campagnesActives = getCampagnesActives();

  // Alertes prescripteurs
  let prescripteursAlertes: Awaited<ReturnType<typeof detecterPrescripteursARelancer>> = [];
  try {
    prescripteursAlertes = await detecterPrescripteursARelancer();
  } catch (err) {
    console.error("Erreur detection prescripteurs:", err);
  }

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
    },
    caEvolution,
    contratsByType,
    dealsByEtape,
    renewals,
    tachesAujourdhui,
    topProspects,
    opportunites: opportunites.slice(0, 8),
    campagnesActives,
    prescripteursAlertes,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cabinet de conseil en protection sociale et strategie patrimoniale des dirigeants</h1>
        <p className="text-muted-foreground text-sm mt-1">Tableau de bord - GargarineV1</p>
      </div>
      <KPICards kpis={data.kpis} />
      <CAEvolutionChart data={data.caEvolution} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={data.contratsByType} />
        <PipelineChart data={data.dealsByEtape} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProductPieChart data={data.contratsByType} />
        <TasksWidget taches={data.tachesAujourdhui} />
      </div>
      <RenewalsWidget contrats={data.renewals} />

      {/* Campagnes & Prescripteurs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CampagnesWidget campagnes={data.campagnesActives} />
        <PrescripteursWidget alertes={data.prescripteursAlertes} />
      </div>

      {/* Phase 2 widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 prospects */}
        {data.topProspects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top prospects a traiter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.topProspects.map((p) => (
                <Link key={p.id} href={`/clients/${p.id}`} className="block">
                  <div className="flex items-center justify-between py-1.5 hover:bg-muted/30 rounded px-2 -mx-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] w-8 justify-center" style={{ borderColor: getScoreColor(p.score), color: getScoreColor(p.score) }}>
                        {p.score}
                      </Badge>
                      <span className="text-sm font-medium">{p.raisonSociale}</span>
                    </div>
                    {p.potentiel > 0 && (
                      <span className="text-xs text-emerald-600 font-medium">
                        {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(p.potentiel)}/an
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Opportunites detectees */}
        {data.opportunites.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Opportunites detectees</CardTitle>
                <Badge>{data.opportunites.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.opportunites.map((opp) => (
                <Link key={opp.id} href={`/clients/${opp.clientId}`} className="block">
                  <div className="flex items-center justify-between py-1.5 hover:bg-muted/30 rounded px-2 -mx-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={opp.priorite === "haute" ? "destructive" : "secondary"} className="text-[10px]">
                          {opp.priorite}
                        </Badge>
                        <span className="text-sm font-medium truncate">{opp.clientNom}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{opp.titre}</p>
                    </div>
                    {opp.produitCible && (
                      <Badge variant="outline" className="text-[10px] ml-2 flex-shrink-0">
                        {TYPES_PRODUITS[opp.produitCible as keyof typeof TYPES_PRODUITS]?.label ?? opp.produitCible}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
