import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import { CATEGORIES_RESEAU } from "@/lib/constants";
import { ReseauObjectifForm } from "@/components/reseau/ReseauObjectifForm";
import { AddContactButton } from "@/components/reseau/AddContactButton";
import { ReseauContactList } from "@/components/reseau/ReseauContactList";
import { ReseauForecast } from "@/components/reseau/ReseauForecast";
import { calculerPotentielCADetail } from "@/lib/scoring/potentiel";
import { getBaseAssumptions, getClientOverridesBatch } from "@/lib/scoring/assumptions";
import { isPurePrescripteurReseau } from "@/lib/constants";

export default async function ReseauPage() {
  const [clientsReseau, objectifs] = await Promise.all([
    prisma.client.findMany({
      where: { categorieReseau: { not: null } },
      include: {
        _count: { select: { contrats: true, deals: true } },
        contrats: {
          where: { statut: "actif" },
          select: { typeProduit: true, statut: true },
        },
      },
      orderBy: { raisonSociale: "asc" },
    }),
    prisma.reseauObjectif.findMany(),
  ]);

  // ── Fetch global assumptions + client overrides for effective potentiel ──
  const clientIds = clientsReseau.map((c) => c.id);
  const [assumptions, allOverrides] = await Promise.all([
    getBaseAssumptions(),
    getClientOverridesBatch(clientIds),
  ]);

  // ── Compute effective potentiel per client ──
  const effectivePotentiels = new Map<string, { total: number; recurring: number; upfront: number }>();
  for (const c of clientsReseau) {
    const clientOverrides = allOverrides.filter((o) => o.clientId === c.id);
    const detail = calculerPotentielCADetail(c, c.contrats, assumptions, clientOverrides);
    effectivePotentiels.set(c.id, {
      total: detail.total,
      recurring: detail.recurringTotal,
      upfront: detail.upfrontTotal,
    });
  }

  // ── Category performance table — uses effective potentiels ──
  const categorieStats = CATEGORIES_RESEAU.map((cat) => {
    const clients = clientsReseau.filter((c) => c.categorieReseau === cat.id);
    const prospects = clients.filter((c) => c.statut === "prospect").length;
    const actifs = clients.filter((c) => c.statut === "client_actif").length;
    const total = clients.length;
    const tauxConversionReel = total > 0 ? (actifs / total) * 100 : 0;
    const obj = objectifs.find((o) => o.categorie === cat.id);

    // Effective potentiel per category — exclude pure prescripteurs from direct potential
    const directProspectClients = clients.filter((c) => !isPurePrescripteurReseau(c.rolesReseau, c.typeRelation));
    const potentielEffectifTotal = directProspectClients.reduce((sum, c) => sum + (effectivePotentiels.get(c.id)?.total ?? 0), 0);
    const potentielEffectifMoyen = directProspectClients.length > 0 ? Math.round(potentielEffectifTotal / directProspectClients.length) : 0;

    // Objective data (kept for conversion targets)
    const contactsObj = obj?.contactsObjectif ?? 0;
    const tauxObj = obj?.tauxConversionObj ?? 0;

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
      potentielEffectifMoyen,
      potentielEffectifTotal,
    };
  });

  const totalReseau = clientsReseau.length;
  const totalProspects = clientsReseau.filter((c) => c.statut === "prospect").length;
  const totalActifs = clientsReseau.filter((c) => c.statut === "client_actif").length;
  const tauxConversionGlobal = totalReseau > 0 ? (totalActifs / totalReseau) * 100 : 0;
  // Global potentiel — exclude pure prescripteurs
  const potentielGlobal = clientsReseau
    .filter((c) => !isPurePrescripteurReseau(c.rolesReseau, c.typeRelation))
    .reduce((sum, c) => sum + (effectivePotentiels.get(c.id)?.total ?? 0), 0);

  // Forecast data — uses effective potentiel (not manual potentielEstimeAnnuel)
  const forecastContacts = clientsReseau.map((c) => ({
    id: c.id,
    raisonSociale: c.raisonSociale,
    categorieReseau: c.categorieReseau,
    typeRelation: c.typeRelation,
    rolesReseau: c.rolesReseau,
    statutReseau: c.statutReseau,
    niveauPotentiel: c.niveauPotentiel,
    potentielAffaires: c.potentielAffaires,
    // Use effective potentiel — zero for pure prescripteurs (filtered in computeForecast too)
    potentielEstimeAnnuel: isPurePrescripteurReseau(c.rolesReseau, c.typeRelation)
      ? 0
      : (effectivePotentiels.get(c.id)?.total ?? 0),
    horizonActivation: c.horizonActivation,
  }));

  // Serialize for client component (dates → ISO strings)
  const clientsForList = clientsReseau.map((c) => ({
    id: c.id,
    raisonSociale: c.raisonSociale,
    prenom: c.prenom,
    nom: c.nom,
    email: c.email,
    telephone: c.telephone,
    ville: c.ville,
    statut: c.statut,
    categorieReseau: c.categorieReseau,
    typeRelation: c.typeRelation,
    rolesReseau: c.rolesReseau,
    statutReseau: c.statutReseau,
    niveauPotentiel: c.niveauPotentiel,
    potentielAffaires: c.potentielAffaires,
    // Use effective potentiel in the contact list display
    potentielEstimeAnnuel: effectivePotentiels.get(c.id)?.total ?? c.potentielEstimeAnnuel,
    horizonActivation: c.horizonActivation,
    prochaineActionReseau: c.prochaineActionReseau,
    dateRelanceReseau: c.dateRelanceReseau?.toISOString() ?? null,
    dateDernierContact: c.dateDernierContact?.toISOString() ?? null,
    _count: c._count,
    // Additional fields for rich edit modal
    civilite: c.civilite,
    secteurActivite: c.secteurActivite,
    notes: c.notes,
    siret: c.siret,
    formeJuridique: c.formeJuridique,
    codeNAF: c.codeNAF,
    trancheEffectifs: c.trancheEffectifs,
    nbSalaries: c.nbSalaries,
    adresse: c.adresse,
    codePostal: c.codePostal,
  }));

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
            <p className="text-xs text-muted-foreground">Potentiel CA total (effectif)</p>
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
                  <th className="pb-2 font-medium text-right">Pot. moyen/client</th>
                  <th className="pb-2 font-medium text-right">Pot. total effectif</th>
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
                      {cat.potentielEffectifMoyen > 0
                        ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cat.potentielEffectifMoyen)
                        : "-"}
                    </td>
                    <td className="py-3 text-right font-medium">
                      {cat.potentielEffectifTotal > 0
                        ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cat.potentielEffectifTotal)
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
          <p className="text-[10px] text-muted-foreground mt-3">
            Les colonnes Pot. moyen/client et Pot. total effectif sont calcules a partir des hypotheses globales, des donnees client et des surcharges manuelles.
          </p>
        </CardContent>
      </Card>

      <ReseauForecast contacts={forecastContacts} />

      <ReseauContactList clients={clientsForList} />
    </div>
  );
}
