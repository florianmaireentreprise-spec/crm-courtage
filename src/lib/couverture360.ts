import type { Contrat } from "@prisma/client";

export const COUVERTURE_360 = [
  { id: "SANTE_COLLECTIVE", label: "Sante collective", obligatoire: true },
  { id: "PREVOYANCE_COLLECTIVE", label: "Prevoyance collective", obligatoire: true },
  { id: "PREVOYANCE_MADELIN", label: "Prevoyance Madelin dirigeant", obligatoire: false },
  { id: "SANTE_MADELIN", label: "Sante Madelin dirigeant", obligatoire: false },
  { id: "RCP_PRO", label: "RCP Professionnelle", obligatoire: true },
  { id: "PER", label: "PER / Retraite", obligatoire: false },
] as const;

export function calculerCouverture360(
  contrats: Pick<Contrat, "typeProduit" | "statut">[]
): { score: number; couverts: string[]; manquants: typeof COUVERTURE_360[number][] } {
  const typesActifs = contrats
    .filter((c) => c.statut === "actif")
    .map((c) => c.typeProduit);

  const couverts: string[] = [];
  const manquants: typeof COUVERTURE_360[number][] = [];

  for (const item of COUVERTURE_360) {
    if (typesActifs.includes(item.id)) {
      couverts.push(item.id);
    } else {
      manquants.push(item);
    }
  }

  const score = Math.round((couverts.length / COUVERTURE_360.length) * 100);
  return { score, couverts, manquants };
}

export function getCouvertureColor(score: number): string {
  if (score >= 80) return "#10B981";
  if (score >= 50) return "#F59E0B";
  return "#EF4444";
}
