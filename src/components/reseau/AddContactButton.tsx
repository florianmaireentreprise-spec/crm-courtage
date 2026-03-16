"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { CATEGORIES_RESEAU, TYPES_RELATION_RESEAU, STATUTS_RESEAU, NIVEAUX_POTENTIEL, HORIZONS_ACTIVATION } from "@/lib/constants";
import { addContactReseau } from "@/app/(app)/reseau/actions";
import { CompanySearchButton } from "@/components/clients/CompanySearchButton";

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

  async function handleSubmit(formData: FormData) {
    await addContactReseau(formData);
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
                <Label>Entreprise / Structure *</Label>
                <Input name="raisonSociale" required placeholder="Ex: Cabinet Dr. Martin" defaultValue={sirene.raisonSociale ?? ""} />
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

            {/* Qualification reseau — lightweight: no commentaireReseau, no dateRelanceReseau */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de relation</Label>
                <Select name="typeRelation">
                  <SelectTrigger>
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES_RELATION_RESEAU.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Statut reseau</Label>
                <Select name="statutReseau" defaultValue="identifie">
                  <SelectTrigger>
                    <SelectValue placeholder="Identifie" />
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
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Niveau potentiel</Label>
                <Select name="niveauPotentiel">
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
                <Label>Potentiel estime annuel</Label>
                <Input name="potentielEstimeAnnuel" type="number" min={0} step={100} placeholder="€/an" />
              </div>
              <div className="space-y-2">
                <Label>Horizon activation</Label>
                <Select name="horizonActivation">
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
              <Button type="submit">Ajouter au reseau</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
