"use client";

import { Droppable } from "@hello-pangea/dnd";
import { DealCard } from "./DealCard";
import type { PipelineColumn } from "@/types";

type Props = {
  column: PipelineColumn;
};

export function KanbanColumn({ column }: Props) {
  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: column.color }}
        />
        <h3 className="font-semibold text-sm">{column.label}</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {column.deals.length}
        </span>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-2 min-h-[200px] p-2 rounded-lg transition-colors ${
              snapshot.isDraggingOver ? "bg-muted/50" : "bg-muted/20"
            }`}
          >
            {column.deals.map((deal, index) => (
              <DealCard key={deal.id} deal={deal} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
