"use client";

import { useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { KanbanColumn } from "./KanbanColumn";
import { DealForm } from "./DealForm";
import { moveDeal } from "@/app/(app)/pipeline/actions";
import type { PipelineColumn } from "@/types";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  columns: PipelineColumn[];
  clients: { id: string; raisonSociale: string }[];
  users: { id: string; prenom: string; nom: string }[];
};

export function KanbanBoard({ columns, clients, users }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [lossDialog, setLossDialog] = useState<{ dealId: string; targetEtape: string } | null>(null);
  const [motifPerte, setMotifPerte] = useState("");

  async function onDragEnd(result: DropResult) {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newEtape = destination.droppableId;

    if (newEtape === "PERDU") {
      setLossDialog({ dealId: draggableId, targetEtape: newEtape });
      return;
    }

    await moveDeal(draggableId, newEtape);
  }

  async function handleLossConfirm() {
    if (!lossDialog) return;
    await moveDeal(lossDialog.dealId, lossDialog.targetEtape, motifPerte || undefined);
    setLossDialog(null);
    setMotifPerte("");
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {columns.reduce((sum, c) => sum + c.deals.length, 0)} opportunités
        </p>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle opportunité
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 500 }}>
          {columns.map((col) => (
            <KanbanColumn key={col.id} column={col} />
          ))}
        </div>
      </DragDropContext>

      {showForm && (
        <DealForm
          open={showForm}
          onClose={() => setShowForm(false)}
          clients={clients}
          users={users}
        />
      )}

      <Dialog open={!!lossDialog} onOpenChange={() => { setLossDialog(null); setMotifPerte(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motif de perte</DialogTitle>
            <DialogDescription>
              Pourquoi cette opportunité a-t-elle été perdue ?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motifPerte">Motif</Label>
            <Textarea
              id="motifPerte"
              value={motifPerte}
              onChange={(e) => setMotifPerte(e.target.value)}
              placeholder="Prix, concurrence, timing..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setLossDialog(null); setMotifPerte(""); }}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleLossConfirm}>
              Confirmer la perte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
