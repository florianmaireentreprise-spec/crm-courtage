"use client";

import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Trash2, Calendar } from "lucide-react";
import { deleteDeal } from "@/app/(app)/pipeline/actions";
import { TYPES_PRODUITS } from "@/lib/constants";
import { toast } from "sonner";
import type { DealWithClient } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Props = {
  deal: DealWithClient;
  index: number;
  onClick?: () => void;
  isSelected?: boolean;
  onDeleted?: () => void;
};

const TEMPERATURES: Record<string, { label: string; color: string }> = {
  chaud: { label: "Chaud", color: "#ef4444" },
  tiede: { label: "Tiede", color: "#f59e0b" },
  froid: { label: "Froid", color: "#6b7280" },
};

const fmt = (v: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);

function parseProduits(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
}

export function DealCard({ deal, index, onClick, isSelected, onDeleted }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const temp = deal.client?.temperatureCommerciale
    ? TEMPERATURES[deal.client.temperatureCommerciale]
    : null;
  const produits = parseProduits(deal.produitsCibles);
  const score = deal.client?.scoreProspect;

  async function handleDelete() {
    setDeleting(true);
    await deleteDeal(deal.id);
    toast.success("Opportunite supprimee");
    onDeleted?.();
    setDeleting(false);
    setConfirmDelete(false);
  }

  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={(e) => {
            if (!snapshot.isDragging && !confirmDelete && onClick) {
              onClick();
            }
          }}
        >
          <div
            className={`group rounded-lg border p-2 cursor-pointer transition-all ${
              snapshot.isDragging
                ? "shadow-lg ring-2 ring-primary/20 bg-card"
                : isSelected
                  ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-400 shadow-sm"
                  : "bg-card border-border hover:shadow-sm"
            }`}
            style={{ opacity: snapshot.isDragging ? 0.9 : 1 }}
          >
            {/* Inline delete confirmation */}
            {confirmDelete && (
              <div className="flex items-center justify-between gap-2 mb-1.5 p-1.5 bg-red-50 dark:bg-red-950/30 rounded border border-red-200 dark:border-red-800">
                <span className="text-[10px] font-medium text-red-700 dark:text-red-300">Supprimer ?</span>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground"
                  >
                    Non
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                    disabled={deleting}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                  >
                    {deleting ? "..." : "Oui"}
                  </button>
                </div>
              </div>
            )}

            {/* Row 1: Company name + temperature + delete */}
            <div className="flex items-start justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                {temp && (
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: temp.color }}
                    title={temp.label}
                  />
                )}
                <span className="text-[12px] font-semibold leading-tight text-foreground truncate">
                  {deal.client.raisonSociale}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 -mr-0.5 -mt-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            {/* Row 2: Contact name */}
            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {deal.client.civilite} {deal.client.prenom} {deal.client.nom}
            </div>

            {/* Row 3: Product badges */}
            {produits.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {produits.map((p) => {
                  const key = p as keyof typeof TYPES_PRODUITS;
                  const config = TYPES_PRODUITS[key];
                  if (!config) return null;
                  return (
                    <span
                      key={p}
                      className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: config.color + "18",
                        color: config.color,
                      }}
                    >
                      {config.label}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Row 4: Closing date + amount */}
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-muted-foreground">
                {deal.dateClosingPrev && (
                  <span className="flex items-center gap-0.5">
                    <Calendar className="h-2.5 w-2.5" />
                    {format(new Date(deal.dateClosingPrev), "dd MMM", { locale: fr })}
                  </span>
                )}
              </span>
              <span className="text-xs font-bold text-foreground">
                {deal.montantEstime ? fmt(deal.montantEstime) : ""}
              </span>
            </div>

            {/* Row 5: Probability + score bar */}
            <div className="flex items-center gap-2 mt-1">
              {deal.probabilite != null && deal.probabilite > 0 && (
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {deal.probabilite}%
                </span>
              )}
              {score != null && (
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${score}%`,
                      background:
                        score >= 70
                          ? "#22c55e"
                          : score >= 40
                            ? "#f59e0b"
                            : "#ef4444",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
