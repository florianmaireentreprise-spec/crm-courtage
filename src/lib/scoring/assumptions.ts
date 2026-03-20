import { prisma } from "@/lib/prisma";
import type { PotentielBaseAssumption, ClientPotentielOverride } from "@prisma/client";

// ── Default assumptions (seed values and fallback) ──
// These match the original hardcoded formulas in calculerPotentielCA:
//   SANTE_COLLECTIVE: nbSal * 100 * 12 * 0.07   → estimatedPremium=1200/sal/year
//   PREVOYANCE_COLLECTIVE: nbSal * 450 * 0.10    → estimatedPremium=450/sal/year
//   RCP_PRO: (800 + floor(nbSal/10)*200) * 0.15  → base=800, perTenEmpInc=200
//   PREVOYANCE_MADELIN: 2000 * 0.20              → flat=2000
//   SANTE_MADELIN: 2400 * 0.12                   → flat=2400
//   PER: 5000 * 0.03                             → flat=5000, upfront

export const DEFAULT_ASSUMPTIONS: Omit<PotentielBaseAssumption, "id" | "updatedAt">[] = [
  {
    typeProduit: "SANTE_COLLECTIVE",
    label: "Sante collective",
    estimatedPremium: 1200,
    isPerEmployee: true,
    perTenEmployeeIncrement: 0,
    commissionRate: 0.07,
    isRecurring: true,
    enabled: true,
  },
  {
    typeProduit: "PREVOYANCE_COLLECTIVE",
    label: "Prevoyance collective",
    estimatedPremium: 450,
    isPerEmployee: true,
    perTenEmployeeIncrement: 0,
    commissionRate: 0.10,
    isRecurring: true,
    enabled: true,
  },
  {
    typeProduit: "RCP_PRO",
    label: "RCP Professionnelle",
    estimatedPremium: 800,
    isPerEmployee: false,
    perTenEmployeeIncrement: 200,
    commissionRate: 0.15,
    isRecurring: true,
    enabled: true,
  },
  {
    typeProduit: "PREVOYANCE_MADELIN",
    label: "Prevoyance Madelin",
    estimatedPremium: 2000,
    isPerEmployee: false,
    perTenEmployeeIncrement: 0,
    commissionRate: 0.20,
    isRecurring: true,
    enabled: true,
  },
  {
    typeProduit: "SANTE_MADELIN",
    label: "Sante Madelin (TNS)",
    estimatedPremium: 2400,
    isPerEmployee: false,
    perTenEmployeeIncrement: 0,
    commissionRate: 0.12,
    isRecurring: true,
    enabled: true,
  },
  {
    typeProduit: "PER",
    label: "PER / Retraite",
    estimatedPremium: 5000,
    isPerEmployee: false,
    perTenEmployeeIncrement: 0,
    commissionRate: 0.03,
    isRecurring: false,
    enabled: true,
  },
];

/**
 * Fetch base assumptions from DB (auto-seeds if empty).
 * Returns all assumptions sorted by typeProduit.
 */
export async function getBaseAssumptions(): Promise<PotentielBaseAssumption[]> {
  let assumptions = await prisma.potentielBaseAssumption.findMany({
    orderBy: { typeProduit: "asc" },
  });

  // Auto-seed on first access
  if (assumptions.length === 0) {
    await prisma.potentielBaseAssumption.createMany({
      data: DEFAULT_ASSUMPTIONS,
    });
    assumptions = await prisma.potentielBaseAssumption.findMany({
      orderBy: { typeProduit: "asc" },
    });
  }

  return assumptions;
}

/**
 * Fetch client-level overrides for a specific client.
 */
export async function getClientOverrides(clientId: string): Promise<ClientPotentielOverride[]> {
  return prisma.clientPotentielOverride.findMany({
    where: { clientId },
  });
}

/**
 * Fetch overrides for multiple clients at once (batch, for reseau page).
 */
export async function getClientOverridesBatch(clientIds: string[]): Promise<ClientPotentielOverride[]> {
  if (clientIds.length === 0) return [];
  return prisma.clientPotentielOverride.findMany({
    where: { clientId: { in: clientIds } },
  });
}
