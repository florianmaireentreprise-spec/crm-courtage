"use client";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SOURCES_ACQUISITION,
  FORMES_JURIDIQUES,
  STATUTS_CLIENT,
  CATEGORIES_RESEAU,
} from "@/lib/constants";
import type { Client, User } from "@prisma/client";

type Props = {
  client?: Client;
  users: Pick<User, "id" | "prenom" | "nom">[];
  prescripteurs?: { id: string; prenom: string; nom: string; entreprise: string | null }[];
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]> } | void>;
};

export function ClientForm({ client, users, prescripteurs, action }: Props) {
  return (
    <form action={async (formData) => { await action(formData); }} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entreprise</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="raisonSociale">Raison sociale *</Label>
            <Input
              id="raisonSociale"
              name="raisonSociale"
              defaultValue={client?.raisonSociale}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="siret">SIRET</Label>
            <Input id="siret" name="siret" defaultValue={client?.siret ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="formeJuridique">Forme juridique</Label>
            <Select name="formeJuridique" defaultValue={client?.formeJuridique ?? ""}>
              <SelectTrigger>
                <SelectValue placeholder="Selectionner..." />
              </SelectTrigger>
              <SelectContent>
                {FORMES_JURIDIQUES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secteurActivite">Secteur d&apos;activite</Label>
            <Input
              id="secteurActivite"
              name="secteurActivite"
              defaultValue={client?.secteurActivite ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nbSalaries">Nb salaries</Label>
            <Input
              id="nbSalaries"
              name="nbSalaries"
              type="number"
              defaultValue={client?.nbSalaries ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chiffreAffaires">CA annuel estime</Label>
            <Input
              id="chiffreAffaires"
              name="chiffreAffaires"
              type="number"
              defaultValue={client?.chiffreAffaires ?? ""}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="conventionCollective">Convention collective</Label>
            <Input
              id="conventionCollective"
              name="conventionCollective"
              defaultValue={client?.conventionCollective ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Couverture actuelle (Qualification)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="mutuelleActuelle">Mutuelle actuelle</Label>
            <Input
              id="mutuelleActuelle"
              name="mutuelleActuelle"
              defaultValue={client?.mutuelleActuelle ?? ""}
              placeholder="Assureur, formule..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prevoyanceActuelle">Prevoyance actuelle</Label>
            <Input
              id="prevoyanceActuelle"
              name="prevoyanceActuelle"
              defaultValue={client?.prevoyanceActuelle ?? ""}
              placeholder="Assureur, garanties..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateEcheanceMutuelle">Date echeance mutuelle</Label>
            <Input
              id="dateEcheanceMutuelle"
              name="dateEcheanceMutuelle"
              type="date"
              defaultValue={
                client?.dateEcheanceMutuelle
                  ? new Date(client.dateEcheanceMutuelle).toISOString().split("T")[0]
                  : ""
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateEcheancePrevoyance">Date echeance prevoyance</Label>
            <Input
              id="dateEcheancePrevoyance"
              name="dateEcheancePrevoyance"
              type="date"
              defaultValue={
                client?.dateEcheancePrevoyance
                  ? new Date(client.dateEcheancePrevoyance).toISOString().split("T")[0]
                  : ""
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dirigeant / Contact principal</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="civilite">Civilite</Label>
            <Select name="civilite" defaultValue={client?.civilite ?? ""}>
              <SelectTrigger>
                <SelectValue placeholder="Selectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M.">M.</SelectItem>
                <SelectItem value="Mme">Mme</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div />
          <div className="space-y-2">
            <Label htmlFor="prenom">Prenom *</Label>
            <Input
              id="prenom"
              name="prenom"
              defaultValue={client?.prenom}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nom">Nom *</Label>
            <Input
              id="nom"
              name="nom"
              defaultValue={client?.nom}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={client?.email ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telephone">Telephone</Label>
            <Input
              id="telephone"
              name="telephone"
              defaultValue={client?.telephone ?? ""}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Input
              id="adresse"
              name="adresse"
              defaultValue={client?.adresse ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="codePostal">Code postal</Label>
            <Input
              id="codePostal"
              name="codePostal"
              defaultValue={client?.codePostal ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ville">Ville</Label>
            <Input
              id="ville"
              name="ville"
              defaultValue={client?.ville ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateNaissance">Date de naissance</Label>
            <Input
              id="dateNaissance"
              name="dateNaissance"
              type="date"
              defaultValue={
                client?.dateNaissance
                  ? new Date(client.dateNaissance).toISOString().split("T")[0]
                  : ""
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metadonnees</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="statut">Statut</Label>
            <Select name="statut" defaultValue={client?.statut ?? "prospect"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUTS_CLIENT.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sourceAcquisition">Source d&apos;acquisition</Label>
            <Select
              name="sourceAcquisition"
              defaultValue={client?.sourceAcquisition ?? ""}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selectionner..." />
              </SelectTrigger>
              <SelectContent>
                {SOURCES_ACQUISITION.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {prescripteurs && prescripteurs.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="prescripteurId">Prescripteur</Label>
              <Select name="prescripteurId" defaultValue={client?.prescripteurId ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucun prescripteur" />
                </SelectTrigger>
                <SelectContent>
                  {prescripteurs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.prenom} {p.nom}{p.entreprise ? ` (${p.entreprise})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="categorieReseau">Categorie reseau personnel</Label>
            <Select name="categorieReseau" defaultValue={client?.categorieReseau ?? ""}>
              <SelectTrigger>
                <SelectValue placeholder="Hors reseau" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES_RESEAU.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assigneA">Assigne a</Label>
            <Select name="assigneA" defaultValue={client?.assigneA ?? ""}>
              <SelectTrigger>
                <SelectValue placeholder="Selectionner..." />
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
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={client?.notes ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit">
          {client ? "Mettre a jour" : "Creer le client"}
        </Button>
      </div>
    </form>
  );
}
