import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { TYPES_PRODUITS, STATUTS_CONTRAT } from "@/lib/constants";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

function getRenewalAlert(daysToRenewal: number | null, statut: string) {
  if (statut !== "actif" || daysToRenewal === null) return null;

  if (daysToRenewal < 0) {
    return { label: "En retard", className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700" };
  }
  if (daysToRenewal < 30) {
    return { label: "Renouvellement proche", className: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700" };
  }
  if (daysToRenewal < 60) {
    return { label: "À préparer", className: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700" };
  }
  return { label: "OK", className: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700" };
}

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
              const renewalAlert = getRenewalAlert(daysToRenewal, contrat.statut);
              const isOverdue = contrat.statut === "actif" && daysToRenewal !== null && daysToRenewal < 0;

              return (
                <tr key={contrat.id} className={`border-b hover:bg-muted/30 ${isOverdue ? "bg-red-50 dark:bg-red-950/20" : ""}`}>
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
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-muted-foreground text-xs">
                          {format(contrat.dateEcheance, "dd/MM/yyyy")}
                        </span>
                        {renewalAlert && (
                          <Badge variant="outline" className={`text-xs ${renewalAlert.className}`}>
                            {renewalAlert.label}
                          </Badge>
                        )}
                      </div>
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
