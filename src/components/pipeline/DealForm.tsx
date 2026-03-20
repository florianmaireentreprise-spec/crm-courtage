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
import { SubmitButton } from "@/components/ui/submit-button";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ETAPES_PIPELINE, SOURCES_PROSPECT } from "@/lib/constants";
import { createDeal } from "@/app/(app)/pipeline/actions";

type Props = {
  open: boolean;
  onClose: () => void;
  clients: { id: string; raisonSociale: string }[];
  users: { id: string; prenom: string; nom: string }[];
  prescripteurs: { id: string; prenom: string; nom: string; entreprise: string | null }[];
};

export function DealForm({ open, onClose, clients, users, prescripteurs }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    try {
      const result = await createDeal(formData);
      if (result && "error" in result) {
        toast.error("Erreur", { description: "Verifiez les champs du formulaire." });
        return;
      }
      toast.success("Opportunite creee");
      onClose();
    } catch {
      toast.error("Erreur inattendue");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle opportunite</DialogTitle>
          <DialogDescription>
            Ajoutez une opportunite au pipeline commercial.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titre">Titre *</Label>
            <Input id="titre" name="titre" required placeholder="Ex: Sante collective 50 salaries" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientId">Client / Entreprise *</Label>
            <Select name="clientId" required>
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

          {prescripteurs.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="prescripteurId">Prescripteur</Label>
              <Select name="prescripteurId">
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
              <Input id="montantEstime" name="montantEstime" type="number" step="0.01" placeholder="EUR" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="probabilite">Probabilite (%)</Label>
              <Input id="probabilite" name="probabilite" type="number" min="0" max="100" placeholder="50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateClosingPrev">Closing prevu</Label>
              <Input id="dateClosingPrev" name="dateClosingPrev" type="date" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="produitsCibles">Produits cibles</Label>
              <Input id="produitsCibles" name="produitsCibles" placeholder="Sante, Prevoyance..." />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigneA">Assigne a</Label>
            <Select name="assigneA">
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
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <SubmitButton pendingText="Creation...">Creer</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
