import { prisma } from "@/lib/prisma";
import { KPICards } from "@/components/dashboard/KPICards";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { PipelineChart } from "@/components/dashboard/PipelineChart";
import { ProductPieChart } from "@/components/dashboard/ProductPieChart";
import { RenewalsWidget } from "@/components/dashboard/RenewalsWidget";
import { TasksWidget } from "@/components/dashboard/TasksWidget";

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
  ]);

  const caGestion = commissionsGestion._sum.montant ?? 0;

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
    },
    contratsByType,
    dealsByEtape,
    renewals,
    tachesAujourdhui,
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={data.contratsByType} />
        <PipelineChart data={data.dealsByEtape} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProductPieChart data={data.contratsByType} />
        <TasksWidget taches={data.tachesAujourdhui} />
      </div>
      <RenewalsWidget contrats={data.renewals} />
    </div>
  );
}
