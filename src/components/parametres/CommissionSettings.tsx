"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { TYPES_PRODUITS } from "@/lib/constants";
import { updateTauxCommission } from "@/app/(app)/parametres/actions";
import type { TauxCommissionMap } from "@/lib/settings";

type Props = {
  taux: TauxCommissionMap;
};

export function CommissionSettings({ taux }: Props) {
  const [editing, setEditing] = useState(false);

  async function handleSubmit(formData: FormData) {
    const result = await updateTauxCommission(formData);
    if (result && "error" in result) return;
    setEditing(false);
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Taux de commission par defaut</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(TYPES_PRODUITS).map(([key, produit]) => {
              const t = taux[key] ?? { apport: 0, gestion: 0 };
              return (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: produit.color }}
                    />
                    <span className="text-sm font-medium">{produit.label}</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      Apport: {(t.apport * 100).toFixed(1)}%
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      Gestion: {(t.gestion * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Ces taux sont appliques automatiquement lors de la creation d&apos;un contrat.
            Ils peuvent etre modifies individuellement sur chaque contrat.
          </p>
        </CardContent>
      </Card>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier les taux de commission</DialogTitle>
            <DialogDescription>
              Saisissez les taux en pourcentage (ex: 7 pour 7%).
            </DialogDescription>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            {Object.entries(TYPES_PRODUITS).map(([key, produit]) => {
              const t = taux[key] ?? { apport: 0, gestion: 0 };
              return (
                <div key={key} className="flex items-center gap-4 p-3 rounded-lg border">
                  <div className="flex items-center gap-2 min-w-[200px]">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: produit.color }}
                    />
                    <span className="text-sm font-medium">{produit.label}</span>
                  </div>
                  <div className="flex gap-3 flex-1">
                    <div className="space-y-1 flex-1">
                      <Label className="text-xs text-muted-foreground">Apport %</Label>
                      <Input
                        name={`${key}_apport`}
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        defaultValue={(t.apport * 100).toFixed(1)}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1 flex-1">
                      <Label className="text-xs text-muted-foreground">Gestion %</Label>
                      <Input
                        name={`${key}_gestion`}
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        defaultValue={(t.gestion * 100).toFixed(1)}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex justify-end gap-2 pt-2">
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
