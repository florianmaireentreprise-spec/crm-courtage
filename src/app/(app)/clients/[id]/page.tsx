import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Mail, Phone, MapPin, Building2 } from "lucide-react";
import { STATUTS_CLIENT, TYPES_PRODUITS, ETAPES_PIPELINE, PRIORITES } from "@/lib/constants";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      contrats: {
        include: { compagnie: true },
        orderBy: { dateEffet: "desc" },
      },
      deals: {
        orderBy: { dateMaj: "desc" },
      },
      taches: {
        where: { statut: { in: ["a_faire", "en_cours"] } },
        orderBy: { dateEcheance: "asc" },
      },
    },
  });

  if (!client) notFound();

  const statutConfig = STATUTS_CLIENT.find((s) => s.id === client.statut);
  const caRecurrent = client.contrats
    .filter((c) => c.statut === "actif")
    .reduce((sum, c) => sum + (c.commissionAnnuelle ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{client.raisonSociale}</h1>
            <Badge
              variant="outline"
              style={{ borderColor: statutConfig?.color, color: statutConfig?.color }}
            >
              {statutConfig?.label}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {client.civilite} {client.prenom} {client.nom}
            {client.formeJuridique && ` — ${client.formeJuridique}`}
          </p>
        </div>
        <Link href={`/clients/${id}/modifier`}>
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{client.contrats.filter((c) => c.statut === "actif").length}</p>
            <p className="text-xs text-muted-foreground">Contrats actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(caRecurrent)}
            </p>
            <p className="text-xs text-muted-foreground">Commission annuelle</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{client.nbSalaries ?? "-"}</p>
            <p className="text-xs text-muted-foreground">Salariés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{client.deals.length}</p>
            <p className="text-xs text-muted-foreground">Opportunités</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Coordonnées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {client.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a>
              </div>
            )}
            {client.telephone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${client.telephone}`} className="hover:underline">{client.telephone}</a>
              </div>
            )}
            {client.adresse && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{client.adresse}, {client.codePostal} {client.ville}</span>
              </div>
            )}
            {client.secteurActivite && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{client.secteurActivite}</span>
              </div>
            )}
            {client.siret && (
              <div className="text-muted-foreground">SIRET : {client.siret}</div>
            )}
            {client.sourceAcquisition && (
              <div className="text-muted-foreground">Source : {client.sourceAcquisition}</div>
            )}
            {client.prescripteur && (
              <div className="text-muted-foreground">Prescripteur : {client.prescripteur}</div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="contrats">
            <TabsList>
              <TabsTrigger value="contrats">Contrats ({client.contrats.length})</TabsTrigger>
              <TabsTrigger value="pipeline">Pipeline ({client.deals.length})</TabsTrigger>
              <TabsTrigger value="taches">Tâches ({client.taches.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="contrats" className="mt-4">
              {client.contrats.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">Aucun contrat</p>
              ) : (
                <div className="space-y-2">
                  {client.contrats.map((contrat) => {
                    const typeConfig = TYPES_PRODUITS[contrat.typeProduit as keyof typeof TYPES_PRODUITS];
                    return (
                      <Link key={contrat.id} href={`/contrats/${contrat.id}`} className="block">
                        <Card className="hover:bg-muted/30 transition-colors">
                          <CardContent className="py-3 flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: typeConfig?.color }}
                                />
                                <span className="font-medium text-sm">{typeConfig?.label}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {contrat.compagnie?.nom} — {contrat.nomProduit}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-sm">
                                {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(contrat.primeAnnuelle)}
                                /an
                              </p>
                              <Badge variant={contrat.statut === "actif" ? "default" : "secondary"} className="text-[10px]">
                                {contrat.statut}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="pipeline" className="mt-4">
              {client.deals.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">Aucune opportunité</p>
              ) : (
                <div className="space-y-2">
                  {client.deals.map((deal) => {
                    const etapeConfig = ETAPES_PIPELINE.find((e) => e.id === deal.etape);
                    return (
                      <Card key={deal.id}>
                        <CardContent className="py-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{deal.titre}</p>
                            <Badge
                              variant="outline"
                              className="mt-1 text-[10px]"
                              style={{ borderColor: etapeConfig?.color, color: etapeConfig?.color }}
                            >
                              {etapeConfig?.label}
                            </Badge>
                          </div>
                          {deal.montantEstime && (
                            <p className="font-medium text-sm">
                              {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(deal.montantEstime)}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="taches" className="mt-4">
              {client.taches.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">Aucune tâche en cours</p>
              ) : (
                <div className="space-y-2">
                  {client.taches.map((tache) => {
                    const prioriteConfig = PRIORITES.find((p) => p.id === tache.priorite);
                    return (
                      <Card key={tache.id}>
                        <CardContent className="py-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{tache.titre}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Échéance : {format(tache.dateEcheance, "dd MMM yyyy", { locale: fr })}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            style={{ borderColor: prioriteConfig?.color, color: prioriteConfig?.color }}
                          >
                            {prioriteConfig?.label}
                          </Badge>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
