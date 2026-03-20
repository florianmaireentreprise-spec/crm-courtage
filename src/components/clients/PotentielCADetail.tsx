"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TrendingUp, ChevronDown, ChevronUp, Pencil, Check, X, Info } from "lucide-react";
import { toast } from "sonner";

export type PotentielProduit = {
  typeProduit: string;
  label: string;
  recurring: number;
  upfront: number;
  total: number;
  basis: string;
};

type Props = {
  potentielTotal: number;
  recurringTotal: number;
  upfrontTotal: number;
  produits: PotentielProduit[];
  nbSalaries: number | null;
  clientId: string;
  updateNbSalariesAction: (clientId: string, nbSalaries: number | null) => Promise<{ error?: string } | void>;
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function PotentielCADetail({
  potentielTotal,
  recurringTotal,
  upfrontTotal,
  produits,
  nbSalaries,
  clientId,
  updateNbSalariesAction,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editingNb, setEditingNb] = useState(false);
  const [nbValue, setNbValue] = useState<string>(nbSalaries?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSaveNb() {
    setSaving(true);
    const val = nbValue.trim() === "" ? null : parseInt(nbValue, 10);
    if (val !== null && (isNaN(val) || val < 0)) {
      toast.error("Nombre invalide");
      setSaving(false);
      return;
    }
    const result = await updateNbSalariesAction(clientId, val);
    setSaving(false);
    if (result && "error" in result) {
      toast.error("Erreur", { description: result.error });
    } else {
      toast.success("Effectif mis a jour");
      setEditingNb(false);
    }
  }

  if (potentielTotal <= 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Potentiel CA
          </CardTitle>
          <span className="text-xl font-bold text-emerald-600">
            {formatCurrency(potentielTotal)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Recurring vs upfront summary */}
        <div className="flex gap-3">
          <div className="flex-1 rounded-md bg-blue-50 dark:bg-blue-950/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Recurrent annuel</p>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
              {formatCurrency(recurringTotal)}
            </p>
          </div>
          {upfrontTotal > 0 && (
            <div className="flex-1 rounded-md bg-amber-50 dark:bg-amber-950/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">Ponctuel (entree)</p>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {formatCurrency(upfrontTotal)}
              </p>
            </div>
          )}
        </div>

        {/* Employee count — editable inline */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Effectif estime :</span>
          {editingNb ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                value={nbValue}
                onChange={(e) => setNbValue(e.target.value)}
                className="h-7 w-20 text-xs"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleSaveNb}
                disabled={saving}
              >
                <Check className="h-3 w-3 text-green-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => { setEditingNb(false); setNbValue(nbSalaries?.toString() ?? ""); }}
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="font-medium">{nbSalaries ?? "non renseigne"}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => { setEditingNb(true); setNbValue(nbSalaries?.toString() ?? ""); }}
                title="Modifier l'effectif"
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          )}
          {!nbSalaries && (
            <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300">
              Defaut: 1
            </Badge>
          )}
        </div>

        {/* Expand/collapse detail */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Masquer le detail" : "Voir le detail par produit manquant"}
        </button>

        {expanded && (
          <div className="space-y-2">
            {produits.map((p) => (
              <div
                key={p.typeProduit}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-xs">{p.label}</span>
                  <span className="font-semibold text-xs">{formatCurrency(p.total)}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {p.recurring > 0 && (
                    <span className="text-[10px] text-blue-600">
                      Recurrent: {formatCurrency(p.recurring)}
                    </span>
                  )}
                  {p.upfront > 0 && (
                    <span className="text-[10px] text-amber-600">
                      Ponctuel: {formatCurrency(p.upfront)}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{p.basis}</p>
              </div>
            ))}

            <div className="flex items-start gap-1.5 mt-2 text-[10px] text-muted-foreground">
              <Info className="h-3 w-3 shrink-0 mt-0.5" />
              <p>
                Estimation theorique basee sur les produits manquants et des hypotheses internes.
                Ce n&apos;est ni du CA signe ni une probabilite de closing.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
