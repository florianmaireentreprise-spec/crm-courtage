import { prisma } from "@/lib/prisma";

// ── Patterns to exclude (newsletters, automated, noreply) ──
const EXCLUDED_PATTERNS = [
  /noreply@/i, /no-reply@/i, /ne-pas-repondre@/i,
  /newsletter@/i, /notifications?@/i, /mailer-daemon@/i,
  /postmaster@/i, /unsubscribe/i, /marketing@/i, /promo@/i,
];

const INSURANCE_KEYWORDS = [
  "contrat", "police", "sinistre", "devis", "cotisation", "prime",
  "résiliation", "avenant", "souscription", "adhésion", "garantie",
  "mutuelle", "prévoyance", "santé", "retraite", "assurance",
  "courtage", "indemnisation", "déclaration", "attestation",
  "rcpro", "multirisque", "protection juridique", "madelin",
  "urgent", "important", "signature", "rdv", "rendez-vous",
];

// ── Exported helpers (used by API routes and actions) ──

export function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).toLowerCase().trim();
}

export function extractSenderName(from: string): string {
  const match = from.match(/^([^<]+)\s*</);
  if (match) return match[1].trim();
  const emailMatch = from.match(/^([^@]+)@/);
  return emailMatch ? emailMatch[1] : from;
}

export function isExcludedSender(from: string): boolean {
  return EXCLUDED_PATTERNS.some((p) => p.test(from));
}

export function classifyPertinence(
  hasClient: boolean,
  sujet: string,
  extrait: string | null
): { pertinence: string; scoreRelevance: number } {
  let score = 0;
  if (hasClient) score += 50;

  const text = `${sujet} ${extrait ?? ""}`.toLowerCase();
  if (INSURANCE_KEYWORDS.some((kw) => text.includes(kw))) score += 20;

  let pertinence = "normal";
  if (hasClient) pertinence = "client";
  else if (score >= 20) pertinence = "important";

  return { pertinence, scoreRelevance: Math.min(100, score) };
}

export async function matchClientByEmail(emailAddress: string): Promise<string | null> {
  const addr = extractEmailAddress(emailAddress);
  const client = await prisma.client.findFirst({
    where: {
      OR: [
        { email: { equals: addr, mode: "insensitive" } },
        { email: { contains: addr.split("@")[0], mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  return client?.id ?? null;
}

export async function matchPrescripteurByEmail(emailAddress: string): Promise<string | null> {
  const addr = extractEmailAddress(emailAddress);
  const prescripteur = await prisma.prescripteur.findFirst({
    where: {
      email: { equals: addr, mode: "insensitive" },
    },
    select: { id: true },
  });
  return prescripteur?.id ?? null;
}
