import { prisma } from "@/lib/prisma";
import { TYPES_PRODUITS } from "@/lib/constants";

// ── Types ──

export type TypeSignal =
  | "produit_mentionne"
  | "sentiment_positif"
  | "sentiment_negatif"
  | "objection"
  | "besoin"
  | "deal_update"
  | "urgence_haute";

export type SignalCandidate = {
  typeSignal: TypeSignal;
  valeur: string;
  details?: string;
};

type AnalysisInput = {
  produitsMentionnes?: string[] | null;
  sentiment?: string | null;
  urgence?: string | null;
  notes?: string | null;
  actions?: Array<{ type: string; titre: string; priorite?: string; details?: string }>;
  dealUpdate?: { etapeSuggeree?: string } | null;
  type?: string | null;
};

// ── Keywords objections (multi-mots prioritaires) ──

const OBJECTION_KEYWORDS: Record<string, string[]> = {
  prix: ["trop cher", "budget", "cout", "tarif", "moins cher", "prix eleve", "trop onereux"],
  timing: ["pas le moment", "plus tard", "attendre", "reporter", "pas maintenant", "pas presse"],
  concurrent: ["concurrent", "autre courtier", "deja couvert", "courtier actuel", "deja assure"],
};

const PRODUIT_KEYS = Object.keys(TYPES_PRODUITS) as string[];

// ── Extraction deterministe ──

/**
 * Extrait des signaux commerciaux depuis les donnees d'analyse IA.
 * Deterministe, pas d'appel IA supplementaire.
 */
export function extraireSignauxCommerciaux(input: AnalysisInput): SignalCandidate[] {
  const signals: SignalCandidate[] = [];

  // 1. Produits mentionnes
  if (input.produitsMentionnes?.length) {
    for (const produit of input.produitsMentionnes) {
      const normalized = produit.toUpperCase().replace(/[^A-Z_]/g, "");
      if (PRODUIT_KEYS.includes(normalized)) {
        signals.push({
          typeSignal: "produit_mentionne",
          valeur: normalized,
          details: `Produit mentionne dans l'email`,
        });
      }
    }
  }

  // 2. Sentiment
  if (input.sentiment === "positif") {
    signals.push({
      typeSignal: "sentiment_positif",
      valeur: "positif",
      details: "Sentiment positif detecte dans l'email",
    });
  } else if (input.sentiment === "negatif") {
    signals.push({
      typeSignal: "sentiment_negatif",
      valeur: "negatif",
      details: "Sentiment negatif detecte dans l'email",
    });
  }

  // 3. Urgence haute
  if (input.urgence === "haute") {
    signals.push({
      typeSignal: "urgence_haute",
      valeur: "haute",
      details: "Email marque comme urgent",
    });
  }

  // 4. Deal update
  if (input.dealUpdate?.etapeSuggeree) {
    signals.push({
      typeSignal: "deal_update",
      valeur: input.dealUpdate.etapeSuggeree,
      details: "Suggestion de changement d'etape pipeline",
    });
  }

  // 5. Objections (scan notes + actions)
  const textToScan = buildTextToScan(input.notes, input.actions);
  if (textToScan) {
    const lower = textToScan.toLowerCase();
    for (const [objType, keywords] of Object.entries(OBJECTION_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        signals.push({
          typeSignal: "objection",
          valeur: objType,
          details: `Objection detectee: ${objType}`,
        });
      }
    }
  }

  // 6. Besoins (action type relance/deal + mention produit)
  if (input.actions?.length) {
    for (const action of input.actions) {
      const actionText = (action.titre + " " + (action.details || "")).toLowerCase();
      for (const prodKey of PRODUIT_KEYS) {
        const label = TYPES_PRODUITS[prodKey as keyof typeof TYPES_PRODUITS]?.label?.toLowerCase() || "";
        if (actionText.includes(prodKey.toLowerCase()) || (label && actionText.includes(label))) {
          // Avoid duplicate if already in produitsMentionnes
          if (!signals.some((s) => s.typeSignal === "besoin" && s.valeur === prodKey)) {
            signals.push({
              typeSignal: "besoin",
              valeur: prodKey,
              details: `Besoin identifie via action: ${action.titre.slice(0, 100)}`,
            });
          }
        }
      }
    }
  }

  return signals;
}

function buildTextToScan(
  notes: string | null | undefined,
  actions?: Array<{ type: string; titre: string; priorite?: string; details?: string }>,
): string {
  const parts: string[] = [];
  if (notes) parts.push(notes);
  if (actions?.length) {
    for (const a of actions) {
      parts.push(a.titre);
      if (a.details) parts.push(a.details);
    }
  }
  return parts.join(" ");
}

// ── Mise a jour memoire commerciale ──

/**
 * Insere les signaux en base et recalcule les 7 champs caches sur Client.
 * Non-bloquant (appeler dans try/catch).
 */
export async function mettreAJourMemoireCommerciale(
  clientId: string,
  emailId: string,
  signals: SignalCandidate[],
): Promise<void> {
  if (signals.length === 0) return;

  // 1. Inserer les signaux
  await prisma.signalCommercial.createMany({
    data: signals.map((s) => ({
      clientId,
      emailId,
      typeSignal: s.typeSignal,
      valeur: s.valeur,
      details: s.details?.slice(0, 200) || null,
      source: "email_analysis",
    })),
  });

  // 2. Requeter TOUS les signaux du client pour recalculer les caches
  const allSignals = await prisma.signalCommercial.findMany({
    where: { clientId },
    orderBy: { dateSignal: "desc" },
  });

  // 3. Calculer les 7 champs caches
  const produitsDiscutes = uniqueValues(allSignals, "produit_mentionne");
  const objectionsConnues = uniqueValues(allSignals, "objection");
  const besoinsIdentifies = uniqueValues(allSignals, "besoin");
  const nbSignaux = allSignals.length;
  const dernierSignal = allSignals[0] || null;

  // Temperature commerciale : score pondere sur 30 jours
  const temperatureCommerciale = calculerTemperature(allSignals);

  // 4. Update Client
  await prisma.client.update({
    where: { id: clientId },
    data: {
      temperatureCommerciale,
      produitsDiscutes: produitsDiscutes.length > 0 ? JSON.stringify(produitsDiscutes) : null,
      objectionsConnues: objectionsConnues.length > 0 ? JSON.stringify(objectionsConnues) : null,
      besoinsIdentifies: besoinsIdentifies.length > 0 ? JSON.stringify(besoinsIdentifies) : null,
      dernierSignalDate: dernierSignal?.dateSignal || null,
      dernierSignalResume: dernierSignal
        ? `${dernierSignal.typeSignal}: ${dernierSignal.valeur}${dernierSignal.details ? " — " + dernierSignal.details.slice(0, 150) : ""}`
            .slice(0, 200)
        : null,
      nbSignaux,
    },
  });
}

// ── Helpers ──

function uniqueValues(
  signals: Array<{ typeSignal: string; valeur: string }>,
  typeSignal: string,
): string[] {
  const values = new Set<string>();
  for (const s of signals) {
    if (s.typeSignal === typeSignal) values.add(s.valeur);
  }
  return Array.from(values);
}

/**
 * Score pondere sur les 30 derniers jours :
 * +3 urgence_haute, +2 sentiment_positif, +2 besoin, +1 produit_mentionne
 * -2 sentiment_negatif, -1 objection
 * Resultat : "chaud" (>=4) | "tiede" (>=1) | "froid" (<1)
 */
function calculerTemperature(
  signals: Array<{ typeSignal: string; dateSignal: Date }>,
): string {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = signals.filter((s) => new Date(s.dateSignal).getTime() >= thirtyDaysAgo);

  const POIDS: Record<string, number> = {
    urgence_haute: 3,
    sentiment_positif: 2,
    besoin: 2,
    produit_mentionne: 1,
    deal_update: 1,
    sentiment_negatif: -2,
    objection: -1,
  };

  let score = 0;
  for (const s of recent) {
    score += POIDS[s.typeSignal] ?? 0;
  }

  if (score >= 4) return "chaud";
  if (score >= 1) return "tiede";
  return "froid";
}
