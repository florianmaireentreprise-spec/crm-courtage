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
  prescripteurs: { id: string; prenom: string; nom: string; entreprise: string | null }[];
};

export function KanbanBoard({ columns, clients, users, prescripteurs }: Props) {
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

  const totalDeals = columns.reduce((sum, c) => sum + c.deals.length, 0);
  const totalMontant = columns
    .filter((c) => !["PERDU"].includes(c.id))
    .reduce((sum, c) => sum + c.deals.reduce((s, d) => s + (d.montantEstime ?? 0), 0), 0);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {totalDeals} opportunites
          </p>
          <p className="text-sm font-medium">
            Pipeline : {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(totalMontant)}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle opportunite
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 500 }}>
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
          prescripteurs={prescripteurs}
        />
      )}

      <Dialog open={!!lossDialog} onOpenChange={() => { setLossDialog(null); setMotifPerte(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motif de perte</DialogTitle>
            <DialogDescription>
              Pourquoi cette opportunite a-t-elle ete perdue ?
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
