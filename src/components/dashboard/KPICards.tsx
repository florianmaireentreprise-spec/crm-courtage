import { Card, CardContent } from "@/components/ui/card";
import { Users, FileText, TrendingUp, Target, Clock, Euro, UserCheck, Handshake, ShoppingCart, Layers, AlertTriangle, Zap, Play } from "lucide-react";
import type { DashboardKPIs } from "@/types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const kpiConfig = [
  {
    key: "caRecurrentMensuel" as const,
    label: "CA recurrent mensuel",
    icon: Euro,
    format: formatCurrency,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    key: "caRecurrentAnnuel" as const,
    label: "CA recurrent annuel",
    icon: TrendingUp,
    format: formatCurrency,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    key: "nbClientsActifs" as const,
    label: "Clients actifs",
    icon: Users,
    format: (v: number) => v.toString(),
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    key: "nbContratsActifs" as const,
    label: "Contrats actifs",
    icon: FileText,
    format: (v: number) => v.toString(),
    color: "text-cyan-600",
    bg: "bg-cyan-50",
  },
  {
    key: "pipelineEnCours" as const,
    label: "Pipeline en cours",
    icon: Target,
    format: formatCurrency,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    key: "nbTachesEnRetard" as const,
    label: "Taches en retard",
    icon: Clock,
    format: (v: number) => v.toString(),
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    key: "nbPrescripteurs" as const,
    label: "Prescripteurs actifs",
    icon: Handshake,
    format: (v: number) => v.toString(),
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    key: "nbDirigeants" as const,
    label: "Dirigeants suivis",
    icon: UserCheck,
    format: (v: number) => v.toString(),
    color: "text-pink-600",
    bg: "bg-pink-50",
  },
  {
    key: "panierMoyen" as const,
    label: "Panier moyen/client",
    icon: ShoppingCart,
    format: formatCurrency,
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
  {
    key: "tauxMultiEquipement" as const,
    label: "Multi-equipement",
    icon: Layers,
    format: (v: string) => `${v}x`,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    key: "contratsARenouveler30j" as const,
    label: "Renouvellements 30j",
    icon: AlertTriangle,
    format: (v: number) => v.toString(),
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    key: "totalPotentiel" as const,
    label: "Potentiel pipeline",
    icon: Zap,
    format: formatCurrency,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    key: "sequencesActives" as const,
    label: "Sequences actives",
    icon: Play,
    format: (v: number) => v.toString(),
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
];

export function KPICards({ kpis }: { kpis: DashboardKPIs }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {kpiConfig.map((config) => (
        <Card key={config.key}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${config.bg}`}>
                <config.icon className={`h-4 w-4 ${config.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold">{(config.format as (v: never) => string)(kpis[config.key] as never)}</p>
            <p className="text-xs text-muted-foreground">{config.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
