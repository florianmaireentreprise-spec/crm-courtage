"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, ShoppingBag, CheckCircle2, X, ArrowRight, Clock } from "lucide-react";
import { TYPES_PRODUITS } from "@/lib/constants";
import { useRouter } from "next/navigation";

type Opportunite = {
  id: string;
  typeProduit: string | null;
  titre: string;
  description: string | null;
  statut: string;
  confiance: string;
  temperature: string | null;
  origineSignal: string | null;
  detecteeLe: string;
  derniereActivite: string;
};

type Props = {
  opportunites: Opportunite[];
  clientId: string;
};

const CONFIANCE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  haute: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Haute" },
  moyenne: { bg: "bg-amber-50", text: "text-amber-700", label: "Moyenne" },
  basse: { bg: "bg-gray-50", text: "text-gray-600", label: "Basse" },
};

const TEMPERATURE_DOT: Record<string, string> = {
  chaud: "bg-red-500",
  tiede: "bg-amber-500",
  froid: "bg-blue-500",
};

const STATUT_LABELS: Record<string, { label: string; color: string }> = {
  detectee: { label: "Detectee", color: "#3B82F6" },
  qualifiee: { label: "Qualifiee", color: "#8B5CF6" },
  en_cours: { label: "En cours", color: "#F59E0B" },
  convertie: { label: "Convertie", color: "#10B981" },
  rejetee: { label: "Rejetee", color: "#94A3B8" },
  expiree: { label: "Expiree", color: "#94A3B8" },
};

export function OpportunitesCard({ opportunites, clientId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  if (opportunites.length === 0) return null;

  const actives = opportunites.filter((o) => ["detectee", "qualifiee", "en_cours"].includes(o.statut));
  const closed = opportunites.filter((o) => !["detectee", "qualifiee", "en_cours"].includes(o.statut));

  async function updateStatut(id: string, statut: string, motifRejet?: string) {
    setLoading(id);
    try {
      await fetch("/api/opportunities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, statut, motifRejet }),
      });
      router.refresh();
    } catch {
      // Silent failure — will refresh on next load
    } finally {
      setLoading(null);
    }
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const now = Date.now();
    const diffDays = Math.round((now - d.getTime()) / 86400000);
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Opportunites commerciales
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {actives.length} active{actives.length > 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actives.map((opp) => {
          const produitConfig = opp.typeProduit
            ? TYPES_PRODUITS[opp.typeProduit as keyof typeof TYPES_PRODUITS]
            : null;
          const confianceStyle = CONFIANCE_STYLES[opp.confiance] || CONFIANCE_STYLES.moyenne;
          const statutConfig = STATUT_LABELS[opp.statut];
          const tempDot = opp.temperature ? TEMPERATURE_DOT[opp.temperature] : null;
          const isLoading = loading === opp.id;

          return (
            <div
              key={opp.id}
              className="border rounded-lg p-3 space-y-2 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {tempDot && (
                    <span className={`h-2 w-2 rounded-full shrink-0 ${tempDot}`} />
                  )}
                  <span className="text-sm font-medium truncate">{opp.titre}</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] shrink-0"
                  style={{ borderColor: statutConfig?.color, color: statutConfig?.color }}
                >
                  {statutConfig?.label || opp.statut}
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {produitConfig && (
                  <Badge
                    variant="outline"
                    className="text-[10px] gap-1"
                    style={{ borderColor: produitConfig.color, color: produitConfig.color }}
                  >
                    <ShoppingBag className="h-2.5 w-2.5" />
                    {produitConfig.label}
                  </Badge>
                )}
                <Badge variant="outline" className={`text-[10px] ${confianceStyle.bg} ${confianceStyle.text} border-0`}>
                  {confianceStyle.label}
                </Badge>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
                  <Clock className="h-2.5 w-2.5" />
                  {formatDate(opp.derniereActivite)}
                </span>
              </div>

              {opp.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{opp.description}</p>
              )}

              <div className="flex items-center gap-1.5 pt-1">
                {opp.statut === "detectee" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] gap-1"
                    disabled={isLoading}
                    onClick={() => updateStatut(opp.id, "qualifiee")}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Qualifier
                  </Button>
                )}
                {(opp.statut === "detectee" || opp.statut === "qualifiee") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] gap-1"
                    disabled={isLoading}
                    onClick={() => updateStatut(opp.id, "en_cours")}
                  >
                    <ArrowRight className="h-3 w-3" />
                    En cours
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] gap-1 text-muted-foreground ml-auto"
                  disabled={isLoading}
                  onClick={() => updateStatut(opp.id, "rejetee", "Non pertinent")}
                >
                  <X className="h-3 w-3" />
                  Rejeter
                </Button>
              </div>
            </div>
          );
        })}

        {closed.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-[10px] text-muted-foreground">
              {closed.length} opportunite{closed.length > 1 ? "s" : ""} fermee{closed.length > 1 ? "s" : ""}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
