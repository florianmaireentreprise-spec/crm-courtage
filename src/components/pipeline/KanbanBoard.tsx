"use client";

import { useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { KanbanColumn } from "./KanbanColumn";
import { DealForm } from "./DealForm";
import { DealPanel } from "./DealPanel";
import { moveDeal, createContractsFromDeal } from "@/app/(app)/pipeline/actions";
import type { PipelineColumn, DealWithClient } from "@/types";
import { TYPES_PRODUITS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, TrendingUp } from "lucide-react";
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

const fmt = (v: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);

export function KanbanBoard({ columns, clients, users, prescripteurs }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [lossDialog, setLossDialog] = useState<{ dealId: string; targetEtape: string } | null>(null);
  const [motifPerte, setMotifPerte] = useState("");
  const [signatureDialog, setSignatureDialog] = useState<{ dealId: string; products: string[] } | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [creatingContracts, setCreatingContracts] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<DealWithClient | null>(null);

  function getDealProducts(dealId: string): string[] {
    for (const col of columns) {
      const deal = col.deals.find((d) => d.id === dealId);
      if (deal?.produitsCibles) {
        try { return JSON.parse(deal.produitsCibles); } catch { return deal.produitsCibles.split(",").map((s) => s.trim()).filter(Boolean); }
      }
    }
    return [];
  }

  async function onDragEnd(result: DropResult) {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newEtape = destination.droppableId;

    if (newEtape === "PERDU") {
      setLossDialog({ dealId: draggableId, targetEtape: newEtape });
      return;
    }

    if (newEtape === "SIGNATURE") {
      const products = getDealProducts(draggableId);
      await moveDeal(draggableId, newEtape);
      if (products.length > 0) {
        setSelectedProducts([...products]);
        setSignatureDialog({ dealId: draggableId, products });
      }
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

  async function handleCreateContracts() {
    if (!signatureDialog || selectedProducts.length === 0) return;
    setCreatingContracts(true);
    await createContractsFromDeal(signatureDialog.dealId, selectedProducts);
    setCreatingContracts(false);
    setSignatureDialog(null);
    setSelectedProducts([]);
  }

  const totalDeals = columns.reduce((sum, c) => sum + c.deals.length, 0);
  const totalMontant = columns
    .filter((c) => !["PERDU"].includes(c.id))
    .reduce((sum, c) => sum + c.deals.reduce((s, d) => s + (d.montantEstime ?? 0), 0), 0);
  const totalPondere = columns
    .filter((c) => !["PERDU", "SIGNATURE", "ONBOARDING", "DEVELOPPEMENT"].includes(c.id))
    .reduce(
      (sum, c) => sum + c.deals.reduce((s, d) => s + ((d.montantEstime ?? 0) * (d.probabilite ?? 0)) / 100, 0),
      0,
    );
  const totalGagne = columns
    .filter((c) => ["SIGNATURE", "ONBOARDING", "DEVELOPPEMENT"].includes(c.id))
    .reduce((sum, c) => sum + c.deals.reduce((s, d) => s + (d.montantEstime ?? 0), 0), 0);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">{totalDeals} opportunites</p>
          <div className="flex items-center gap-3 text-sm">
            <div className="bg-muted/60 px-3 py-1 rounded-lg">
              <span className="text-muted-foreground">Pipeline </span>
              <span className="font-bold">{fmt(totalMontant)}</span>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-lg">
              <TrendingUp className="inline h-3.5 w-3.5 mr-1 text-indigo-600 dark:text-indigo-400" />
              <span className="text-muted-foreground">Pondere </span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{fmt(totalPondere)}</span>
            </div>
            {totalGagne > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-lg">
                <span className="text-muted-foreground">Gagne </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalGagne)}</span>
              </div>
            )}
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle opportunite
        </Button>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-2 overflow-x-auto pb-4" style={{ minHeight: 500 }}>
          {columns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              onDealClick={(deal) => setSelectedDeal(deal)}
              selectedDealId={selectedDeal?.id}
              onDealDeleted={(dealId) => {
                if (selectedDeal?.id === dealId) setSelectedDeal(null);
              }}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Deal side panel */}
      {selectedDeal && (
        <DealPanel
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onDeleted={() => setSelectedDeal(null)}
        />
      )}

      {/* Deal creation form */}
      {showForm && (
        <DealForm
          open={showForm}
          onClose={() => setShowForm(false)}
          clients={clients}
          users={users}
          prescripteurs={prescripteurs}
        />
      )}

      {/* Loss dialog */}
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

      {/* Signature → contract creation dialog */}
      <Dialog open={!!signatureDialog} onOpenChange={() => { setSignatureDialog(null); setSelectedProducts([]); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Creer les contrats</DialogTitle>
            <DialogDescription>
              L&apos;opportunite est signee. Voulez-vous creer les contrats associes ?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {signatureDialog?.products.map((productId) => {
              const config = TYPES_PRODUITS[productId as keyof typeof TYPES_PRODUITS];
              return (
                <div key={productId} className="flex items-center gap-3">
                  <Checkbox
                    id={`product-${productId}`}
                    checked={selectedProducts.includes(productId)}
                    onCheckedChange={(checked) => {
                      setSelectedProducts((prev) =>
                        checked ? [...prev, productId] : prev.filter((p) => p !== productId)
                      );
                    }}
                  />
                  <label htmlFor={`product-${productId}`} className="flex items-center gap-2 text-sm cursor-pointer">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config?.color }} />
                    {config?.label ?? productId}
                  </label>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSignatureDialog(null); setSelectedProducts([]); }}>
              Passer
            </Button>
            <Button onClick={handleCreateContracts} disabled={selectedProducts.length === 0 || creatingContracts}>
              {creatingContracts ? "Creation..." : `Creer ${selectedProducts.length} contrat(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
