"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  CATEGORIES_RESEAU,
  STATUTS_RESEAU,
  NIVEAUX_POTENTIEL,
  POTENTIELS_AFFAIRES,
  HORIZONS_ACTIVATION,
  ROLES_RESEAU,
  computePrioriteReseau,
  PRIORITES_RESEAU_CONFIG,
} from "@/lib/constants";
import { CompanySearchButton } from "@/components/clients/CompanySearchButton";
import { SubmitButton } from "@/components/ui/submit-button";
import { toast } from "sonner";
import { AlertTriangle, ExternalLink, Info } from "lucide-react";

type SireneOverrides = {
  raisonSociale?: string;
  siret?: string;
  ville?: string;
  secteurActivite?: string;
  codePostal?: string;
  adresse?: string;
  formeJuridique?: string;
  codeNAF?: string;
  trancheEffectifs?: string;
  nbSalaries?: number;
};

export type ReseauContactData = {
  id: string;
  raisonSociale: string;
  civilite: string | null;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  ville: string | null;
  secteurActivite: string | null;
  categorieReseau: string | null;
  rolesReseau: string[];
  statutReseau: string | null;
  niveauPotentiel: string | null;
  potentielAffaires: string | null;
  potentielEstimeAnnuel: number | null;
  horizonActivation: string | null;
  prochaineActionReseau: string | null;
  dateDernierContact: string | null;
  notes: string | null;
  siret: string | null;
  formeJuridique: string | null;
  codeNAF: string | null;
  trancheEffectifs: string | null;
  nbSalaries: number | null;
  adresse: string | null;
  codePostal: string | null;
};

type DuplicateCandidate = {
  id: string;
  raisonSociale: string;
  prenom: string;
  nom: string;
  email: string | null;
  ville: string | null;
  categorieReseau: string | null;
  rolesReseau: string[];
};

type Props = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: FormData) => Promise<{ error?: unknown } | void>;
  editData?: ReseauContactData;
};

// ── Duplicate detection hook ──

function useDuplicateCheck(mode: "create" | "edit", excludeId?: string) {
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [checking, setChecking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef("");

  const check = useCallback((nom: string, prenom: string, raisonSociale: string) => {
    if (mode === "edit") return; // Skip duplicate check in edit mode

    const queryKey = `${nom}|${prenom}|${raisonSociale}`;
    if (queryKey === lastQueryRef.current) return;
    lastQueryRef.current = queryKey;

    if (timerRef.current) clearTimeout(timerRef.current);

    const trimNom = nom.trim();
    const trimPrenom = prenom.trim();
    const trimRS = raisonSociale.trim();

    // Need at least a last name (2+ chars) to check
    if (trimNom.length < 2 && trimRS.length < 3) {
      setDuplicates([]);
      return;
    }

    setChecking(true);
    timerRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (trimNom) params.set("nom", trimNom);
        if (trimPrenom) params.set("prenom", trimPrenom);
        if (trimRS) params.set("raisonSociale", trimRS);
        if (excludeId) params.set("excludeId", excludeId);

        const res = await fetch(`/api/reseau/check-duplicates?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setDuplicates(data.duplicates ?? []);
        }
      } catch {
        // Silent fail — duplicate check is best-effort
      } finally {
        setChecking(false);
      }
    }, 400);
  }, [mode, excludeId]);

  const reset = useCallback(() => {
    setDuplicates([]);
    lastQueryRef.current = "";
  }, []);

  return { duplicates, checking, check, reset };
}

export function ReseauContactDialog({ mode, open, onOpenChange, onSubmit, editData }: Props) {
  const [sirene, setSirene] = useState<SireneOverrides>({});
  const [formKey, setFormKey] = useState(0);

  const [liveProba, setLiveProba] = useState<string>(editData?.niveauPotentiel ?? "");
  const [livePotentiel, setLivePotentiel] = useState<string>(editData?.potentielAffaires ?? "");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(editData?.rolesReseau ?? []);

  // Live identity fields for duplicate detection
  const [liveNom, setLiveNom] = useState(editData?.nom ?? "");
  const [livePrenom, setLivePrenom] = useState(editData?.prenom ?? "");
  const [liveRS, setLiveRS] = useState(editData?.raisonSociale ?? "");

  const { duplicates, checking, check, reset: resetDuplicates } = useDuplicateCheck(mode, editData?.id);

  // Trigger duplicate check when identity fields change
  useEffect(() => {
    check(liveNom, livePrenom, liveRS);
  }, [liveNom, livePrenom, liveRS, check]);

  // Reset state when editData changes (open different contact)
  const editId = editData?.id ?? "";
  const [lastEditId, setLastEditId] = useState(editId);
  if (editId !== lastEditId) {
    setLastEditId(editId);
    setLiveProba(editData?.niveauPotentiel ?? "");
    setLivePotentiel(editData?.potentielAffaires ?? "");
    setSelectedRoles(editData?.rolesReseau ?? []);
    setLiveNom(editData?.nom ?? "");
    setLivePrenom(editData?.prenom ?? "");
    setLiveRS(editData?.raisonSociale ?? "");
    setSirene({});
    setFormKey((k) => k + 1);
    resetDuplicates();
  }

  // Reset on dialog open/close
  useEffect(() => {
    if (!open) {
      resetDuplicates();
      setLiveNom(editData?.nom ?? "");
      setLivePrenom(editData?.prenom ?? "");
      setLiveRS(editData?.raisonSociale ?? "");
    }
  }, [open, editData, resetDuplicates]);

  const livePriorite = useMemo(
    () => computePrioriteReseau(liveProba || null, livePotentiel || null),
    [liveProba, livePotentiel]
  );

  // PART C/D: Derive whether this is a pure prescripteur (no prospect_direct)
  const isPurePrescripteur = selectedRoles.includes("prescripteur_potentiel") && !selectedRoles.includes("prospect_direct");
  const hasProspectDirect = selectedRoles.includes("prospect_direct");

  async function handleSubmit(formData: FormData) {
    const result = await onSubmit(formData);
    if (result && "error" in result) {
      toast.error("Erreur de validation", {
        description: "Verifiez les champs obligatoires.",
      });
      return;
    }
    toast.success(mode === "create" ? "Contact ajoute au reseau" : "Contact mis a jour");
    onOpenChange(false);
  }

  const handleSireneSelect = useCallback((company: {
    raisonSociale: string;
    siret: string;
    formeJuridique: string | null;
    codeNAF: string | null;
    secteurActivite: string | null;
    trancheEffectifs: string | null;
    nbSalaries: number | null;
    ville: string | null;
    codePostal: string | null;
    adresse: string | null;
  }) => {
    setSirene({
      raisonSociale: company.raisonSociale,
      siret: company.siret,
      ville: company.ville ?? undefined,
      secteurActivite: company.secteurActivite ?? undefined,
      formeJuridique: company.formeJuridique ?? undefined,
      codeNAF: company.codeNAF ?? undefined,
      trancheEffectifs: company.trancheEffectifs ?? undefined,
      nbSalaries: company.nbSalaries ?? undefined,
    });
    setLiveRS(company.raisonSociale);
    setFormKey((k) => k + 1);
  }, []);

  function toggleRole(roleId: string) {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  }

  // Default value helper: sirene > editData > empty
  function dv(field: keyof SireneOverrides, editField?: keyof ReseauContactData): string {
    const sv = sirene[field];
    if (sv !== undefined && sv !== null) return String(sv);
    if (editData) {
      const ef = editField ?? (field as keyof ReseauContactData);
      const ev = editData[ef];
      if (ev !== undefined && ev !== null) return String(ev);
    }
    return "";
  }

  function fmtDate(d: string | null | undefined): string {
    if (!d) return "";
    try { return new Date(d).toISOString().split("T")[0]; } catch { return ""; }
  }

  const isEdit = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le contact reseau" : "Nouveau contact reseau"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifiez les informations de ce contact reseau."
              : "Ajoutez un contact a votre reseau personnel strategique."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <CompanySearchButton onSelect={handleSireneSelect} variant="compact" />
          {(sirene.raisonSociale || (isEdit && editData?.raisonSociale)) && (
            <span className="text-xs text-green-600 font-medium truncate">
              {sirene.raisonSociale || editData?.raisonSociale}
            </span>
          )}
        </div>

        <form key={formKey} action={handleSubmit} className="space-y-4">
          {/* Client ID for edit mode */}
          {isEdit && editData && <input type="hidden" name="clientId" value={editData.id} />}

          {/* Hidden fields for SIRENE-only data */}
          <input type="hidden" name="siret" value={dv("siret")} />
          <input type="hidden" name="formeJuridique" value={dv("formeJuridique")} />
          <input type="hidden" name="codeNAF" value={dv("codeNAF")} />
          <input type="hidden" name="trancheEffectifs" value={dv("trancheEffectifs")} />
          <input type="hidden" name="adresse" value={dv("adresse")} />
          <input type="hidden" name="codePostal" value={dv("codePostal")} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Entreprise / Structure</Label>
              <Input
                name="raisonSociale"
                placeholder="Ex: Cabinet Dr. Martin (optionnel)"
                defaultValue={dv("raisonSociale")}
                onChange={(e) => setLiveRS(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Categorie reseau *</Label>
              <Select name="categorieReseau" required defaultValue={editData?.categorieReseau ?? undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES_RESEAU.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Civilite</Label>
              <Select name="civilite" defaultValue={editData?.civilite ?? undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M.">M.</SelectItem>
                  <SelectItem value="Mme">Mme</SelectItem>
                  <SelectItem value="Dr">Dr</SelectItem>
                  <SelectItem value="Me">Me</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prenom *</Label>
              <Input
                name="prenom"
                required
                defaultValue={editData?.prenom ?? ""}
                onChange={(e) => setLivePrenom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input
                name="nom"
                required
                defaultValue={editData?.nom ?? ""}
                onChange={(e) => setLiveNom(e.target.value)}
              />
            </div>
          </div>

          {/* PART A: Duplicate warning */}
          {duplicates.length > 0 && mode === "create" && (
            <div className="rounded-lg border border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-xs font-medium">
                  {duplicates.length === 1 ? "Un contact similaire existe deja" : `${duplicates.length} contacts similaires trouves`}
                </span>
              </div>
              <div className="space-y-1.5">
                {duplicates.map((dup) => (
                  <div key={dup.id} className="flex items-center justify-between text-xs bg-white/60 dark:bg-black/20 rounded px-2 py-1.5">
                    <div className="min-w-0">
                      <span className="font-medium">{dup.prenom} {dup.nom}</span>
                      {dup.raisonSociale && <span className="text-muted-foreground"> — {dup.raisonSociale}</span>}
                      {dup.ville && <span className="text-muted-foreground"> ({dup.ville})</span>}
                    </div>
                    <Link href={`/clients/${dup.id}`} target="_blank" className="shrink-0 ml-2">
                      <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[10px]">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Voir
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                Verifiez qu&apos;il ne s&apos;agit pas d&apos;un doublon avant de continuer.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input name="email" type="email" placeholder="email@exemple.fr" defaultValue={editData?.email ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>Telephone</Label>
              <Input name="telephone" placeholder="06 12 34 56 78" defaultValue={editData?.telephone ?? ""} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ville</Label>
              <Input name="ville" placeholder="Strasbourg" defaultValue={dv("ville")} />
            </div>
            <div className="space-y-2">
              <Label>Secteur d&apos;activite</Label>
              <Input name="secteurActivite" placeholder="Medecine, Droit..." defaultValue={dv("secteurActivite")} />
            </div>
          </div>

          {/* PART B: Approximate employee count — visible field */}
          <div className="space-y-2">
            <Label className="text-xs">Nombre approximatif de salaries</Label>
            <Input
              name="nbSalaries"
              type="number"
              min={0}
              step={1}
              placeholder="Ex: 15"
              className="h-9 w-40"
              defaultValue={dv("nbSalaries")}
            />
            <p className="text-[10px] text-muted-foreground">
              Utile pour estimer le potentiel CA. Laissez vide si non applicable.
            </p>
          </div>

          {/* Qualification reseau */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Qualification
              </h4>
              {livePriorite && (
                <Badge className={`text-[10px] ${PRIORITES_RESEAU_CONFIG[livePriorite].bgClass}`}>
                  {PRIORITES_RESEAU_CONFIG[livePriorite].label}
                </Badge>
              )}
            </div>

            {/* Multi-role selection */}
            <div className="space-y-2">
              <Label className="text-xs">Roles (multi-selection)</Label>
              <div className="flex flex-wrap gap-2">
                {ROLES_RESEAU.map((role) => {
                  const isSelected = selectedRoles.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleRole(role.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                        isSelected
                          ? "border-transparent text-white shadow-sm"
                          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      }`}
                      style={isSelected ? { backgroundColor: role.color } : undefined}
                    >
                      {role.label}
                    </button>
                  );
                })}
              </div>
              {selectedRoles.map((roleId) => (
                <input key={roleId} type="hidden" name="rolesReseau" value={roleId} />
              ))}
            </div>

            {/* PART D: Prescripteur-only hint */}
            {isPurePrescripteur && (
              <div className="flex items-start gap-2 rounded-md border border-violet-200 bg-violet-50/50 dark:bg-violet-950/20 p-2.5">
                <Info className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-violet-700 dark:text-violet-300">
                  Ce contact est un prescripteur pur — il ne sera pas comptabilise dans le potentiel CA direct du reseau.
                  Pour qu&apos;il contribue au potentiel, ajoutez egalement le role &quot;Prospect direct&quot;.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Statut reseau</Label>
                <Select name="statutReseau" defaultValue={editData?.statutReseau ?? "aucune_demarche"}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Aucune demarche" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUTS_RESEAU.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Moment d&apos;activation</Label>
                <Select name="horizonActivation" defaultValue={editData?.horizonActivation ?? undefined}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__clear__">— Aucun —</SelectItem>
                    {HORIZONS_ACTIVATION.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Qualification fields — visually muted when pure prescripteur */}
            <div className={`grid grid-cols-2 gap-4 ${isPurePrescripteur ? "opacity-50" : ""}`}>
              <div className="space-y-2">
                <Label className="text-xs">Probabilite de signature</Label>
                <Select
                  name="niveauPotentiel"
                  defaultValue={editData?.niveauPotentiel ?? undefined}
                  onValueChange={setLiveProba}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    {NIVEAUX_POTENTIEL.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Potentiel affaires</Label>
                <Select
                  name="potentielAffaires"
                  defaultValue={editData?.potentielAffaires ?? undefined}
                  onValueChange={setLivePotentiel}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    {POTENTIELS_AFFAIRES.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={`grid grid-cols-2 gap-4 ${isPurePrescripteur ? "opacity-50" : ""}`}>
              <div className="space-y-2">
                <Label className="text-xs">Potentiel estime annuel</Label>
                <Input name="potentielEstimeAnnuel" type="number" min={0} step={100} placeholder="EUR/an" className="h-9" defaultValue={editData?.potentielEstimeAnnuel ?? ""} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prochaine action</Label>
              <Input name="prochaineActionReseau" placeholder="Ex: Inviter a un dejeuner" defaultValue={editData?.prochaineActionReseau ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>Date dernier contact</Label>
              <Input name="dateDernierContact" type="date" defaultValue={fmtDate(editData?.dateDernierContact)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea name="notes" placeholder="Contexte, point de contact, remarques..." rows={2} defaultValue={editData?.notes ?? ""} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <SubmitButton pendingText={isEdit ? "Mise a jour..." : "Ajout en cours..."}>
              {isEdit ? "Enregistrer" : "Ajouter au reseau"}
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
