import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { TRANCHES_EFFECTIFS, NATURES_JURIDIQUES } from "@/lib/constants";

/**
 * Proxy search to recherche-entreprises.api.gouv.fr
 * Supports search by SIREN, SIRET, or company name.
 * Returns normalized results ready for form prefill.
 */

type SireneResult = {
  siren: string;
  siret: string;
  nom_complet: string;
  nom_raison_sociale: string;
  nature_juridique: string;
  activite_principale: string;
  tranche_effectif_salarie: string;
  section_activite_principale: string;
  date_creation: string;
  siege: {
    siret: string;
    adresse: string;
    numero_voie: string;
    type_voie: string;
    libelle_voie: string;
    code_postal: string;
    libelle_commune: string;
  };
};

type NormalizedCompany = {
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

function normalizeResult(r: SireneResult): NormalizedCompany {
  const tranche = TRANCHES_EFFECTIFS[r.tranche_effectif_salarie];
  const formeJuridique = NATURES_JURIDIQUES[r.nature_juridique] ?? null;

  // Build address from parts (cleaner than the full adresse field)
  const adresseParts = [
    r.siege?.numero_voie,
    r.siege?.type_voie,
    r.siege?.libelle_voie,
  ].filter(Boolean).join(" ");

  return {
    siren: r.siren,
    siret: r.siege?.siret || r.siren,
    raisonSociale: r.nom_raison_sociale || r.nom_complet,
    formeJuridique,
    codeNAF: r.activite_principale || null,
    secteurActivite: null, // Will be enriched from NAF label on the client side if needed
    trancheEffectifs: tranche?.label ?? null,
    nbSalaries: tranche ? Math.round((tranche.min + tranche.max) / 2) : null,
    adresse: adresseParts || null,
    codePostal: r.siege?.code_postal || null,
    ville: r.siege?.libelle_commune || null,
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const url = new URL("https://recherche-entreprises.api.gouv.fr/search");
    url.searchParams.set("q", q);
    url.searchParams.set("page", "1");
    url.searchParams.set("per_page", "10");
    // Only active companies
    url.searchParams.set("etat_administratif", "A");

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error("SIRENE API error:", response.status, response.statusText);
      return NextResponse.json({ results: [], error: "API indisponible" });
    }

    const data = await response.json();
    const results: NormalizedCompany[] = (data.results || []).map(normalizeResult);

    return NextResponse.json({
      results,
      total: data.total_results ?? 0,
    });
  } catch (error) {
    console.error("SIRENE search error:", error);
    return NextResponse.json({ results: [], error: "Erreur de recherche" });
  }
}
