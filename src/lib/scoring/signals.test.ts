/**
 * Tests for extraireSignauxCommerciaux — deterministic signal extraction
 * from AI email analysis data. Pure function, no DB, no mocks needed.
 */
import { describe, it, expect } from "vitest";
import { extraireSignauxCommerciaux, type SignalCandidate } from "./signals";

// ── Helpers ──

function findSignal(signals: SignalCandidate[], typeSignal: string, valeur?: string) {
  return signals.find(
    (s) => s.typeSignal === typeSignal && (valeur === undefined || s.valeur === valeur),
  );
}

// ── Tests ──

describe("extraireSignauxCommerciaux", () => {
  // ── Rule 1: Products mentioned ──

  it("detects a known product from produitsMentionnes", () => {
    const signals = extraireSignauxCommerciaux({
      produitsMentionnes: ["SANTE_COLLECTIVE"],
    });
    expect(signals).toHaveLength(1);
    expect(findSignal(signals, "produit_mentionne", "SANTE_COLLECTIVE")).toBeDefined();
  });

  it("normalizes product keys (lowercase → uppercase with underscores preserved)", () => {
    const signals = extraireSignauxCommerciaux({
      produitsMentionnes: ["sante_collective", "RCP_PRO"],
    });
    expect(findSignal(signals, "produit_mentionne", "SANTE_COLLECTIVE")).toBeDefined();
    expect(findSignal(signals, "produit_mentionne", "RCP_PRO")).toBeDefined();
  });

  it("strips non-letter/underscore chars during normalization (hyphen → dropped)", () => {
    // "rcp-pro" → "RCP-PRO" → strip non-[A-Z_] → "RCPPRO" which is NOT a valid product key
    const signals = extraireSignauxCommerciaux({
      produitsMentionnes: ["rcp-pro"],
    });
    // Should not match because RCPPRO is not in PRODUIT_KEYS
    expect(findSignal(signals, "produit_mentionne", "RCP_PRO")).toBeUndefined();
    expect(signals).toHaveLength(0);
  });

  it("ignores unknown product keys", () => {
    const signals = extraireSignauxCommerciaux({
      produitsMentionnes: ["SANTE_COLLECTIVE", "PRODUIT_INEXISTANT"],
    });
    const productSignals = signals.filter((s) => s.typeSignal === "produit_mentionne");
    expect(productSignals).toHaveLength(1);
    expect(productSignals[0].valeur).toBe("SANTE_COLLECTIVE");
  });

  it("handles null/undefined produitsMentionnes", () => {
    expect(extraireSignauxCommerciaux({ produitsMentionnes: null })).toEqual([]);
    expect(extraireSignauxCommerciaux({ produitsMentionnes: undefined })).toEqual([]);
    expect(extraireSignauxCommerciaux({})).toEqual([]);
  });

  // ── Rule 2: Sentiment ──

  it("detects positive sentiment", () => {
    const signals = extraireSignauxCommerciaux({ sentiment: "positif" });
    expect(signals).toHaveLength(1);
    expect(findSignal(signals, "sentiment_positif", "positif")).toBeDefined();
  });

  it("detects negative sentiment", () => {
    const signals = extraireSignauxCommerciaux({ sentiment: "negatif" });
    expect(signals).toHaveLength(1);
    expect(findSignal(signals, "sentiment_negatif", "negatif")).toBeDefined();
  });

  it("ignores neutral/null sentiment", () => {
    expect(extraireSignauxCommerciaux({ sentiment: "neutre" })).toEqual([]);
    expect(extraireSignauxCommerciaux({ sentiment: null })).toEqual([]);
  });

  // ── Rule 3: High urgency ──

  it("detects high urgency", () => {
    const signals = extraireSignauxCommerciaux({ urgence: "haute" });
    expect(signals).toHaveLength(1);
    expect(findSignal(signals, "urgence_haute")).toBeDefined();
  });

  it("ignores non-haute urgency", () => {
    expect(extraireSignauxCommerciaux({ urgence: "normale" })).toEqual([]);
    expect(extraireSignauxCommerciaux({ urgence: "basse" })).toEqual([]);
  });

  // ── Rule 4: Deal update ──

  it("detects deal stage suggestion", () => {
    const signals = extraireSignauxCommerciaux({
      dealUpdate: { etapeSuggeree: "QUALIFICATION" },
    });
    expect(signals).toHaveLength(1);
    expect(findSignal(signals, "deal_update", "QUALIFICATION")).toBeDefined();
  });

  it("ignores empty deal update", () => {
    expect(extraireSignauxCommerciaux({ dealUpdate: null })).toEqual([]);
    expect(extraireSignauxCommerciaux({ dealUpdate: {} })).toEqual([]);
  });

  // ── Rule 5: Objections ──

  it("detects price objection from notes", () => {
    const signals = extraireSignauxCommerciaux({
      notes: "Le client trouve ça trop cher et hésite",
    });
    expect(findSignal(signals, "objection", "prix")).toBeDefined();
  });

  it("detects timing objection from action details", () => {
    const signals = extraireSignauxCommerciaux({
      actions: [
        { type: "relance", titre: "Rappeler", details: "Pas le moment pour eux, reporter" },
      ],
    });
    expect(findSignal(signals, "objection", "timing")).toBeDefined();
  });

  it("detects competitor objection", () => {
    const signals = extraireSignauxCommerciaux({
      notes: "Ils ont un courtier actuel qui fait le suivi",
    });
    expect(findSignal(signals, "objection", "concurrent")).toBeDefined();
  });

  it("detects multiple objection types simultaneously", () => {
    const signals = extraireSignauxCommerciaux({
      notes: "Trop cher et pas le moment, ils ont un concurrent",
    });
    const objections = signals.filter((s) => s.typeSignal === "objection");
    expect(objections).toHaveLength(3);
    const types = objections.map((s) => s.valeur).sort();
    expect(types).toEqual(["concurrent", "prix", "timing"]);
  });

  // ── Rule 6: Needs from actions ──

  it("detects need from action text mentioning product key", () => {
    const signals = extraireSignauxCommerciaux({
      actions: [
        { type: "deal", titre: "Proposer PER retraite complémentaire", details: "Besoin exprimé" },
      ],
    });
    expect(findSignal(signals, "besoin", "PER")).toBeDefined();
  });

  it("detects need from action text mentioning product label", () => {
    const signals = extraireSignauxCommerciaux({
      actions: [
        { type: "deal", titre: "Etudier la prevoyance collective pour l'entreprise" },
      ],
    });
    expect(findSignal(signals, "besoin", "PREVOYANCE_COLLECTIVE")).toBeDefined();
  });

  // ── Combined scenarios ──

  it("extracts signals from a realistic full-analysis email", () => {
    const signals = extraireSignauxCommerciaux({
      produitsMentionnes: ["SANTE_COLLECTIVE"],
      sentiment: "positif",
      urgence: "haute",
      dealUpdate: { etapeSuggeree: "DEVIS" },
      notes: "Client très intéressé, demande un devis rapidement",
      actions: [
        { type: "tache", titre: "Préparer devis santé collective", details: "18 salariés" },
      ],
    });

    // Should have: produit_mentionne, sentiment_positif, urgence_haute, deal_update
    expect(findSignal(signals, "produit_mentionne", "SANTE_COLLECTIVE")).toBeDefined();
    expect(findSignal(signals, "sentiment_positif")).toBeDefined();
    expect(findSignal(signals, "urgence_haute")).toBeDefined();
    expect(findSignal(signals, "deal_update", "DEVIS")).toBeDefined();
    expect(signals.length).toBeGreaterThanOrEqual(4);
  });

  it("returns empty array for completely empty input", () => {
    expect(extraireSignauxCommerciaux({})).toEqual([]);
  });

  it("returns empty array for non-triggering input", () => {
    const signals = extraireSignauxCommerciaux({
      sentiment: "neutre",
      urgence: "basse",
      notes: "Simple suivi administratif",
      actions: [{ type: "info", titre: "Noter l'information" }],
    });
    expect(signals).toEqual([]);
  });
});
