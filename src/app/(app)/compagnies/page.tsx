import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, ExternalLink } from "lucide-react";

export default async function CompagniesPage() {
  const compagnies = await prisma.compagnie.findMany({
    include: {
      contrats: { where: { statut: "actif" } },
    },
    orderBy: { nom: "asc" },
  });

  const totalContrats = compagnies.reduce((sum, c) => sum + c.contrats.length, 0);
  const totalPrimes = compagnies.reduce(
    (sum, c) => sum + c.contrats.reduce((s, ct) => s + ct.primeAnnuelle, 0),
    0
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Compagnies</h1>
        <Link href="/compagnies/nouveau">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle compagnie
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{compagnies.length}</p>
            <p className="text-xs text-muted-foreground">Compagnies partenaires</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{totalContrats}</p>
            <p className="text-xs text-muted-foreground">Contrats actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{fmt(totalPrimes)}</p>
            <p className="text-xs text-muted-foreground">Primes totales</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Convention</TableHead>
              <TableHead className="text-right">Contrats actifs</TableHead>
              <TableHead className="text-right">Primes cumulées</TableHead>
              <TableHead>Surcommission</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {compagnies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Aucune compagnie enregistrée
                </TableCell>
              </TableRow>
            ) : (
              compagnies.map((comp) => {
                const primes = comp.contrats.reduce((s, c) => s + c.primeAnnuelle, 0);
                return (
                  <TableRow key={comp.id}>
                    <TableCell className="font-medium">{comp.nom}</TableCell>
                    <TableCell className="text-sm">
                      {comp.contactNom && (
                        <span>{comp.contactNom}</span>
                      )}
                      {comp.contactEmail && (
                        <span className="text-muted-foreground block text-xs">{comp.contactEmail}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={comp.conventionSignee ? "default" : "outline"}>
                        {comp.conventionSignee ? "Signée" : "Non signée"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{comp.contrats.length}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(primes)}</TableCell>
                    <TableCell>
                      {comp.seuilSurcommission ? (
                        <span className="text-xs">
                          {comp.seuilSurcommission} contrats → {((comp.tauxSurcommission ?? 0) * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/compagnies/${comp.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
