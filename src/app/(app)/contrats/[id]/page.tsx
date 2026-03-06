import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import { TYPES_PRODUITS, STATUTS_CONTRAT, TYPES_COMMISSION, STATUTS_COMMISSION } from "@/lib/constants";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function ContratDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contrat = await prisma.contrat.findUnique({
    where: { id },
    include: {
      client: true,
      compagnie: true,
      commissions: { orderBy: { dateCreation: "desc" } },
    },
  });

  if (!contrat) notFound();

  const typeConfig = TYPES_PRODUITS[contrat.typeProduit as keyof typeof TYPES_PRODUITS];
  const statutConfig = STATUTS_CONTRAT.find((s) => s.id === contrat.statut);
  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: typeConfig?.color }} />
            <h1 className="text-2xl font-bold">{typeConfig?.label}</h1>
            <Badge variant="outline" style={{ borderColor: statutConfig?.color, color: statutConfig?.color }}>
              {statutConfig?.label}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            <Link href={`/clients/${contrat.clientId}`} className="hover:underline">
              {contrat.client.raisonSociale}
            </Link>
            {contrat.compagnie && ` — ${contrat.compagnie.nom}`}
            {contrat.nomProduit && ` — ${contrat.nomProduit}`}
          </p>
        </div>
        <Link href={`/contrats/${id}/modifier`}>
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold">{fmt(contrat.primeAnnuelle)}</p>
            <p className="text-xs text-muted-foreground">Prime annuelle</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold">{contrat.commissionAnnuelle ? fmt(contrat.commissionAnnuelle) : "-"}</p>
            <p className="text-xs text-muted-foreground">Commission annuelle</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold">{contrat.tauxCommApport ? `${(contrat.tauxCommApport * 100).toFixed(1)}%` : "-"}</p>
            <p className="text-xs text-muted-foreground">Taux apport</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold">{contrat.tauxCommGestion ? `${(contrat.tauxCommGestion * 100).toFixed(1)}%` : "-"}</p>
            <p className="text-xs text-muted-foreground">Taux gestion</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Détails du contrat</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {contrat.numeroContrat && <div><span className="text-muted-foreground">N° contrat :</span> {contrat.numeroContrat}</div>}
            <div><span className="text-muted-foreground">Date d&apos;effet :</span> {format(contrat.dateEffet, "dd MMMM yyyy", { locale: fr })}</div>
            {contrat.dateEcheance && <div><span className="text-muted-foreground">Échéance :</span> {format(contrat.dateEcheance, "dd MMMM yyyy", { locale: fr })}</div>}
            {contrat.modeVersement && <div><span className="text-muted-foreground">Mode de versement :</span> {contrat.modeVersement}</div>}
            {contrat.frequenceVersement && <div><span className="text-muted-foreground">Fréquence :</span> {contrat.frequenceVersement}</div>}
            {contrat.nbBeneficiaires && <div><span className="text-muted-foreground">Bénéficiaires :</span> {contrat.nbBeneficiaires}</div>}
            {contrat.cotisationUnitaire && <div><span className="text-muted-foreground">Cotisation unitaire :</span> {fmt(contrat.cotisationUnitaire)}/mois</div>}
            {contrat.notes && <div className="pt-2 border-t"><span className="text-muted-foreground">Notes :</span> {contrat.notes}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Commissions ({contrat.commissions.length})</CardTitle></CardHeader>
          <CardContent>
            {contrat.commissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune commission</p>
            ) : (
              <div className="space-y-2">
                {contrat.commissions.map((comm) => {
                  const typeC = TYPES_COMMISSION.find((t) => t.id === comm.type);
                  const statutC = STATUTS_COMMISSION.find((s) => s.id === comm.statut);
                  return (
                    <div key={comm.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <span className="text-sm font-medium">{typeC?.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{comm.periode}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{fmt(comm.montant)}</span>
                        <Badge variant="outline" style={{ borderColor: statutC?.color, color: statutC?.color }} className="text-[10px]">
                          {statutC?.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
