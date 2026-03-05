import { prisma } from "@/lib/prisma";
import { computeMetrics, computeForecast } from "@/lib/objectifs";
import { ObjectifGrid } from "@/components/objectifs/ObjectifGrid";
import { Card, CardContent } from "@/components/ui/card";
import { TYPES_OBJECTIF } from "@/lib/constants";

export default async function ObjectifsPage() {
  const currentYear = new Date().getFullYear();

  const [objectifs, users] = await Promise.all([
    prisma.objectif.findMany({
      orderBy: { dateCreation: "desc" },
    }),
    prisma.user.findMany({
      select: { id: true, prenom: true, nom: true },
    }),
  ]);

  const metrics = await computeMetrics(currentYear);

  const objectifsWithProgress = objectifs.map((obj) => {
    const metricKey = obj.type as keyof typeof metrics;
    const metric = metrics[metricKey] ?? { valeur: 0, velocite: 0 };
    return {
      ...obj,
      valeurActuelle: metric.valeur,
      forecast: computeForecast(obj.valeurCible, metric.valeur, metric.velocite),
    };
  });

  // Summary cards — current metrics
  const fmt = (n: number, currency = false) =>
    currency
      ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n)
      : new Intl.NumberFormat("fr-FR").format(Math.round(n));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Objectifs & Performance</h1>

      {/* Current metrics snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {TYPES_OBJECTIF.map((type) => {
          const metricKey = type.id as keyof typeof metrics;
          const metric = metrics[metricKey];
          return (
            <Card key={type.id}>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">
                  {fmt(metric.valeur, type.format === "currency")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{type.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {fmt(metric.velocite * 4.33, type.format === "currency")}/mois
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ObjectifGrid objectifs={objectifsWithProgress} users={users} />
    </div>
  );
}
