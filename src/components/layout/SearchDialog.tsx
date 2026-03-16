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
import { Building2, FileText, Target, Users, Mail, Search, UserCheck, Briefcase, FolderOpen } from "lucide-react";

type SearchResults = {
  clients: { id: string; raisonSociale: string; nom: string; prenom: string; statut: string; ville: string | null }[];
  dirigeants: { id: string; prenom: string; nom: string; email: string | null; statutProfessionnel: string | null; client: { id: string; raisonSociale: string } }[];
  contrats: { id: string; typeProduit: string; nomProduit: string | null; numeroContrat: string | null; client: { raisonSociale: string }; compagnie: { nom: string } | null }[];
  deals: { id: string; titre: string; etape: string; clientId: string; client: { raisonSociale: string } }[];
  prescripteurs: { id: string; nom: string; prenom: string; type: string; entreprise: string | null }[];
  compagnies: { id: string; nom: string; type: string | null; nbContratsActifs: number | null }[];
  documents: { id: string; nomAffiche: string; categorie: string; typeDocument: string; clientId: string; client: { raisonSociale: string } }[];
  emails: { id: string; sujet: string; expediteur: string; dateEnvoi: string; clientId: string | null }[];
};

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
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
      setError(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          setResults(await res.json());
        } else {
          setError(true);
        }
      } catch {
        setError(true);
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
      results.dirigeants.length > 0 ||
      results.contrats.length > 0 ||
      results.deals.length > 0 ||
      results.prescripteurs.length > 0 ||
      results.compagnies.length > 0 ||
      results.documents.length > 0 ||
      results.emails.length > 0);

  let groupIndex = 0;

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
        shouldFilter={false}
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setQuery("");
            setResults(null);
            setError(false);
          }
        }}
        title="Recherche globale"
        description="Rechercher clients, dirigeants, contrats, compagnies, documents..."
      >
        <CommandInput
          placeholder="Rechercher un client, dirigeant, contrat, document..."
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
          {query.length >= 2 && !loading && error && (
            <CommandEmpty>Erreur de recherche. Reessayez.</CommandEmpty>
          )}
          {query.length >= 2 && !loading && !error && !hasResults && (
            <CommandEmpty>Aucun resultat pour &quot;{query}&quot;</CommandEmpty>
          )}

          {/* Clients */}
          {results?.clients && results.clients.length > 0 && (
            <>
              {groupIndex++ > 0 && <CommandSeparator />}
              <CommandGroup heading="Clients">
                {results.clients.map((c) => (
                  <CommandItem key={c.id} value={`client-${c.id}`} onSelect={() => navigate(`/clients/${c.id}`)}>
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
            </>
          )}

          {/* Dirigeants */}
          {results?.dirigeants && results.dirigeants.length > 0 && (
            <>
              {groupIndex++ > 0 && <CommandSeparator />}
              <CommandGroup heading="Dirigeants">
                {results.dirigeants.map((d) => (
                  <CommandItem key={d.id} value={`dirigeant-${d.id}`} onSelect={() => navigate(`/clients/${d.client.id}`)}>
                    <UserCheck className="h-4 w-4 text-indigo-500" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{d.prenom} {d.nom}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{d.client.raisonSociale}</span>
                    </div>
                    {d.statutProfessionnel && (
                      <span className="text-xs text-muted-foreground">{d.statutProfessionnel === "TNS" ? "TNS" : "Assimile"}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Contrats */}
          {results?.contrats && results.contrats.length > 0 && (
            <>
              {groupIndex++ > 0 && <CommandSeparator />}
              <CommandGroup heading="Contrats">
                {results.contrats.map((c) => (
                  <CommandItem key={c.id} value={`contrat-${c.id}`} onSelect={() => navigate(`/contrats/${c.id}`)}>
                    <FileText className="h-4 w-4 text-purple-500" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{c.nomProduit || c.typeProduit}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {c.client.raisonSociale}
                        {c.compagnie ? ` — ${c.compagnie.nom}` : ""}
                      </span>
                    </div>
                    {c.numeroContrat && (
                      <span className="text-xs text-muted-foreground">#{c.numeroContrat}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Pipeline / Deals */}
          {results?.deals && results.deals.length > 0 && (
            <>
              {groupIndex++ > 0 && <CommandSeparator />}
              <CommandGroup heading="Pipeline">
                {results.deals.map((d) => (
                  <CommandItem key={d.id} value={`deal-${d.id}`} onSelect={() => navigate(`/clients/${d.clientId}`)}>
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

          {/* Prescripteurs */}
          {results?.prescripteurs && results.prescripteurs.length > 0 && (
            <>
              {groupIndex++ > 0 && <CommandSeparator />}
              <CommandGroup heading="Prescripteurs">
                {results.prescripteurs.map((p) => (
                  <CommandItem key={p.id} value={`prescripteur-${p.id}`} onSelect={() => navigate(`/prescripteurs/${p.id}`)}>
                    <Users className="h-4 w-4 text-green-500" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{p.prenom} {p.nom}</span>
                      {p.entreprise && (
                        <span className="text-muted-foreground ml-2 text-xs">{p.entreprise}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{p.type?.replace(/_/g, " ")}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Compagnies */}
          {results?.compagnies && results.compagnies.length > 0 && (
            <>
              {groupIndex++ > 0 && <CommandSeparator />}
              <CommandGroup heading="Compagnies">
                {results.compagnies.map((c) => (
                  <CommandItem key={c.id} value={`compagnie-${c.id}`} onSelect={() => navigate(`/compagnies/${c.id}`)}>
                    <Briefcase className="h-4 w-4 text-amber-500" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{c.nom}</span>
                      {c.nbContratsActifs != null && c.nbContratsActifs > 0 && (
                        <span className="text-muted-foreground ml-2 text-xs">{c.nbContratsActifs} contrat{c.nbContratsActifs > 1 ? "s" : ""}</span>
                      )}
                    </div>
                    {c.type && (
                      <span className="text-xs text-muted-foreground capitalize">{c.type}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Documents */}
          {results?.documents && results.documents.length > 0 && (
            <>
              {groupIndex++ > 0 && <CommandSeparator />}
              <CommandGroup heading="Documents">
                {results.documents.map((d) => (
                  <CommandItem key={d.id} value={`document-${d.id}`} onSelect={() => navigate(`/clients/${d.clientId}`)}>
                    <FolderOpen className="h-4 w-4 text-teal-500" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{d.nomAffiche}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{d.client.raisonSociale}</span>
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{d.categorie}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Emails */}
          {results?.emails && results.emails.length > 0 && (
            <>
              {groupIndex++ > 0 && <CommandSeparator />}
              <CommandGroup heading="Emails">
                {results.emails.map((e) => (
                  <CommandItem key={e.id} value={`email-${e.id}`} onSelect={() => navigate(e.clientId ? `/clients/${e.clientId}` : "/emails")}>
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
