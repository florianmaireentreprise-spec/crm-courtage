import type { Client, Contrat } from "@prisma/client";

export function calculerPotentielCA(
  client: Pick<Client, "nbSalaries">,
  contratsExistants: Pick<Contrat, "typeProduit" | "statut">[]
): number {
  const nbSal = client.nbSalaries || 1;
  const types = contratsExistants
    .filter((c) => c.statut === "actif")
    .map((c) => c.typeProduit);
  let potentiel = 0;

  // Sante collective: nbSal * 100€/mois * 12 * 7%
  if (!types.includes("SANTE_COLLECTIVE") && nbSal >= 1)
    potentiel += nbSal * 100 * 12 * 0.07;

  // Prevoyance collective: nbSal * 450€ * 10%
  if (!types.includes("PREVOYANCE_COLLECTIVE") && nbSal >= 1)
    potentiel += nbSal * 450 * 0.10;

  // RCP Pro
  if (!types.includes("RCP_PRO"))
    potentiel += (800 + Math.floor(nbSal / 10) * 200) * 0.15;

  // Prevoyance Madelin
  if (!types.includes("PREVOYANCE_MADELIN")) potentiel += 2000 * 0.20;

  // Sante Madelin
  if (!types.includes("SANTE_MADELIN")) potentiel += 2400 * 0.12;

  // PER / Retraite
  if (!types.includes("PER")) potentiel += 5000 * 0.03;

  return Math.round(potentiel);
}

export function getProduitsManquants(
  contratsExistants: Pick<Contrat, "typeProduit" | "statut">[]
): string[] {
  const TOUS_PRODUITS = [
    "SANTE_COLLECTIVE",
    "PREVOYANCE_COLLECTIVE",
    "RCP_PRO",
    "PREVOYANCE_MADELIN",
    "SANTE_MADELIN",
    "PER",
  ];
  const types = contratsExistants
    .filter((c) => c.statut === "actif")
    .map((c) => c.typeProduit);
  return TOUS_PRODUITS.filter((p) => !types.includes(p));
}

// ── Potentiel CA detail breakdown (Parts B/D) ──
// Returns per-product breakdown with recurring vs upfront split.
// Business logic:
//   - Recurring = annual commission on ongoing premiums (sante, prevoyance, RCP, Madelin)
//   - Upfront = one-time apport commission (PER placement)
// All formulas are identical to calculerPotentielCA — this just decomposes the output.

export type PotentielProduitDetail = {
  typeProduit: string;
  label: string;
  recurring: number;
  upfront: number;
  total: number;
  basis: string;
};

export type PotentielCADetailResult = {
  total: number;
  recurringTotal: number;
  upfrontTotal: number;
  produits: PotentielProduitDetail[];
};

const PRODUCT_LABELS: Record<string, string> = {
  SANTE_COLLECTIVE: "Sante collective",
  PREVOYANCE_COLLECTIVE: "Prevoyance collective",
  RCP_PRO: "RCP Professionnelle",
  PREVOYANCE_MADELIN: "Prevoyance Madelin",
  SANTE_MADELIN: "Sante Madelin (TNS)",
  PER: "PER / Retraite",
};

export function calculerPotentielCADetail(
  client: Pick<Client, "nbSalaries">,
  contratsExistants: Pick<Contrat, "typeProduit" | "statut">[]
): PotentielCADetailResult {
  const nbSal = client.nbSalaries || 1;
  const types = contratsExistants
    .filter((c) => c.statut === "actif")
    .map((c) => c.typeProduit);
  const produits: PotentielProduitDetail[] = [];

  // Sante collective: recurring — nbSal * 100EUR/mois * 12 * 7% apport
  if (!types.includes("SANTE_COLLECTIVE") && nbSal >= 1) {
    const amount = Math.round(nbSal * 100 * 12 * 0.07);
    produits.push({
      typeProduit: "SANTE_COLLECTIVE",
      label: PRODUCT_LABELS.SANTE_COLLECTIVE,
      recurring: amount,
      upfront: 0,
      total: amount,
      basis: `${nbSal} sal. x 100 EUR/mois x 12 x 7% commission apport`,
    });
  }

  // Prevoyance collective: recurring — nbSal * 450EUR * 10% apport
  if (!types.includes("PREVOYANCE_COLLECTIVE") && nbSal >= 1) {
    const amount = Math.round(nbSal * 450 * 0.10);
    produits.push({
      typeProduit: "PREVOYANCE_COLLECTIVE",
      label: PRODUCT_LABELS.PREVOYANCE_COLLECTIVE,
      recurring: amount,
      upfront: 0,
      total: amount,
      basis: `${nbSal} sal. x 450 EUR/an x 10% commission apport`,
    });
  }

  // RCP Pro: recurring — (800 + nbSal/10 * 200) * 15%
  if (!types.includes("RCP_PRO")) {
    const prime = 800 + Math.floor(nbSal / 10) * 200;
    const amount = Math.round(prime * 0.15);
    produits.push({
      typeProduit: "RCP_PRO",
      label: PRODUCT_LABELS.RCP_PRO,
      recurring: amount,
      upfront: 0,
      total: amount,
      basis: `Prime estimee ${prime} EUR x 15% commission apport`,
    });
  }

  // Prevoyance Madelin: recurring — 2000EUR * 20%
  if (!types.includes("PREVOYANCE_MADELIN")) {
    const amount = Math.round(2000 * 0.20);
    produits.push({
      typeProduit: "PREVOYANCE_MADELIN",
      label: PRODUCT_LABELS.PREVOYANCE_MADELIN,
      recurring: amount,
      upfront: 0,
      total: amount,
      basis: "Cotisation estimee 2 000 EUR/an x 20% commission apport",
    });
  }

  // Sante Madelin: recurring — 2400EUR * 12%
  if (!types.includes("SANTE_MADELIN")) {
    const amount = Math.round(2400 * 0.12);
    produits.push({
      typeProduit: "SANTE_MADELIN",
      label: PRODUCT_LABELS.SANTE_MADELIN,
      recurring: amount,
      upfront: 0,
      total: amount,
      basis: "Cotisation estimee 2 400 EUR/an x 12% commission apport",
    });
  }

  // PER: upfront (placement fee) — 5000EUR * 3%
  // PER is primarily an upfront commission on the initial placement,
  // with ongoing gestion fees negligible in the heuristic
  if (!types.includes("PER")) {
    const amount = Math.round(5000 * 0.03);
    produits.push({
      typeProduit: "PER",
      label: PRODUCT_LABELS.PER,
      recurring: 0,
      upfront: amount,
      total: amount,
      basis: "Versement estime 5 000 EUR x 3% commission apport",
    });
  }

  const recurringTotal = produits.reduce((sum, p) => sum + p.recurring, 0);
  const upfrontTotal = produits.reduce((sum, p) => sum + p.upfront, 0);
  const total = recurringTotal + upfrontTotal;

  return { total, recurringTotal, upfrontTotal, produits };
}
