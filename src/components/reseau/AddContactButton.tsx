"use client";

import { useState } from "react";
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

export function AddContactButton() {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    await addContactReseau(formData);
    setOpen(false);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Ajouter un contact
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau contact reseau</DialogTitle>
            <DialogDescription>
              Ajoutez un contact a votre reseau personnel strategique.
            </DialogDescription>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entreprise / Structure *</Label>
                <Input name="raisonSociale" required placeholder="Ex: Cabinet Dr. Martin" />
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
                <Input name="ville" placeholder="Strasbourg" />
              </div>
              <div className="space-y-2">
                <Label>Secteur d&apos;activite</Label>
                <Input name="secteurActivite" placeholder="Medecine, Droit..." />
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
