"use client";

import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ETAPES_PIPELINE, SOURCES_PROSPECT } from "@/lib/constants";
import { createDeal, updateDeal } from "@/app/(app)/pipeline/actions";
import type { DealWithClient } from "@/types";
import { format } from "date-fns";

type Props = {
  open: boolean;
  onClose: () => void;
  clients: { id: string; raisonSociale: string }[];
  users: { id: string; prenom: string; nom: string }[];
  prescripteurs: { id: string; prenom: string; nom: string; entreprise: string | null }[];
  deal?: DealWithClient | null;
};

export function DealForm({ open, onClose, clients, users, prescripteurs, deal }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!deal;

  async function handleSubmit(formData: FormData) {
    if (isEdit) {
      await updateDeal(deal.id, formData);
    } else {
      await createDeal(formData);
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'opportunite" : "Nouvelle opportunite"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifiez les informations de cette opportunite."
              : "Ajoutez une opportunite au pipeline commercial."}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titre">Titre *</Label>
            <Input
              id="titre"
              name="titre"
              required
              defaultValue={deal?.titre ?? ""}
              placeholder="Ex: Sante collective 50 salaries"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientId">Client / Entreprise *</Label>
            <Select name="clientId" required defaultValue={deal?.clientId ?? undefined}>
              <SelectTrigger>
                <SelectValue placeholder="Selectionner un client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.raisonSociale}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="etape">Etape</Label>
                <Select name="etape" defaultValue="PROSPECT_IDENTIFIE">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ETAPES_PIPELINE.filter((e) => !["ONBOARDING", "DEVELOPPEMENT", "PERDU"].includes(e.id)).map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceProspect">Source</Label>
                <Select name="sourceProspect">
                  <SelectTrigger>
                    <SelectValue placeholder="Source..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES_PROSPECT.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {isEdit && (
            <div className="space-y-2">
              <Label htmlFor="sourceProspect">Source</Label>
              <Select name="sourceProspect" defaultValue={deal.sourceProspect ?? undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Source..." />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES_PROSPECT.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {prescripteurs.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="prescripteurId">Prescripteur</Label>
              <Select name="prescripteurId" defaultValue={deal?.prescripteurId ?? undefined}>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="montantEstime">Montant estime</Label>
              <Input
                id="montantEstime"
                name="montantEstime"
                type="number"
                step="0.01"
                defaultValue={deal?.montantEstime ?? ""}
                placeholder="EUR"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="probabilite">Probabilite (%)</Label>
              <Input
                id="probabilite"
                name="probabilite"
                type="number"
                min="0"
                max="100"
                defaultValue={deal?.probabilite ?? ""}
                placeholder="50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateClosingPrev">Closing prevu</Label>
              <Input
                id="dateClosingPrev"
                name="dateClosingPrev"
                type="date"
                defaultValue={deal?.dateClosingPrev ? format(new Date(deal.dateClosingPrev), "yyyy-MM-dd") : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="produitsCibles">Produits cibles</Label>
              <Input
                id="produitsCibles"
                name="produitsCibles"
                defaultValue={deal?.produitsCibles ?? ""}
                placeholder="Sante, Prevoyance..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigneA">Assigne a</Label>
            <Select name="assigneA" defaultValue={deal?.assigneA ?? undefined}>
              <SelectTrigger>
                <SelectValue placeholder="Non assigne" />
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

          <div className="space-y-2">
            <Label htmlFor="qualificationNotes">Notes de qualification</Label>
            <Textarea
              id="qualificationNotes"
              name="qualificationNotes"
              rows={2}
              defaultValue={deal?.qualificationNotes ?? ""}
              placeholder="Taille entreprise, besoins identifies..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="problematiqueDirigeant">Problematique dirigeant</Label>
            <Textarea
              id="problematiqueDirigeant"
              name="problematiqueDirigeant"
              rows={2}
              defaultValue={deal?.problematiqueDirigeant ?? ""}
              placeholder="Protection, retraite, epargne..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={deal?.notes ?? ""}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">{isEdit ? "Enregistrer" : "Creer"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
