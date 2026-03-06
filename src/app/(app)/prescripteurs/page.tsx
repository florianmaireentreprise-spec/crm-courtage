import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Handshake, Mail, Phone, Users, Euro } from "lucide-react";
import { TYPES_PRESCRIPTEUR } from "@/lib/constants";

export default async function PrescripteursPage() {
  const prescripteurs = await prisma.prescripteur.findMany({
    include: {
      _count: {
        select: { clients: true, deals: true },
      },
    },
    orderBy: { commissionsGenerees: "desc" },
  });

  const totalPrescripteurs = prescripteurs.length;
  const totalDossiers = prescripteurs.reduce((s, p) => s + p.dossiersEnvoyes, 0);
  const totalSignes = prescripteurs.reduce((s, p) => s + p.clientsSignes, 0);
  const totalCommissions = prescripteurs.reduce((s, p) => s + p.commissionsGenerees, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Prescripteurs</h1>
        <Link href="/prescripteurs/nouveau">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau prescripteur
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{totalPrescripteurs}</p>
            <p className="text-xs text-muted-foreground">Prescripteurs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-blue-600">{totalDossiers}</p>
            <p className="text-xs text-muted-foreground">Dossiers envoyes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-600">{totalSignes}</p>
            <p className="text-xs text-muted-foreground">Clients signes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-amber-600">
              {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(totalCommissions)}
            </p>
            <p className="text-xs text-muted-foreground">Commissions generees</p>
          </CardContent>
        </Card>
      </div>

      {prescripteurs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Handshake className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun prescripteur enregistre</p>
            <p className="text-sm text-muted-foreground mt-1">
              Ajoutez vos experts-comptables, avocats et partenaires apporteurs d&apos;affaires.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {prescripteurs.map((p) => {
            const typeConfig = TYPES_PRESCRIPTEUR.find((t) => t.id === p.type);
            const conversionRate = p.dossiersEnvoyes > 0
              ? Math.round((p.clientsSignes / p.dossiersEnvoyes) * 100)
              : 0;

            return (
              <Link key={p.id} href={`/prescripteurs/${p.id}`}>
                <Card className="hover:bg-muted/30 transition-colors">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">
                            {p.civilite} {p.prenom} {p.nom}
                          </p>
                          {typeConfig && (
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                              style={{ borderColor: typeConfig.color, color: typeConfig.color }}
                            >
                              {typeConfig.label}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          {p.entreprise && (
                            <span className="text-xs text-muted-foreground">{p.entreprise}</span>
                          )}
                          {p.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{p.email}</span>
                            </div>
                          )}
                          {p.telephone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{p.telephone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="text-sm font-medium">{p.dossiersEnvoyes} / {p.clientsSignes}</p>
                          <p className="text-[10px] text-muted-foreground">Dossiers / Signes</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{conversionRate}%</p>
                          <p className="text-[10px] text-muted-foreground">Conversion</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-600">
                            {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(p.commissionsGenerees)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Commissions</p>
                        </div>
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
