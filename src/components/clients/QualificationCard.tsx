"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, XCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { QualificationResult } from "@/lib/scoring/qualification";

type Props = {
  qualification: QualificationResult;
  clientId: string;
  hasDirigeant: boolean;
};

const STATUT_CONFIG = {
  qualifie: { label: "Qualifié", color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2, barColor: "bg-emerald-500" },
  en_cours: { label: "En cours", color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300", icon: AlertCircle, barColor: "bg-amber-500" },
  non_qualifie: { label: "Non qualifié", color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300", icon: XCircle, barColor: "bg-red-500" },
} as const;

const CATEGORIE_LABELS: Record<string, string> = {
  entreprise: "Entreprise",
  contact: "Contact",
  couverture: "Couverture",
  dirigeant: "Dirigeant",
};

const FIELD_EDIT_TARGETS: Record<string, "client" | "dirigeant"> = {
  entreprise: "client",
  contact: "client",
  couverture: "client",
  dirigeant: "dirigeant",
};

export function QualificationCard({ qualification, clientId, hasDirigeant }: Props) {
  const config = STATUT_CONFIG[qualification.statut];
  const Icon = config.icon;

  // Group missing fields by category
  const byCategory = new Map<string, typeof qualification.champsManquants>();
  for (const champ of qualification.champsManquants) {
    if (!byCategory.has(champ.categorie)) byCategory.set(champ.categorie, []);
    byCategory.get(champ.categorie)!.push(champ);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            Qualification
          </span>
          <Badge variant="outline" className={config.color}>
            {config.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Score bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{qualification.champsRemplis}/{qualification.champsTotal} champs remplis</span>
            <span className="font-medium">{qualification.score}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${config.barColor}`}
              style={{ width: `${qualification.score}%` }}
            />
          </div>
        </div>

        {/* Missing fields */}
        {qualification.champsManquants.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Champs manquants :</p>
            {Array.from(byCategory.entries()).map(([categorie, champs]) => (
              <div key={categorie}>
                <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wide mb-0.5">
                  {CATEGORIE_LABELS[categorie] ?? categorie}
                </p>
                <div className="flex flex-wrap gap-1">
                  {champs.map((c) => {
                    const target = FIELD_EDIT_TARGETS[c.categorie];
                    const href = target === "dirigeant"
                      ? `/dirigeants` // Dirigeant edit is on the dirigeants page
                      : `/clients/${clientId}/modifier`;
                    return (
                      <Link key={c.champ} href={href}>
                        <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-accent gap-1">
                          {c.label}
                          <ExternalLink className="h-2.5 w-2.5" />
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-emerald-600">Toutes les informations sont renseignées.</p>
        )}

        {/* Hint about dirigeant */}
        {!hasDirigeant && (
          <p className="text-[11px] text-muted-foreground italic">
            Aucun dirigeant rattaché — les champs dirigeant ne sont pas pris en compte dans le score.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
