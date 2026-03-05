import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Pencil } from "lucide-react";
import { TYPES_PRODUITS, STATUTS_CONTRAT } from "@/lib/constants";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function CompagnieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const compagnie = await prisma.compagnie.findUnique({
    where: { id },
    include: {
      contrats: {
        include: { client: true, commissions: true },
        orderBy: { dateCreation: "desc" },
      },
    },
  });

  if (!compagnie) notFound();

  const totalPrimes = compagnie.contrats.reduce((sum, c) => sum + c.primeAnnuelle, 0);
  const totalCommissions = compagnie.contrats.reduce(
    (sum, c) => sum + c.commissions.reduce((s, comm) => s + comm.montant, 0),
    0
  );
  const contratsActifs = compagnie.contrats.filter((c) => c.statut === "actif").length;

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/compagnies">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{compagnie.nom}</h1>
          <p className="text-sm text-muted-foreground">{compagnie.type ?? "Compagnie d'assurance"}</p>
        </div>
        <Link href={`/compagnies/${id}/modifier`}>
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{contratsActifs}</p>
            <p className="text-xs text-muted-foreground">Contrats actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{fmt(totalPrimes)}</p>
            <p className="text-xs text-muted-foreground">Primes annuelles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{fmt(totalCommissions)}</p>
            <p className="text-xs text-muted-foreground">Commissions totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <Badge variant={compagnie.conventionSignee ? "default" : "outline"}>
              {compagnie.conventionSignee ? "Convention signée" : "Pas de convention"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {compagnie.contactNom && <p><span className="text-muted-foreground">Nom :</span> {compagnie.contactNom}</p>}
            {compagnie.contactEmail && <p><span className="text-muted-foreground">Email :</span> {compagnie.contactEmail}</p>}
            {compagnie.contactTelephone && <p><span className="text-muted-foreground">Tél :</span> {compagnie.contactTelephone}</p>}
            {compagnie.notes && (
              <>
                <p className="text-muted-foreground mt-4">Notes :</p>
                <p className="whitespace-pre-wrap">{compagnie.notes}</p>
              </>
            )}
            {compagnie.seuilSurcommission && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-muted-foreground">Surcommission :</p>
                <p>Seuil : {compagnie.seuilSurcommission} contrats</p>
                <p>Taux : {((compagnie.tauxSurcommission ?? 0) * 100).toFixed(1)}%</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contrats ({compagnie.contrats.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Prime</TableHead>
                    <TableHead>Date effet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compagnie.contrats.map((contrat) => {
                    const produit = TYPES_PRODUITS[contrat.typeProduit as keyof typeof TYPES_PRODUITS];
                    const statutConfig = STATUTS_CONTRAT.find((s) => s.id === contrat.statut);
                    return (
                      <TableRow key={contrat.id}>
                        <TableCell>
                          <Link
                            href={`/clients/${contrat.clientId}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {contrat.client.raisonSociale}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: produit?.color }}
                            />
                            <span className="text-sm">{produit?.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            style={{ borderColor: statutConfig?.color, color: statutConfig?.color }}
                          >
                            {statutConfig?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {fmt(contrat.primeAnnuelle)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(contrat.dateEffet, "dd/MM/yyyy", { locale: fr })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
