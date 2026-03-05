"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { Compagnie } from "@prisma/client";

type Props = {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]> } | void>;
  defaultValues?: Compagnie;
};

export function CompagnieForm({ action, defaultValues }: Props) {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
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
              <Label htmlFor="contactTelephone">Téléphone</Label>
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
            <Label htmlFor="conventionSignee">Convention signée</Label>
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
              <Label htmlFor="seuilSurcommission">Seuil surcommission (nb contrats)</Label>
              <Input
                id="seuilSurcommission"
                name="seuilSurcommission"
                type="number"
                defaultValue={defaultValues?.seuilSurcommission ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tauxSurcommission">Taux surcommission (%)</Label>
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
          {defaultValues ? "Enregistrer" : "Créer"}
        </Button>
      </div>
    </form>
  );
}
