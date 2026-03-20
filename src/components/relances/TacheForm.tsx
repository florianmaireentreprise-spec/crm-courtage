"use client";

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
import { TYPES_TACHE, PRIORITES } from "@/lib/constants";
import { createTache, updateTache } from "@/app/(app)/relances/actions";
import type { TacheWithClient } from "@/types";
import { format } from "date-fns";

type Props = {
  open: boolean;
  onClose: () => void;
  clients: { id: string; raisonSociale: string }[];
  users: { id: string; prenom: string; nom: string }[];
  tache?: TacheWithClient | null;
};

export function TacheForm({ open, onClose, clients, users, tache }: Props) {
  const isEdit = !!tache;

  async function handleSubmit(formData: FormData) {
    try {
      if (isEdit && tache) {
        const result = await updateTache(tache.id, formData);
        if (result && "error" in result) {
          toast.error("Erreur", { description: "Verifiez les champs du formulaire." });
          return;
        }
        toast.success("Tache mise a jour");
      } else {
        const result = await createTache(formData);
        if (result && "error" in result) {
          toast.error("Erreur", { description: "Verifiez les champs du formulaire." });
          return;
        }
        toast.success("Tache creee");
      }
      onClose();
    } catch {
      toast.error("Erreur inattendue");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier la tache" : "Nouvelle tache"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Modifiez les informations de la tache." : "Creez une tache ou une relance."}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titre">Titre *</Label>
            <Input
              id="titre"
              name="titre"
              required
              placeholder="Ex: Relancer devis sante"
              defaultValue={tache?.titre ?? ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select name="type" defaultValue={tache?.type ?? "AUTRE"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_TACHE.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priorite">Priorite</Label>
              <Select name="priorite" defaultValue={tache?.priorite ?? "normale"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITES.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateEcheance">Date d&apos;echeance *</Label>
              <Input
                id="dateEcheance"
                name="dateEcheance"
                type="date"
                required
                defaultValue={tache ? format(tache.dateEcheance, "yyyy-MM-dd") : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientId">Client</Label>
              <Select name="clientId" defaultValue={tache?.clientId ?? undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.raisonSociale}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigneA">Assigne a</Label>
            <Select name="assigneA" defaultValue={tache?.assigneA ?? undefined}>
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={tache?.description ?? ""}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <SubmitButton pendingText={isEdit ? "Enregistrement..." : "Creation..."}>
              {isEdit ? "Enregistrer" : "Creer"}
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
