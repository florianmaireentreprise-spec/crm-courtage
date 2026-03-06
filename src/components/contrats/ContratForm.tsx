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
import type { Contrat } from "@prisma/client";

interface ContratFormProps {
  contrat?: Contrat;
  action: (formData: FormData) => Promise<void | { error?: Record<string, string[]> }>;
  clients: { id: string; raisonSociale: string }[];
  compagnies: { id: string; nom: string }[];
}

export function ContratForm({ contrat, action, clients, compagnies }: ContratFormProps) {
  const isEdit = !!contrat;

  const [typeProduit, setTypeProduit] = useState<TypeProduit | "">(
    isEdit ? (contrat.typeProduit as TypeProduit) : ""
  );
  const [primeAnnuelle, setPrimeAnnuelle] = useState(isEdit ? contrat.primeAnnuelle : 0);
  const [tauxApport, setTauxApport] = useState(
    isEdit ? (contrat.tauxCommApport ?? 0) : 0
  );
  const [tauxGestion, setTauxGestion] = useState(
    isEdit ? (contrat.tauxCommGestion ?? 0) : 0
  );

  useEffect(() => {
    if (!isEdit && typeProduit && typeProduit in TAUX_COMMISSION_DEFAUT) {
      const taux = TAUX_COMMISSION_DEFAUT[typeProduit as TypeProduit];
      setTauxApport(taux.apport);
      setTauxGestion(taux.gestion);
    }
  }, [typeProduit, isEdit]);

  const commissionEstimee = primeAnnuelle * tauxGestion;

  return (
    <form action={async (formData) => { await action(formData); }} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Informations generales</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Client *</Label>
            <Select name="clientId" required defaultValue={contrat?.clientId}>
              <SelectTrigger><SelectValue placeholder="Selectionner un client..." /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.raisonSociale}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type de produit *</Label>
            <Select
              name="typeProduit"
              required
              defaultValue={contrat?.typeProduit}
              onValueChange={(v) => setTypeProduit(v as TypeProduit)}
            >
              <SelectTrigger><SelectValue placeholder="Selectionner..." /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPES_PRODUITS).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Compagnie</Label>
            <Select name="compagnieId" defaultValue={contrat?.compagnieId ?? undefined}>
              <SelectTrigger><SelectValue placeholder="Selectionner..." /></SelectTrigger>
              <SelectContent>
                {compagnies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nom du produit</Label>
            <Input name="nomProduit" defaultValue={contrat?.nomProduit ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>N° de contrat</Label>
            <Input name="numeroContrat" defaultValue={contrat?.numeroContrat ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select name="statut" defaultValue={contrat?.statut ?? "actif"}>
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
            <Input
              name="primeAnnuelle"
              type="number"
              step="0.01"
              required
              defaultValue={contrat?.primeAnnuelle ?? ""}
              onChange={(e) => setPrimeAnnuelle(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Taux commission apport (%)</Label>
            <Input
              name="tauxCommApport"
              type="number"
              step="0.001"
              value={tauxApport}
              onChange={(e) => setTauxApport(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Taux commission gestion (%)</Label>
            <Input
              name="tauxCommGestion"
              type="number"
              step="0.001"
              value={tauxGestion}
              onChange={(e) => setTauxGestion(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Commission annuelle estimee</Label>
            <div className="h-9 flex items-center px-3 border rounded-md bg-muted text-sm font-medium">
              {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(commissionEstimee)}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Mode de versement</Label>
            <Select name="modeVersement" defaultValue={contrat?.modeVersement ?? undefined}>
              <SelectTrigger><SelectValue placeholder="Selectionner..." /></SelectTrigger>
              <SelectContent>
                {MODES_VERSEMENT.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Frequence de versement</Label>
            <Select name="frequenceVersement" defaultValue={contrat?.frequenceVersement ?? undefined}>
              <SelectTrigger><SelectValue placeholder="Selectionner..." /></SelectTrigger>
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
        <CardHeader><CardTitle className="text-base">Dates & details collectif</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date d&apos;effet *</Label>
            <Input
              name="dateEffet"
              type="date"
              required
              defaultValue={contrat?.dateEffet ? contrat.dateEffet.toISOString().slice(0, 10) : ""}
            />
          </div>
          <div className="space-y-2">
            <Label>Date d&apos;echeance</Label>
            <Input
              name="dateEcheance"
              type="date"
              defaultValue={contrat?.dateEcheance ? contrat.dateEcheance.toISOString().slice(0, 10) : ""}
            />
          </div>
          <div className="space-y-2">
            <Label>Nb beneficiaires (collectif)</Label>
            <Input name="nbBeneficiaires" type="number" defaultValue={contrat?.nbBeneficiaires ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Cotisation unitaire /mois</Label>
            <Input name="cotisationUnitaire" type="number" step="0.01" defaultValue={contrat?.cotisationUnitaire ?? ""} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Notes</Label>
            <Textarea name="notes" rows={3} defaultValue={contrat?.notes ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Button type="submit">{isEdit ? "Enregistrer les modifications" : "Creer le contrat"}</Button>
    </form>
  );
}
