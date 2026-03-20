import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Target, Lightbulb } from "lucide-react";
import {
  CATEGORIES_RESEAU,
  TYPES_RELATION_RESEAU,
  ROLES_RESEAU,
  HORIZONS_ACTIVATION,
  COEFFICIENTS_STATUT_RESEAU,
  STATUTS_RESEAU,
  computePrioriteReseau,
  PRIORITES_RESEAU_CONFIG,
} from "@/lib/constants";

type ForecastContact = {
  id: string;
  raisonSociale: string;
  categorieReseau: string | null;
  typeRelation: string | null;
  rolesReseau: string[];
  statutReseau: string | null;
  niveauPotentiel: string | null;
  potentielAffaires: string | null;
  potentielEstimeAnnuel: number | null;
  horizonActivation: string | null;
};

type ForecastData = {
  potentielBrut: number;
  potentielPondere: number;
  potentielCourtTerme: number;
  nbActivables: number;
  nbFortPotentiel: number;
  nbFortPotentielAffaires: number;
  byCategorie: { id: string; label: string; color: string; brut: number; pondere: number; count: number }[];
  byType: { id: string; label: string; brut: number; pondere: number; count: number }[];
  byHorizon: { id: string; label: string; brut: number; pondere: number; count: number }[];
  byPriorite: { id: string; label: string; color: string; count: number; brut: number; pondere: number }[];
  insights: string[];
};

function computeForecast(contacts: ForecastContact[]): ForecastData {
  // Filter contacts with potentielEstimeAnnuel
  const withPotentiel = contacts.filter((c) => c.potentielEstimeAnnuel != null && c.potentielEstimeAnnuel > 0);

  // Potentiel brut = sum of all potentielEstimeAnnuel
  const potentielBrut = withPotentiel.reduce((sum, c) => sum + (c.potentielEstimeAnnuel ?? 0), 0);

  // Potentiel pondere = sum of potentielEstimeAnnuel * coefficient[statutReseau]
  const potentielPondere = withPotentiel.reduce((sum, c) => {
    const coeff = COEFFICIENTS_STATUT_RESEAU[c.statutReseau ?? ""] ?? 0;
    return sum + (c.potentielEstimeAnnuel ?? 0) * coeff;
  }, 0);

  // Lancement = pondere where horizonActivation === "lancement"
  const potentielCourtTerme = withPotentiel
    .filter((c) => c.horizonActivation === "lancement")
    .reduce((sum, c) => {
      const coeff = COEFFICIENTS_STATUT_RESEAU[c.statutReseau ?? ""] ?? 0;
      return sum + (c.potentielEstimeAnnuel ?? 0) * coeff;
    }, 0);

  // Activables = contacts in actionable statuts
  const statutsActivables = ["a_contacter", "premier_echange", "suivi_en_cours"];
  const nbActivables = contacts.filter((c) => statutsActivables.includes(c.statutReseau ?? "")).length;

  // Forte probabilite conversion
  const nbFortPotentiel = contacts.filter((c) => c.niveauPotentiel === "fort").length;

  // Fort potentiel affaires (fort ou strategique)
  const nbFortPotentielAffaires = contacts.filter((c) => c.potentielAffaires === "fort" || c.potentielAffaires === "strategique").length;

  // Breakdown by categorie
  const byCategorie = CATEGORIES_RESEAU.map((cat) => {
    const catContacts = withPotentiel.filter((c) => c.categorieReseau === cat.id);
    const brut = catContacts.reduce((s, c) => s + (c.potentielEstimeAnnuel ?? 0), 0);
    const pondere = catContacts.reduce((s, c) => {
      const coeff = COEFFICIENTS_STATUT_RESEAU[c.statutReseau ?? ""] ?? 0;
      return s + (c.potentielEstimeAnnuel ?? 0) * coeff;
    }, 0);
    return { id: cat.id, label: cat.label, color: cat.color, brut, pondere, count: catContacts.length };
  }).filter((c) => c.count > 0);

  // Breakdown by role (multi-role aware — a contact counted in each role it has)
  const byType = ROLES_RESEAU.map((role) => {
    const roleContacts = withPotentiel.filter((c) => {
      if (c.rolesReseau && c.rolesReseau.length > 0) return c.rolesReseau.includes(role.id);
      // Backward compat: map old typeRelation
      const map: Record<string, string> = { client_potentiel_direct: "prospect_direct", prescripteur: "prescripteur_potentiel", partenaire: "partenaire", ancien_client: "ancien_client" };
      return c.typeRelation ? map[c.typeRelation] === role.id : false;
    });
    const brut = roleContacts.reduce((s, c) => s + (c.potentielEstimeAnnuel ?? 0), 0);
    const pondere = roleContacts.reduce((s, c) => {
      const coeff = COEFFICIENTS_STATUT_RESEAU[c.statutReseau ?? ""] ?? 0;
      return s + (c.potentielEstimeAnnuel ?? 0) * coeff;
    }, 0);
    return { id: role.id, label: role.label, brut, pondere, count: roleContacts.length };
  }).filter((t) => t.count > 0);

  // Breakdown by horizon
  const byHorizon = HORIZONS_ACTIVATION.map((h) => {
    const hContacts = withPotentiel.filter((c) => c.horizonActivation === h.id);
    const brut = hContacts.reduce((s, c) => s + (c.potentielEstimeAnnuel ?? 0), 0);
    const pondere = hContacts.reduce((s, c) => {
      const coeff = COEFFICIENTS_STATUT_RESEAU[c.statutReseau ?? ""] ?? 0;
      return s + (c.potentielEstimeAnnuel ?? 0) * coeff;
    }, 0);
    return { id: h.id, label: h.label, brut, pondere, count: hContacts.length };
  }).filter((h) => h.count > 0);

  // Breakdown by priority class
  const byPriorite = (["A", "B", "C"] as const).map((prio) => {
    const config = PRIORITES_RESEAU_CONFIG[prio];
    const prioContacts = contacts.filter((c) => computePrioriteReseau(c.niveauPotentiel, c.potentielAffaires) === prio);
    const prioWithPot = prioContacts.filter((c) => c.potentielEstimeAnnuel != null && c.potentielEstimeAnnuel > 0);
    const brut = prioWithPot.reduce((s, c) => s + (c.potentielEstimeAnnuel ?? 0), 0);
    const pondere = prioWithPot.reduce((s, c) => {
      const coeff = COEFFICIENTS_STATUT_RESEAU[c.statutReseau ?? ""] ?? 0;
      return s + (c.potentielEstimeAnnuel ?? 0) * coeff;
    }, 0);
    return { id: prio, label: config.label, color: config.color, count: prioContacts.length, brut, pondere };
  }).filter((p) => p.count > 0);

  // Operational insights
  const insights: string[] = [];

  // 1. Forte probabilite not yet activated (early stages)
  const earlyStatuts = ["aucune_demarche", "a_qualifier", "a_contacter"];
  const fortNonActives = contacts.filter(
    (c) => c.niveauPotentiel === "fort" && earlyStatuts.includes(c.statutReseau ?? "")
  );
  if (fortNonActives.length > 0) {
    const totalPotentiel = fortNonActives.reduce((s, c) => s + (c.potentielEstimeAnnuel ?? 0), 0);
    insights.push(
      `${fortNonActives.length} contact${fortNonActives.length > 1 ? "s" : ""} a forte probabilite de conversion ${totalPotentiel > 0 ? `(${formatCurrency(totalPotentiel)})` : ""} encore en phase initiale — priorite d'activation.`
    );
  }

  // 2. Lancement + high probability or high value
  const lancementFort = contacts.filter(
    (c) => c.horizonActivation === "lancement" && (c.niveauPotentiel === "fort" || (c.potentielEstimeAnnuel ?? 0) >= 5000)
  );
  if (lancementFort.length > 0) {
    insights.push(
      `${lancementFort.length} contact${lancementFort.length > 1 ? "s" : ""} "Au lancement" a forte probabilite — activables immediatement.`
    );
  }

  // 3. Strongest category
  const bestCat = byCategorie.reduce<(typeof byCategorie)[0] | null>(
    (best, cat) => (!best || cat.pondere > best.pondere ? cat : best),
    null
  );
  if (bestCat && bestCat.pondere > 0) {
    insights.push(
      `Categorie la plus prometteuse : ${bestCat.label} avec ${formatCurrency(bestCat.pondere)} de potentiel pondere (${bestCat.count} contacts).`
    );
  }

  // 4. Contacts without potentiel estimate
  const sansPotentiel = contacts.filter((c) => c.potentielEstimeAnnuel == null || c.potentielEstimeAnnuel === 0);
  const sansPotentielActifs = sansPotentiel.filter((c) => !["sans_suite", "actif"].includes(c.statutReseau ?? ""));
  if (sansPotentielActifs.length > 0) {
    insights.push(
      `${sansPotentielActifs.length} contact${sansPotentielActifs.length > 1 ? "s" : ""} actif${sansPotentielActifs.length > 1 ? "s" : ""} sans estimation de potentiel — a qualifier pour affiner le forecast.`
    );
  }

  // 5. Prescripteurs actifs (indirect value)
  const prescripteursActifs = contacts.filter((c) => c.typeRelation === "prescripteur" && c.statutReseau === "actif");
  if (prescripteursActifs.length > 0) {
    insights.push(
      `${prescripteursActifs.length} prescripteur${prescripteursActifs.length > 1 ? "s" : ""} actif${prescripteursActifs.length > 1 ? "s" : ""} — potentiel indirect via referrals.`
    );
  }

  return {
    potentielBrut,
    potentielPondere,
    potentielCourtTerme,
    nbActivables,
    nbFortPotentiel,
    nbFortPotentielAffaires,
    byCategorie,
    byType,
    byHorizon,
    byPriorite,
    insights,
  };
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export function ReseauForecast({ contacts }: { contacts: ForecastContact[] }) {
  const forecast = computeForecast(contacts);

  // Don't render if no contacts have potentiel data and no activables
  if (forecast.potentielBrut === 0 && forecast.nbActivables === 0 && forecast.nbFortPotentiel === 0 && forecast.nbFortPotentielAffaires === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Forecast lancement — potentiel reseau
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Estimation basee sur le potentiel estime par contact, pondere par le statut d&apos;avancement dans le reseau.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-lg font-bold">{formatCurrency(forecast.potentielBrut)}</p>
            <p className="text-[11px] text-muted-foreground">Potentiel brut</p>
          </div>
          <div className="rounded-lg border p-3 border-blue-200 bg-blue-50/30 dark:bg-blue-950/10">
            <p className="text-lg font-bold text-blue-600">{formatCurrency(forecast.potentielPondere)}</p>
            <p className="text-[11px] text-muted-foreground">Potentiel pondere</p>
          </div>
          <div className="rounded-lg border p-3 border-violet-200 bg-violet-50/30 dark:bg-violet-950/10">
            <p className="text-lg font-bold text-violet-600">{formatCurrency(forecast.potentielCourtTerme)}</p>
            <p className="text-[11px] text-muted-foreground">Au lancement (pondere)</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-lg font-bold text-amber-600">{forecast.nbActivables}</p>
            <p className="text-[11px] text-muted-foreground">Contacts activables</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-lg font-bold text-emerald-600">{forecast.nbFortPotentiel}</p>
            <p className="text-[11px] text-muted-foreground">Forte probabilite</p>
          </div>
          <div className="rounded-lg border p-3 border-orange-200 bg-orange-50/30 dark:bg-orange-950/10">
            <p className="text-lg font-bold text-orange-600">{forecast.nbFortPotentielAffaires}</p>
            <p className="text-[11px] text-muted-foreground">Fort pot. affaires</p>
          </div>
        </div>

        {/* Breakdowns */}
        {(forecast.byCategorie.length > 0 || forecast.byType.length > 0 || forecast.byHorizon.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* By categorie */}
            {forecast.byCategorie.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Par categorie
                </h4>
                <div className="space-y-1.5">
                  {forecast.byCategorie.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="truncate">{cat.label}</span>
                        <span className="text-muted-foreground">({cat.count})</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground">{formatCurrency(cat.brut)}</span>
                        <span className="font-medium text-blue-600">{formatCurrency(cat.pondere)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* By role */}
            {forecast.byType.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Par role
                </h4>
                <div className="space-y-1.5">
                  {forecast.byType.map((type) => (
                    <div key={type.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{type.label}</span>
                        <span className="text-muted-foreground">({type.count})</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground">{formatCurrency(type.brut)}</span>
                        <span className="font-medium text-blue-600">{formatCurrency(type.pondere)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* By horizon */}
            {forecast.byHorizon.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  Par moment d&apos;activation
                </h4>
                <div className="space-y-1.5">
                  {forecast.byHorizon.map((h) => (
                    <div key={h.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{h.label}</span>
                        <span className="text-muted-foreground">({h.count})</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground">{formatCurrency(h.brut)}</span>
                        <span className="font-medium text-blue-600">{formatCurrency(h.pondere)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Priority breakdown */}
        {forecast.byPriorite.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Target className="h-3 w-3" />
              Repartition par priorite
              <span className="text-[10px] font-normal ml-1">(probabilite x potentiel affaires)</span>
            </h4>
            <div className="flex gap-3">
              {forecast.byPriorite.map((p) => (
                <div key={p.id} className="flex-1 rounded-lg border p-3" style={{ borderColor: p.color + "40" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Badge className={`text-[10px] px-1.5 py-0 ${PRIORITES_RESEAU_CONFIG[p.id]?.bgClass ?? ""}`}>
                      {p.label}
                    </Badge>
                  </div>
                  <p className="text-lg font-bold" style={{ color: p.color }}>{p.count}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {p.brut > 0 && `${formatCurrency(p.pondere)} pondere`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coefficient legend */}
        <div className="border-t pt-3">
          <p className="text-[10px] text-muted-foreground mb-1.5">Coefficients de ponderation :</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUTS_RESEAU.filter((s) => s.id !== "sans_suite").map((s) => {
              const coeff = COEFFICIENTS_STATUT_RESEAU[s.id] ?? 0;
              return (
                <Badge key={s.id} variant="outline" className="text-[9px] px-1.5 py-0" style={{ borderColor: s.color, color: s.color }}>
                  {s.label}: {(coeff * 100).toFixed(0)}%
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Operational insights */}
        {forecast.insights.length > 0 && (
          <div className="border-t pt-3">
            <h4 className="text-xs font-medium flex items-center gap-1.5 mb-2">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              Insights operationnels
            </h4>
            <ul className="space-y-1">
              {forecast.insights.map((insight, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
