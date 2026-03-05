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
import { ETAPES_PIPELINE } from "@/lib/constants";
import { createDeal } from "@/app/(app)/pipeline/actions";

type Props = {
  open: boolean;
  onClose: () => void;
  clients: { id: string; raisonSociale: string }[];
  users: { id: string; prenom: string; nom: string }[];
};

export function DealForm({ open, onClose, clients, users }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await createDeal(formData);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle opportunité</DialogTitle>
          <DialogDescription>
            Ajoutez une opportunité au pipeline commercial.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titre">Titre *</Label>
            <Input id="titre" name="titre" required placeholder="Ex: Santé collective 50 salariés" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientId">Client *</Label>
            <Select name="clientId" required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un client" />
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="etape">Étape</Label>
              <Select name="etape" defaultValue="PROSPECTION">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ETAPES_PIPELINE.filter((e) => e.id !== "SIGNE" && e.id !== "PERDU").map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="montantEstime">Montant estimé</Label>
              <Input id="montantEstime" name="montantEstime" type="number" step="0.01" placeholder="€" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="probabilite">Probabilité (%)</Label>
              <Input id="probabilite" name="probabilite" type="number" min="0" max="100" placeholder="50" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateClosingPrev">Closing prévu</Label>
              <Input id="dateClosingPrev" name="dateClosingPrev" type="date" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="produitsCibles">Produits ciblés</Label>
            <Input id="produitsCibles" name="produitsCibles" placeholder="Santé, Prévoyance, RCP..." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigneA">Assigné à</Label>
            <Select name="assigneA">
              <SelectTrigger>
                <SelectValue placeholder="Non assigné" />
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
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">Créer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
