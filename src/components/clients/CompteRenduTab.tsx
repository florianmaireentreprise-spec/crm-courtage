"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Calendar, MapPin, Users, ChevronDown, ChevronUp, Pencil, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createCompteRendu, updateCompteRendu, deleteCompteRendu } from "@/app/(app)/clients/[id]/cr-actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { toast } from "sonner";

const TYPES_RDV = [
  { id: "decouverte", label: "Découverte", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  { id: "audit", label: "Audit", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  { id: "recommandation", label: "Recommandation", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  { id: "signature", label: "Signature", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  { id: "suivi", label: "Suivi", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300" },
  { id: "autre", label: "Autre", color: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300" },
] as const;

const LIEUX = [
  { id: "cabinet", label: "Cabinet" },
  { id: "client", label: "Chez le client" },
  { id: "visio", label: "Visio" },
  { id: "telephone", label: "Téléphone" },
  { id: "autre", label: "Autre" },
] as const;

type CompteRendu = {
  id: string;
  clientId: string;
  dealId: string | null;
  dateRDV: Date;
  typeRDV: string;
  lieu: string;
  interlocuteurs: string;
  resume: string;
  pointsCles: string | null;
  decisionsActions: string | null;
  prochainRDV: Date | null;
  notes: string | null;
  createdAt: Date;
};

type Deal = { id: string; titre: string };

type Props = {
  comptesRendus: CompteRendu[];
  clientId: string;
  deals: Deal[];
};

export function CompteRenduTab({ comptesRendus, clientId, deals }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingCR, setEditingCR] = useState<CompteRendu | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteCompteRendu(id, clientId);
      if (result?.success) {
        toast.success("Compte-rendu supprimé");
        setDeletingId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {comptesRendus.length} compte{comptesRendus.length !== 1 ? "s" : ""}-rendu{comptesRendus.length !== 1 ? "s" : ""}
        </h3>
        <Button size="sm" onClick={() => { setEditingCR(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" />
          Nouveau RDV
        </Button>
      </div>

      {comptesRendus.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucun compte-rendu de RDV</p>
            <p className="text-xs mt-1">Cliquez sur &quot;Nouveau RDV&quot; pour documenter votre premier rendez-vous</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {comptesRendus.map((cr) => {
            const typeConfig = TYPES_RDV.find((t) => t.id === cr.typeRDV);
            const lieuConfig = LIEUX.find((l) => l.id === cr.lieu);
            const isExpanded = expandedId === cr.id;
            const pointsCles = cr.pointsCles ? safeParse(cr.pointsCles) : [];
            const decisionsActions = cr.decisionsActions ? safeParse(cr.decisionsActions) : [];

            return (
              <Card key={cr.id} className="transition-shadow hover:shadow-md">
                <CardContent className="py-3">
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : cr.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {format(cr.dateRDV, "d MMM yyyy", { locale: fr })}
                        </span>
                        <Badge variant="outline" className={typeConfig?.color}>
                          {typeConfig?.label ?? cr.typeRDV}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {lieuConfig?.label ?? cr.lieu}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {cr.interlocuteurs}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {cr.resume}
                      </p>
                      {(pointsCles.length > 0 || decisionsActions.length > 0 || cr.prochainRDV) && (
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          {pointsCles.length > 0 && (
                            <span>{pointsCles.length} point{pointsCles.length > 1 ? "s" : ""} clé{pointsCles.length > 1 ? "s" : ""}</span>
                          )}
                          {decisionsActions.length > 0 && (
                            <span>{decisionsActions.length} action{decisionsActions.length > 1 ? "s" : ""}</span>
                          )}
                          {cr.prochainRDV && (
                            <span className="text-blue-600">
                              Prochain : {format(cr.prochainRDV, "d MMM", { locale: fr })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); setEditingCR(cr); setShowForm(true); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {deletingId === cr.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => handleDelete(cr.id)} disabled={isPending}>
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "✓"}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeletingId(null)}>✕</Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700"
                          onClick={(e) => { e.stopPropagation(); setDeletingId(cr.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Résumé complet</p>
                        <p className="text-sm whitespace-pre-wrap">{cr.resume}</p>
                      </div>
                      {pointsCles.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Points clés</p>
                          <ul className="list-disc list-inside text-sm space-y-0.5">
                            {pointsCles.map((p: string, i: number) => <li key={i}>{p}</li>)}
                          </ul>
                        </div>
                      )}
                      {decisionsActions.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Décisions & actions</p>
                          <ul className="list-disc list-inside text-sm space-y-0.5">
                            {decisionsActions.map((a: string, i: number) => <li key={i}>{a}</li>)}
                          </ul>
                        </div>
                      )}
                      {cr.notes && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                          <p className="text-sm whitespace-pre-wrap">{cr.notes}</p>
                        </div>
                      )}
                      {cr.prochainRDV && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Prochain RDV</p>
                          <p className="text-sm">{format(cr.prochainRDV, "EEEE d MMMM yyyy", { locale: fr })}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <CRFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        clientId={clientId}
        deals={deals}
        editingCR={editingCR}
        onSuccess={() => { setShowForm(false); setEditingCR(null); }}
      />
    </div>
  );
}

// ── Form Dialog ──

function CRFormDialog({
  open,
  onOpenChange,
  clientId,
  deals,
  editingCR,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  deals: Deal[];
  editingCR: CompteRendu | null;
  onSuccess: () => void;
}) {
  const isEdit = !!editingCR;

  async function handleSubmit(formData: FormData) {
    const result = isEdit
      ? await updateCompteRendu(editingCR!.id, formData)
      : await createCompteRendu(formData);

    if (result && "error" in result && result.error) {
      toast.error("Erreur de validation");
      return;
    }
    toast.success(isEdit ? "Compte-rendu modifié" : "Compte-rendu créé");
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le compte-rendu" : "Nouveau compte-rendu de RDV"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Modifiez les informations du rendez-vous." : "Documentez le rendez-vous avec votre prospect ou client."}
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="clientId" value={clientId} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateRDV">Date du RDV *</Label>
              <Input
                id="dateRDV"
                name="dateRDV"
                type="date"
                required
                defaultValue={editingCR ? format(editingCR.dateRDV, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="typeRDV">Type de RDV *</Label>
              <Select name="typeRDV" defaultValue={editingCR?.typeRDV ?? "decouverte"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_RDV.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lieu">Lieu *</Label>
              <Select name="lieu" defaultValue={editingCR?.lieu ?? "cabinet"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIEUX.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {deals.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="dealId">Deal associé</Label>
                <Select name="dealId" defaultValue={editingCR?.dealId ?? ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucun</SelectItem>
                    {deals.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.titre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="interlocuteurs">Interlocuteurs présents *</Label>
            <Input
              id="interlocuteurs"
              name="interlocuteurs"
              required
              placeholder="Ex: Jean Dupont (dirigeant), Marie Martin (RH)"
              defaultValue={editingCR?.interlocuteurs ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resume">Résumé du RDV *</Label>
            <Textarea
              id="resume"
              name="resume"
              required
              rows={4}
              placeholder="Résumez ce qui s'est dit lors du rendez-vous..."
              defaultValue={editingCR?.resume ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pointsCles">Points clés (un par ligne)</Label>
            <Textarea
              id="pointsCles"
              name="pointsCles"
              rows={3}
              placeholder={"Dirigeant TNS depuis 2018\nMutuelle Axa échéance juin\nIntéressé par PER"}
              defaultValue={editingCR?.pointsCles ? safeParse(editingCR.pointsCles).join("\n") : ""}
            />
            <p className="text-[11px] text-muted-foreground">Chaque ligne = un point clé</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="decisionsActions">Décisions & actions (une par ligne)</Label>
            <Textarea
              id="decisionsActions"
              name="decisionsActions"
              rows={3}
              placeholder={"Envoyer comparatif mutuelle\nPlanifier audit complet"}
              defaultValue={editingCR?.decisionsActions ? safeParse(editingCR.decisionsActions).join("\n") : ""}
            />
            <p className="text-[11px] text-muted-foreground">Chaque ligne = une action</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prochainRDV">Prochain RDV</Label>
              <Input
                id="prochainRDV"
                name="prochainRDV"
                type="date"
                defaultValue={editingCR?.prochainRDV ? format(editingCR.prochainRDV, "yyyy-MM-dd") : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes complémentaires</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={editingCR?.notes ?? ""}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <SubmitButton pendingText={isEdit ? "Enregistrement..." : "Création..."}>
              {isEdit ? "Enregistrer" : "Créer le compte-rendu"}
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Helpers ──

function safeParse(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Treat as newline-separated text
    return json.split("\n").map((s) => s.trim()).filter(Boolean);
  }
}
