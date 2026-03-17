/**
 * Tests for opportunity deduplication logic.
 * deduplicateCandidates is a pure function — no DB, no mocks.
 */
import { describe, it, expect } from "vitest";
import { deduplicateCandidates, type OpportuniteCandidate } from "./detection";

// ── Helpers ──

function makeCandidate(overrides: Partial<OpportuniteCandidate> = {}): OpportuniteCandidate {
  return {
    sourceType: "signal",
    typeProduit: "SANTE_COLLECTIVE",
    titre: "Test opportunity",
    description: null,
    confiance: "moyenne",
    temperature: null,
    origineSignal: null,
    dedupeKey: "client1:SANTE_COLLECTIVE:signal",
    ...overrides,
  };
}

// ── Tests ──

describe("deduplicateCandidates", () => {
  it("returns empty array for empty input", () => {
    expect(deduplicateCandidates([])).toEqual([]);
  });

  it("keeps single candidate as-is", () => {
    const candidates = [makeCandidate()];
    const result = deduplicateCandidates(candidates);
    expect(result).toHaveLength(1);
    expect(result[0].dedupeKey).toBe("client1:SANTE_COLLECTIVE:signal");
  });

  it("deduplicates by dedupeKey, keeping highest confidence", () => {
    const candidates = [
      makeCandidate({ confiance: "moyenne", titre: "Low confidence" }),
      makeCandidate({ confiance: "haute", titre: "High confidence" }),
    ];
    const result = deduplicateCandidates(candidates);
    expect(result).toHaveLength(1);
    expect(result[0].titre).toBe("High confidence");
    expect(result[0].confiance).toBe("haute");
  });

  it("keeps lower confidence if it appears first and no higher exists", () => {
    const candidates = [
      makeCandidate({ confiance: "basse", titre: "Only one" }),
    ];
    const result = deduplicateCandidates(candidates);
    expect(result).toHaveLength(1);
    expect(result[0].confiance).toBe("basse");
  });

  it("does NOT replace with same confidence (keeps first)", () => {
    const candidates = [
      makeCandidate({ confiance: "moyenne", titre: "First" }),
      makeCandidate({ confiance: "moyenne", titre: "Second" }),
    ];
    const result = deduplicateCandidates(candidates);
    expect(result).toHaveLength(1);
    expect(result[0].titre).toBe("First");
  });

  it("preserves candidates with different dedupeKeys", () => {
    const candidates = [
      makeCandidate({ dedupeKey: "c1:SANTE_COLLECTIVE:signal", confiance: "moyenne" }),
      makeCandidate({ dedupeKey: "c1:SANTE_COLLECTIVE:devis", confiance: "haute" }),
      makeCandidate({ dedupeKey: "c1:RCP_PRO:signal", confiance: "basse" }),
    ];
    const result = deduplicateCandidates(candidates);
    expect(result).toHaveLength(3);
  });

  it("correctly handles the full confidence ordering (haute > moyenne > basse)", () => {
    const candidates = [
      makeCandidate({ dedupeKey: "k1", confiance: "basse", titre: "basse" }),
      makeCandidate({ dedupeKey: "k1", confiance: "haute", titre: "haute" }),
      makeCandidate({ dedupeKey: "k1", confiance: "moyenne", titre: "moyenne" }),
    ];
    const result = deduplicateCandidates(candidates);
    expect(result).toHaveLength(1);
    expect(result[0].confiance).toBe("haute");
  });

  it("handles realistic multi-rule scenario from same email", () => {
    // Simulates what detecterOpportunitesDepuisEmail produces:
    // Rule 1 (signal) + Rule 2 (devis) + Rule 3 (renouvellement) for same product
    const candidates = [
      makeCandidate({
        dedupeKey: "c1:SANTE_COLLECTIVE:signal",
        confiance: "moyenne",
        origineSignal: "produit_mentionne",
        sourceType: "signal",
      }),
      makeCandidate({
        dedupeKey: "c1:SANTE_COLLECTIVE:devis",
        confiance: "haute",
        origineSignal: "demande_devis",
        sourceType: "email_analysis",
        temperature: "chaud",
      }),
      makeCandidate({
        dedupeKey: "c1:SANTE_COLLECTIVE:renouvellement",
        confiance: "moyenne",
        origineSignal: "renouvellement",
        sourceType: "email_analysis",
      }),
    ];
    const result = deduplicateCandidates(candidates);
    // All 3 have different dedupeKeys → all preserved
    expect(result).toHaveLength(3);
    // Devis should be haute
    const devis = result.find((r) => r.dedupeKey.includes("devis"));
    expect(devis?.confiance).toBe("haute");
    expect(devis?.temperature).toBe("chaud");
  });
});
