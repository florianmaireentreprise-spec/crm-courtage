"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import {
  CATEGORIES_RESEAU,
  STATUTS_RESEAU,
  NIVEAUX_POTENTIEL,
  POTENTIELS_AFFAIRES,
  HORIZONS_ACTIVATION,
  ROLES_RESEAU,
  computePrioriteReseau,
  PRIORITES_RESEAU_CONFIG,
} from "@/lib/constants";
import { addContactReseau } from "@/app/(app)/reseau/actions";
import { CompanySearchButton } from "@/components/clients/CompanySearchButton";
import { SubmitButton } from "@/components/ui/submit-button";
import { toast } from "sonner";

type SireneOverrides = {
  raisonSociale?: string;
  siret?: string;
  ville?: string;
  secteurActivite?: string;
  codePostal?: string;
  adresse?: string;
  formeJuridique?: string;
  codeNAF?: string;
  trancheEffectifs?: string;
  nbSalaries?: number;
};

export function AddContactButton() {
  const [open, setOpen] = useState(false);
  const [sirene, setSirene] = useState<SireneOverrides>({});
  const [formKey, setFormKey] = useState(0);

  // Live preview state for priority
  const [liveProba, setLiveProba] = useState<string>("");
  const [livePotentiel, setLivePotentiel] = useState<string>("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const livePriorite = useMemo(
    () => computePrioriteReseau(liveProba || null, livePotentiel || null),
    [liveProba, livePotentiel]
  );

  async function handleSubmit(formData: FormData) {
    const result = await addContactReseau(formData);
    if (result && "error" in result) {
      toast.error("Erreur de validation", {
        description: "Verifiez les champs obligatoires.",
      });
      return;
    }
    toast.success("Contact ajoute au reseau");
    setOpen(false);
  }

  const handleSireneSelect = useCallback((company: {
    raisonSociale: string;
    siret: string;
    formeJuridique: string | null;
    codeNAF: string | null;
    secteurActivite: string | null;
    trancheEffectifs: string | null;
    nbSalaries: number | null;
    ville: string | null;
    codePostal: string | null;
    adresse: string | null;
  }) => {
    setSirene({
      raisonSociale: company.raisonSociale,
      siret: company.siret,
      ville: company.ville ?? undefined,
      secteurActivite: company.secteurActivite ?? undefined,
      formeJuridique: company.formeJuridique ?? undefined,
      codeNAF: company.codeNAF ?? undefined,
      trancheEffectifs: company.trancheEffectifs ?? undefined,
      nbSalaries: company.nbSalaries ?? undefined,
    });
    setFormKey((k) => k + 1);
  }, []);

  function handleOpen() {
    setOpen(true);
    setSirene({});
    setFormKey(0);
    setLiveProba("");
    setLivePotentiel("");
    setSelectedRoles([]);
  }

  function toggleRole(roleId: string) {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  }

  return (
    <>
      <Button onClick={handleOpen}>
        <Plus className="h-4 w-4 mr-2" />
        Ajouter un contact
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau contact reseau</DialogTitle>
            <DialogDescription>
              Ajoutez un contact a votre reseau personnel strategique.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <CompanySearchButton onSelect={handleSireneSelect} variant="compact" />
            {sirene.raisonSociale && (
              <span className="text-xs text-green-600 font-medium truncate">
                {sirene.raisonSociale}
              </span>
            )}
          </div>

          <form key={formKey} action={handleSubmit} className="space-y-4">
            {/* Hidden fields for SIRENE-only data */}
            <input type="hidden" name="siret" value={sirene.siret ?? ""} />
            <input type="hidden" name="formeJuridique" value={sirene.formeJuridique ?? ""} />
            <input type="hidden" name="codeNAF" value={sirene.codeNAF ?? ""} />
            <input type="hidden" name="trancheEffectifs" value={sirene.trancheEffectifs ?? ""} />
            <input type="hidden" name="nbSalaries" value={sirene.nbSalaries ?? ""} />
            <input type="hidden" name="adresse" value={sirene.adresse ?? ""} />
            <input type="hidden" name="codePostal" value={sirene.codePostal ?? ""} />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entreprise / Structure</Label>
                <Input name="raisonSociale" placeholder="Ex: Cabinet Dr. Martin (optionnel)" defaultValue={sirene.raisonSociale ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>Categorie reseau *</Label>
                <Select name="categorieReseau" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES_RESEAU.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Civilite</Label>
                <Select name="civilite">
                  <SelectTrigger>
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M.">M.</SelectItem>
                    <SelectItem value="Mme">Mme</SelectItem>
                    <SelectItem value="Dr">Dr</SelectItem>
                    <SelectItem value="Me">Me</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prenom *</Label>
                <Input name="prenom" required />
              </div>
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input name="nom" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" type="email" placeholder="email@exemple.fr" />
              </div>
              <div className="space-y-2">
                <Label>Telephone</Label>
                <Input name="telephone" placeholder="06 12 34 56 78" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ville</Label>
                <Input name="ville" placeholder="Strasbourg" defaultValue={sirene.ville ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>Secteur d&apos;activite</Label>
                <Input name="secteurActivite" placeholder="Medecine, Droit..." defaultValue={sirene.secteurActivite ?? ""} />
              </div>
            </div>

            {/* ── Qualification reseau ── */}
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Qualification
                </h4>
                {livePriorite && (
                  <Badge className={`text-[10px] ${PRIORITES_RESEAU_CONFIG[livePriorite].bgClass}`}>
                    {PRIORITES_RESEAU_CONFIG[livePriorite].label}
                  </Badge>
                )}
              </div>

              {/* Multi-role selection */}
              <div className="space-y-2">
                <Label className="text-xs">Roles (multi-selection)</Label>
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
                {/* Hidden inputs for FormData */}
                {selectedRoles.map((roleId) => (
                  <input key={roleId} type="hidden" name="rolesReseau" value={roleId} />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Statut reseau</Label>
                  <Select name="statutReseau" defaultValue="aucune_demarche">
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Aucune demarche" />
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
                  <Label className="text-xs">Horizon activation</Label>
                  <Select name="horizonActivation">
                    <SelectTrigger className="h-9">
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Probabilite de signature</Label>
                  <Select name="niveauPotentiel" onValueChange={setLiveProba}>
                    <SelectTrigger className="h-9">
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
                  <Label className="text-xs">Potentiel affaires</Label>
                  <Select name="potentielAffaires" onValueChange={setLivePotentiel}>
                    <SelectTrigger className="h-9">
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Potentiel estime annuel</Label>
                  <Input name="potentielEstimeAnnuel" type="number" min={0} step={100} placeholder="EUR/an" className="h-9" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prochaine action</Label>
                <Input name="prochaineActionReseau" placeholder="Ex: Inviter a un dejeuner" />
              </div>
              <div className="space-y-2">
                <Label>Date dernier contact</Label>
                <Input name="dateDernierContact" type="date" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea name="notes" placeholder="Contexte, point de contact, remarques..." rows={2} />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <SubmitButton pendingText="Ajout en cours...">
                Ajouter au reseau
              </SubmitButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
