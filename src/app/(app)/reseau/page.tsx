import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, Users, Target, ArrowRight, TrendingUp } from "lucide-react";
import { CATEGORIES_RESEAU, STATUTS_CLIENT } from "@/lib/constants";
import { ReseauObjectifForm } from "@/components/reseau/ReseauObjectifForm";
import { AddContactButton } from "@/components/reseau/AddContactButton";

export default async function ReseauPage() {
  const clientsReseau = await prisma.client.findMany({
    where: { categorieReseau: { not: null } },
    include: {
      _count: { select: { contrats: true, deals: true } },
    },
    orderBy: { raisonSociale: "asc" },
  });

  const objectifs = await prisma.reseauObjectif.findMany();

  const categorieStats = CATEGORIES_RESEAU.map((cat) => {
    const clients = clientsReseau.filter((c) => c.categorieReseau === cat.id);
    const prospects = clients.filter((c) => c.statut === "prospect").length;
    const actifs = clients.filter((c) => c.statut === "client_actif").length;
    const total = clients.length;
    const tauxConversionReel = total > 0 ? (actifs / total) * 100 : 0;
    const obj = objectifs.find((o) => o.categorie === cat.id);

    const contactsObj = obj?.contactsObjectif ?? 0;
    const tauxObj = obj?.tauxConversionObj ?? 0;
    const potentielUnit = obj?.potentielUnitaire ?? 0;
    const potentielTotal = contactsObj * tauxObj * potentielUnit;

    return {
      ...cat,
      total,
      prospects,
      actifs,
      clients,
      tauxConversionReel,
      objectif: obj,
      contactsObj,
      tauxConversionObj: tauxObj * 100,
      potentielUnit,
      potentielTotal,
    };
  });

  const totalReseau = clientsReseau.length;
  const totalProspects = clientsReseau.filter((c) => c.statut === "prospect").length;
  const totalActifs = clientsReseau.filter((c) => c.statut === "client_actif").length;
  const tauxConversionGlobal = totalReseau > 0 ? (totalActifs / totalReseau) * 100 : 0;
  const potentielGlobal = categorieStats.reduce((sum, c) => sum + c.potentielTotal, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reseau personnel strategique</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerez votre reseau, definissez vos objectifs de conversion et suivez le potentiel commercial.
          </p>
        </div>
        <AddContactButton />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
            <p className="text-2xl font-bold text-blue-600">{tauxConversionGlobal.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Taux conversion reel</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-emerald-600">
              {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(potentielGlobal)}
            </p>
            <p className="text-xs text-muted-foreground">Potentiel CA total</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance par categorie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Categorie</th>
                  <th className="pb-2 font-medium text-center">Contacts</th>
                  <th className="pb-2 font-medium text-center">Objectif</th>
                  <th className="pb-2 font-medium text-center">Actifs</th>
                  <th className="pb-2 font-medium text-center">Conv. reel</th>
                  <th className="pb-2 font-medium text-center">Conv. objectif</th>
                  <th className="pb-2 font-medium text-right">Potentiel/client</th>
                  <th className="pb-2 font-medium text-right">Potentiel total</th>
                  <th className="pb-2 font-medium text-center">Parametres</th>
                </tr>
              </thead>
              <tbody>
                {categorieStats.map((cat) => (
                  <tr key={cat.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="font-medium">{cat.label}</span>
                      </div>
                    </td>
                    <td className="py-3 text-center">{cat.total}</td>
                    <td className="py-3 text-center text-muted-foreground">{cat.contactsObj || "-"}</td>
                    <td className="py-3 text-center">
                      <span className="text-green-600 font-medium">{cat.actifs}</span>
                    </td>
                    <td className="py-3 text-center">
                      <Badge variant={cat.tauxConversionReel >= cat.tauxConversionObj ? "default" : "outline"}>
                        {cat.tauxConversionReel.toFixed(0)}%
                      </Badge>
                    </td>
                    <td className="py-3 text-center text-muted-foreground">
                      {cat.tauxConversionObj > 0 ? `${cat.tauxConversionObj.toFixed(0)}%` : "-"}
                    </td>
                    <td className="py-3 text-right text-muted-foreground">
                      {cat.potentielUnit > 0
                        ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cat.potentielUnit)
                        : "-"}
                    </td>
                    <td className="py-3 text-right font-medium">
                      {cat.potentielTotal > 0
                        ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cat.potentielTotal)
                        : "-"}
                    </td>
                    <td className="py-3 text-center">
                      <ReseauObjectifForm categorie={cat.id} categorieLabel={cat.label} objectif={cat.objectif} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categorieStats.map((cat) => (
          <Card key={cat.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.label}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {cat.tauxConversionReel > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {cat.tauxConversionReel.toFixed(0)}% conv.
                    </Badge>
                  )}
                  <Badge variant="outline">{cat.total}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {cat.clients.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun contact</p>
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
          <div className="flex items-center gap-4 text-sm">
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
        </CardContent>
      </Card>
    </div>
  );
}
