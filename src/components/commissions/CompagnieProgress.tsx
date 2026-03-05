import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Compagnie, Contrat, Commission } from "@prisma/client";

type CompagnieWithContracts = Compagnie & {
  contrats: (Contrat & { commissions: Commission[] })[];
};

type Props = {
  compagnies: CompagnieWithContracts[];
};

export function CompagnieProgress({ compagnies }: Props) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  const compagniesWithSeuil = compagnies.filter(
    (c) => c.seuilSurcommission && c.seuilSurcommission > 0
  );

  if (compagniesWithSeuil.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Surcommissions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucune compagnie avec seuil de surcommission configuré.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Surcommissions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {compagniesWithSeuil.map((comp) => {
          const totalPrimes = comp.contrats.reduce(
            (sum, c) => sum + c.primeAnnuelle,
            0
          );
          const seuil = comp.seuilSurcommission!;
          const progress = Math.min((totalPrimes / seuil) * 100, 100);
          const atteint = totalPrimes >= seuil;

          return (
            <div key={comp.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{comp.nom}</span>
                <span className="text-muted-foreground">
                  {fmt(totalPrimes)} / {fmt(seuil)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: atteint ? "#10B981" : "#3B82F6",
                  }}
                />
              </div>
              {atteint && comp.tauxSurcommission && (
                <p className="text-xs text-green-600 font-medium">
                  Seuil atteint — surcommission {(comp.tauxSurcommission * 100).toFixed(0)}%
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
