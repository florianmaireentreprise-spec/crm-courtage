import type { Contrat } from "@prisma/client";
import { persistOpportunites, type OpportuniteCandidate } from "@/lib/opportunities/detection";

export type Opportunite = {
  id: string;
  titre: string;
  message: string;
  produitCible: string | null;
  priorite: "haute" | "normale";
  clientId: string;
  clientNom: string;
};

type RegleOpportunite = {
  id: string;
  condition: (contrats: Pick<Contrat, "typeProduit" | "statut" | "dateEcheance">[]) => boolean;
  titre: string;
  message: string;
  produitCible: string | null;
  priorite: "haute" | "normale";
};

const REGLES_OPPORTUNITES: RegleOpportunite[] = [
  {
    id: "SANTE_SANS_PREVOYANCE",
    condition: (contrats) =>
      contrats.some((c) => c.typeProduit === "SANTE_COLLECTIVE" && c.statut === "actif") &&
      !contrats.some((c) => c.typeProduit === "PREVOYANCE_COLLECTIVE" && c.statut === "actif"),
    titre: "Prevoyance collective manquante",
    message: "Sante collective sans prevoyance collective. Obligatoire pour les cadres.",
    produitCible: "PREVOYANCE_COLLECTIVE",
    priorite: "haute",
  },
  {
    id: "DIRIGEANT_SANS_PER",
    condition: (contrats) =>
      !contrats.some(
        (c) => ["PER", "ASSURANCE_VIE"].includes(c.typeProduit) && c.statut === "actif"
      ),
    titre: "Pas d'epargne retraite dirigeant",
    message: "Ni PER ni AV. Fort argument fiscal (deductibilite).",
    produitCible: "PER",
    priorite: "normale",
  },
  {
    id: "DIRIGEANT_SANS_PREVOYANCE_MADELIN",
    condition: (contrats) =>
      !contrats.some((c) => c.typeProduit === "PREVOYANCE_MADELIN" && c.statut === "actif"),
    titre: "Prevoyance Madelin manquante",
    message: "Aucune couverture arret de travail / invalidite dirigeant. Risque majeur.",
    produitCible: "PREVOYANCE_MADELIN",
    priorite: "haute",
  },
  {
    id: "PAS_DE_RCP",
    condition: (contrats) =>
      !contrats.some((c) => c.typeProduit === "RCP_PRO" && c.statut === "actif"),
    titre: "RCP Pro manquante",
    message: "Pas de RC Professionnelle. Obligatoire pour beaucoup de professions.",
    produitCible: "RCP_PRO",
    priorite: "haute",
  },
  {
    id: "CONTRAT_ECHEANCE_SWITCH",
    condition: (contrats) =>
      contrats.some((c) => {
        if (!c.dateEcheance || c.statut !== "actif") return false;
        const jours = (new Date(c.dateEcheance).getTime() - Date.now()) / 86400000;
        return jours > 0 && jours < 120;
      }),
    titre: "Contrat renouvelable bientot",
    message: "Echeance dans moins de 4 mois. Opportunite de renegociation ou switch.",
    produitCible: null,
    priorite: "normale",
  },
];

export function detecterOpportunites(
  clients: {
    id: string;
    raisonSociale: string;
    statut: string;
    contrats: Pick<Contrat, "typeProduit" | "statut" | "dateEcheance">[];
  }[]
): Opportunite[] {
  const opportunites: Opportunite[] = [];

  for (const client of clients) {
    if (client.statut === "ancien_client") continue;

    for (const regle of REGLES_OPPORTUNITES) {
      if (regle.condition(client.contrats)) {
        opportunites.push({
          id: `${client.id}-${regle.id}`,
          titre: regle.titre,
          message: regle.message,
          produitCible: regle.produitCible,
          priorite: regle.priorite,
          clientId: client.id,
          clientNom: client.raisonSociale,
        });
      }
    }
  }

  // Priorite haute en premier
  return opportunites.sort((a, b) =>
    a.priorite === "haute" && b.priorite !== "haute" ? -1 : b.priorite === "haute" && a.priorite !== "haute" ? 1 : 0
  );
}

// ── Persistance cross-sell ──

/**
 * Evalue les regles cross-sell pour un client et persiste les opportunites detectees.
 * Idempotent grace a dedupeKey + cooldown 30j dans persistOpportunites().
 * Non-bloquant (appeler dans try/catch).
 */
export async function persisterOpportunitesCrossSell(
  clientId: string,
  contrats: Pick<Contrat, "typeProduit" | "statut" | "dateEcheance">[],
): Promise<number> {
  const candidates: OpportuniteCandidate[] = [];

  for (const regle of REGLES_OPPORTUNITES) {
    if (regle.condition(contrats)) {
      candidates.push({
        sourceType: "cross_sell",
        typeProduit: regle.produitCible,
        titre: regle.titre,
        description: regle.message,
        confiance: regle.priorite === "haute" ? "haute" : "moyenne",
        temperature: null,
        origineSignal: regle.id === "CONTRAT_ECHEANCE_SWITCH" ? "echeance_proche" : "couverture_manquante",
        dedupeKey: `${clientId}:${regle.produitCible || "_general"}:cross_sell`,
        metadata: { regleId: regle.id },
      });
    }
  }

  if (candidates.length === 0) return 0;

  await persistOpportunites(clientId, null, candidates);
  return candidates.length;
}
