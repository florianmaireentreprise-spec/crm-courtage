import { prisma } from "@/lib/prisma";
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
import { createDirigeant } from "../actions";
import Link from "next/link";

export default async function NouveauDirigeantPage() {
  // Clients sans dirigeant
  const clientsSansDirigeant = await prisma.client.findMany({
    where: {
      dirigeant: null,
    },
    select: { id: true, raisonSociale: true, prenom: true, nom: true },
    orderBy: { raisonSociale: "asc" },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Nouveau dirigeant</h1>

      <form action={createDirigeant} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entreprise & Identite</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="clientId">Entreprise / Client *</Label>
              <Select name="clientId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner une entreprise..." />
                </SelectTrigger>
                <SelectContent>
                  {clientsSansDirigeant.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.raisonSociale} ({c.prenom} {c.nom})
                    </SelectItem>
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
              <Label htmlFor="statutProfessionnel">Statut professionnel</Label>
              <Select name="statutProfessionnel">
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
              <Input id="prenom" name="prenom" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input id="nom" name="nom" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephone">Telephone</Label>
              <Input id="telephone" name="telephone" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateNaissance">Date de naissance</Label>
              <Input id="dateNaissance" name="dateNaissance" type="date" />
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
              <Input id="mutuellePerso" name="mutuellePerso" placeholder="Assureur, formule..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prevoyancePerso">Prevoyance personnelle</Label>
              <Input id="prevoyancePerso" name="prevoyancePerso" placeholder="Assureur, garanties..." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="protectionActuelle">Description protection actuelle</Label>
              <Textarea id="protectionActuelle" name="protectionActuelle" rows={3} placeholder="Detail de la couverture actuelle du dirigeant..." />
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
              <Input id="regimeRetraite" name="regimeRetraite" placeholder="CNAV, RSI, CIPAV..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complementaireRetraite">Complementaire retraite</Label>
              <Input id="complementaireRetraite" name="complementaireRetraite" placeholder="PER, Madelin..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="epargneActuelle">Epargne actuelle</Label>
              <Input id="epargneActuelle" name="epargneActuelle" placeholder="Type d'epargne..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="montantEpargne">Montant epargne (EUR)</Label>
              <Input id="montantEpargne" name="montantEpargne" type="number" step="0.01" />
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
              <Textarea id="besoinsPatrimoniaux" name="besoinsPatrimoniaux" rows={3} placeholder="Transmission, protection famille, optimisation fiscale..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="objectifsRetraite">Objectifs retraite</Label>
              <Textarea id="objectifsRetraite" name="objectifsRetraite" rows={3} placeholder="Age de depart souhaite, revenu cible..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit">Creer le dirigeant</Button>
          <Link href="/dirigeants">
            <Button type="button" variant="outline">Annuler</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
