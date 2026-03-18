"use client";

import { Droppable } from "@hello-pangea/dnd";
import { DealCard } from "./DealCard";
import type { PipelineColumn, DealWithClient } from "@/types";

type Props = {
  column: PipelineColumn;
  onDealClick?: (deal: DealWithClient) => void;
  selectedDealId?: string;
};

const fmt = (v: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);

export function KanbanColumn({ column, onDealClick, selectedDealId }: Props) {
  const colTotal = column.deals.reduce((s, d) => s + (d.montantEstime ?? 0), 0);

  return (
    <div className="flex-shrink-0 w-[200px] flex flex-col">
      {/* Column header */}
      <div className="px-2.5 pt-2 pb-1.5 mb-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: column.color }}
          />
          <span className="text-[11px] font-semibold text-foreground truncate">
            {column.label}
          </span>
          <span className="ml-auto text-[10px] font-semibold text-muted-foreground bg-muted rounded-full px-1.5 py-px">
            {column.deals.length}
          </span>
        </div>
        {colTotal > 0 && (
          <div className="text-[10px] text-muted-foreground pl-4">
            {fmt(colTotal)}
          </div>
        )}
      </div>

      {/* Droppable zone */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 space-y-1.5 min-h-[200px] p-1.5 rounded-lg transition-colors ${
              snapshot.isDraggingOver
                ? "bg-indigo-50 dark:bg-indigo-950/30 ring-1 ring-indigo-200 dark:ring-indigo-800 ring-dashed"
                : "bg-muted/20"
            }`}
          >
            {column.deals.map((deal, index) => (
              <DealCard
                key={deal.id}
                deal={deal}
                index={index}
                onClick={() => onDealClick?.(deal)}
                isSelected={selectedDealId === deal.id}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
