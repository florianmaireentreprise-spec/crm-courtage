"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Pencil, Check, X, Info, Calculator } from "lucide-react";
import { toast } from "sonner";
import { updateBaseAssumption } from "@/app/(app)/parametres/hypotheses/actions";

type Assumption = {
  id: string;
  typeProduit: string;
  label: string;
  estimatedPremium: number;
  isPerEmployee: boolean;
  perTenEmployeeIncrement: number;
  commissionRate: number;
  isRecurring: boolean;
  enabled: boolean;
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export function HypothesesTable({ assumptions }: { assumptions: Assumption[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPremium, setEditPremium] = useState("");
  const [editRate, setEditRate] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  function startEdit(a: Assumption) {
    setEditingId(a.id);
    setEditPremium(a.estimatedPremium.toString());
    setEditRate((a.commissionRate * 100).toFixed(1));
    setEditEnabled(a.enabled);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSave(id: string) {
    setSaving(true);
    const formData = new FormData();
    formData.set("id", id);
    formData.set("estimatedPremium", editPremium);
    formData.set("commissionRate", editRate);
    if (editEnabled) formData.set("enabled", "true");

    const result = await updateBaseAssumption(formData);
    setSaving(false);
    if (result && "error" in result) {
      toast.error("Erreur de validation");
    } else {
      toast.success("Hypothese mise a jour");
      setEditingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Hypotheses de base — potentiel CA
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Ces valeurs servent de base au calcul theorique du potentiel. Les estimations client derivent de ces hypotheses, sauf surcharge manuelle.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Produit</th>
                <th className="pb-2 font-medium text-right">Prime estimee</th>
                <th className="pb-2 font-medium text-center">Mode</th>
                <th className="pb-2 font-medium text-right">Commission</th>
                <th className="pb-2 font-medium text-center">Type</th>
                <th className="pb-2 font-medium text-center">Actif</th>
                <th className="pb-2 font-medium text-right">Exemple (10 sal.)</th>
                <th className="pb-2 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assumptions.map((a) => {
                const isEditing = editingId === a.id;
                // Compute example for 10 employees
                let examplePremium = a.estimatedPremium;
                if (a.isPerEmployee) examplePremium *= 10;
                examplePremium += Math.floor(10 / 10) * a.perTenEmployeeIncrement;
                const exampleCommission = Math.round(examplePremium * a.commissionRate);

                return (
                  <tr key={a.id} className={`border-b last:border-0 ${!a.enabled ? "opacity-50" : ""}`}>
                    <td className="py-3">
                      <span className="font-medium">{a.label}</span>
                      <span className="text-[10px] text-muted-foreground ml-1.5">({a.typeProduit})</span>
                    </td>
                    <td className="py-3 text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          min={0}
                          value={editPremium}
                          onChange={(e) => setEditPremium(e.target.value)}
                          className="h-7 w-24 text-xs ml-auto"
                        />
                      ) : (
                        <span className="font-mono text-xs">
                          {formatCurrency(a.estimatedPremium)}
                          {a.isPerEmployee && <span className="text-muted-foreground">/sal./an</span>}
                          {!a.isPerEmployee && <span className="text-muted-foreground">/an</span>}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {a.isPerEmployee ? (
                        <Badge variant="secondary" className="text-[10px]">Par salarie</Badge>
                      ) : a.perTenEmployeeIncrement > 0 ? (
                        <Badge variant="secondary" className="text-[10px]">Base + /10 sal.</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Forfait</Badge>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center gap-1 justify-end">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            value={editRate}
                            onChange={(e) => setEditRate(e.target.value)}
                            className="h-7 w-20 text-xs"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      ) : (
                        <span className="font-mono text-xs">{(a.commissionRate * 100).toFixed(1)}%</span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {a.isRecurring ? (
                        <Badge className="text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-100">Recurrent</Badge>
                      ) : (
                        <Badge className="text-[10px] bg-amber-100 text-amber-700 hover:bg-amber-100">Ponctuel</Badge>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {isEditing ? (
                        <Switch checked={editEnabled} onCheckedChange={setEditEnabled} />
                      ) : (
                        <span className={`text-xs ${a.enabled ? "text-green-600" : "text-red-500"}`}>
                          {a.enabled ? "Oui" : "Non"}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <span className="font-mono text-xs text-muted-foreground">{formatCurrency(exampleCommission)}</span>
                    </td>
                    <td className="py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center gap-1 justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleSave(a.id)}
                            disabled={saving}
                          >
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={cancelEdit}
                          >
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => startEdit(a)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-start gap-1.5 mt-4 text-[10px] text-muted-foreground border-t pt-3">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          <p>
            Les colonnes Prime et Commission sont editables. Le mode (par salarie / forfait) et le type (recurrent / ponctuel) sont fixes.
            L&apos;exemple est calcule pour 10 salaries. Les surcharges client s&apos;appliquent par-dessus ces hypotheses.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
