"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Settings2 } from "lucide-react";
import { upsertReseauObjectif } from "@/app/(app)/reseau/actions";

type Props = {
  categorie: string;
  categorieLabel: string;
  objectif?: {
    contactsObjectif: number;
    tauxConversionObj: number;
    potentielUnitaire: number;
    notes: string | null;
  } | null;
};

export function ReseauObjectifForm({ categorie, categorieLabel, objectif }: Props) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    await upsertReseauObjectif(formData);
    setOpen(false);
  }

  return (
    <>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(true)}>
        <Settings2 className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Parametres — {categorieLabel}</DialogTitle>
            <DialogDescription>
              Definissez les objectifs de conversion et le potentiel pour cette categorie.
            </DialogDescription>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-4">
            <input type="hidden" name="categorie" value={categorie} />

            <div className="space-y-2">
              <Label>Contacts objectif</Label>
              <Input
                name="contactsObjectif"
                type="number"
                min={0}
                defaultValue={objectif?.contactsObjectif ?? 0}
              />
            </div>

            <div className="space-y-2">
              <Label>Taux de conversion objectif (%)</Label>
              <Input
                name="tauxConversionObj"
                type="number"
                min={0}
                max={100}
                step={1}
                defaultValue={objectif ? Math.round(objectif.tauxConversionObj * 100) : 0}
              />
            </div>

            <div className="space-y-2">
              <Label>Potentiel CA par client converti</Label>
              <Input
                name="potentielUnitaire"
                type="number"
                min={0}
                step={100}
                defaultValue={objectif?.potentielUnitaire ?? 0}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                name="notes"
                defaultValue={objectif?.notes ?? ""}
                placeholder="Notes optionnelles..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
