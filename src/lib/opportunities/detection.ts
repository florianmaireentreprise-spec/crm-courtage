import { prisma } from "@/lib/prisma";
import type { SignalCandidate } from "@/lib/scoring/signals";

// ── Types ──

type DetectionContext = {
  clientId: string;
  emailId: string;
  signals: SignalCandidate[];
  emailAnalysis: {
    type?: string | null;
    sentiment?: string | null;
    urgence?: string | null;
    resume?: string | null;
    produitsMentionnes?: string[] | null;
    notes?: string | null;
    actions?: Array<{ type: string; titre: string; details?: string }>;
  };
};

export type OpportuniteCandidate = {
  sourceType: string;
  typeProduit: string | null;
  titre: string;
  description: string | null;
  confiance: "haute" | "moyenne" | "basse";
  temperature: string | null;
  origineSignal: string | null;
  dedupeKey: string;
  metadata?: Record<string, unknown>;
};

// ── Keywords pour detection d'intention ──

const QUOTE_KEYWORDS = [
  "devis", "cotation", "tarif", "proposition", "chiffrage",
  "combien", "prix", "offre", "estimation",
];

const RENEWAL_KEYWORDS = [
  "renouvellement", "echeance", "resiliation", "changement",
  "renegocier", "reviser", "modifier le contrat", "fin de contrat",
];

const NEW_NEED_KEYWORDS = [
  "nouveau besoin", "nous cherchons", "je souhaiterais", "nous aurions besoin",
  "mise en place", "mettre en place", "souscrire",
];

// ── Detection deterministe ──

/**
 * Detecte des opportunites commerciales depuis les signaux et l'analyse email.
 * Deterministe, pas d'appel IA. Non-bloquant (appeler dans try/catch).
 */
export async function detecterOpportunitesDepuisEmail(
  ctx: DetectionContext,
): Promise<void> {
  const candidates: OpportuniteCandidate[] = [];

  // Calcul temperature depuis les signaux frais
  const temperature = ctx.signals.some((s) => s.typeSignal === "urgence_haute")
    ? "chaud"
    : ctx.signals.some((s) => s.typeSignal === "sentiment_positif")
      ? "tiede"
      : null;

  // Rule 1: Product interest from signals (produit_mentionne or besoin)
  const productSignals = ctx.signals.filter(
    (s) => s.typeSignal === "produit_mentionne" || s.typeSignal === "besoin",
  );
  for (const signal of productSignals) {
    candidates.push({
      sourceType: "signal",
      typeProduit: signal.valeur,
      titre: `Interet ${signal.typeSignal === "besoin" ? "besoin" : "produit"} : ${signal.valeur}`,
      description: signal.details || null,
      confiance: signal.typeSignal === "besoin" ? "haute" : "moyenne",
      temperature,
      origineSignal: signal.typeSignal,
      dedupeKey: `${ctx.clientId}:${signal.valeur}:signal`,
    });
  }

  // Rule 2: Quote request (scan resume + notes + actions)
  const textToScan = buildScanText(ctx.emailAnalysis);
  if (textToScan && hasKeywordMatch(textToScan, QUOTE_KEYWORDS)) {
    const produit = ctx.emailAnalysis.produitsMentionnes?.[0] || null;
    candidates.push({
      sourceType: "email_analysis",
      typeProduit: produit,
      titre: `Demande de devis${produit ? " : " + produit : ""}`,
      description: ctx.emailAnalysis.resume?.slice(0, 200) || null,
      confiance: "haute",
      temperature: "chaud",
      origineSignal: "demande_devis",
      dedupeKey: `${ctx.clientId}:${produit || "general"}:devis`,
    });
  }

  // Rule 3: Renewal / coverage discussion
  if (textToScan && hasKeywordMatch(textToScan, RENEWAL_KEYWORDS)) {
    const produit = ctx.emailAnalysis.produitsMentionnes?.[0] || null;
    candidates.push({
      sourceType: "email_analysis",
      typeProduit: produit,
      titre: `Discussion renouvellement${produit ? " : " + produit : ""}`,
      description: ctx.emailAnalysis.resume?.slice(0, 200) || null,
      confiance: "moyenne",
      temperature: temperature || "tiede",
      origineSignal: "renouvellement",
      dedupeKey: `${ctx.clientId}:${produit || "general"}:renouvellement`,
    });
  }

  // Rule 4: New need expression
  if (textToScan && hasKeywordMatch(textToScan, NEW_NEED_KEYWORDS)) {
    const produit = ctx.emailAnalysis.produitsMentionnes?.[0] || null;
    candidates.push({
      sourceType: "email_analysis",
      typeProduit: produit,
      titre: `Nouveau besoin exprime${produit ? " : " + produit : ""}`,
      description: ctx.emailAnalysis.resume?.slice(0, 200) || null,
      confiance: "moyenne",
      temperature: temperature || "tiede",
      origineSignal: "nouveau_besoin",
      dedupeKey: `${ctx.clientId}:${produit || "general"}:nouveau_besoin`,
    });
  }

  // Rule 5: Strong positive signal with product (urgence haute + produit)
  if (
    ctx.signals.some((s) => s.typeSignal === "urgence_haute") &&
    ctx.emailAnalysis.produitsMentionnes?.length &&
    ctx.emailAnalysis.sentiment !== "negatif"
  ) {
    for (const produit of ctx.emailAnalysis.produitsMentionnes) {
      // Only if not already covered by rule 1
      if (!candidates.some((c) => c.typeProduit === produit && c.sourceType === "signal")) {
        candidates.push({
          sourceType: "signal",
          typeProduit: produit,
          titre: `Signal urgent : ${produit}`,
          description: ctx.emailAnalysis.resume?.slice(0, 200) || null,
          confiance: "haute",
          temperature: "chaud",
          origineSignal: "urgence_produit",
          dedupeKey: `${ctx.clientId}:${produit}:signal`,
        });
      }
    }
  }

  if (candidates.length === 0) return;

  // Deduplicate candidates (same dedupeKey → keep highest confidence)
  const uniqueCandidates = deduplicateCandidates(candidates);

  // Persist with deduplication against existing DB records
  await persistOpportunites(ctx.clientId, ctx.emailId, uniqueCandidates);
}

// ── Deduplication ──

const CONFIANCE_ORDER: Record<string, number> = { haute: 3, moyenne: 2, basse: 1 };

function deduplicateCandidates(candidates: OpportuniteCandidate[]): OpportuniteCandidate[] {
  const map = new Map<string, OpportuniteCandidate>();
  for (const c of candidates) {
    const existing = map.get(c.dedupeKey);
    if (!existing || (CONFIANCE_ORDER[c.confiance] ?? 0) > (CONFIANCE_ORDER[existing.confiance] ?? 0)) {
      map.set(c.dedupeKey, c);
    }
  }
  return Array.from(map.values());
}

const STATUTS_ACTIFS = ["detectee", "qualifiee", "en_cours"];
const REJETEE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function persistOpportunites(
  clientId: string,
  emailId: string | null,
  candidates: OpportuniteCandidate[],
): Promise<void> {
  // Fetch active + recently rejected opportunities for this client
  const rejetCutoff = new Date(Date.now() - REJETEE_COOLDOWN_MS);
  const existingOpps = await prisma.opportuniteCommerciale.findMany({
    where: {
      clientId,
      OR: [
        { statut: { in: STATUTS_ACTIFS } },
        { statut: "rejetee", updatedAt: { gte: rejetCutoff } },
      ],
    },
    select: { id: true, dedupeKey: true, confiance: true, statut: true },
  });

  const activeOpps = existingOpps.filter((o) => STATUTS_ACTIFS.includes(o.statut));
  const rejeteeKeys = new Set(
    existingOpps.filter((o) => o.statut === "rejetee").map((o) => o.dedupeKey),
  );
  const existingKeys = new Map(activeOpps.map((o) => [o.dedupeKey, o]));

  for (const candidate of candidates) {
    const existing = existingKeys.get(candidate.dedupeKey);

    if (existing) {
      // Update derniereActivite + upgrade confidence if higher
      const shouldUpgrade =
        (CONFIANCE_ORDER[candidate.confiance] ?? 0) > (CONFIANCE_ORDER[existing.confiance] ?? 0);

      await prisma.opportuniteCommerciale.update({
        where: { id: existing.id },
        data: {
          derniereActivite: new Date(),
          ...(shouldUpgrade ? { confiance: candidate.confiance } : {}),
          ...(candidate.temperature ? { temperature: candidate.temperature } : {}),
        },
      });
    } else {
      // Skip if same dedupeKey was rejected in last 30 days
      if (rejeteeKeys.has(candidate.dedupeKey)) continue;

      // Also check if there's an active opportunity for same client+product (broader dedup)
      if (candidate.typeProduit) {
        const sameProductOpp = activeOpps.find(
          (o) => o.dedupeKey.startsWith(`${clientId}:${candidate.typeProduit}:`),
        );
        if (sameProductOpp) {
          // Same product already tracked — just refresh
          await prisma.opportuniteCommerciale.update({
            where: { id: sameProductOpp.id },
            data: {
              derniereActivite: new Date(),
              ...(candidate.temperature ? { temperature: candidate.temperature } : {}),
            },
          });
          continue;
        }

        // Also check broader rejetee: same product rejected recently
        const sameProductRejected = existingOpps.find(
          (o) => o.statut === "rejetee" && o.dedupeKey.startsWith(`${clientId}:${candidate.typeProduit}:`),
        );
        if (sameProductRejected) continue;
      }

      // Create new opportunity
      await prisma.opportuniteCommerciale.create({
        data: {
          clientId,
          sourceType: candidate.sourceType,
          sourceEmailId: emailId ?? undefined,
          typeProduit: candidate.typeProduit,
          titre: candidate.titre.slice(0, 200),
          description: candidate.description,
          statut: "detectee",
          confiance: candidate.confiance,
          temperature: candidate.temperature,
          origineSignal: candidate.origineSignal,
          dedupeKey: candidate.dedupeKey,
          ...(candidate.metadata ? { metadata: candidate.metadata as object } : {}),
        },
      });
    }
  }
}

// ── Helpers ──

function buildScanText(analysis: DetectionContext["emailAnalysis"]): string {
  const parts: string[] = [];
  if (analysis.resume) parts.push(analysis.resume);
  if (analysis.notes) parts.push(analysis.notes);
  if (analysis.actions?.length) {
    for (const a of analysis.actions) {
      parts.push(a.titre);
      if (a.details) parts.push(a.details);
    }
  }
  return parts.join(" ").toLowerCase();
}

function hasKeywordMatch(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}
