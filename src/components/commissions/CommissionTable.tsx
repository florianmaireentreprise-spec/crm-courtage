"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { STATUTS_COMMISSION, TYPES_COMMISSION } from "@/lib/constants";
import { updateCommissionStatut, updateCommission, deleteCommission } from "@/app/(app)/commissions/actions";
import { Pencil, Trash2 } from "lucide-react";
import type { CommissionWithRelations } from "@/types";

type Props = {
  commissions: CommissionWithRelations[];
};

export function CommissionTable({ commissions }: Props) {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatut, setFilterStatut] = useState<string>("all");
  const [editingCommission, setEditingCommission] = useState<CommissionWithRelations | null>(null);
  const [deletingCommission, setDeletingCommission] = useState<CommissionWithRelations | null>(null);

  const filtered = commissions.filter((c) => {
    if (filterType !== "all" && c.type !== filterType) return false;
    if (filterStatut !== "all" && c.statut !== filterStatut) return false;
    return true;
  });

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  const handleDelete = async () => {
    if (!deletingCommission) return;
    await deleteCommission(deletingCommission.id);
    setDeletingCommission(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {TYPES_COMMISSION.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {STATUTS_COMMISSION.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Compagnie</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Aucune commission
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => {
                const statutConfig = STATUTS_COMMISSION.find((s) => s.id === c.statut);
                const typeConfig = TYPES_COMMISSION.find((t) => t.id === c.type);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-sm">
                      {c.contrat.client.raisonSociale}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.contrat.compagnie?.nom ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {typeConfig?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{c.periode}</TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {fmt(c.montant)}
                    </TableCell>
                    <TableCell>
                      <Select
                        defaultValue={c.statut}
                        onValueChange={(val) => updateCommissionStatut(c.id, val)}
                      >
                        <SelectTrigger className="h-7 w-[110px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUTS_COMMISSION.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: s.color }}
                                />
                                {s.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setEditingCommission(c)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeletingCommission(c)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Commission Dialog */}
      <Dialog open={!!editingCommission} onOpenChange={(open) => { if (!open) setEditingCommission(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la commission</DialogTitle>
            <DialogDescription>
              {editingCommission && `${editingCommission.contrat.client.raisonSociale} - ${editingCommission.contrat.compagnie?.nom ?? ""}`}
            </DialogDescription>
          </DialogHeader>
          {editingCommission && (
            <form
              action={async (formData) => {
                await updateCommission(editingCommission.id, formData);
                setEditingCommission(null);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="edit-montant">Montant (EUR)</Label>
                <Input
                  id="edit-montant"
                  name="montant"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={editingCommission.montant}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Type</Label>
                <Select name="type" defaultValue={editingCommission.type} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES_COMMISSION.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-periode">Periode</Label>
                <Input
                  id="edit-periode"
                  name="periode"
                  required
                  defaultValue={editingCommission.periode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-statut">Statut</Label>
                <Select name="statut" defaultValue={editingCommission.statut} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUTS_COMMISSION.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          {s.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Input
                  id="edit-notes"
                  name="notes"
                  defaultValue={editingCommission.notes ?? ""}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Annuler</Button>
                </DialogClose>
                <Button type="submit">Enregistrer</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingCommission} onOpenChange={(open) => { if (!open) setDeletingCommission(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la commission</DialogTitle>
            <DialogDescription>
              Etes-vous sur de vouloir supprimer cette commission ?
              {deletingCommission && ` (${fmt(deletingCommission.montant)} - ${TYPES_COMMISSION.find((t) => t.id === deletingCommission.type)?.label})`}
              {" "}Cette action est irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Annuler</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
