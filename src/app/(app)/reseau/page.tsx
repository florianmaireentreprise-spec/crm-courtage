import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Network, Users, Target, ArrowRight } from "lucide-react";
import { CATEGORIES_RESEAU, STATUTS_CLIENT } from "@/lib/constants";

export default async function ReseauPage() {
  // Clients marques dans le reseau personnel
  const clientsReseau = await prisma.client.findMany({
    where: {
      categorieReseau: { not: null },
    },
    include: {
      _count: { select: { contrats: true, deals: true } },
    },
    orderBy: { raisonSociale: "asc" },
  });

  // Stats par categorie
  const categorieStats = CATEGORIES_RESEAU.map((cat) => {
    const clients = clientsReseau.filter((c) => c.categorieReseau === cat.id);
    const prospects = clients.filter((c) => c.statut === "prospect").length;
    const actifs = clients.filter((c) => c.statut === "client_actif").length;
    return {
      ...cat,
      total: clients.length,
      prospects,
      actifs,
      clients,
    };
  });

  // Stats globales
  const totalReseau = clientsReseau.length;
  const totalProspects = clientsReseau.filter((c) => c.statut === "prospect").length;
  const totalActifs = clientsReseau.filter((c) => c.statut === "client_actif").length;
  const sansAudit = clientsReseau.filter(
    (c) => c.statut === "prospect" && c._count.deals === 0
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reseau personnel strategique</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Identifiez et developpez votre reseau pour generer des opportunites d&apos;audit.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{totalReseau}</p>
            <p className="text-xs text-muted-foreground">Total reseau</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-amber-600">{totalProspects}</p>
            <p className="text-xs text-muted-foreground">Prospects</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-600">{totalActifs}</p>
            <p className="text-xs text-muted-foreground">Clients actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-red-600">{sansAudit}</p>
            <p className="text-xs text-muted-foreground">A contacter (sans deal)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categorieStats.map((cat) => (
          <Card key={cat.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.label}
                </CardTitle>
                <Badge variant="outline">{cat.total}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {cat.clients.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun contact dans cette categorie</p>
              ) : (
                <div className="space-y-2">
                  {cat.clients.slice(0, 5).map((client) => {
                    const statutConfig = STATUTS_CLIENT.find((s) => s.id === client.statut);
                    return (
                      <Link key={client.id} href={`/clients/${client.id}`} className="block">
                        <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30 transition-colors">
                          <div>
                            <p className="text-sm font-medium">{client.raisonSociale}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {client.prenom} {client.nom}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                              style={{ borderColor: statutConfig?.color, color: statutConfig?.color }}
                            >
                              {statutConfig?.label}
                            </Badge>
                            {client._count.deals > 0 && (
                              <Badge variant="secondary" className="text-[10px]">
                                {client._count.deals} deal{client._count.deals > 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                  {cat.clients.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      + {cat.clients.length - 5} autres
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Objectif : Proposer un audit initial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Chaque contact de votre reseau doit recevoir une proposition d&apos;audit protection sociale.</span>
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-blue-500" />
              <span>Contact identifie</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              <span>Audit propose</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              <span>Recommandation & signature</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Pour ajouter un contact au reseau, modifiez la fiche client et selectionnez une categorie reseau.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
