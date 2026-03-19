"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import {
  Phone,
  CalendarClock,
  AlertTriangle,
  Zap,
  Clock,
  ArrowUpDown,
  Filter,
  X,
  Pencil,
  ExternalLink,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  CATEGORIES_RESEAU,
  TYPES_RELATION_RESEAU,
  STATUTS_RESEAU,
  NIVEAUX_POTENTIEL,
  POTENTIELS_AFFAIRES,
  HORIZONS_ACTIVATION,
  STATUTS_CLIENT,
} from "@/lib/constants";
import { quickUpdateReseau } from "@/app/(app)/reseau/actions";
import { forceDeleteClient } from "@/app/(app)/clients/actions";

type ReseauClient = {
  id: string;
  raisonSociale: string;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  ville: string | null;
  statut: string;
  categorieReseau: string | null;
  typeRelation: string | null;
  statutReseau: string | null;
  niveauPotentiel: string | null;
  potentielAffaires: string | null;
  potentielEstimeAnnuel: number | null;
  horizonActivation: string | null;
  prochaineActionReseau: string | null;
  dateRelanceReseau: string | null;
  dateDernierContact: string | null;
  _count: { contrats: number; deals: number };
};

type SortKey = "alpha" | "potentiel_desc" | "relance_asc" | "dernier_contact_asc";

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "alpha", label: "Alphabetique" },
  { id: "potentiel_desc", label: "Potentiel (decroissant)" },
  { id: "relance_asc", label: "Relance (plus proche)" },
  { id: "dernier_contact_asc", label: "Dernier contact (plus ancien)" },
];

function formatDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function isOverdue(d: string | null): boolean {
  if (!d) return false;
  return new Date(d) < new Date(new Date().toDateString());
}

function isDueSoon(d: string | null, days: number): boolean {
  if (!d) return false;
  const target = new Date(d);
  const now = new Date(new Date().toDateString());
  const limit = new Date(now);
  limit.setDate(limit.getDate() + days);
  return target >= now && target <= limit;
}

function clientDisplayName(c: { raisonSociale: string; prenom: string; nom: string }): string {
  return c.raisonSociale || `${c.prenom} ${c.nom}`;
}

export function ReseauContactList({ clients }: { clients: ReseauClient[] }) {
  // Filters
  const [filterCategorie, setFilterCategorie] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatut, setFilterStatut] = useState<string>("all");
  const [filterPotentiel, setFilterPotentiel] = useState<string>("all");
  const [filterPotentielAffaires, setFilterPotentielAffaires] = useState<string>("all");
  const [filterHorizon, setFilterHorizon] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("alpha");
  const [showFilters, setShowFilters] = useState(false);

  // Quick edit
  const [editClient, setEditClient] = useState<ReseauClient | null>(null);
  const [editStatut, setEditStatut] = useState("");
  const [editAction, setEditAction] = useState("");
  const [editRelance, setEditRelance] = useState("");
  const [saving, setSaving] = useState(false);

  // Force delete
  const [deleteClient, setDeleteClient] = useState<ReseauClient | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const hasActiveFilters = filterCategorie !== "all" || filterType !== "all" || filterStatut !== "all" || filterPotentiel !== "all" || filterPotentielAffaires !== "all" || filterHorizon !== "all";

  function clearFilters() {
    setFilterCategorie("all");
    setFilterType("all");
    setFilterStatut("all");
    setFilterPotentiel("all");
    setFilterPotentielAffaires("all");
    setFilterHorizon("all");
  }

  // Filtered + sorted
  const filtered = useMemo(() => {
    let result = clients;

    if (filterCategorie !== "all") result = result.filter((c) => c.categorieReseau === filterCategorie);
    if (filterType !== "all") result = result.filter((c) => c.typeRelation === filterType);
    if (filterStatut !== "all") result = result.filter((c) => c.statutReseau === filterStatut);
    if (filterPotentiel !== "all") result = result.filter((c) => c.niveauPotentiel === filterPotentiel);
    if (filterPotentielAffaires !== "all") result = result.filter((c) => c.potentielAffaires === filterPotentielAffaires);
    if (filterHorizon !== "all") result = result.filter((c) => c.horizonActivation === filterHorizon);

    const sorted = [...result];
    switch (sortKey) {
      case "potentiel_desc":
        sorted.sort((a, b) => (b.potentielEstimeAnnuel ?? 0) - (a.potentielEstimeAnnuel ?? 0));
        break;
      case "relance_asc":
        sorted.sort((a, b) => {
          if (!a.dateRelanceReseau && !b.dateRelanceReseau) return 0;
          if (!a.dateRelanceReseau) return 1;
          if (!b.dateRelanceReseau) return -1;
          return new Date(a.dateRelanceReseau).getTime() - new Date(b.dateRelanceReseau).getTime();
        });
        break;
      case "dernier_contact_asc":
        sorted.sort((a, b) => {
          if (!a.dateDernierContact && !b.dateDernierContact) return 0;
          if (!a.dateDernierContact) return -1;
          if (!b.dateDernierContact) return 1;
          return new Date(a.dateDernierContact).getTime() - new Date(b.dateDernierContact).getTime();
        });
        break;
      default:
        sorted.sort((a, b) => clientDisplayName(a).localeCompare(clientDisplayName(b), "fr"));
    }
    return sorted;
  }, [clients, filterCategorie, filterType, filterStatut, filterPotentiel, filterPotentielAffaires, filterHorizon, sortKey]);

  // Operational highlights
  const aContacter = useMemo(() => clients.filter((c) => c.statutReseau === "a_contacter" || c.statutReseau === "aucune_demarche"), [clients]);
  const relancesEchues = useMemo(() => clients.filter((c) => isOverdue(c.dateRelanceReseau)), [clients]);
  const relancesBientot = useMemo(() => clients.filter((c) => isDueSoon(c.dateRelanceReseau, 7) && !isOverdue(c.dateRelanceReseau)), [clients]);
  const fortPotentiel = useMemo(() => clients.filter((c) => c.niveauPotentiel === "fort"), [clients]);
  const fortPotentielAffaires = useMemo(() => clients.filter((c) => c.potentielAffaires === "fort" || c.potentielAffaires === "strategique"), [clients]);
  const courtTerme = useMemo(() => clients.filter((c) => c.horizonActivation === "court"), [clients]);

  function openQuickEdit(client: ReseauClient) {
    setEditClient(client);
    setEditStatut(client.statutReseau ?? "");
    setEditAction(client.prochaineActionReseau ?? "");
    setEditRelance(client.dateRelanceReseau ? new Date(client.dateRelanceReseau).toISOString().slice(0, 10) : "");
  }

  async function handleQuickSave() {
    if (!editClient) return;
    setSaving(true);
    await quickUpdateReseau({
      clientId: editClient.id,
      statutReseau: editStatut,
      prochaineActionReseau: editAction,
      dateRelanceReseau: editRelance,
    });
    setSaving(false);
    setEditClient(null);
  }

  async function handleForceDelete() {
    if (!deleteClient) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await forceDeleteClient(deleteClient.id);
    if (result && "error" in result && result.error) {
      setDeleteError(typeof result.error === "string" ? result.error : "Erreur inconnue");
      setDeleting(false);
    }
    // If success, server-side redirect to /clients happens
  }

  return (
    <div className="space-y-4">
      {/* Operational highlights */}
      {(relancesEchues.length > 0 || relancesBientot.length > 0 || aContacter.length > 0 || fortPotentiel.length > 0 || fortPotentielAffaires.length > 0 || courtTerme.length > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {relancesEchues.length > 0 && (
            <button
              onClick={() => { clearFilters(); setSortKey("relance_asc"); }}
              className="text-left"
            >
              <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 hover:shadow-sm transition-shadow cursor-pointer">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-lg font-bold text-red-600">{relancesEchues.length}</span>
                  </div>
                  <p className="text-[11px] text-red-600/80 mt-0.5">Relances en retard</p>
                </CardContent>
              </Card>
            </button>
          )}
          {relancesBientot.length > 0 && (
            <button
              onClick={() => { clearFilters(); setSortKey("relance_asc"); }}
              className="text-left"
            >
              <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 hover:shadow-sm transition-shadow cursor-pointer">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-lg font-bold text-amber-600">{relancesBientot.length}</span>
                  </div>
                  <p className="text-[11px] text-amber-600/80 mt-0.5">Relances cette semaine</p>
                </CardContent>
              </Card>
            </button>
          )}
          <button
            onClick={() => { clearFilters(); setFilterStatut("a_contacter"); }}
            className="text-left"
          >
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 hover:shadow-sm transition-shadow cursor-pointer">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-500" />
                  <span className="text-lg font-bold text-blue-600">{aContacter.length}</span>
                </div>
                <p className="text-[11px] text-blue-600/80 mt-0.5">A contacter / sans demarche</p>
              </CardContent>
            </Card>
          </button>
          <button
            onClick={() => { clearFilters(); setFilterPotentiel("fort"); }}
            className="text-left"
          >
            <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 hover:shadow-sm transition-shadow cursor-pointer">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-500" />
                  <span className="text-lg font-bold text-emerald-600">{fortPotentiel.length}</span>
                </div>
                <p className="text-[11px] text-emerald-600/80 mt-0.5">Forte probabilite</p>
              </CardContent>
            </Card>
          </button>
          {fortPotentielAffaires.length > 0 && (
            <button
              onClick={() => { clearFilters(); setFilterPotentielAffaires("strategique"); }}
              className="text-left"
            >
              <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 hover:shadow-sm transition-shadow cursor-pointer">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                    <span className="text-lg font-bold text-orange-600">{fortPotentielAffaires.length}</span>
                  </div>
                  <p className="text-[11px] text-orange-600/80 mt-0.5">Fort potentiel affaires</p>
                </CardContent>
              </Card>
            </button>
          )}
          <button
            onClick={() => { clearFilters(); setFilterHorizon("court"); }}
            className="text-left"
          >
            <Card className="border-violet-200 bg-violet-50/50 dark:bg-violet-950/20 hover:shadow-sm transition-shadow cursor-pointer">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-violet-500" />
                  <span className="text-lg font-bold text-violet-600">{courtTerme.length}</span>
                </div>
                <p className="text-[11px] text-violet-600/80 mt-0.5">Court terme</p>
              </CardContent>
            </Card>
          </button>
        </div>
      )}

      {/* Toolbar: filters + sort */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant={showFilters ? "default" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            Filtres
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                {[filterCategorie, filterType, filterStatut, filterPotentiel, filterPotentielAffaires, filterHorizon].filter((f) => f !== "all").length}
              </Badge>
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3.5 w-3.5 mr-1" />
              Effacer
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-8 w-[200px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{filtered.length} contact{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Filter dropdowns */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Categorie</Label>
                <Select value={filterCategorie} onValueChange={setFilterCategorie}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {CATEGORIES_RESEAU.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Type relation</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {TYPES_RELATION_RESEAU.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Statut reseau</Label>
                <Select value={filterStatut} onValueChange={setFilterStatut}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {STATUTS_RESEAU.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Probabilite</Label>
                <Select value={filterPotentiel} onValueChange={setFilterPotentiel}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {NIVEAUX_POTENTIEL.map((n) => (
                      <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Pot. affaires</Label>
                <Select value={filterPotentielAffaires} onValueChange={setFilterPotentielAffaires}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {POTENTIELS_AFFAIRES.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Horizon</Label>
                <Select value={filterHorizon} onValueChange={setFilterHorizon}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {HORIZONS_ACTIVATION.map((h) => (
                      <SelectItem key={h.id} value={h.id}>{h.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
            Aucun contact ne correspond aux filtres selectionnes.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => {
            const catConfig = CATEGORIES_RESEAU.find((c) => c.id === client.categorieReseau);
            const statutConfig = STATUTS_CLIENT.find((s) => s.id === client.statut);
            const srConfig = STATUTS_RESEAU.find((s) => s.id === client.statutReseau);
            const typeConfig = TYPES_RELATION_RESEAU.find((t) => t.id === client.typeRelation);
            const horizonConfig = HORIZONS_ACTIVATION.find((h) => h.id === client.horizonActivation);
            const relanceOverdue = isOverdue(client.dateRelanceReseau);
            const relanceSoon = isDueSoon(client.dateRelanceReseau, 7);

            return (
              <Card
                key={client.id}
                className={`transition-colors ${relanceOverdue ? "border-red-300 bg-red-50/30 dark:bg-red-950/10" : relanceSoon ? "border-amber-200 bg-amber-50/20 dark:bg-amber-950/10" : ""}`}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: identity + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/clients/${client.id}`} className="font-medium text-sm hover:underline truncate">
                          {clientDisplayName(client)}
                        </Link>
                        {catConfig && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: catConfig.color }} />
                            <span className="text-[10px] text-muted-foreground">{catConfig.label}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {client.raisonSociale ? `${client.prenom} ${client.nom}` : null}
                        {client.ville && <>{client.raisonSociale ? " — " : ""}{client.ville}</>}
                      </p>

                      {/* Badges row */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {srConfig && (
                          <Badge variant="outline" className="text-[10px] px-1.5" style={{ borderColor: srConfig.color, color: srConfig.color }}>
                            {srConfig.label}
                          </Badge>
                        )}
                        {typeConfig && (
                          <Badge variant="secondary" className="text-[10px] px-1.5">
                            {typeConfig.label}
                          </Badge>
                        )}
                        {client.niveauPotentiel && NIVEAUX_POTENTIEL.find((n) => n.id === client.niveauPotentiel) && (
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-1.5 ${
                              client.niveauPotentiel === "fort"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : client.niveauPotentiel === "moyen"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : ""
                            }`}
                          >
                            {NIVEAUX_POTENTIEL.find((n) => n.id === client.niveauPotentiel)!.label}
                          </Badge>
                        )}
                        {client.potentielAffaires && POTENTIELS_AFFAIRES.find((p) => p.id === client.potentielAffaires) && (
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-1.5 ${
                              client.potentielAffaires === "strategique"
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                : client.potentielAffaires === "fort"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : ""
                            }`}
                          >
                            Pot. {POTENTIELS_AFFAIRES.find((p) => p.id === client.potentielAffaires)!.label}
                          </Badge>
                        )}
                        {client.potentielEstimeAnnuel != null && client.potentielEstimeAnnuel > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 font-mono">
                            {formatCurrency(client.potentielEstimeAnnuel)}/an
                          </Badge>
                        )}
                        {horizonConfig && (
                          <Badge variant="outline" className="text-[10px] px-1.5">
                            {horizonConfig.label}
                          </Badge>
                        )}
                        {statutConfig && (
                          <Badge variant="outline" className="text-[10px] px-1.5" style={{ borderColor: statutConfig.color, color: statutConfig.color }}>
                            {statutConfig.label}
                          </Badge>
                        )}
                      </div>

                      {/* Action + dates row */}
                      {(client.prochaineActionReseau || client.dateRelanceReseau || client.dateDernierContact) && (
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                          {client.prochaineActionReseau && (
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {client.prochaineActionReseau}
                            </span>
                          )}
                          {client.dateRelanceReseau && (
                            <span className={`flex items-center gap-1 ${relanceOverdue ? "text-red-600 font-medium" : relanceSoon ? "text-amber-600" : ""}`}>
                              <CalendarClock className="h-3 w-3" />
                              Relance: {formatDate(client.dateRelanceReseau)}
                              {relanceOverdue && " (en retard)"}
                            </span>
                          )}
                          {client.dateDernierContact && (
                            <span>Dernier contact: {formatDate(client.dateDernierContact)}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openQuickEdit(client)} title="Mise a jour rapide">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Link href={`/clients/${client.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Voir la fiche">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-600"
                        onClick={() => { setDeleteClient(client); setDeleteConfirmText(""); setDeleteError(null); }}
                        title="Supprimer definitivement"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick edit dialog */}
      <Dialog open={!!editClient} onOpenChange={(open) => { if (!open) setEditClient(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Mise a jour rapide</DialogTitle>
            <DialogDescription>
              {editClient ? clientDisplayName(editClient) : ""}{editClient?.raisonSociale ? ` — ${editClient.prenom} ${editClient.nom}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Statut reseau</Label>
              <Select value={editStatut} onValueChange={setEditStatut}>
                <SelectTrigger>
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  {STATUTS_RESEAU.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Prochaine action</Label>
              <Input
                value={editAction}
                onChange={(e) => setEditAction(e.target.value)}
                placeholder="Ex: Appeler pour proposer un RDV"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Date de relance</Label>
              <Input
                type="date"
                value={editRelance}
                onChange={(e) => setEditRelance(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditClient(null)}>
                Annuler
              </Button>
              <Button size="sm" onClick={handleQuickSave} disabled={saving}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Force delete confirmation dialog */}
      <Dialog open={!!deleteClient} onOpenChange={(open) => { if (!open) { setDeleteClient(null); setDeleteConfirmText(""); setDeleteError(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              Suppression definitive
            </DialogTitle>
            <DialogDescription>
              Toutes les donnees liees seront supprimees : contrats, deals, documents, opportunites, dirigeant, signaux, preconisations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-red-700">
              Tapez <span className="font-bold">{deleteClient ? clientDisplayName(deleteClient) : ""}</span> pour confirmer :
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={deleteClient ? clientDisplayName(deleteClient) : ""}
              className="text-sm border-red-300 focus-visible:ring-red-400"
              autoFocus
            />
            {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setDeleteClient(null); setDeleteConfirmText(""); setDeleteError(null); }}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleForceDelete}
              disabled={deleteConfirmText.trim().toLowerCase() !== (deleteClient ? clientDisplayName(deleteClient) : "").trim().toLowerCase() || deleting}
            >
              {deleting ? "Suppression..." : "Supprimer definitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
