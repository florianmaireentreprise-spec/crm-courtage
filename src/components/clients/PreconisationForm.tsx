"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";
import { THEMES_PRECONISATION, STATUTS_PRECONISATION, PRIORITES_PRECONISATION } from "@/lib/constants";
import { createPreconisation, updatePreconisation } from "@/app/(app)/clients/preconisations-actions";

type PreconisationData = {
  id: string;
  theme: string;
  titre: string;
  justification: string | null;
  priorite: string;
  statut: string;
  prochainePas: string | null;
  notes: string | null;
  dealId: string | null;
};

type DealOption = {
  id: string;
  label: string;
};

export function PreconisationForm({
  clientId,
  deals,
  preconisation,
}: {
  clientId: string;
  deals: DealOption[];
  preconisation?: PreconisationData;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!preconisation;

  async function handleSubmit(formData: FormData) {
    formData.set("clientId", clientId);
    if (isEdit) {
      await updatePreconisation(preconisation.id, formData);
    } else {
      await createPreconisation(formData);
    }
    setOpen(false);
    formRef.current?.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-blue-600">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle preconisation
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier la preconisation" : "Nouvelle preconisation"}</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="titre">Titre</Label>
            <Input id="titre" name="titre" defaultValue={preconisation?.titre ?? ""} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="theme">Theme</Label>
              <Select name="theme" defaultValue={preconisation?.theme ?? "mutuelle_collective"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THEMES_PRECONISATION.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priorite">Priorite</Label>
              <Select name="priorite" defaultValue={preconisation?.priorite ?? "moyenne"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITES_PRECONISATION.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="statut">Statut</Label>
            <Select name="statut" defaultValue={preconisation?.statut ?? "a_preparer"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUTS_PRECONISATION.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="justification">Justification</Label>
            <Textarea
              id="justification"
              name="justification"
              rows={3}
              placeholder="Pourquoi cette preconisation ?"
              defaultValue={preconisation?.justification ?? ""}
            />
          </div>

          <div>
            <Label htmlFor="prochainePas">Prochaine etape</Label>
            <Input
              id="prochainePas"
              name="prochainePas"
              placeholder="Ex: Envoyer comparatif, RDV presentation..."
              defaultValue={preconisation?.prochainePas ?? ""}
            />
          </div>

          {deals.length > 0 && (
            <div>
              <Label htmlFor="dealId">Deal associe (optionnel)</Label>
              <Select name="dealId" defaultValue={preconisation?.dealId ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun</SelectItem>
                  {deals.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Notes internes..."
              defaultValue={preconisation?.notes ?? ""}
            />
          </div>

          <Button type="submit" className="w-full">
            {isEdit ? "Enregistrer" : "Creer la preconisation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
