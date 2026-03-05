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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUTS_COMMISSION, TYPES_COMMISSION } from "@/lib/constants";
import { updateCommissionStatut } from "@/app/(app)/commissions/actions";
import type { CommissionWithRelations } from "@/types";

type Props = {
  commissions: CommissionWithRelations[];
};

export function CommissionTable({ commissions }: Props) {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatut, setFilterStatut] = useState<string>("all");

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
              <TableHead>Période</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
