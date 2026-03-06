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
