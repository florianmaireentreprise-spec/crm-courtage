"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    .filter((e) => e.id !== "SIGNE" && e.id !== "PERDU")
    .map((etape) => {
      const found = data.find((d) => d.etape === etape.id);
      return {
        name: etape.label,
        deals: found?._count ?? 0,
        montant: Math.round(found?._sum.montantEstime ?? 0),
        color: etape.color,
      };
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pipeline par étape</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={12} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === "montant"
                    ? new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      }).format(value)
                    : value,
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
