"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { TYPES_PRODUITS } from "@/lib/constants";

type ContratsByType = {
  typeProduit: string;
  _sum: { commissionAnnuelle: number | null };
  _count: number;
}[];

export function ProductPieChart({ data }: { data: ContratsByType }) {
  const chartData = data.map((item) => {
    const config = TYPES_PRODUITS[item.typeProduit as keyof typeof TYPES_PRODUITS];
    return {
      name: config?.label ?? item.typeProduit,
      value: Math.round(item._sum.commissionAnnuelle ?? 0),
      color: config?.color ?? "#94A3B8",
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Répartition CA par produit</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) =>
                  new Intl.NumberFormat("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  }).format(value ?? 0)
                }
              />
              <Legend fontSize={11} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
