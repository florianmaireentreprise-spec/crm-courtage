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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TYPES_OBJECTIF, PERIODES_OBJECTIF } from "@/lib/constants";
import { createObjectif, updateObjectif } from "@/app/(app)/objectifs/actions";
import type { Objectif } from "@prisma/client";

type Props = {
  open: boolean;
  onClose: () => void;
  editingObjectif?: Objectif | null;
  users: { id: string; prenom: string; nom: string }[];
};

export function ObjectifForm({ open, onClose, editingObjectif, users }: Props) {
  const currentYear = new Date().getFullYear();

  async function handleSubmit(formData: FormData) {
    if (editingObjectif) {
      await updateObjectif(editingObjectif.id, formData);
    } else {
      await createObjectif(formData);
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingObjectif ? "Modifier l'objectif" : "Nouvel objectif"}</DialogTitle>
          <DialogDescription>
            Définissez une cible à atteindre pour suivre votre performance.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type d&apos;objectif *</Label>
            <Select name="type" defaultValue={editingObjectif?.type ?? ""} required>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un type" />
              </SelectTrigger>
              <SelectContent>
                {TYPES_OBJECTIF.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Période *</Label>
              <Select name="periode" defaultValue={editingObjectif?.periode ?? "ANNUEL"} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODES_OBJECTIF.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="annee">Année *</Label>
              <Input
                id="annee"
                name="annee"
                type="number"
                defaultValue={editingObjectif?.annee ?? currentYear}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valeurCible">Valeur cible *</Label>
            <Input
              id="valeurCible"
              name="valeurCible"
              type="number"
              step="0.01"
              required
              defaultValue={editingObjectif?.valeurCible ?? ""}
              placeholder="Ex: 30000 pour 30 000 €, ou 20 pour 20 clients"
            />
          </div>

          <div className="space-y-2">
            <Label>Assigné à</Label>
            <Select name="userId" defaultValue={editingObjectif?.userId ?? ""}>
              <SelectTrigger>
                <SelectValue placeholder="Cabinet (global)" />
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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">
              {editingObjectif ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
