"use client";

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
import { STATUTS_DIRIGEANT } from "@/lib/constants";
import Link from "next/link";
import type { Dirigeant } from "@prisma/client";

type Props = {
  dirigeant?: Dirigeant;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (formData: FormData) => any;
  clients?: { id: string; raisonSociale: string; prenom: string; nom: string }[];
};

export function DirigeantForm({ dirigeant, action, clients }: Props) {
  const isEdit = !!dirigeant;

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entreprise & Identite</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!isEdit && clients && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="clientId">Entreprise / Client *</Label>
              <Select name="clientId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner une entreprise..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.raisonSociale} ({c.prenom} {c.nom})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="civilite">Civilite</Label>
            <Select name="civilite" defaultValue={dirigeant?.civilite ?? undefined}>
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
            <Label htmlFor="statutProfessionnel">Statut professionnel</Label>
            <Select name="statutProfessionnel" defaultValue={dirigeant?.statutProfessionnel ?? undefined}>
              <SelectTrigger>
                <SelectValue placeholder="Selectionner..." />
              </SelectTrigger>
              <SelectContent>
                {STATUTS_DIRIGEANT.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prenom">Prenom *</Label>
            <Input id="prenom" name="prenom" required defaultValue={dirigeant?.prenom ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nom">Nom *</Label>
            <Input id="nom" name="nom" required defaultValue={dirigeant?.nom ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={dirigeant?.email ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telephone">Telephone</Label>
            <Input id="telephone" name="telephone" defaultValue={dirigeant?.telephone ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateNaissance">Date de naissance</Label>
            <Input
              id="dateNaissance"
              name="dateNaissance"
              type="date"
              defaultValue={dirigeant?.dateNaissance?.toISOString().slice(0, 10) ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Protection actuelle</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="mutuellePerso">Mutuelle personnelle</Label>
            <Input
              id="mutuellePerso"
              name="mutuellePerso"
              placeholder="Assureur, formule..."
              defaultValue={dirigeant?.mutuellePerso ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prevoyancePerso">Prevoyance personnelle</Label>
            <Input
              id="prevoyancePerso"
              name="prevoyancePerso"
              placeholder="Assureur, garanties..."
              defaultValue={dirigeant?.prevoyancePerso ?? ""}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="protectionActuelle">Description protection actuelle</Label>
            <Textarea
              id="protectionActuelle"
              name="protectionActuelle"
              rows={3}
              placeholder="Detail de la couverture actuelle du dirigeant..."
              defaultValue={dirigeant?.protectionActuelle ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Retraite & Epargne</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="regimeRetraite">Regime de retraite</Label>
            <Input
              id="regimeRetraite"
              name="regimeRetraite"
              placeholder="CNAV, RSI, CIPAV..."
              defaultValue={dirigeant?.regimeRetraite ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="complementaireRetraite">Complementaire retraite</Label>
            <Input
              id="complementaireRetraite"
              name="complementaireRetraite"
              placeholder="PER, Madelin..."
              defaultValue={dirigeant?.complementaireRetraite ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="epargneActuelle">Epargne actuelle</Label>
            <Input
              id="epargneActuelle"
              name="epargneActuelle"
              placeholder="Type d'epargne..."
              defaultValue={dirigeant?.epargneActuelle ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="montantEpargne">Montant epargne (EUR)</Label>
            <Input
              id="montantEpargne"
              name="montantEpargne"
              type="number"
              step="0.01"
              defaultValue={dirigeant?.montantEpargne?.toString() ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Besoins & Objectifs</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="besoinsPatrimoniaux">Besoins patrimoniaux</Label>
            <Textarea
              id="besoinsPatrimoniaux"
              name="besoinsPatrimoniaux"
              rows={3}
              placeholder="Transmission, protection famille, optimisation fiscale..."
              defaultValue={dirigeant?.besoinsPatrimoniaux ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="objectifsRetraite">Objectifs retraite</Label>
            <Textarea
              id="objectifsRetraite"
              name="objectifsRetraite"
              rows={3}
              placeholder="Age de depart souhaite, revenu cible..."
              defaultValue={dirigeant?.objectifsRetraite ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={dirigeant?.notes ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit">{isEdit ? "Enregistrer" : "Creer le dirigeant"}</Button>
        <Link href="/dirigeants">
          <Button type="button" variant="outline">Annuler</Button>
        </Link>
      </div>
    </form>
  );
}
