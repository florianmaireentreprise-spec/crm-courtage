import type { Client, Contrat } from "@prisma/client";

const SECTEURS_RCP = [
  "Architecture", "Expert-comptable", "Avocat", "Medecin",
  "Profession de sante", "Conseil", "Immobilier", "BTP",
];

const SOURCE_SCORES: Record<string, number> = {
  "Expert-comptable": 15,
  "Parrainage client": 12,
  "BNI / Reseau affaires": 10,
  "LinkedIn": 8,
  "Site web / SEO": 6,
  "Google Ads": 5,
};

const VILLES_GRAND_EST = [
  "Nancy", "Metz", "Strasbourg", "Colmar", "Mulhouse",
  "Reims", "Troyes", "Epinal",
];

export function calculerScoreProspect(
  client: Pick<Client, "nbSalaries" | "secteurActivite" | "sourceAcquisition" | "ville">,
  contrats: Pick<Contrat, "statut" | "dateEcheance">[]
): number {
  let score = 0;

  // Taille entreprise (0-25 pts)
  if (client.nbSalaries) {
    if (client.nbSalaries >= 50) score += 25;
    else if (client.nbSalaries >= 20) score += 20;
    else if (client.nbSalaries >= 10) score += 15;
    else if (client.nbSalaries >= 5) score += 10;
    else score += 5;
  }

  // Secteur a RCP obligatoire (0-15 pts)
  if (SECTEURS_RCP.includes(client.secteurActivite || "")) score += 15;

  // Moins de contrats = plus d'opportunites (0-20 pts)
  const nbContratsActifs = contrats.filter((c) => c.statut === "actif").length;
  if (nbContratsActifs === 0) score += 20;
  else if (nbContratsActifs <= 2) score += 15;
  else if (nbContratsActifs <= 4) score += 5;

  // Source d'acquisition (0-15 pts)
  score += SOURCE_SCORES[client.sourceAcquisition || ""] || 0;

  // Proximite Grand Est (0-10 pts)
  if (VILLES_GRAND_EST.some((v) => client.ville?.includes(v))) score += 10;

  // Echeance contrat proche = opportunite switch (0-15 pts)
  if (
    contrats.some((c) => {
      if (!c.dateEcheance) return false;
      const jours = (new Date(c.dateEcheance).getTime() - Date.now()) / 86400000;
      return jours > 0 && jours < 120;
    })
  )
    score += 15;

  return Math.min(score, 100);
}

export function getScoreColor(score: number): string {
  if (score >= 61) return "#10B981"; // vert
  if (score >= 31) return "#F59E0B"; // orange
  return "#EF4444"; // rouge
}

export function getScoreLabel(score: number): string {
  if (score >= 61) return "Chaud";
  if (score >= 31) return "Tiede";
  return "Froid";
}
