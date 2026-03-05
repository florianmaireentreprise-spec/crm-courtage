"use client";

import { useEffect, useState } from "react";
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
  TYPES_PRODUITS,
  TAUX_COMMISSION_DEFAUT,
  MODES_VERSEMENT,
  FREQUENCES_VERSEMENT,
  STATUTS_CONTRAT,
  type TypeProduit,
} from "@/lib/constants";
import { createContrat } from "../actions";

export default function NouveauContratPage() {
  const [typeProduit, setTypeProduit] = useState<TypeProduit | "">("");
  const [primeAnnuelle, setPrimeAnnuelle] = useState(0);
  const [tauxApport, setTauxApport] = useState(0);
  const [tauxGestion, setTauxGestion] = useState(0);
  const [clients, setClients] = useState<{ id: string; raisonSociale: string }[]>([]);
  const [compagnies, setCompagnies] = useState<{ id: string; nom: string }[]>([]);

  useEffect(() => {
    fetch("/api/clients-list").then((r) => r.json()).then(setClients);
    fetch("/api/compagnies-list").then((r) => r.json()).then(setCompagnies);
  }, []);

  useEffect(() => {
    if (typeProduit && typeProduit in TAUX_COMMISSION_DEFAUT) {
      const taux = TAUX_COMMISSION_DEFAUT[typeProduit as TypeProduit];
      setTauxApport(taux.apport);
      setTauxGestion(taux.gestion);
    }
  }, [typeProduit]);

  const commissionEstimee = primeAnnuelle * tauxGestion;

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Nouveau contrat</h1>
      <form action={createContrat} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Informations générales</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select name="clientId" required>
                <SelectTrigger><SelectValue placeholder="Sélectionner un client..." /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.raisonSociale}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type de produit *</Label>
              <Select name="typeProduit" required onValueChange={(v) => setTypeProduit(v as TypeProduit)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPES_PRODUITS).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Compagnie</Label>
              <Select name="compagnieId">
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {compagnies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nom du produit</Label>
              <Input name="nomProduit" />
            </div>
            <div className="space-y-2">
              <Label>N° de contrat</Label>
              <Input name="numeroContrat" />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select name="statut" defaultValue="actif">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUTS_CONTRAT.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Financier</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prime annuelle TTC *</Label>
              <Input name="primeAnnuelle" type="number" step="0.01" required onChange={(e) => setPrimeAnnuelle(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Taux commission apport (%)</Label>
              <Input name="tauxCommApport" type="number" step="0.001" value={tauxApport} onChange={(e) => setTauxApport(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Taux commission gestion (%)</Label>
              <Input name="tauxCommGestion" type="number" step="0.001" value={tauxGestion} onChange={(e) => setTauxGestion(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Commission annuelle estimée</Label>
              <div className="h-9 flex items-center px-3 border rounded-md bg-muted text-sm font-medium">
                {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(commissionEstimee)}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mode de versement</Label>
              <Select name="modeVersement">
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {MODES_VERSEMENT.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fréquence de versement</Label>
              <Select name="frequenceVersement">
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {FREQUENCES_VERSEMENT.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Dates & détails collectif</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date d&apos;effet *</Label>
              <Input name="dateEffet" type="date" required />
            </div>
            <div className="space-y-2">
              <Label>Date d&apos;échéance</Label>
              <Input name="dateEcheance" type="date" />
            </div>
            <div className="space-y-2">
              <Label>Nb bénéficiaires (collectif)</Label>
              <Input name="nbBeneficiaires" type="number" />
            </div>
            <div className="space-y-2">
              <Label>Cotisation unitaire /mois</Label>
              <Input name="cotisationUnitaire" type="number" step="0.01" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea name="notes" rows={3} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit">Créer le contrat</Button>
      </form>
    </div>
  );
}
