"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Pencil } from "lucide-react";
import { updateCabinetInfo } from "@/app/(app)/parametres/actions";

type CabinetInfo = {
  raisonSociale: string;
  formeJuridique: string;
  gerants: string;
  zone: string;
  cible: string;
};

type Props = {
  cabinet: CabinetInfo;
};

export function CabinetSettings({ cabinet }: Props) {
  const [editing, setEditing] = useState(false);

  async function handleSubmit(formData: FormData) {
    const result = await updateCabinetInfo(formData);
    if (result && "error" in result) return;
    setEditing(false);
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Informations Cabinet</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Raison sociale :</span> {cabinet.raisonSociale}</p>
          <p><span className="text-muted-foreground">Forme juridique :</span> {cabinet.formeJuridique}</p>
          <p><span className="text-muted-foreground">Gerants :</span> {cabinet.gerants}</p>
          <p><span className="text-muted-foreground">Zone :</span> {cabinet.zone}</p>
          <p><span className="text-muted-foreground">Cible :</span> {cabinet.cible}</p>
        </CardContent>
      </Card>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier les informations du cabinet</DialogTitle>
            <DialogDescription>
              Mettez a jour les informations affichees dans le CRM.
            </DialogDescription>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="raisonSociale">Raison sociale *</Label>
              <Input
                id="raisonSociale"
                name="raisonSociale"
                required
                defaultValue={cabinet.raisonSociale}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="formeJuridique">Forme juridique *</Label>
                <Input
                  id="formeJuridique"
                  name="formeJuridique"
                  required
                  defaultValue={cabinet.formeJuridique}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gerants">Gerants *</Label>
                <Input
                  id="gerants"
                  name="gerants"
                  required
                  defaultValue={cabinet.gerants}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zone">Zone *</Label>
                <Input
                  id="zone"
                  name="zone"
                  required
                  defaultValue={cabinet.zone}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cible">Cible *</Label>
                <Input
                  id="cible"
                  name="cible"
                  required
                  defaultValue={cabinet.cible}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>
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
