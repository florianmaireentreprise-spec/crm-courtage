"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { THEMES_PRECONISATION, STATUTS_PRECONISATION, PRIORITES_PRECONISATION } from "@/lib/constants";
import { PreconisationForm } from "./PreconisationForm";
import { deletePreconisation, updatePreconisationStatut } from "@/app/(app)/clients/preconisations-actions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Preco = {
  id: string;
  theme: string;
  titre: string;
  justification: string | null;
  priorite: string;
  statut: string;
  prochainePas: string | null;
  notes: string | null;
  dealId: string | null;
  createdByUser: { prenom: string; nom: string } | null;
  createdAt: string;
  updatedAt: string;
};

type DealOption = { id: string; label: string };

export function PreconisationsTab({
  preconisations,
  clientId,
  deals,
}: {
  preconisations: Preco[];
  clientId: string;
  deals: DealOption[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const active = preconisations.filter((p) => !["validee", "refusee"].includes(p.statut));
  const closed = preconisations.filter((p) => ["validee", "refusee"].includes(p.statut));

  async function handleDelete(precoId: string) {
    setDeletingId(precoId);
    await deletePreconisation(precoId, clientId);
    setDeletingId(null);
  }

  // Status transition helper — returns the next logical status options
  function getNextStatuts(current: string): string[] {
    switch (current) {
      case "a_preparer": return ["presentee"];
      case "presentee": return ["en_discussion", "refusee", "reportee"];
      case "en_discussion": return ["validee", "refusee", "reportee"];
      case "reportee": return ["presentee", "en_discussion"];
      default: return [];
    }
  }

  function renderCard(preco: Preco) {
    const themeConfig = THEMES_PRECONISATION.find((t) => t.id === preco.theme);
    const statutConfig = STATUTS_PRECONISATION.find((s) => s.id === preco.statut);
    const prioriteConfig = PRIORITES_PRECONISATION.find((p) => p.id === preco.priorite);
    const isExpanded = expandedId === preco.id;
    const nextStatuts = getNextStatuts(preco.statut);

    return (
      <Card key={preco.id} className="hover:bg-muted/30 transition-colors">
        <CardContent className="py-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: themeConfig?.color }}
                />
                <span className="font-medium text-sm truncate">{preco.titre}</span>
                <Badge
                  variant="outline"
                  className="text-[10px]"
                  style={{ borderColor: statutConfig?.color, color: statutConfig?.color }}
                >
                  {statutConfig?.label}
                </Badge>
                <Badge
                  variant="secondary"
                  className="text-[10px]"
                  style={{ backgroundColor: (prioriteConfig?.color ?? "#94A3B8") + "15", color: prioriteConfig?.color }}
                >
                  {prioriteConfig?.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {themeConfig?.label}
                {preco.prochainePas && (
                  <span className="ml-2">
                    <ArrowRight className="inline h-3 w-3 mr-0.5" />
                    {preco.prochainePas}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
              <PreconisationForm
                clientId={clientId}
                deals={deals}
                preconisation={{
                  ...preco,
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-muted-foreground"
                onClick={() => setExpandedId(isExpanded ? null : preco.id)}
              >
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-3 pt-3 border-t space-y-2">
              {preco.justification && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase">Justification</p>
                  <p className="text-xs mt-0.5">{preco.justification}</p>
                </div>
              )}
              {preco.notes && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase">Notes</p>
                  <p className="text-xs mt-0.5">{preco.notes}</p>
                </div>
              )}
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {preco.createdByUser && (
                  <span>Par {preco.createdByUser.prenom} {preco.createdByUser.nom}</span>
                )}
                <span>Cree le {format(new Date(preco.createdAt), "dd MMM yyyy", { locale: fr })}</span>
              </div>

              {/* Status transitions */}
              {nextStatuts.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  {nextStatuts.map((ns) => {
                    const nsConfig = STATUTS_PRECONISATION.find((s) => s.id === ns);
                    return (
                      <Button
                        key={ns}
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px]"
                        style={{ borderColor: nsConfig?.color, color: nsConfig?.color }}
                        onClick={() => updatePreconisationStatut(preco.id, clientId, ns)}
                      >
                        {nsConfig?.label}
                      </Button>
                    );
                  })}
                </div>
              )}

              {/* Delete */}
              <div className="pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50"
                  disabled={deletingId === preco.id}
                  onClick={() => handleDelete(preco.id)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Supprimer
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PreconisationForm clientId={clientId} deals={deals} />
      </div>

      {preconisations.length === 0 ? (
        <p className="text-sm text-muted-foreground p-4">Aucune preconisation</p>
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-2">
              {active.map(renderCard)}
            </div>
          )}
          {closed.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase mt-4">Terminees</p>
              {closed.map(renderCard)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
