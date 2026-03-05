import { Card, CardContent } from "@/components/ui/card";
import { Users, FileText, TrendingUp, Target, Clock, Euro } from "lucide-react";
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
    label: "CA récurrent mensuel",
    icon: Euro,
    format: formatCurrency,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    key: "caRecurrentAnnuel" as const,
    label: "CA récurrent annuel",
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
    label: "Tâches en retard",
    icon: Clock,
    format: (v: number) => v.toString(),
    color: "text-red-600",
    bg: "bg-red-50",
  },
];

export function KPICards({ kpis }: { kpis: DashboardKPIs }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpiConfig.map((config) => (
        <Card key={config.key}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${config.bg}`}>
                <config.icon className={`h-4 w-4 ${config.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold">{config.format(kpis[config.key])}</p>
            <p className="text-xs text-muted-foreground">{config.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
