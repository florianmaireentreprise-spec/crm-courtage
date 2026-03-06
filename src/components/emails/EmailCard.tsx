"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronDown, ChevronUp, Loader2, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { analyzeEmail, markEmailRead } from "@/app/(app)/emails/actions";
import { AnalysisPanel } from "./AnalysisPanel";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Email, Client } from "@prisma/client";

type Props = {
  email: Email & { client: Client | null };
};

const pertinenceConfig: Record<string, { label: string; class: string }> = {
  client: { label: "Client", class: "bg-blue-100 text-blue-700 border-blue-200" },
  important: { label: "Important", class: "bg-orange-100 text-orange-700 border-orange-200" },
  normal: { label: "", class: "" },
  ignore: { label: "Ignoré", class: "bg-gray-100 text-gray-500" },
};

const statusColors: Record<string, string> = {
  non_analyse: "bg-muted text-muted-foreground",
  en_cours: "bg-yellow-100 text-yellow-700",
  analyse: "bg-green-100 text-green-700",
  erreur: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  non_analyse: "Non analysé",
  en_cours: "Analyse...",
  analyse: "Analysé",
  erreur: "Erreur",
};

export function EmailCard({ email }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  async function handleAnalyze(e: React.MouseEvent) {
    e.stopPropagation();
    setAnalyzing(true);
    await analyzeEmail(email.id);
    setAnalyzing(false);
    setExpanded(true);
  }

  async function handleClick() {
    if (!email.lu) await markEmailRead(email.id);
    setExpanded((prev) => !prev);
  }

  const isSortant = email.direction === "sortant";
  const pert = pertinenceConfig[email.pertinence] ?? pertinenceConfig.normal;

  return (
    <Card className={`transition-colors ${!email.lu ? "border-blue-200 bg-blue-50/30" : ""}`}>
      <CardContent className="p-4">
        <div
          className="flex items-start justify-between gap-3 cursor-pointer"
          onClick={handleClick}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {/* Direction badge */}
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
              {isSortant ? `→ ${email.destinataires.replace(/[[\]"]/g, "")}` : email.expediteur}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(email.dateEnvoi), "dd MMM yyyy à HH:mm", { locale: fr })}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Pertinence badge */}
            {pert.label && (
              <Badge variant="outline" className={`text-[10px] ${pert.class}`}>
                {pert.label}
              </Badge>
            )}

            {/* Client badge */}
            {email.client && (
              <Badge variant="secondary" className="text-[10px]">
                {email.client.raisonSociale}
              </Badge>
            )}

            {/* Analysis status */}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                statusColors[email.analyseStatut] ?? statusColors.non_analyse
              }`}
            >
              {statusLabels[email.analyseStatut] ?? "Non analysé"}
            </span>

            {email.analyseStatut === "non_analyse" && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                {analyzing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <><Sparkles className="h-3 w-3 mr-1" />Analyser</>
                )}
              </Button>
            )}

            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Preview */}
        {!expanded && email.extrait && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{email.extrait}</p>
        )}

        {/* Expanded content */}
        {expanded && (
          <div className="mt-3 space-y-3">
            {email.extrait && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{email.extrait}</p>
            )}
            {email.analyseStatut === "analyse" && (
              <AnalysisPanel email={email} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
