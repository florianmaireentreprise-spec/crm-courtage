import { prisma } from "@/lib/prisma";
import { TAUX_COMMISSION_DEFAUT } from "@/lib/constants";
import type { Settings } from "@prisma/client";

export type TauxCommissionMap = Record<
  string,
  { apport: number; gestion: number }
>;

/**
 * Recupere les settings (singleton). Cree l'enregistrement avec les valeurs par defaut s'il n'existe pas.
 */
export async function getSettings(): Promise<Settings> {
  return prisma.settings.upsert({
    where: { id: "default" },
    create: {
      tauxCommission: JSON.stringify(TAUX_COMMISSION_DEFAUT),
    },
    update: {},
  });
}

/**
 * Parse les taux de commission depuis les settings DB.
 * Fallback sur les constantes si le parsing echoue.
 */
export function getTauxCommission(settings: Settings): TauxCommissionMap {
  try {
    const parsed = JSON.parse(settings.tauxCommission);
    // Merge avec les defaults pour garantir que tous les produits existent
    return { ...TAUX_COMMISSION_DEFAUT, ...parsed };
  } catch {
    return { ...TAUX_COMMISSION_DEFAUT };
  }
}
