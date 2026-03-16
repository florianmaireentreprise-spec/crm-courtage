"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search, Building2, MapPin, Users, Loader2 } from "lucide-react";

type CompanyResult = {
  siren: string;
  siret: string;
  raisonSociale: string;
  formeJuridique: string | null;
  codeNAF: string | null;
  secteurActivite: string | null;
  trancheEffectifs: string | null;
  nbSalaries: number | null;
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
};

type Props = {
  onSelect: (company: CompanyResult) => void;
  variant?: "default" | "compact";
};

export function CompanySearchButton({ onSelect, variant = "default" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    if (!query.trim() || query.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    setError(null);
    try {
      const res = await fetch(`/api/entreprise/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      }
      setResults(data.results || []);
    } catch {
      setResults([]);
      setError("Erreur reseau. Verifiez votre connexion et reessayez.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  function handleSelect(company: CompanyResult) {
    onSelect(company);
    setOpen(false);
    setQuery("");
    setResults([]);
    setSearched(false);
  }

  function handleOpen() {
    setOpen(true);
    setQuery("");
    setResults([]);
    setSearched(false);
    setError(null);
  }

  return (
    <>
      {variant === "compact" ? (
        <Button type="button" variant="outline" size="sm" onClick={handleOpen}>
          <Search className="h-3.5 w-3.5 mr-1.5" />
          SIRENE
        </Button>
      ) : (
        <Button type="button" variant="outline" onClick={handleOpen}>
          <Search className="h-4 w-4 mr-2" />
          Rechercher une entreprise (SIRENE)
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Rechercher une entreprise</DialogTitle>
            <DialogDescription>
              Recherchez par nom, SIREN ou SIRET pour pre-remplir les informations.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Input
              placeholder="Nom d'entreprise, SIREN ou SIRET..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  search();
                }
              }}
              autoFocus
            />
            <Button onClick={search} disabled={loading || query.trim().length < 2}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          <div className="overflow-y-auto flex-1 -mx-6 px-6">
            {loading && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Recherche en cours...
              </div>
            )}

            {!loading && error && (
              <p className="text-center text-amber-600 py-4 text-sm">
                {error}
              </p>
            )}

            {!loading && searched && results.length === 0 && !error && (
              <p className="text-center text-muted-foreground py-8">
                Aucun resultat. Essayez avec un autre terme de recherche.
              </p>
            )}

            {!loading && results.length > 0 && (
              <div className="space-y-2 py-2">
                {results.map((company, idx) => (
                  <button
                    key={`${company.siret}-${idx}`}
                    type="button"
                    onClick={() => handleSelect(company)}
                    className="w-full text-left p-3 rounded-lg border hover:bg-accent hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium truncate">{company.raisonSociale}</span>
                          {company.formeJuridique && (
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded shrink-0">
                              {company.formeJuridique}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>SIRET: {company.siret}</span>
                          {company.codeNAF && <span>NAF: {company.codeNAF}</span>}
                        </div>
                        <div className="flex items-center gap-4 mt-0.5 text-xs text-muted-foreground">
                          {company.ville && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {company.codePostal} {company.ville}
                            </span>
                          )}
                          {company.trancheEffectifs && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {company.trancheEffectifs}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
