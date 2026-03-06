"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Calendar, Users, Handshake } from "lucide-react";
import { deleteDeal } from "@/app/(app)/pipeline/actions";
import { TYPES_PRODUITS, SOURCES_PROSPECT } from "@/lib/constants";
import type { DealWithClient } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Props = {
  deal: DealWithClient;
  index: number;
};

export function DealCard({ deal, index }: Props) {
  const sourceLabel = SOURCES_PROSPECT.find((s) => s.id === deal.sourceProspect)?.label;

  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <Card
            className={`transition-shadow ${
              snapshot.isDragging ? "shadow-lg ring-2 ring-primary/20" : ""
            }`}
          >
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between">
                <p className="font-medium text-sm leading-tight">{deal.titre}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mr-1 -mt-1 text-muted-foreground hover:text-destructive"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await deleteDeal(deal.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{deal.client.raisonSociale}</p>
              </div>

              {sourceLabel && (
                <div className="flex items-center gap-1">
                  <Handshake className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground">{sourceLabel}</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                {deal.montantEstime ? (
                  <span className="text-sm font-semibold">
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      maximumFractionDigits: 0,
                    }).format(deal.montantEstime)}
                  </span>
                ) : (
                  <span />
                )}
                {deal.probabilite != null && (
                  <Badge variant="outline" className="text-[10px]">
                    {deal.probabilite}%
                  </Badge>
                )}
              </div>

              {deal.dateClosingPrev && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(deal.dateClosingPrev), "dd MMM yyyy", { locale: fr })}
                </div>
              )}

              {deal.produitsCibles && (() => {
                let produits: string[] = [];
                try {
                  produits = JSON.parse(deal.produitsCibles);
                } catch {
                  produits = deal.produitsCibles.split(",").map((s) => s.trim());
                }
                return (
                  <div className="flex flex-wrap gap-1">
                    {produits.map((p) => {
                      const key = p as keyof typeof TYPES_PRODUITS;
                      const label = TYPES_PRODUITS[key]?.label ?? p;
                      return (
                        <Badge key={p} variant="secondary" className="text-[10px]">
                          {label}
                        </Badge>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}
