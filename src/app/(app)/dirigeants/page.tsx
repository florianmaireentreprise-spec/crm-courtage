import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, UserCheck, Building2, Shield, PiggyBank } from "lucide-react";
import { STATUTS_DIRIGEANT } from "@/lib/constants";

export default async function DirigeantsPage() {
  const dirigeants = await prisma.dirigeant.findMany({
    include: {
      client: {
        select: {
          id: true,
          raisonSociale: true,
          statut: true,
          nbSalaries: true,
        },
      },
    },
    orderBy: { dateMaj: "desc" },
  });

  const totalDirigeants = dirigeants.length;
  const tns = dirigeants.filter((d) => d.statutProfessionnel === "TNS").length;
  const assimiles = dirigeants.filter((d) => d.statutProfessionnel === "assimile_salarie").length;
  const sansAudit = dirigeants.filter((d) => !d.dateAuditDirigeant).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dirigeants</h1>
        <Link href="/dirigeants/nouveau">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau dirigeant
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{totalDirigeants}</p>
            <p className="text-xs text-muted-foreground">Total dirigeants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-blue-600">{tns}</p>
            <p className="text-xs text-muted-foreground">TNS</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-purple-600">{assimiles}</p>
            <p className="text-xs text-muted-foreground">Assimiles salaries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-amber-600">{sansAudit}</p>
            <p className="text-xs text-muted-foreground">Sans audit</p>
          </CardContent>
        </Card>
      </div>

      {dirigeants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun dirigeant enregistre</p>
            <p className="text-sm text-muted-foreground mt-1">
              Ajoutez les dirigeants de vos clients pour suivre leur protection sociale.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {dirigeants.map((d) => {
            const statutLabel = STATUTS_DIRIGEANT.find((s) => s.id === d.statutProfessionnel)?.label;
            return (
              <Link key={d.id} href={`/clients/${d.clientId}`}>
                <Card className="hover:bg-muted/30 transition-colors">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">
                            {d.civilite} {d.prenom} {d.nom}
                          </p>
                          {statutLabel && (
                            <Badge variant="outline" className="text-[10px]">
                              {statutLabel}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{d.client.raisonSociale}</span>
                          </div>
                          {d.protectionActuelle && (
                            <div className="flex items-center gap-1">
                              <Shield className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">{d.protectionActuelle}</span>
                            </div>
                          )}
                          {d.montantEpargne != null && d.montantEpargne > 0 && (
                            <div className="flex items-center gap-1">
                              <PiggyBank className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(d.montantEpargne)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!d.dateAuditDirigeant && (
                          <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700">
                            Audit a faire
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
