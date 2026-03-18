"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Building2, User, Briefcase, Save, ExternalLink } from "lucide-react";
import { updateDealDetails } from "@/app/(app)/pipeline/actions";
import { ETAPES_PIPELINE, TYPES_PRODUITS, SOURCES_PROSPECT } from "@/lib/constants";
import type { DealWithClient } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

type Props = {
  deal: DealWithClient;
  onClose: () => void;
};

type TabId = "deal" | "client" | "dirigeant";

const fmt = (v: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);

const fmtCA = (v: number) =>
  v >= 1e6 ? `${(v / 1e6).toFixed(1)} M\u20ac` : `${(v / 1e3).toFixed(0)} k\u20ac`;

const fmtDate = (d?: Date | string | null) => {
  if (!d) return "\u2014";
  return format(new Date(d), "dd MMM yyyy", { locale: fr });
};

function parseProduits(raw?: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return raw.split(",").map((s) => s.trim()).filter(Boolean); }
}

export function DealPanel({ deal, onClose }: Props) {
  const [tab, setTab] = useState<TabId>("deal");
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    qualificationNotes: deal.qualificationNotes || "",
    problematiqueDirigeant: deal.problematiqueDirigeant || "",
    assureurChoisi: deal.assureurChoisi || "",
    commissionsAttendues: deal.commissionsAttendues?.toString() || "",
    documentsNotes: deal.documentsNotes || "",
  });

  const cl = deal.client;
  const dir = cl.dirigeant;
  const etape = ETAPES_PIPELINE.find((e) => e.id === deal.etape);
  const sourceLabel = SOURCES_PROSPECT.find((s) => s.id === deal.sourceProspect)?.label;
  const produits = parseProduits(deal.produitsCibles);

  function setField(field: string, value: string) {
    setEditData((d) => ({ ...d, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("qualificationNotes", editData.qualificationNotes);
      formData.set("problematiqueDirigeant", editData.problematiqueDirigeant);
      formData.set("assureurChoisi", editData.assureurChoisi);
      formData.set("commissionsAttendues", editData.commissionsAttendues);
      formData.set("documentsNotes", editData.documentsNotes);
      await updateDealDetails(deal.id, formData);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "deal", label: "Deal", icon: <Briefcase className="h-3.5 w-3.5" /> },
    { id: "client", label: "Fiche Client", icon: <Building2 className="h-3.5 w-3.5" /> },
    { id: "dirigeant", label: "Dirigeant", icon: <User className="h-3.5 w-3.5" /> },
  ];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 w-[420px] max-w-[92vw] h-screen bg-background border-l border-border shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-foreground truncate">
              {deal.titre}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              {etape && (
                <Badge
                  variant="outline"
                  className="text-[10px]"
                  style={{ borderColor: etape.color, color: etape.color }}
                >
                  {etape.label}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">{cl.raisonSociale}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
                tab === id
                  ? "text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ── Deal Tab ── */}
          {tab === "deal" && (
            <div className="flex flex-col gap-4">
              {/* Key metrics */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-muted-foreground">Montant</div>
                  <div className="text-sm font-bold">
                    {deal.montantEstime ? fmt(deal.montantEstime) : "\u2014"}
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-muted-foreground">Probabilite</div>
                  <div className="text-sm font-bold">
                    {deal.probabilite != null ? `${deal.probabilite}%` : "\u2014"}
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-muted-foreground">Closing</div>
                  <div className="text-sm font-bold">
                    {deal.dateClosingPrev ? format(new Date(deal.dateClosingPrev), "dd/MM/yy") : "\u2014"}
                  </div>
                </div>
              </div>

              {/* Source + Prescripteur */}
              {(sourceLabel || deal.prescripteur) && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                  {sourceLabel && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Source: </span>
                      <span className="text-foreground">{sourceLabel}</span>
                    </div>
                  )}
                  {deal.prescripteur && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Prescripteur: </span>
                      <span className="text-foreground">
                        {deal.prescripteur.prenom} {deal.prescripteur.nom}
                        {deal.prescripteur.entreprise ? ` (${deal.prescripteur.entreprise})` : ""}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Products */}
              {produits.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                    Produits cibles
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {produits.map((p) => {
                      const key = p as keyof typeof TYPES_PRODUITS;
                      const config = TYPES_PRODUITS[key];
                      return (
                        <Badge
                          key={p}
                          variant="outline"
                          className="text-[10px] gap-1"
                          style={config ? { borderColor: config.color, color: config.color } : undefined}
                        >
                          {config?.label ?? p}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Key dates */}
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
                  Dates cles
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div>
                    <span className="text-muted-foreground">Creation: </span>
                    <span>{fmtDate(deal.dateCreation)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">MAJ: </span>
                    <span>{fmtDate(deal.dateMaj)}</span>
                  </div>
                  {deal.dateSignature && (
                    <div>
                      <span className="text-muted-foreground">Signature: </span>
                      <span>{fmtDate(deal.dateSignature)}</span>
                    </div>
                  )}
                  {deal.dateOnboarding && (
                    <div>
                      <span className="text-muted-foreground">Onboarding: </span>
                      <span>{fmtDate(deal.dateOnboarding)}</span>
                    </div>
                  )}
                  {deal.dateClosingReel && (
                    <div>
                      <span className="text-muted-foreground">Closing reel: </span>
                      <span>{fmtDate(deal.dateClosingReel)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Motif perte */}
              {deal.motifPerte && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">
                    Motif de perte
                  </div>
                  <p className="text-xs text-red-700 dark:text-red-300">{deal.motifPerte}</p>
                </div>
              )}

              {/* Notes */}
              {deal.notes && (
                <div>
                  <div className="text-[11px] font-semibold text-muted-foreground mb-1">Notes</div>
                  <p className="text-xs text-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-2.5">
                    {deal.notes}
                  </p>
                </div>
              )}

              {/* Editable fields */}
              <div className="border-t border-border pt-4 space-y-3">
                <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Qualification & Details
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                    Notes de qualification
                  </label>
                  <Textarea
                    value={editData.qualificationNotes}
                    onChange={(e) => setField("qualificationNotes", e.target.value)}
                    rows={2}
                    className="text-xs"
                    placeholder="Besoins, contexte, concurrence..."
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                    Problematique dirigeant
                  </label>
                  <Textarea
                    value={editData.problematiqueDirigeant}
                    onChange={(e) => setField("problematiqueDirigeant", e.target.value)}
                    rows={2}
                    className="text-xs"
                    placeholder="Situation du dirigeant, enjeux..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                      Assureur choisi
                    </label>
                    <Input
                      value={editData.assureurChoisi}
                      onChange={(e) => setField("assureurChoisi", e.target.value)}
                      className="text-xs h-8"
                      placeholder="Nom assureur"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                      Commissions attendues
                    </label>
                    <Input
                      type="number"
                      value={editData.commissionsAttendues}
                      onChange={(e) => setField("commissionsAttendues", e.target.value)}
                      className="text-xs h-8"
                      placeholder="EUR"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                    Notes documents
                  </label>
                  <Textarea
                    value={editData.documentsNotes}
                    onChange={(e) => setField("documentsNotes", e.target.value)}
                    rows={2}
                    className="text-xs"
                    placeholder="Documents requis, manquants..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Client Tab ── */}
          {tab === "client" && (
            <div className="flex flex-col gap-4">
              {/* Client header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-bold text-foreground">{cl.raisonSociale}</div>
                  <div className="text-sm text-muted-foreground">
                    {cl.civilite} {cl.prenom} {cl.nom}
                  </div>
                </div>
                <Link
                  href={`/clients/${cl.id}`}
                  className="text-indigo-600 hover:text-indigo-700 transition-colors"
                  title="Ouvrir la fiche client"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>

              {/* Score prospect */}
              {cl.scoreProspect != null && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Score</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${cl.scoreProspect}%`,
                        background:
                          cl.scoreProspect >= 70 ? "#22c55e" : cl.scoreProspect >= 40 ? "#f59e0b" : "#ef4444",
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-foreground">{cl.scoreProspect}/100</span>
                </div>
              )}

              {/* Company info */}
              <div className="bg-muted/50 rounded-lg p-3.5 border border-border">
                <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2.5">
                  Informations entreprise
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {([
                    ["SIRET", cl.siret],
                    ["Forme", cl.formeJuridique],
                    ["Activite", cl.secteurActivite],
                    ["Effectif", cl.nbSalaries],
                    ["CA", cl.chiffreAffaires ? fmtCA(cl.chiffreAffaires) : null],
                    ["CCN", cl.conventionCollective],
                    ["Ville", cl.ville],
                    ["Statut", cl.statut?.replace(/_/g, " ")],
                    ["Courtier actuel", cl.courtierActuel],
                  ] as const)
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k}>
                        <span className="text-muted-foreground">{k} </span>
                        <span className="text-foreground">{v}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Contact */}
              <div className="bg-muted/50 rounded-lg p-3.5 border border-border">
                <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2.5">
                  Contact
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <div>
                    <span className="text-muted-foreground">Email </span>
                    <span className="text-foreground">{cl.email || "\u2014"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tel </span>
                    <span className="text-foreground">{cl.telephone || "\u2014"}</span>
                  </div>
                </div>
              </div>

              {/* Coverage */}
              {(cl.mutuelleActuelle || cl.prevoyanceActuelle) && (
                <div className="bg-muted/50 rounded-lg p-3.5 border border-border">
                  <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2.5">
                    Couverture actuelle
                  </div>
                  <div className="flex flex-col gap-1.5 text-sm">
                    {cl.mutuelleActuelle && (
                      <div>
                        <span className="text-muted-foreground">Mutuelle </span>
                        <span className="text-foreground">{cl.mutuelleActuelle}</span>
                        {cl.dateEcheanceMutuelle && (
                          <span className="text-muted-foreground text-xs ml-2">
                            (ech. {fmtDate(cl.dateEcheanceMutuelle)})
                          </span>
                        )}
                      </div>
                    )}
                    {cl.prevoyanceActuelle && (
                      <div>
                        <span className="text-muted-foreground">Prevoyance </span>
                        <span className="text-foreground">{cl.prevoyanceActuelle}</span>
                        {cl.dateEcheancePrevoyance && (
                          <span className="text-muted-foreground text-xs ml-2">
                            (ech. {fmtDate(cl.dateEcheancePrevoyance)})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Potentiel */}
              {cl.potentielCA != null && cl.potentielCA > 0 && (
                <div className="text-xs text-muted-foreground">
                  Potentiel CA : <span className="font-bold text-foreground">{fmt(cl.potentielCA)}/an</span>
                </div>
              )}
            </div>
          )}

          {/* ── Dirigeant Tab ── */}
          {tab === "dirigeant" && (
            <>
              {dir ? (
                <div className="flex flex-col gap-4">
                  <div className="bg-muted/50 rounded-lg p-3.5 border border-border">
                    <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2.5">
                      Profil Dirigeant
                    </div>
                    <div className="text-sm font-medium text-foreground mb-1">
                      {dir.civilite} {dir.prenom} {dir.nom}
                    </div>
                    <div className="flex flex-col gap-2 text-sm mt-3">
                      {([
                        ["Statut professionnel", dir.statutProfessionnel],
                        ["Regime retraite", dir.regimeRetraite],
                        ["Complementaire retraite", dir.complementaireRetraite],
                        ["Mutuelle perso", dir.mutuellePerso],
                        ["Prevoyance perso", dir.prevoyancePerso],
                        ["Protection actuelle", dir.protectionActuelle],
                        ["Epargne actuelle", dir.epargneActuelle],
                        ["Montant epargne", dir.montantEpargne ? fmt(dir.montantEpargne) : null],
                        ["Besoins patrimoniaux", dir.besoinsPatrimoniaux],
                        ["Objectifs retraite", dir.objectifsRetraite],
                        ["Date audit dirigeant", dir.dateAuditDirigeant ? fmtDate(dir.dateAuditDirigeant) : null],
                      ] as const).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-muted-foreground">{k} : </span>
                          <span className={v ? "text-foreground" : "text-muted-foreground/50 italic"}>
                            {(v as string) || "Non renseigne"}
                          </span>
                        </div>
                      ))}
                    </div>
                    {dir.notes && (
                      <div className="mt-3 text-xs text-muted-foreground italic border-t border-border pt-2">
                        {dir.notes}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Aucun dirigeant lie a ce client.
                  <br />
                  <span className="text-xs">Ajoutez-le depuis la fiche client.</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer — Save button (only on Deal tab) */}
        {tab === "deal" && (
          <div className="px-5 py-3 border-t border-border flex gap-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1"
              size="sm"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saving ? "Enregistrement..." : "Enregistrer les details"}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
