"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ETAPES_PIPELINE } from "@/lib/constants";

type DealsByEtape = {
  etape: string;
  _count: number;
  _sum: { montantEstime: number | null };
}[];

export function PipelineChart({ data }: { data: DealsByEtape }) {
  const chartData = ETAPES_PIPELINE
    .filter((e) => !["SIGNATURE", "ONBOARDING", "DEVELOPPEMENT", "PERDU"].includes(e.id))
    .map((etape) => {
      const found = data.find((d) => d.etape === etape.id);
      return {
        name: etape.label,
        deals: found?._count ?? 0,
        montant: Math.round(found?._sum.montantEstime ?? 0),
        color: etape.color,
      };
    });

  if (chartData.every(d => d.deals === 0 && d.montant === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline par étape</CardTitle>
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
        <CardTitle className="text-base">Pipeline par étape</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [
                  name === "montant"
                    ? new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      }).format(value ?? 0)
                    : (value ?? 0),
                  name === "montant" ? "Montant" : "Deals",
                ]}
              />
              <Bar dataKey="deals" radius={4}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
