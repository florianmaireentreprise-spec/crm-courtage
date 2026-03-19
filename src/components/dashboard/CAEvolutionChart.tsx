"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type CAEvolutionData = {
  mois: string;
  reel: number;
  theorique: number;
}[];

export function CAEvolutionChart({ data }: { data: CAEvolutionData }) {
  if (!data || data.length === 0 || data.every(d => d.reel === 0 && d.theorique === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CA Recurrent Evolution</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={BarChart3} title="Pas encore de donnees" description="Ce graphique se remplira avec vos premiers contrats." compact />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">CA Recurrent Evolution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
              <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(v) =>
                  new Intl.NumberFormat("fr-FR", {
                    notation: "compact",
                    compactDisplay: "short",
                  }).format(v) + " €"
                }
              />
              <Tooltip
                formatter={(value: number | string | undefined) =>
                  typeof value === "number"
                    ? new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                        maximumFractionDigits: 0,
                      }).format(value)
                    : String(value ?? "")
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="reel"
                name="CA reel"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="theorique"
                name="CA theorique"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
