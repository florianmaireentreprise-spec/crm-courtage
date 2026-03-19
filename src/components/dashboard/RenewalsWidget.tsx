import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TYPES_PRODUITS } from "@/lib/constants";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import type { Contrat, Client, Compagnie } from "@prisma/client";
import { EmptyState } from "@/components/ui/empty-state";
import { RefreshCw } from "lucide-react";

type ContratWithRelations = Contrat & {
  client: Client;
  compagnie: Compagnie | null;
};

function getDaysBadge(days: number) {
  if (days <= 30) return <Badge variant="destructive">{days}j</Badge>;
  if (days <= 60) return <Badge className="bg-orange-500 text-white">{days}j</Badge>;
  return <Badge variant="secondary">{days}j</Badge>;
}

export function RenewalsWidget({ contrats }: { contrats: ContratWithRelations[] }) {
  if (contrats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Renouvellements à venir (90 jours)</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={RefreshCw}
            title="Aucun renouvellement a venir"
            description="Les echeances contrats apparaitront ici 90 jours avant leur date."
            action={{ label: "Voir les contrats", href: "/contrats" }}
            compact
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Renouvellements à venir (90 jours)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Client</th>
                <th className="pb-2 font-medium">Produit</th>
                <th className="pb-2 font-medium">Compagnie</th>
                <th className="pb-2 font-medium">Échéance</th>
                <th className="pb-2 font-medium">Délai</th>
              </tr>
            </thead>
            <tbody>
              {contrats.map((contrat) => {
                const days = differenceInDays(
                  contrat.dateEcheance!,
                  new Date()
                );
                const typeConfig =
                  TYPES_PRODUITS[
                    contrat.typeProduit as keyof typeof TYPES_PRODUITS
                  ];
                return (
                  <tr key={contrat.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">
                      {contrat.client.raisonSociale}
                    </td>
                    <td className="py-2">{typeConfig?.label ?? contrat.typeProduit}</td>
                    <td className="py-2">{contrat.compagnie?.nom ?? "-"}</td>
                    <td className="py-2">
                      {format(contrat.dateEcheance!, "dd MMM yyyy", {
                        locale: fr,
                      })}
                    </td>
                    <td className="py-2">{getDaysBadge(days)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
