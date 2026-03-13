"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, CheckCircle2, X, PenLine, Lightbulb, Trophy, ThumbsDown, AlertTriangle, Target } from "lucide-react";

export type FeedbackStats = {
  total: number;
  byType: Record<string, number>;
  opportunityOutcomes: {
    won: number;
    lost: number;
    rejected: number;
  };
  replyStats: {
    sent: number;
    edited: number;
  };
  actionStats: {
    executed: number;
    ignored: number;
  };
  detectionQuality?: Record<string, { total: number; rejected: number; won: number; lost: number }>;
};

const RULE_LABELS: Record<string, string> = {
  produit_mentionne: "Produit mentionne",
  besoin: "Besoin identifie",
  demande_devis: "Demande de devis",
  renouvellement: "Renouvellement",
  nouveau_besoin: "Nouveau besoin",
  urgence_produit: "Signal urgent",
  inconnu: "Autre",
};

function pct(a: number, b: number): string {
  if (b === 0) return "—";
  return Math.round((a / b) * 100) + "%";
}

export function FeedbackStatsCard({ stats }: { stats: FeedbackStats }) {
  const replyTotal = stats.replyStats.sent + stats.replyStats.edited;
  const actionTotal = stats.actionStats.executed + stats.actionStats.ignored;
  const oppTotal = stats.opportunityOutcomes.won + stats.opportunityOutcomes.lost + stats.opportunityOutcomes.rejected;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-500" />
          Intelligence IA — Feedback
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {stats.total} evenements
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.total === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun feedback enregistre. Les statistiques apparaitront a mesure que vous utilisez les suggestions IA.
          </p>
        ) : (
          <>
            {/* Reply quality */}
            {replyTotal > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reponses IA</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-sm">{stats.replyStats.sent} envoyees telles quelles</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <PenLine className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-sm">{stats.replyStats.edited} editees avant envoi</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Taux acceptation: {pct(stats.replyStats.sent, replyTotal)}
                  </Badge>
                </div>
              </div>
            )}

            {/* Actions quality */}
            {actionTotal > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions suggerees</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-sm">{stats.actionStats.executed} executees</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">{stats.actionStats.ignored} ignorees</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Taux utilisation: {pct(stats.actionStats.executed, actionTotal)}
                  </Badge>
                </div>
              </div>
            )}

            {/* Opportunity outcomes */}
            {oppTotal > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Opportunites detectees</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-sm">{stats.opportunityOutcomes.won} gagnees</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-sm">{stats.opportunityOutcomes.lost} perdues</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">{stats.opportunityOutcomes.rejected} rejetees</span>
                  </div>
                  {stats.opportunityOutcomes.rejected > 0 && (
                    <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">
                      Taux faux positifs: {pct(stats.opportunityOutcomes.rejected, oppTotal)}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Client linkage */}
            {(stats.byType.client_linked ?? 0) > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rattachements clients</p>
                <div className="flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-sm">{stats.byType.client_linked} emails rattaches manuellement</span>
                </div>
              </div>
            )}

            {/* Detection quality by rule type */}
            {stats.detectionQuality && Object.keys(stats.detectionQuality).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Target className="h-3 w-3" /> Qualite detection par regle
                </p>
                <div className="space-y-1">
                  {Object.entries(stats.detectionQuality)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([rule, data]) => (
                      <div key={rule} className="flex items-center gap-2 text-sm">
                        <span className="text-xs min-w-[130px]">{RULE_LABELS[rule] || rule}</span>
                        <span className="text-xs text-muted-foreground">
                          {data.total} detectee{data.total > 1 ? "s" : ""}
                        </span>
                        {data.won > 0 && (
                          <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700">
                            {data.won} gagnee{data.won > 1 ? "s" : ""}
                          </Badge>
                        )}
                        {data.rejected > 0 && (
                          <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">
                            {data.rejected} rejetee{data.rejected > 1 ? "s" : ""} sur {data.total}
                            {data.total >= 5 ? ` (${pct(data.rejected, data.total)})` : ""}
                          </Badge>
                        )}
                        {data.rejected === 0 && data.total > 0 && (
                          <span className="text-[10px] text-muted-foreground">0 rejetee</span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
