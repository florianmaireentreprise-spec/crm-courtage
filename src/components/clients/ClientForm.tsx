"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SOURCES_ACQUISITION,
  FORMES_JURIDIQUES,
  STATUTS_CLIENT,
  CATEGORIES_RESEAU,
  STATUTS_RESEAU,
  NIVEAUX_POTENTIEL,
  POTENTIELS_AFFAIRES,
  HORIZONS_ACTIVATION,
  ROLES_RESEAU,
  computePrioriteReseau,
  PRIORITES_RESEAU_CONFIG,
} from "@/lib/constants";
import { CompanySearchButton } from "./CompanySearchButton";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Client, User } from "@prisma/client";

type Props = {
  client?: Client;
  users: Pick<User, "id" | "prenom" | "nom">[];
  prescripteurs?: { id: string; prenom: string; nom: string; entreprise: string | null }[];
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]> } | void>;
};

type SireneData = {
  raisonSociale?: string;
  siret?: string;
  formeJuridique?: string | null;
  codeNAF?: string | null;
  secteurActivite?: string | null;
  trancheEffectifs?: string | null;
  nbSalaries?: number | null;
  adresse?: string | null;
  codePostal?: string | null;
  ville?: string | null;
};

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  return isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
}

export function ClientForm({ client, users, prescripteurs, action }: Props) {
  const [sirene, setSirene] = useState<SireneData>({});
  const [formKey, setFormKey] = useState(0);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    (client as Client & { rolesReseau?: string[] })?.rolesReseau ?? []
  );

  function toggleRole(roleId: string) {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  }

  const handleSireneSelect = useCallback((company: {
    siren: string;
    siret: string;
    raisonSociale: string;
    formeJuridique: string | null;
    codeNAF: string | null;
    secteurActivite: string | null;
    trancheEffectifs: string | null;
    nbSalaries: number | null;
    adresse: string | null;
    codePostal: string | null;
    ville: string | null;
  }) => {
    setSirene({
      raisonSociale: company.raisonSociale,
      siret: company.siret,
      formeJuridique: company.formeJuridique,
      codeNAF: company.codeNAF,
      secteurActivite: company.secteurActivite,
      trancheEffectifs: company.trancheEffectifs,
      nbSalaries: company.nbSalaries,
      adresse: company.adresse,
      codePostal: company.codePostal,
      ville: company.ville,
    });
    setFormKey((k) => k + 1);
  }, []);

  // Merge: SIRENE overrides > existing client > empty
  const v = (field: keyof SireneData, clientField?: keyof Client) => {
    const sireneVal = sirene[field];
    if (sireneVal !== undefined && sireneVal !== null) return String(sireneVal);
    const cf = clientField ?? field;
    const clientVal = client?.[cf as keyof Client];
    if (clientVal !== undefined && clientVal !== null) return String(clientVal);
    return "";
  };

  // For formeJuridique, match against FORMES_JURIDIQUES list
  const formeJuridiqueDefault = (() => {
    const s = sirene.formeJuridique;
    if (s && (FORMES_JURIDIQUES as readonly string[]).includes(s)) return s;
    const c = client?.formeJuridique;
    if (c) return c;
    return "";
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CompanySearchButton onSelect={handleSireneSelect} />
        {sirene.raisonSociale && (
          <span className="text-sm text-green-600 font-medium">
            Pre-rempli depuis SIRENE : {sirene.raisonSociale}
          </span>
        )}
      </div>

      <form key={formKey} action={async (formData) => { await action(formData); }} className="space-y-6">
        {/* Hidden fields for SIRENE-only data */}
        <input type="hidden" name="codeNAF" value={v("codeNAF")} />
        <input type="hidden" name="trancheEffectifs" value={v("trancheEffectifs")} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entreprise</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="raisonSociale">Raison sociale</Label>
              <Input
                id="raisonSociale"
                name="raisonSociale"
                defaultValue={v("raisonSociale")}
                placeholder="Optionnel pour les contacts reseau"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siret">SIRET</Label>
              <Input id="siret" name="siret" defaultValue={v("siret")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="formeJuridique">Forme juridique</Label>
              <Select name="formeJuridique" defaultValue={formeJuridiqueDefault}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {FORMES_JURIDIQUES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secteurActivite">Secteur d&apos;activite</Label>
              <Input
                id="secteurActivite"
                name="secteurActivite"
                defaultValue={v("secteurActivite")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nbSalaries">Nb salaries (estime)</Label>
              <Input
                id="nbSalaries"
                name="nbSalaries"
                type="number"
                defaultValue={v("nbSalaries")}
              />
              {v("trancheEffectifs") && (
                <p className="text-xs text-muted-foreground">Tranche INSEE : {v("trancheEffectifs")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="chiffreAffaires">CA annuel estime</Label>
              <Input
                id="chiffreAffaires"
                name="chiffreAffaires"
                type="number"
                defaultValue={client?.chiffreAffaires ?? ""}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="conventionCollective">Convention collective</Label>
              <Input
                id="conventionCollective"
                name="conventionCollective"
                defaultValue={client?.conventionCollective ?? ""}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Couverture actuelle (Qualification)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mutuelleActuelle">Mutuelle actuelle</Label>
              <Input
                id="mutuelleActuelle"
                name="mutuelleActuelle"
                defaultValue={client?.mutuelleActuelle ?? ""}
                placeholder="Assureur, formule..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prevoyanceActuelle">Prevoyance actuelle</Label>
              <Input
                id="prevoyanceActuelle"
                name="prevoyanceActuelle"
                defaultValue={client?.prevoyanceActuelle ?? ""}
                placeholder="Assureur, garanties..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateEcheanceMutuelle">Date echeance mutuelle</Label>
              <Input
                id="dateEcheanceMutuelle"
                name="dateEcheanceMutuelle"
                type="date"
                defaultValue={fmtDate(client?.dateEcheanceMutuelle)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateEcheancePrevoyance">Date echeance prevoyance</Label>
              <Input
                id="dateEcheancePrevoyance"
                name="dateEcheancePrevoyance"
                type="date"
                defaultValue={fmtDate(client?.dateEcheancePrevoyance)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dirigeant / Contact principal</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="civilite">Civilite</Label>
              <Select name="civilite" defaultValue={client?.civilite ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M.">M.</SelectItem>
                  <SelectItem value="Mme">Mme</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div />
            <div className="space-y-2">
              <Label htmlFor="prenom">Prenom *</Label>
              <Input
                id="prenom"
                name="prenom"
                defaultValue={client?.prenom}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom"
                name="nom"
                defaultValue={client?.nom}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={client?.email ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephone">Telephone</Label>
              <Input
                id="telephone"
                name="telephone"
                defaultValue={client?.telephone ?? ""}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="adresse">Adresse</Label>
              <Input
                id="adresse"
                name="adresse"
                defaultValue={v("adresse")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codePostal">Code postal</Label>
              <Input
                id="codePostal"
                name="codePostal"
                defaultValue={v("codePostal")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ville">Ville</Label>
              <Input
                id="ville"
                name="ville"
                defaultValue={v("ville")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateNaissance">Date de naissance</Label>
              <Input
                id="dateNaissance"
                name="dateNaissance"
                type="date"
                defaultValue={fmtDate(client?.dateNaissance)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Metadonnees</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="statut">Statut</Label>
              <Select name="statut" defaultValue={client?.statut ?? "prospect"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUTS_CLIENT.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sourceAcquisition">Source d&apos;acquisition</Label>
              <Select
                name="sourceAcquisition"
                defaultValue={client?.sourceAcquisition ?? ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES_ACQUISITION.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {prescripteurs && prescripteurs.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="prescripteurId">Prescripteur</Label>
                <Select name="prescripteurId" defaultValue={client?.prescripteurId ?? ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun prescripteur" />
                  </SelectTrigger>
                  <SelectContent>
                    {prescripteurs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.prenom} {p.nom}{p.entreprise ? ` (${p.entreprise})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="categorieReseau">Categorie reseau personnel</Label>
              <Select name="categorieReseau" defaultValue={client?.categorieReseau ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Hors reseau" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES_RESEAU.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {client?.categorieReseau && (
              <div className="md:col-span-2 border rounded-lg p-4 space-y-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Qualification reseau
                  </h4>
                  {(() => {
                    const prio = computePrioriteReseau(client?.niveauPotentiel, client?.potentielAffaires);
                    return prio ? (
                      <Badge className={`text-[10px] ${PRIORITES_RESEAU_CONFIG[prio].bgClass}`}>
                        {PRIORITES_RESEAU_CONFIG[prio].label}
                      </Badge>
                    ) : null;
                  })()}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Multi-role selection */}
                  <div className="space-y-2 md:col-span-2">
                    <Label>Roles (multi-selection)</Label>
                    <div className="flex flex-wrap gap-2">
                      {ROLES_RESEAU.map((role) => {
                        const isSelected = selectedRoles.includes(role.id);
                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => toggleRole(role.id)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                              isSelected
                                ? "border-transparent text-white shadow-sm"
                                : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                            }`}
                            style={isSelected ? { backgroundColor: role.color } : undefined}
                          >
                            {role.label}
                          </button>
                        );
                      })}
                    </div>
                    {selectedRoles.map((roleId) => (
                      <input key={roleId} type="hidden" name="rolesReseau" value={roleId} />
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label>Statut reseau</Label>
                    <Select name="statutReseau" defaultValue={client?.statutReseau ?? ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUTS_RESEAU.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Probabilite de signature</Label>
                    <Select name="niveauPotentiel" defaultValue={client?.niveauPotentiel ?? ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        {NIVEAUX_POTENTIEL.map((n) => (
                          <SelectItem key={n.id} value={n.id}>
                            {n.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Potentiel affaires</Label>
                    <Select name="potentielAffaires" defaultValue={client?.potentielAffaires ?? ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        {POTENTIELS_AFFAIRES.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Potentiel estime annuel</Label>
                    <Input
                      name="potentielEstimeAnnuel"
                      type="number"
                      min={0}
                      step={100}
                      defaultValue={client?.potentielEstimeAnnuel ?? ""}
                      placeholder="€/an"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Horizon activation</Label>
                    <Select name="horizonActivation" defaultValue={client?.horizonActivation ?? ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        {HORIZONS_ACTIVATION.map((h) => (
                          <SelectItem key={h.id} value={h.id}>
                            {h.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prochaine action reseau</Label>
                    <Input
                      name="prochaineActionReseau"
                      defaultValue={client?.prochaineActionReseau ?? ""}
                      placeholder="Ex: Inviter a un dejeuner"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date relance reseau</Label>
                    <Input
                      name="dateRelanceReseau"
                      type="date"
                      defaultValue={fmtDate(client?.dateRelanceReseau)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date dernier contact</Label>
                    <Input
                      name="dateDernierContact"
                      type="date"
                      defaultValue={fmtDate(client?.dateDernierContact)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Commentaire reseau</Label>
                    <Textarea
                      name="commentaireReseau"
                      rows={2}
                      defaultValue={client?.commentaireReseau ?? ""}
                      placeholder="Notes specifiques au reseau..."
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="assigneA">Assigne a</Label>
              <Select name="assigneA" defaultValue={client?.assigneA ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.prenom} {u.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                defaultValue={client?.notes ?? ""}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Veille concurrentielle</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="courtierActuel">Courtier actuel</Label>
              <Input
                id="courtierActuel"
                name="courtierActuel"
                defaultValue={client?.courtierActuel ?? ""}
                placeholder="Nom du courtier concurrent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assureurActuelSante">Assureur actuel sante</Label>
              <Input
                id="assureurActuelSante"
                name="assureurActuelSante"
                defaultValue={client?.assureurActuelSante ?? ""}
                placeholder="AXA, Malakoff, Harmonie..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateDerniereRevision">Date derniere revision</Label>
              <Input
                id="dateDerniereRevision"
                name="dateDerniereRevision"
                type="date"
                defaultValue={fmtDate(client?.dateDerniereRevision)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="motifChangement">Motif de changement</Label>
              <Select name="motifChangement" defaultValue={client?.motifChangement ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prix">Prix</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="couverture">Couverture</SelectItem>
                  <SelectItem value="conseil">Conseil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <SubmitButton pendingText={client ? "Mise a jour..." : "Creation..."}>
            {client ? "Mettre a jour" : "Creer le client"}
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
