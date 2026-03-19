"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Building2,
  Users,
  TrendingUp,
  Plus,
  Loader2,
  Briefcase,
  MapPin,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createDeal } from "@/app/(app)/pipeline/actions";

interface ClientSearchResult {
  id: string;
  raisonSociale: string;
  civilite: string | null;
  prenom: string;
  nom: string;
  formeJuridique: string | null;
  secteurActivite: string | null;
  nbSalaries: number | null;
  chiffreAffaires: number | null;
  ville: string | null;
  statut: string;
  scoreProspect: number | null;
  temperatureCommerciale: string | null;
  potentielCA: number | null;
  _count?: { deals: number; contrats: number };
}

interface DealCreateFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDealCreated?: (dealId: string) => void;
}

const TEMPERATURES: Record<string, { label: string; class: string }> = {
  chaud: { label: "Chaud", class: "bg-destructive/10 text-destructive" },
  tiede: { label: "Tiede", class: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  froid: { label: "Froid", class: "bg-muted text-muted-foreground" },
};

const fmtCA = (v: number) =>
  v >= 1e6 ? `${(v / 1e6).toFixed(1)} M\u20ac` : `${(v / 1e3).toFixed(0)} k\u20ac`;

export function DealCreateFlow({ open, onOpenChange, onDealCreated }: DealCreateFlowProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setHasSearched(false);
      setCreating(false);
      setSelectedClientId(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const searchClients = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/clients/search-pipeline?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setHasSearched(true);
      }
    } catch (err) {
      console.error("Erreur recherche client:", err);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchClients(query), 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, open, searchClients]);

  async function handleSelectClient(client: ClientSearchResult) {
    setSelectedClientId(client.id);
    setCreating(true);
    try {
      const formData = new FormData();
      formData.set("titre", `Nouveau deal \u2014 ${client.raisonSociale}`);
      formData.set("clientId", client.id);
      formData.set("etape", "PROSPECT_IDENTIFIE");
      formData.set("probabilite", "10");

      const result = await createDeal(formData);

      onOpenChange(false);

      if (result && typeof result === "object" && "id" in result) {
        onDealCreated?.(result.id as string);
      }

      router.refresh();
    } catch (err) {
      console.error("Erreur creation deal:", err);
      setCreating(false);
      setSelectedClientId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="text-base font-bold">Nouveau deal</DialogTitle>
          <DialogDescription className="text-xs">
            Recherchez un client pour creer une opportunite
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Raison sociale, nom, ville, secteur, SIRET..."
              className="pl-9 h-10 bg-muted/50"
              disabled={creating}
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
          {!hasSearched && !searching && query.length < 2 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-5">
              <div className="p-3 rounded-xl bg-muted/50 mb-3">
                <Building2 className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">
                Tapez au moins 2 caracteres pour rechercher
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Recherche par raison sociale, nom du dirigeant, ville ou secteur
              </p>
            </div>
          )}

          {hasSearched && results.length === 0 && !searching && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-5">
              <div className="p-3 rounded-xl bg-muted/50 mb-3">
                <Search className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">
                Aucun client trouve pour &quot;{query}&quot;
              </p>
              <Button
                variant="link"
                size="sm"
                className="mt-2 text-xs h-auto p-0"
                onClick={() => {
                  onOpenChange(false);
                  router.push("/clients/nouveau");
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Creer un nouveau client
              </Button>
            </div>
          )}

          {results.length > 0 && (
            <div className="px-2 pb-2">
              {results.map((client) => {
                const temp = client.temperatureCommerciale
                  ? TEMPERATURES[client.temperatureCommerciale]
                  : null;
                const isSelected = selectedClientId === client.id;
                const dealsCount = client._count?.deals || 0;
                const contratsCount = client._count?.contrats || 0;

                return (
                  <button
                    key={client.id}
                    onClick={() => handleSelectClient(client)}
                    disabled={creating}
                    className={cn(
                      "w-full text-left px-3 py-3 rounded-lg transition-all duration-150",
                      "border border-transparent",
                      "hover:bg-primary/[0.04] hover:border-primary/10",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "disabled:opacity-50",
                      isSelected && creating && "bg-primary/[0.06] border-primary/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">
                            {client.raisonSociale}
                          </span>
                          {dealsCount > 0 && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                              {dealsCount} deal{dealsCount > 1 ? "s" : ""} en cours
                            </span>
                          )}
                          {contratsCount > 0 && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-success/10 text-success">
                              {contratsCount} contrat{contratsCount > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {client.civilite} {client.prenom} {client.nom}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {temp && (
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-md", temp.class)}>
                            {temp.label}
                          </span>
                        )}
                        {client.scoreProspect != null && (
                          <span className={cn(
                            "text-xs font-bold tabular-nums min-w-[28px] text-right",
                            client.scoreProspect >= 70 ? "text-success"
                              : client.scoreProspect >= 40 ? "text-amber-600 dark:text-amber-400"
                              : "text-destructive"
                          )}>
                            {client.scoreProspect}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
                      {client.formeJuridique && (
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {client.formeJuridique}
                        </span>
                      )}
                      {client.ville && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {client.ville}
                        </span>
                      )}
                      {client.nbSalaries != null && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {client.nbSalaries} sal.
                        </span>
                      )}
                      {client.chiffreAffaires != null && client.chiffreAffaires > 0 && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {fmtCA(client.chiffreAffaires)}
                        </span>
                      )}
                      {client.secteurActivite && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {client.secteurActivite}
                        </span>
                      )}
                    </div>

                    {isSelected && creating && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-primary">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Creation du deal...
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            Cliquez sur un client pour creer le deal
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => {
              onOpenChange(false);
              router.push("/clients/nouveau");
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            Nouveau client
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
