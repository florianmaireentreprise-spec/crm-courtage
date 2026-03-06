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
} from "recharts";
import { TYPES_PRODUITS } from "@/lib/constants";

type ContratsByType = {
  typeProduit: string;
  _sum: { commissionAnnuelle: number | null };
  _count: number;
}[];

export function RevenueChart({ data }: { data: ContratsByType }) {
  const chartData = data.map((item) => ({
    name:
      TYPES_PRODUITS[item.typeProduit as keyof typeof TYPES_PRODUITS]?.label ??
      item.typeProduit,
    commission: Math.round(item._sum.commissionAnnuelle ?? 0),
    contrats: item._count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">CA par type de produit</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                tickFormatter={(v) => `${v} €`}
                fontSize={12}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                fontSize={11}
              />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) =>
                  new Intl.NumberFormat("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  }).format(value ?? 0)
                }
              />
              <Bar dataKey="commission" fill="var(--color-chart-1)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
