"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trash2, Pencil } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { TYPES_OBJECTIF, PERIODES_OBJECTIF } from "@/lib/constants";
import { ForecastBadge } from "./ForecastBadge";
import { deleteObjectif } from "@/app/(app)/objectifs/actions";
import type { ForecastResult } from "@/lib/objectifs";
import type { Objectif } from "@prisma/client";

type Props = {
  objectif: Objectif;
  valeurActuelle: number;
  forecast: ForecastResult;
  onEdit: (objectif: Objectif) => void;
};

export function ObjectifCard({ objectif, valeurActuelle, forecast, onEdit }: Props) {
  const typeConfig = TYPES_OBJECTIF.find((t) => t.id === objectif.type);
  const periodeConfig = PERIODES_OBJECTIF.find((p) => p.id === objectif.periode);
  const progressPct = Math.min(100, (valeurActuelle / objectif.valeurCible) * 100);

  const isCurrency = typeConfig?.format === "currency";
  const fmt = (n: number) =>
    isCurrency
      ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n)
      : new Intl.NumberFormat("fr-FR").format(Math.round(n));

  const gaugeData = [
    { value: progressPct, fill: forecast.atteint ? "#10B981" : typeConfig?.color ?? "#3B82F6" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div>
          <p className="text-sm font-semibold">{typeConfig?.label}</p>
          <p className="text-xs text-muted-foreground">
            {periodeConfig?.label} {objectif.annee}
            {objectif.mois && ` — mois ${objectif.mois}`}
            {objectif.trimestre && ` — T${objectif.trimestre}`}
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(objectif)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => deleteObjectif(objectif.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          {/* Radial gauge */}
          <div className="h-20 w-20 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="55%"
                outerRadius="90%"
                data={gaugeData}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar dataKey="value" cornerRadius={4} background />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 space-y-1">
            <p className="text-2xl font-bold">{fmt(valeurActuelle)}</p>
            <p className="text-xs text-muted-foreground">sur {fmt(objectif.valeurCible)}</p>
            <p className="text-sm font-medium" style={{ color: typeConfig?.color }}>
              {progressPct.toFixed(0)}%
            </p>
          </div>
        </div>

        <Progress value={progressPct} className="h-2" />

        <ForecastBadge forecast={forecast} />
      </CardContent>
    </Card>
  );
}
