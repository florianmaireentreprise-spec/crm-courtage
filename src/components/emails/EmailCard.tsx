"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronDown, ChevronUp, Loader2, ArrowUpRight, ArrowDownLeft, AlertTriangle, CheckCircle2, ShoppingBag, Lightbulb } from "lucide-react";
import { analyzeEmail, markEmailRead, markActionTraitee } from "@/app/(app)/emails/actions";
import { AnalysisPanel } from "./AnalysisPanel";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Email } from "@prisma/client";
import type { EmailWithClient } from "./EmailPageTabs";

type Props = {
  email: EmailWithClient;
  onClick?: () => void;
  opportunityInfo?: { count: number; statuts: string[] } | null;
};

const typeConfig: Record<string, { label: string; class: string }> = {
  client: { label: "Client", class: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300" },
  prospect: { label: "Prospect", class: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300" },
  assureur: { label: "Assureur", class: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300" },
  prescripteur: { label: "Prescripteur", class: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300" },
  autre: { label: "", class: "" },
};

const urgenceConfig: Record<string, { label: string; class: string }> = {
  haute: { label: "Urgent", class: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300" },
  normale: { label: "", class: "" },
  basse: { label: "", class: "" },
};

const statusColors: Record<string, string> = {
  non_analyse: "bg-muted text-muted-foreground",
  en_cours: "bg-yellow-100 text-yellow-700",
  analyse: "bg-green-100 text-green-700",
  erreur: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  non_analyse: "Non analyse",
  en_cours: "Analyse...",
  analyse: "Analyse",
  erreur: "Erreur",
};

const PRODUCT_SHORT: Record<string, string> = {
  SANTE_COLLECTIVE: "Sante coll.",
  PREVOYANCE_COLLECTIVE: "Prevoyance coll.",
  PREVOYANCE_MADELIN: "Prevoyance Mad.",
  SANTE_MADELIN: "Sante Mad.",
  RCP_PRO: "RCP Pro",
  PER: "PER",
  ASSURANCE_VIE: "Assurance vie",
  PROTECTION_JURIDIQUE: "PJ",
};

export function EmailCard({ email, onClick, opportunityInfo }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [treated, setTreated] = useState(email.actionTraitee);
  const [treating, setTreating] = useState(false);

  async function handleAnalyze(e: React.MouseEvent) {
    e.stopPropagation();
    setAnalyzing(true);
    setAnalyzeError(null);
    const result = await analyzeEmail(email.id);
    setAnalyzing(false);
    if (result && "error" in result) {
      setAnalyzeError(result.error as string);
    } else {
      setExpanded(true);
    }
  }

  async function handleClick() {
    if (!email.lu) await markEmailRead(email.id);
    if (onClick) {
      onClick();
    } else {
      setExpanded((prev) => !prev);
    }
  }

  async function handleMarkTreated(e: React.MouseEvent) {
    e.stopPropagation();
    setTreating(true);
    await markActionTraitee(email.id);
    setTreated(true);
    setTreating(false);
  }

  const isSortant = email.direction === "sortant";
  const emailType = typeConfig[email.typeEmail ?? ""] ?? typeConfig.autre;
  const emailUrgence = urgenceConfig[email.urgence ?? ""] ?? urgenceConfig.normale;
  const isCommercial = email.typeEmail && ["client", "prospect", "prescripteur"].includes(email.typeEmail);

  // Parse products from JSON
  let products: string[] = [];
  if (email.produitsMentionnes) {
    try { products = JSON.parse(email.produitsMentionnes); } catch { /* ignore */ }
  }

  const hasOpportunity = opportunityInfo && opportunityInfo.count > 0;

  return (
    <Card className={`transition-colors ${!email.lu ? "border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/20" : ""} ${email.urgence === "haute" ? "border-l-4 border-l-red-400" : hasOpportunity ? "border-l-4 border-l-amber-400" : isCommercial ? "border-l-4 border-l-blue-400" : ""}`}>
      <CardContent className="p-4">
        <div
          className="flex items-start justify-between gap-3 cursor-pointer"
          onClick={handleClick}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isSortant ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
              ) : (
                <ArrowDownLeft className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
              )}
              {!email.lu && (
                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              )}
              <p className={`text-sm font-medium truncate ${!email.lu ? "font-semibold" : ""}`}>
                {email.sujet}
              </p>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {isSortant ? `\u2192 ${email.destinataires.replace(/[[\]"]/g, "")}` : email.expediteur}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(email.dateEnvoi), "dd MMM yyyy a HH:mm", { locale: fr })}
            </p>
            {/* AI summary preview */}
            {!expanded && email.resume && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">{email.resume}</p>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end max-w-[50%]">
            {/* Type badge */}
            {emailType.label && (
              <Badge variant="outline" className={`text-[10px] ${emailType.class}`}>
                {emailType.label}
              </Badge>
            )}

            {/* Urgence badge */}
            {emailUrgence.label && (
              <Badge variant="outline" className={`text-[10px] ${emailUrgence.class}`}>
                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                {emailUrgence.label}
              </Badge>
            )}

            {/* Product badges (max 2) */}
            {products.slice(0, 2).map((p) => (
              <Badge key={p} variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 gap-0.5">
                <ShoppingBag className="h-2.5 w-2.5" />
                {PRODUCT_SHORT[p] || p}
              </Badge>
            ))}
            {products.length > 2 && (
              <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
                +{products.length - 2}
              </Badge>
            )}

            {/* Opportunity indicator */}
            {hasOpportunity && (
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 gap-0.5">
                <Lightbulb className="h-2.5 w-2.5" />
                {opportunityInfo.count} opp.
              </Badge>
            )}

            {/* Client badge */}
            {email.client && (
              <Badge variant="secondary" className="text-[10px]">
                {email.client.raisonSociale}
              </Badge>
            )}

            {/* New contact badge */}
            {!email.clientId && email.typeEmail && !["newsletter", "spam", "autre"].includes(email.typeEmail ?? "") && (
              <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                Nouveau contact
              </Badge>
            )}

            {/* Action status */}
            {email.actionRequise && !treated && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px] text-orange-600 border-orange-200 hover:bg-orange-50"
                onClick={handleMarkTreated}
                disabled={treating}
              >
                {treating ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-0.5" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 mr-0.5" />
                )}
                {treating ? "..." : "Traiter"}
              </Button>
            )}
            {treated && email.actionRequise && (
              <Badge variant="outline" className="text-[10px] bg-green-50 text-green-600 border-green-200">
                Traite
              </Badge>
            )}

            {/* Analysis status */}
            {!analyzing && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  statusColors[email.analyseStatut] ?? statusColors.non_analyse
                }`}
              >
                {statusLabels[email.analyseStatut] ?? "Non analyse"}
              </span>
            )}

            {analyzing ? (
              <span className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analyse IA en cours…
              </span>
            ) : (email.analyseStatut === "non_analyse" || email.analyseStatut === "erreur") && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                {email.analyseStatut === "erreur" ? "Réessayer" : "Analyser"}
              </Button>
            )}

            {analyzeError && !analyzing && (
              <span className="text-[10px] text-red-500">{analyzeError}</span>
            )}

            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Preview */}
        {!expanded && email.extrait && !email.resume && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{email.extrait}</p>
        )}

        {/* Expanded content — AI analysis first, then original email */}
        {expanded && (
          <div className="mt-3 space-y-3">
            {email.analyseStatut === "analyse" && (
              <AnalysisPanel email={email} />
            )}
            {email.extrait && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Email original
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/20 rounded-lg p-3">{email.extrait}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
