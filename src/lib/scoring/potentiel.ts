import type { Client, Contrat, PotentielBaseAssumption, ClientPotentielOverride } from "@prisma/client";
import { DEFAULT_ASSUMPTIONS } from "./assumptions";

// ── Types ──

export type PotentielProduitDetail = {
  typeProduit: string;
  label: string;
  recurring: number;
  upfront: number;
  total: number;
  basis: string;
  source: "base" | "override"; // transparency: was this derived or overridden?
};

export type PotentielCADetailResult = {
  total: number;
  recurringTotal: number;
  upfrontTotal: number;
  produits: PotentielProduitDetail[];
};

// ── Assumption type used by computation (Pick from model) ──

type AssumptionInput = Pick<
  PotentielBaseAssumption,
  "typeProduit" | "label" | "estimatedPremium" | "isPerEmployee" | "perTenEmployeeIncrement" | "recurringCommissionRate" | "upfrontCommissionRate" | "enabled"
>;

// ── Core computation ──

/**
 * Compute the gross premium from an assumption row + client data.
 * Pure function — no DB access.
 */
function computeGrossPremium(
  assumption: Pick<PotentielBaseAssumption, "estimatedPremium" | "isPerEmployee" | "perTenEmployeeIncrement">,
  nbSal: number
): number {
  let premium = assumption.estimatedPremium;
  if (assumption.isPerEmployee) {
    premium = assumption.estimatedPremium * nbSal;
  }
  premium += Math.floor(nbSal / 10) * assumption.perTenEmployeeIncrement;
  return premium;
}

/**
 * Build a human-readable basis string for a derived estimate.
 */
function buildBasis(
  assumption: Pick<PotentielBaseAssumption, "estimatedPremium" | "isPerEmployee" | "perTenEmployeeIncrement" | "recurringCommissionRate" | "upfrontCommissionRate">,
  nbSal: number
): string {
  const rates: string[] = [];
  if (assumption.recurringCommissionRate != null) {
    rates.push(`${(assumption.recurringCommissionRate * 100).toFixed(0)}% recurrent`);
  }
  if (assumption.upfrontCommissionRate != null) {
    rates.push(`${(assumption.upfrontCommissionRate * 100).toFixed(0)}% ponctuel`);
  }
  const rateStr = rates.join(" + ");

  if (assumption.isPerEmployee) {
    return `${nbSal} sal. x ${assumption.estimatedPremium} EUR/an x ${rateStr}`;
  }
  if (assumption.perTenEmployeeIncrement > 0) {
    const premium = assumption.estimatedPremium + Math.floor(nbSal / 10) * assumption.perTenEmployeeIncrement;
    return `Prime estimee ${premium} EUR (base ${assumption.estimatedPremium} + ${Math.floor(nbSal / 10)}x${assumption.perTenEmployeeIncrement}) x ${rateStr}`;
  }
  return `Prime estimee ${assumption.estimatedPremium} EUR x ${rateStr}`;
}

/**
 * Full potentiel CA detail breakdown with support for:
 * 1. Global base assumptions (from DB or defaults)
 * 2. Client data (nbSalaries, active contracts)
 * 3. Client-level manual overrides
 *
 * Each assumption can now express both recurring and upfront commission rates.
 *
 * Effective-value hierarchy:
 *   override if present → otherwise derived from assumptions + client data
 */
export function calculerPotentielCADetail(
  client: Pick<Client, "nbSalaries">,
  contratsExistants: Pick<Contrat, "typeProduit" | "statut">[],
  assumptions?: AssumptionInput[],
  overrides?: Pick<ClientPotentielOverride, "typeProduit" | "recurringOverride" | "upfrontOverride">[]
): PotentielCADetailResult {
  const nbSal = client.nbSalaries || 1;
  const activeTypes = contratsExistants
    .filter((c) => c.statut === "actif")
    .map((c) => c.typeProduit);

  const effectiveAssumptions = assumptions ?? DEFAULT_ASSUMPTIONS;
  const effectiveOverrides = overrides ?? [];

  const produits: PotentielProduitDetail[] = [];

  for (const assumption of effectiveAssumptions) {
    if (!assumption.enabled) continue;
    if (activeTypes.includes(assumption.typeProduit)) continue;

    // Check for client override
    const override = effectiveOverrides.find((o) => o.typeProduit === assumption.typeProduit);
    const hasOverride = override && (override.recurringOverride !== null || override.upfrontOverride !== null);

    if (hasOverride) {
      const recurring = override.recurringOverride ?? 0;
      const upfront = override.upfrontOverride ?? 0;
      produits.push({
        typeProduit: assumption.typeProduit,
        label: assumption.label,
        recurring,
        upfront,
        total: recurring + upfront,
        basis: "Valeur manuelle (surcharge client)",
        source: "override",
      });
    } else {
      // Derive from base assumptions + client data
      const grossPremium = computeGrossPremium(assumption, nbSal);
      const recurring = assumption.recurringCommissionRate != null
        ? Math.round(grossPremium * assumption.recurringCommissionRate)
        : 0;
      const upfront = assumption.upfrontCommissionRate != null
        ? Math.round(grossPremium * assumption.upfrontCommissionRate)
        : 0;
      produits.push({
        typeProduit: assumption.typeProduit,
        label: assumption.label,
        recurring,
        upfront,
        total: recurring + upfront,
        basis: buildBasis(assumption, nbSal),
        source: "base",
      });
    }
  }

  const recurringTotal = produits.reduce((sum, p) => sum + p.recurring, 0);
  const upfrontTotal = produits.reduce((sum, p) => sum + p.upfront, 0);
  const total = recurringTotal + upfrontTotal;

  return { total, recurringTotal, upfrontTotal, produits };
}

// ── Backward-compatible single-number function ──
// Used by persist.ts for batch scoring.

export function calculerPotentielCA(
  client: Pick<Client, "nbSalaries">,
  contratsExistants: Pick<Contrat, "typeProduit" | "statut">[],
  assumptions?: AssumptionInput[]
): number {
  const detail = calculerPotentielCADetail(client, contratsExistants, assumptions);
  return detail.total;
}

// ── Missing products helper (unchanged) ──

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
