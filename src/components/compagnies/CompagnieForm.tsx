"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { TYPES_PRODUITS, TAUX_COMMISSION_DEFAUT } from "@/lib/constants";

type ProduitRow = {
  typeProduit: string;
  tauxCommission: number; // stored as 0-1
  seuilSurcommission: number | null;
  tauxSurcommission: number | null; // stored as 0-1
  upfront: number | null;
};

type CompagnieData = {
  id: string;
  nom: string;
  type: string | null;
  contactNom: string | null;
  contactEmail: string | null;
  contactTelephone: string | null;
  conventionSignee: boolean;
  dateConvention: Date | null;
  seuilSurcommission: number | null;
  tauxSurcommission: number | null;
  notes: string | null;
  produits?: ProduitRow[];
};

type Props = {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]> } | void>;
  defaultValues?: CompagnieData;
};

const PRODUCT_KEYS = Object.keys(TYPES_PRODUITS) as (keyof typeof TYPES_PRODUITS)[];

export function CompagnieForm({ action, defaultValues }: Props) {
  const router = useRouter();
  const [produits, setProduits] = useState<ProduitRow[]>(
    defaultValues?.produits ?? []
  );

  const usedProducts = new Set(produits.map((p) => p.typeProduit));
  const availableProducts = PRODUCT_KEYS.filter((k) => !usedProducts.has(k));

  function addProduct() {
    if (availableProducts.length === 0) return;
    const typeProduit = availableProducts[0];
    const defaults = TAUX_COMMISSION_DEFAUT[typeProduit as keyof typeof TAUX_COMMISSION_DEFAUT];
    setProduits([
      ...produits,
      {
        typeProduit,
        tauxCommission: defaults?.apport ?? 0.05,
        seuilSurcommission: null,
        tauxSurcommission: null,
        upfront: null,
      },
    ]);
  }

  function removeProduct(index: number) {
    setProduits(produits.filter((_, i) => i !== index));
  }

  function updateProduct(index: number, field: keyof ProduitRow, value: string) {
    setProduits(
      produits.map((p, i) => {
        if (i !== index) return p;
        if (field === "typeProduit") {
          const defaults = TAUX_COMMISSION_DEFAUT[value as keyof typeof TAUX_COMMISSION_DEFAUT];
          return { ...p, typeProduit: value, tauxCommission: defaults?.apport ?? 0.05 };
        }
        if (field === "tauxCommission") return { ...p, tauxCommission: parseFloat(value) / 100 || 0 };
        if (field === "seuilSurcommission") return { ...p, seuilSurcommission: value ? parseInt(value) : null };
        if (field === "tauxSurcommission") return { ...p, tauxSurcommission: value ? parseFloat(value) / 100 : null };
        if (field === "upfront") return { ...p, upfront: value ? parseFloat(value) : null };
        return p;
      })
    );
  }

  async function handleSubmit(formData: FormData) {
    formData.set("produits", JSON.stringify(produits));
    const result = await action(formData);
    if (result && "error" in result) return;
    router.push("/compagnies");
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom *</Label>
            <Input id="nom" name="nom" required defaultValue={defaultValues?.nom} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Input id="type" name="type" defaultValue={defaultValues?.type ?? ""} placeholder="Assureur, Courtier grossiste..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contactNom">Nom du contact</Label>
            <Input id="contactNom" name="contactNom" defaultValue={defaultValues?.contactNom ?? ""} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email</Label>
              <Input id="contactEmail" name="contactEmail" type="email" defaultValue={defaultValues?.contactEmail ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactTelephone">Telephone</Label>
              <Input id="contactTelephone" name="contactTelephone" defaultValue={defaultValues?.contactTelephone ?? ""} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Convention & Surcommission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="conventionSignee"
              name="conventionSignee"
              defaultChecked={defaultValues?.conventionSignee}
            />
            <Label htmlFor="conventionSignee">Convention signee</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateConvention">Date de convention</Label>
            <Input
              id="dateConvention"
              name="dateConvention"
              type="date"
              defaultValue={defaultValues?.dateConvention ? new Date(defaultValues.dateConvention).toISOString().split("T")[0] : ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seuilSurcommission">Seuil surcommission global (nb contrats)</Label>
              <Input
                id="seuilSurcommission"
                name="seuilSurcommission"
                type="number"
                defaultValue={defaultValues?.seuilSurcommission ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tauxSurcommission">Taux surcommission global (%)</Label>
              <Input
                id="tauxSurcommission"
                name="tauxSurcommission"
                type="number"
                step="0.1"
                defaultValue={defaultValues?.tauxSurcommission ? (defaultValues.tauxSurcommission * 100).toString() : ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product distribution settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Produits distribues</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addProduct}
              disabled={availableProducts.length === 0}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Ajouter un produit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {produits.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucun produit configure. Cliquez &quot;Ajouter un produit&quot; pour definir les conditions commerciales par produit.
            </p>
          ) : (
            <div className="space-y-4">
              {produits.map((p, index) => {
                const config = TYPES_PRODUITS[p.typeProduit as keyof typeof TYPES_PRODUITS];
                return (
                  <div
                    key={index}
                    className="rounded-lg border border-border p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {config && (
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: config.color }}
                          />
                        )}
                        <select
                          value={p.typeProduit}
                          onChange={(e) => updateProduct(index, "typeProduit", e.target.value)}
                          className="text-sm font-medium bg-transparent border-none outline-none cursor-pointer"
                        >
                          <option value={p.typeProduit}>
                            {config?.label ?? p.typeProduit}
                          </option>
                          {availableProducts.map((k) => (
                            <option key={k} value={k}>
                              {TYPES_PRODUITS[k].label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeProduct(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Commission (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={(p.tauxCommission * 100).toFixed(1)}
                          onChange={(e) => updateProduct(index, "tauxCommission", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Seuil surcomm.</Label>
                        <Input
                          type="number"
                          min="0"
                          value={p.seuilSurcommission ?? ""}
                          onChange={(e) => updateProduct(index, "seuilSurcommission", e.target.value)}
                          className="h-8 text-sm"
                          placeholder="nb contrats"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Taux surcomm. (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={p.tauxSurcommission ? (p.tauxSurcommission * 100).toFixed(1) : ""}
                          onChange={(e) => updateProduct(index, "tauxSurcommission", e.target.value)}
                          className="h-8 text-sm"
                          placeholder="%"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Upfront (EUR)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={p.upfront ?? ""}
                          onChange={(e) => updateProduct(index, "upfront", e.target.value)}
                          className="h-8 text-sm"
                          placeholder="EUR"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea name="notes" rows={4} defaultValue={defaultValues?.notes ?? ""} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Annuler
        </Button>
        <Button type="submit">
          {defaultValues ? "Enregistrer" : "Creer"}
        </Button>
      </div>
    </form>
  );
}
