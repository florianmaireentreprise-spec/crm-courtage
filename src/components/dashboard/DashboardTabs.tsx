"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Banknote,
  TrendingUp,
  Target,
  AlertCircle,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";

// Existing dashboard widgets
import { CAEvolutionChart } from "./CAEvolutionChart";
import { PipelineChart } from "./PipelineChart";
import { RevenueChart } from "./RevenueChart";
import { ProductPieChart } from "./ProductPieChart";
import { TasksWidget } from "./TasksWidget";
import { RenewalsWidget } from "./RenewalsWidget";
import { UrgentEmailsWidget } from "./UrgentEmailsWidget";
import { RecentActivityWidget } from "./RecentActivityWidget";
import { SignauxCommerciaux } from "./SignauxCommerciaux";
import { CalendrierEcheances } from "./CalendrierEcheances";
import { CampagnesWidget } from "./CampagnesWidget";
import { PrescripteursWidget } from "./PrescripteursWidget";
import { EmailsWidget } from "./EmailsWidget";

import { TYPES_PRODUITS } from "@/lib/constants";
import { getScoreColor } from "@/lib/scoring/prospect";

type TabId = "global" | "commercial" | "revenus" | "reseau";

const TABS: { id: TabId; label: string }[] = [
  { id: "global", label: "Vue Globale" },
  { id: "commercial", label: "Commercial" },
  { id: "revenus", label: "Revenus" },
  { id: "reseau", label: "Reseau & Prescripteurs" },
];

function fmt(v: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

type DashboardTabsProps = {
  kpis: {
    caRecurrentMensuel: number;
    caRecurrentAnnuel: number;
    nbClientsActifs: number;
    nbContratsActifs: number;
    pipelineEnCours: number;
    nbTachesEnRetard: number;
    nbPrescripteurs: number;
    nbDirigeants: number;
    panierMoyen: number;
    tauxMultiEquipement: string;
    contratsARenouveler30j: number;
    totalPotentiel: number;
    sequencesActives: number;
  };
  objectifs: {
    type: string;
    valeurCible: number;
    valeurActuelle: number;
    label: string;
    format: "currency" | "number";
  }[];
  caEvolution: { mois: string; reel: number; theorique: number }[];
  contratsByType: { typeProduit: string; _sum: { commissionAnnuelle: number | null }; _count: number }[];
  dealsByEtape: { etape: string; _count: number; _sum: { montantEstime: number | null } }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renewals: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tachesAujourdhui: any[];
  topProspects: { id: string; raisonSociale: string; statut: string; score: number; potentiel: number }[];
  opportunites: { id: string; clientId: string; clientNom: string; titre: string; priorite: string; produitCible?: string | null }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  campagnesActives: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prescripteursAlertes: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emailsPending: any[];
  emailsPendingCount: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  urgentEmails: any[];
  recentActivity: { type: "email" | "contrat" | "deal" | "tache"; date: Date; title: string; detail?: string; clientId?: string; clientNom?: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recentSignaux: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intelligenceOpportunites: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  upcomingDeals: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  upcomingTaches: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  upcomingRelances: any[];
};

export function DashboardTabs({ data }: { data: DashboardTabsProps }) {
  const [tab, setTab] = useState<TabId>("global");
  const { kpis, objectifs } = data;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            GargarineV1 &middot; {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" }).replace(/^\w/, c => c.toUpperCase())}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-1.5 text-sm rounded-md transition-all font-medium ${
                tab === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Hero KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroCard
          label="Primes en portefeuille"
          value={fmt(kpis.caRecurrentAnnuel)}
          sub={`${kpis.nbContratsActifs} contrats actifs`}
          icon={<Banknote className="h-5 w-5" />}
          color="emerald"
        />
        <HeroCard
          label="Commissions annuelles"
          value={fmt(kpis.caRecurrentAnnuel)}
          sub={objectifs.find(o => o.type === "CA_ANNUEL")
            ? `${Math.round((kpis.caRecurrentAnnuel / (objectifs.find(o => o.type === "CA_ANNUEL")!.valeurCible || 1)) * 100)}% vs ${fmt(objectifs.find(o => o.type === "CA_ANNUEL")!.valeurCible)} objectif`
            : `${fmt(kpis.caRecurrentMensuel)}/mois`
          }
          icon={<TrendingUp className="h-5 w-5" />}
          color="blue"
          subColor={
            objectifs.find(o => o.type === "CA_ANNUEL") &&
            kpis.caRecurrentAnnuel < (objectifs.find(o => o.type === "CA_ANNUEL")!.valeurCible * 0.5)
              ? "text-amber-600"
              : "text-success"
          }
        />
        <HeroCard
          label="Pipeline pondere"
          value={fmt(kpis.pipelineEnCours)}
          sub={`${data.dealsByEtape.reduce((s, d) => s + d._count, 0)} deals actifs`}
          icon={<Target className="h-5 w-5" />}
          color="violet"
        />
        <HeroCard
          label="Taches en retard"
          value={kpis.nbTachesEnRetard.toString()}
          sub={`${(data.tachesAujourdhui as unknown[]).length} a faire`}
          icon={kpis.nbTachesEnRetard > 0 ? <AlertCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          color={kpis.nbTachesEnRetard > 0 ? "red" : "emerald"}
        />
      </div>

      {/* Objectifs annuels */}
      {objectifs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Objectifs annuels {new Date().getFullYear()}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {objectifs.map((obj) => {
              const pct = obj.valeurCible > 0 ? Math.min(100, Math.round((obj.valeurActuelle / obj.valeurCible) * 100)) : 0;
              const barColor =
                pct >= 80 ? "bg-success" :
                pct >= 50 ? "bg-amber-500" :
                "bg-destructive";
              return (
                <div key={obj.type} className="flex items-center gap-4">
                  <span className="text-sm font-medium w-40 shrink-0">{obj.label}</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-48 text-right shrink-0">
                    {obj.format === "currency"
                      ? `${fmt(obj.valeurActuelle)} / ${fmt(obj.valeurCible)}`
                      : `${obj.valeurActuelle} / ${obj.valeurCible}`
                    }
                    {" "}({pct}%)
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Tab content */}
      {tab === "global" && (
        <div className="space-y-6">
          <CAEvolutionChart data={data.caEvolution} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PipelineChart data={data.dealsByEtape} />
            <TasksWidget taches={data.tachesAujourdhui} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UrgentEmailsWidget emails={data.urgentEmails} />
            <RecentActivityWidget activities={data.recentActivity} />
          </div>
        </div>
      )}

      {tab === "commercial" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PipelineChart data={data.dealsByEtape} />
            <SignauxCommerciaux signaux={data.recentSignaux} opportunites={data.intelligenceOpportunites} />
          </div>
          <CalendrierEcheances contrats={data.renewals} deals={data.upcomingDeals} taches={data.upcomingTaches} relances={data.upcomingRelances} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top prospects */}
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
                          <span className="text-xs text-success font-medium">
                            {fmt(p.potentiel)}/an
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
          <EmailsWidget emails={data.emailsPending} totalPending={data.emailsPendingCount} />
        </div>
      )}

      {tab === "revenus" && (
        <div className="space-y-6">
          <CAEvolutionChart data={data.caEvolution} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueChart data={data.contratsByType} />
            <ProductPieChart data={data.contratsByType} />
          </div>
          <RenewalsWidget contrats={data.renewals} />
        </div>
      )}

      {tab === "reseau" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CampagnesWidget campagnes={data.campagnesActives} />
            <PrescripteursWidget alertes={data.prescripteursAlertes} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Hero KPI Card ──
const COLOR_MAP: Record<string, { bg: string; text: string; icon: string; border: string }> = {
  emerald: { bg: "bg-success/5", text: "text-success", icon: "text-success", border: "var(--success)" },
  blue: { bg: "bg-primary/5", text: "text-primary", icon: "text-primary", border: "var(--primary)" },
  violet: { bg: "bg-muted", text: "text-foreground", icon: "text-muted-foreground", border: "var(--chart-3)" },
  red: { bg: "bg-destructive/5", text: "text-destructive", icon: "text-destructive", border: "var(--destructive)" },
};

function HeroCard({
  label, value, sub, icon, color, subColor,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  subColor?: string;
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.emerald;
  return (
    <Card className="border-l-4" style={{ borderLeftColor: c.border }}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground font-medium">{label}</span>
          <div className={`p-1.5 rounded-lg ${c.bg}`}>
            <span className={c.icon}>{icon}</span>
          </div>
        </div>
        <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
        <p className={`text-xs mt-1 ${subColor || "text-muted-foreground"}`}>{sub}</p>
      </CardContent>
    </Card>
  );
}
