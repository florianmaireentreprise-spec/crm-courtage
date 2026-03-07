"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Building2, FileText, Target, Users, Mail, Search } from "lucide-react";

type SearchResults = {
  clients: { id: string; raisonSociale: string; nom: string; prenom: string; statut: string; ville: string | null }[];
  contrats: { id: string; typeProduit: string; nomProduit: string | null; client: { raisonSociale: string } }[];
  deals: { id: string; titre: string; etape: string; client: { raisonSociale: string } }[];
  prescripteurs: { id: string; nom: string; prenom: string; type: string; entreprise: string | null }[];
  emails: { id: string; sujet: string; expediteur: string; dateEnvoi: string }[];
};

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          setResults(await res.json());
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const navigate = useCallback(
    (path: string) => {
      setOpen(false);
      setQuery("");
      setResults(null);
      router.push(path);
    },
    [router]
  );

  const hasResults =
    results &&
    (results.clients.length > 0 ||
      results.contrats.length > 0 ||
      results.deals.length > 0 ||
      results.prescripteurs.length > 0 ||
      results.emails.length > 0);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/50 text-sm text-muted-foreground hover:bg-muted transition-colors w-full max-w-[280px]"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Rechercher...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setQuery("");
            setResults(null);
          }
        }}
        title="Recherche globale"
        description="Rechercher clients, contrats, deals, prescripteurs, emails"
      >
        <CommandInput
          placeholder="Rechercher un client, contrat, deal..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {query.length < 2 && (
            <CommandEmpty>Tapez au moins 2 caracteres...</CommandEmpty>
          )}
          {query.length >= 2 && loading && (
            <CommandEmpty>Recherche en cours...</CommandEmpty>
          )}
          {query.length >= 2 && !loading && !hasResults && (
            <CommandEmpty>Aucun resultat pour &quot;{query}&quot;</CommandEmpty>
          )}

          {results?.clients && results.clients.length > 0 && (
            <CommandGroup heading="Clients">
              {results.clients.map((c) => (
                <CommandItem key={c.id} onSelect={() => navigate(`/clients/${c.id}`)}>
                  <Building2 className="h-4 w-4 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{c.raisonSociale}</span>
                    {c.ville && (
                      <span className="text-muted-foreground ml-2 text-xs">{c.ville}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">{c.statut?.replace("_", " ")}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results?.contrats && results.contrats.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Contrats">
                {results.contrats.map((c) => (
                  <CommandItem key={c.id} onSelect={() => navigate(`/contrats/${c.id}`)}>
                    <FileText className="h-4 w-4 text-purple-500" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{c.nomProduit || c.typeProduit}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{c.client.raisonSociale}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {results?.deals && results.deals.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Pipeline">
                {results.deals.map((d) => (
                  <CommandItem key={d.id} onSelect={() => navigate("/pipeline")}>
                    <Target className="h-4 w-4 text-orange-500" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{d.titre}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{d.client.raisonSociale}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{d.etape.replace(/_/g, " ")}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {results?.prescripteurs && results.prescripteurs.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Prescripteurs">
                {results.prescripteurs.map((p) => (
                  <CommandItem key={p.id} onSelect={() => navigate(`/prescripteurs/${p.id}`)}>
                    <Users className="h-4 w-4 text-green-500" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{p.prenom} {p.nom}</span>
                      {p.entreprise && (
                        <span className="text-muted-foreground ml-2 text-xs">{p.entreprise}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{p.type?.replace("_", " ")}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {results?.emails && results.emails.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Emails">
                {results.emails.map((e) => (
                  <CommandItem key={e.id} onSelect={() => navigate("/emails")}>
                    <Mail className="h-4 w-4 text-cyan-500" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate">{e.sujet}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{e.expediteur}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
