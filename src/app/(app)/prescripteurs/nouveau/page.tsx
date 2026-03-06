import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { TYPES_PRESCRIPTEUR } from "@/lib/constants";
import { createPrescripteur } from "../actions";
import Link from "next/link";

export default function NouveauPrescripteurPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Nouveau prescripteur</h1>

      <form action={async (formData) => { "use server"; await createPrescripteur(formData); }} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identite</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type de prescripteur *</Label>
              <Select name="type" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_PRESCRIPTEUR.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="civilite">Civilite</Label>
              <Select name="civilite">
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M.">M.</SelectItem>
                  <SelectItem value="Mme">Mme</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prenom">Prenom *</Label>
              <Input id="prenom" name="prenom" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input id="nom" name="nom" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="entreprise">Cabinet / Entreprise</Label>
              <Input id="entreprise" name="entreprise" placeholder="Nom du cabinet..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coordonnees</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephone">Telephone</Label>
              <Input id="telephone" name="telephone" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adresse">Adresse</Label>
              <Input id="adresse" name="adresse" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ville">Ville</Label>
              <Input id="ville" name="ville" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={4} placeholder="Informations sur la relation, frequence des recommandations..." />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit">Creer le prescripteur</Button>
          <Link href="/prescripteurs">
            <Button type="button" variant="outline">Annuler</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
