import { prisma } from "@/lib/prisma";
import { CommissionTable } from "@/components/commissions/CommissionTable";
import { CompagnieProgress } from "@/components/commissions/CompagnieProgress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TYPES_COMMISSION, STATUTS_COMMISSION } from "@/lib/constants";

export default async function CommissionsPage() {
  const [commissions, compagnies] = await Promise.all([
    prisma.commission.findMany({
      include: {
        contrat: {
          include: {
            client: true,
            compagnie: true,
          },
        },
      },
      orderBy: { periode: "desc" },
    }),
    prisma.compagnie.findMany({
      include: {
        contrats: {
          where: { statut: "actif" },
          include: { commissions: true },
        },
      },
      orderBy: { nom: "asc" },
    }),
  ]);

  // KPIs
  const totalPrevu = commissions
    .filter((c) => c.statut === "prevu")
    .reduce((sum, c) => sum + c.montant, 0);
  const totalVerse = commissions
    .filter((c) => c.statut === "verse")
    .reduce((sum, c) => sum + c.montant, 0);
  const totalGestion = commissions
    .filter((c) => c.type === "GESTION")
    .reduce((sum, c) => sum + c.montant, 0);

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Commissions</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{fmt(totalVerse)}</p>
            <p className="text-xs text-muted-foreground">Total versé</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{fmt(totalPrevu)}</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{fmt(totalGestion)}</p>
            <p className="text-xs text-muted-foreground">CA récurrent (gestion)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CommissionTable commissions={commissions} />
        </div>
        <div>
          <CompagnieProgress compagnies={compagnies} />
        </div>
      </div>
    </div>
  );
}
