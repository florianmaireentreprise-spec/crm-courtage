import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Building2, Pencil } from "lucide-react";
import { TYPES_PRESCRIPTEUR, ETAPES_PIPELINE } from "@/lib/constants";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DeletePrescripteurButton } from "@/components/prescripteurs/DeletePrescripteurButton";
import { deletePrescripteur } from "../actions";

export default async function PrescripteurDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const prescripteur = await prisma.prescripteur.findUnique({
    where: { id },
    include: {
      clients: {
        select: { id: true, raisonSociale: true, statut: true },
        orderBy: { raisonSociale: "asc" },
      },
      deals: {
        include: { client: true },
        orderBy: { dateMaj: "desc" },
        take: 10,
      },
    },
  });

  if (!prescripteur) notFound();

  const typeConfig = TYPES_PRESCRIPTEUR.find((t) => t.id === prescripteur.type);
  const conversionRate = prescripteur.dossiersEnvoyes > 0
    ? Math.round((prescripteur.clientsSignes / prescripteur.dossiersEnvoyes) * 100)
    : 0;

  const deleteAction = deletePrescripteur.bind(null, prescripteur.id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              {prescripteur.civilite} {prescripteur.prenom} {prescripteur.nom}
            </h1>
            {typeConfig && (
              <Badge variant="outline" style={{ borderColor: typeConfig.color, color: typeConfig.color }}>
                {typeConfig.label}
              </Badge>
            )}
          </div>
          {prescripteur.entreprise && (
            <p className="text-muted-foreground mt-1">{prescripteur.entreprise}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/prescripteurs/${prescripteur.id}/modifier`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </Link>
          <DeletePrescripteurButton action={deleteAction} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{prescripteur.dossiersEnvoyes}</p>
            <p className="text-xs text-muted-foreground">Dossiers envoyes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-600">{prescripteur.clientsSignes}</p>
            <p className="text-xs text-muted-foreground">Clients signes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-blue-600">{conversionRate}%</p>
            <p className="text-xs text-muted-foreground">Taux de conversion</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-amber-600">
              {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(prescripteur.commissionsGenerees)}
            </p>
            <p className="text-xs text-muted-foreground">Commissions generees</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coordonnees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {prescripteur.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${prescripteur.email}`} className="hover:underline">{prescripteur.email}</a>
              </div>
            )}
            {prescripteur.telephone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${prescripteur.telephone}`} className="hover:underline">{prescripteur.telephone}</a>
              </div>
            )}
            {prescripteur.adresse && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{prescripteur.adresse}{prescripteur.ville ? `, ${prescripteur.ville}` : ""}</span>
              </div>
            )}
            {prescripteur.derniereRecommandation && (
              <div className="text-muted-foreground">
                Derniere recommandation : {format(prescripteur.derniereRecommandation, "dd MMM yyyy", { locale: fr })}
              </div>
            )}
            {prescripteur.notes && (
              <div className="text-muted-foreground pt-2 border-t">
                {prescripteur.notes}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Clients recommandes ({prescripteur.clients.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {prescripteur.clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun client recommande</p>
            ) : (
              <div className="space-y-2">
                {prescripteur.clients.map((client) => (
                  <Link key={client.id} href={`/clients/${client.id}`} className="block">
                    <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{client.raisonSociale}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {client.statut === "client_actif" ? "Actif" : client.statut === "prospect" ? "Prospect" : "Ancien"}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {prescripteur.deals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Opportunites associees ({prescripteur.deals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {prescripteur.deals.map((deal) => {
                const etapeConfig = ETAPES_PIPELINE.find((e) => e.id === deal.etape);
                return (
                  <div key={deal.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/10">
                    <div>
                      <p className="text-sm font-medium">{deal.titre}</p>
                      <p className="text-xs text-muted-foreground">{deal.client.raisonSociale}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {deal.montantEstime && (
                        <span className="text-sm font-medium">
                          {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(deal.montantEstime)}
                        </span>
                      )}
                      {etapeConfig && (
                        <Badge variant="outline" className="text-[10px]" style={{ borderColor: etapeConfig.color, color: etapeConfig.color }}>
                          {etapeConfig.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
