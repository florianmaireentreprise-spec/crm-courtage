import { prisma } from "@/lib/prisma";
import type { PotentielBaseAssumption, ClientPotentielOverride } from "@prisma/client";

// ── Default assumptions (seed values and fallback) ──
// Each product can now express both a recurring commission rate (gestion)
// and an upfront commission rate (apport). Either can be null if not applicable.
//
// Examples:
//   SANTE_COLLECTIVE: recurring 7%, no upfront
//   PER: upfront 3%, no recurring
//   A product could have both if the business model warrants it.

export const DEFAULT_ASSUMPTIONS: Omit<PotentielBaseAssumption, "id" | "updatedAt">[] = [
  {
    typeProduit: "SANTE_COLLECTIVE",
    label: "Sante collective",
    estimatedPremium: 1200,
    isPerEmployee: true,
    perTenEmployeeIncrement: 0,
    recurringCommissionRate: 0.07,
    upfrontCommissionRate: null,
    commissionRate: null, // deprecated
    isRecurring: null, // deprecated
    enabled: true,
  },
  {
    typeProduit: "PREVOYANCE_COLLECTIVE",
    label: "Prevoyance collective",
    estimatedPremium: 450,
    isPerEmployee: true,
    perTenEmployeeIncrement: 0,
    recurringCommissionRate: 0.10,
    upfrontCommissionRate: null,
    commissionRate: null,
    isRecurring: null,
    enabled: true,
  },
  {
    typeProduit: "RCP_PRO",
    label: "RCP Professionnelle",
    estimatedPremium: 800,
    isPerEmployee: false,
    perTenEmployeeIncrement: 200,
    recurringCommissionRate: 0.15,
    upfrontCommissionRate: null,
    commissionRate: null,
    isRecurring: null,
    enabled: true,
  },
  {
    typeProduit: "PREVOYANCE_MADELIN",
    label: "Prevoyance Madelin",
    estimatedPremium: 2000,
    isPerEmployee: false,
    perTenEmployeeIncrement: 0,
    recurringCommissionRate: 0.20,
    upfrontCommissionRate: null,
    commissionRate: null,
    isRecurring: null,
    enabled: true,
  },
  {
    typeProduit: "SANTE_MADELIN",
    label: "Sante Madelin (TNS)",
    estimatedPremium: 2400,
    isPerEmployee: false,
    perTenEmployeeIncrement: 0,
    recurringCommissionRate: 0.12,
    upfrontCommissionRate: null,
    commissionRate: null,
    isRecurring: null,
    enabled: true,
  },
  {
    typeProduit: "PER",
    label: "PER / Retraite",
    estimatedPremium: 5000,
    isPerEmployee: false,
    perTenEmployeeIncrement: 0,
    recurringCommissionRate: null,
    upfrontCommissionRate: 0.03,
    commissionRate: null,
    isRecurring: null,
    enabled: true,
  },
];

/**
 * Fetch base assumptions from DB (auto-seeds if empty).
 * Also auto-migrates from old commissionRate+isRecurring to new dual rates if needed.
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

  // Auto-migrate from old single commissionRate + isRecurring to new dual rates.
  // This runs once per row that still has old data and no new rates.
  for (const a of assumptions) {
    const raw = a as PotentielBaseAssumption & { commissionRate?: number | null; isRecurring?: boolean | null };
    if (raw.commissionRate != null && a.recurringCommissionRate == null && a.upfrontCommissionRate == null) {
      const update: { recurringCommissionRate?: number; upfrontCommissionRate?: number } = {};
      if (raw.isRecurring === false) {
        update.upfrontCommissionRate = raw.commissionRate;
      } else {
        update.recurringCommissionRate = raw.commissionRate;
      }
      await prisma.potentielBaseAssumption.update({
        where: { id: a.id },
        data: update,
      });
    }
  }

  // Re-fetch after possible migration
  return prisma.potentielBaseAssumption.findMany({
    orderBy: { typeProduit: "asc" },
  });
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
