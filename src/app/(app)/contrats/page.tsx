import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { TYPES_PRODUITS, STATUTS_CONTRAT } from "@/lib/constants";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

export default async function ContratsPage() {
  const contrats = await prisma.contrat.findMany({
    include: { client: true, compagnie: true },
    orderBy: { dateEffet: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contrats</h1>
        <Link href="/contrats/nouveau">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau contrat
          </Button>
        </Link>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Client</th>
              <th className="text-left p-3 font-medium">Produit</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Compagnie</th>
              <th className="text-right p-3 font-medium">Prime</th>
              <th className="text-right p-3 font-medium hidden md:table-cell">Commission</th>
              <th className="text-center p-3 font-medium hidden lg:table-cell">Échéance</th>
              <th className="text-center p-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {contrats.map((contrat) => {
              const typeConfig = TYPES_PRODUITS[contrat.typeProduit as keyof typeof TYPES_PRODUITS];
              const statutConfig = STATUTS_CONTRAT.find((s) => s.id === contrat.statut);
              const daysToRenewal = contrat.dateEcheance
                ? differenceInDays(contrat.dateEcheance, new Date())
                : null;

              return (
                <tr key={contrat.id} className="border-b hover:bg-muted/30">
                  <td className="p-3">
                    <Link href={`/clients/${contrat.clientId}`} className="hover:underline">
                      {contrat.client.raisonSociale}
                    </Link>
                  </td>
                  <td className="p-3">
                    <Link href={`/contrats/${contrat.id}`} className="flex items-center gap-2 hover:underline text-primary font-medium">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeConfig?.color }} />
                      {typeConfig?.label}
                    </Link>
                  </td>
                  <td className="p-3 hidden md:table-cell">{contrat.compagnie?.nom ?? "-"}</td>
                  <td className="p-3 text-right">
                    {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(contrat.primeAnnuelle)}
                  </td>
                  <td className="p-3 text-right hidden md:table-cell">
                    {contrat.commissionAnnuelle
                      ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(contrat.commissionAnnuelle)
                      : "-"}
                  </td>
                  <td className="p-3 text-center hidden lg:table-cell">
                    {contrat.dateEcheance ? (
                      <span className={daysToRenewal !== null && daysToRenewal <= 30 ? "text-destructive font-medium" : ""}>
                        {format(contrat.dateEcheance, "dd/MM/yyyy")}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant="outline" style={{ borderColor: statutConfig?.color, color: statutConfig?.color }}>
                      {statutConfig?.label}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
