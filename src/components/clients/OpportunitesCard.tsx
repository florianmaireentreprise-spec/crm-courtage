"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Lightbulb, ShoppingBag, CheckCircle2, X, ArrowRight, Clock,
  Trophy, ThumbsDown, ChevronDown, ChevronRight, Loader2,
} from "lucide-react";
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
  sourceType: string;
  origineSignal: string | null;
  detecteeLe: string;
  derniereActivite: string;
  closedAt?: string | null;
  closeReason?: string | null;
  motifRejet?: string | null;
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
  gagnee: { label: "Gagnee", color: "#10B981" },
  perdue: { label: "Perdue", color: "#EF4444" },
  rejetee: { label: "Rejetee", color: "#94A3B8" },
  // Legacy
  convertie: { label: "Convertie", color: "#10B981" },
  expiree: { label: "Expiree", color: "#94A3B8" },
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  signal: "📧 Signal client",
  email_analysis: "📧 Signal client",
  cross_sell: "🛡️ Analyse portefeuille",
};

const ORIGINE_SIGNAL_LABELS: Record<string, { label: string; icon: string }> = {
  produit_mentionne: { label: "Produit mentionne", icon: "📦" },
  besoin: { label: "Besoin identifie", icon: "🎯" },
  demande_devis: { label: "Demande de devis", icon: "📋" },
  renouvellement: { label: "Renouvellement", icon: "🔄" },
  nouveau_besoin: { label: "Nouveau besoin", icon: "✨" },
  urgence_produit: { label: "Signal urgent", icon: "⚡" },
  couverture_manquante: { label: "Couverture manquante", icon: "🛡️" },
  echeance_proche: { label: "Echeance proche", icon: "📅" },
};

const ACTIVE_STATUSES = ["detectee", "qualifiee", "en_cours"];

export function OpportunitesCard({ opportunites, clientId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [reasonInput, setReasonInput] = useState<{ id: string; action: string } | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [showClosed, setShowClosed] = useState(false);

  if (opportunites.length === 0) return null;

  const actives = opportunites.filter((o) => ACTIVE_STATUSES.includes(o.statut));
  const closed = opportunites.filter((o) => !ACTIVE_STATUSES.includes(o.statut));

  async function updateStatut(id: string, statut: string, closeReason?: string) {
    setLoading(id);
    try {
      await fetch("/api/opportunities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, statut, closeReason }),
      });
      router.refresh();
    } catch {
      // Will refresh on next load
    } finally {
      setLoading(null);
      setReasonInput(null);
      setReasonText("");
    }
  }

  function startReasonFlow(id: string, action: string) {
    setReasonInput({ id, action });
    setReasonText("");
  }

  function confirmReason() {
    if (!reasonInput) return;
    updateStatut(reasonInput.id, reasonInput.action, reasonText || undefined);
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

  function renderButtons(opp: Opportunite) {
    const isLoading = loading === opp.id;
    const isReasoning = reasonInput?.id === opp.id;

    if (isReasoning) {
      return (
        <div className="space-y-1.5 pt-1">
          <input
            type="text"
            className="w-full h-7 px-2 text-xs border rounded bg-background"
            placeholder={reasonInput.action === "rejetee" ? "Raison du rejet (optionnel)" : reasonInput.action === "perdue" ? "Raison de la perte (optionnel)" : "Commentaire (optionnel)"}
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmReason()}
            autoFocus
          />
          <div className="flex gap-1.5">
            <Button size="sm" className="h-6 text-[10px]" onClick={confirmReason} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmer"}
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setReasonInput(null)}>
              Annuler
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 pt-1 flex-wrap">
        {/* Forward transitions */}
        {opp.statut === "detectee" && (
          <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" disabled={isLoading} onClick={() => updateStatut(opp.id, "qualifiee")}>
            <CheckCircle2 className="h-3 w-3" /> Qualifier
          </Button>
        )}
        {(opp.statut === "detectee" || opp.statut === "qualifiee") && (
          <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" disabled={isLoading} onClick={() => updateStatut(opp.id, "en_cours")}>
            <ArrowRight className="h-3 w-3" /> En cours
          </Button>
        )}
        {opp.statut === "en_cours" && (
          <>
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50" disabled={isLoading} onClick={() => startReasonFlow(opp.id, "gagnee")}>
              <Trophy className="h-3 w-3" /> Gagnee
            </Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 border-red-300 text-red-600 hover:bg-red-50" disabled={isLoading} onClick={() => startReasonFlow(opp.id, "perdue")}>
              <ThumbsDown className="h-3 w-3" /> Perdue
            </Button>
          </>
        )}

        {/* Reject — available on all active statuses */}
        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-muted-foreground ml-auto" disabled={isLoading} onClick={() => startReasonFlow(opp.id, "rejetee")}>
          <X className="h-3 w-3" /> Rejeter
        </Button>
      </div>
    );
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

          return (
            <div key={opp.id} className="border rounded-lg p-3 space-y-2 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {tempDot && <span className={`h-2 w-2 rounded-full shrink-0 ${tempDot}`} />}
                  <span className="text-sm font-medium truncate">{opp.titre}</span>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0" style={{ borderColor: statutConfig?.color, color: statutConfig?.color }}>
                  {statutConfig?.label || opp.statut}
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {produitConfig && (
                  <Badge variant="outline" className="text-[10px] gap-1" style={{ borderColor: produitConfig.color, color: produitConfig.color }}>
                    <ShoppingBag className="h-2.5 w-2.5" /> {produitConfig.label}
                  </Badge>
                )}
                <Badge variant="outline" className={`text-[10px] ${confianceStyle.bg} ${confianceStyle.text} border-0`}>
                  {confianceStyle.label}
                </Badge>
                {SOURCE_TYPE_LABELS[opp.sourceType] && (
                  <span className="text-[10px] text-muted-foreground/70">{SOURCE_TYPE_LABELS[opp.sourceType]}</span>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {opp.origineSignal && ORIGINE_SIGNAL_LABELS[opp.origineSignal]
                    ? `${ORIGINE_SIGNAL_LABELS[opp.origineSignal].icon} ${ORIGINE_SIGNAL_LABELS[opp.origineSignal].label}`
                    : "🔍 Autre signal"}
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
                  <Clock className="h-2.5 w-2.5" /> {formatDate(opp.derniereActivite)}
                </span>
              </div>

              {opp.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{opp.description}</p>
              )}

              {renderButtons(opp)}
            </div>
          );
        })}

        {/* Closed opportunities — collapsible */}
        {closed.length > 0 && (
          <div className="pt-2 border-t">
            <button
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full"
              onClick={() => setShowClosed(!showClosed)}
            >
              {showClosed ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {closed.length} opportunite{closed.length > 1 ? "s" : ""} fermee{closed.length > 1 ? "s" : ""}
            </button>
            {showClosed && (
              <div className="mt-2 space-y-1.5">
                {closed.map((opp) => {
                  const statutConfig = STATUT_LABELS[opp.statut];
                  const reason = opp.closeReason || opp.motifRejet;
                  return (
                    <div key={opp.id} className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                      <Badge variant="outline" className="text-[9px] shrink-0" style={{ borderColor: statutConfig?.color, color: statutConfig?.color }}>
                        {statutConfig?.label || opp.statut}
                      </Badge>
                      <span className="truncate">{opp.titre}</span>
                      {SOURCE_TYPE_LABELS[opp.sourceType] && (
                        <span className="text-[9px] text-muted-foreground/70 shrink-0">{SOURCE_TYPE_LABELS[opp.sourceType]}</span>
                      )}
                      <span className="text-[9px] shrink-0">
                        {opp.origineSignal && ORIGINE_SIGNAL_LABELS[opp.origineSignal]
                          ? ORIGINE_SIGNAL_LABELS[opp.origineSignal].icon
                          : "🔍"}
                      </span>
                      {reason && <span className="text-[10px] italic truncate ml-auto">— {reason}</span>}
                      {opp.closedAt && <span className="text-[10px] shrink-0">{formatDate(opp.closedAt)}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
