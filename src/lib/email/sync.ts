import { prisma } from "@/lib/prisma";

// ── Patterns to exclude (newsletters, automated, noreply) ──
const EXCLUDED_PATTERNS = [
  /noreply@/i, /no-reply@/i, /ne-pas-repondre@/i,
  /newsletter@/i, /notifications?@/i, /mailer-daemon@/i,
  /postmaster@/i, /unsubscribe/i, /marketing@/i, /promo@/i,
  // Generic commercial senders
  /^info@/i, /^contact@/i, /^pub@/i, /^commercial@/i,
  /^communication@/i, /^offres@/i, /^news@/i,
];

// ── Technical/junk domains that should NEVER go to AI analysis ──
const JUNK_DOMAINS = [
  // Dev/infra platforms
  "railway.app", "notify.railway.app",
  "github.com", "noreply.github.com",
  "vercel.com",
  "neon.tech",
  "netlify.com",
  "heroku.com",
  "cloudflare.com",
  "stripe.com",
  "sentry.io",
  "linear.app",
  "notion.so",
  "slack.com",
  "google.com", "accounts.google.com",
  "amazonses.com",
  // Bulk email platforms
  "mailchimp.com", "mandrillapp.com",
  "sendgrid.net",
  "postmarkapp.com",
  "mailjet.com",
  "sendinblue.com", "brevo.com",
  "hubspot.com",
  "constantcontact.com",
  // Social/professional networks
  "linkedin.com", "facebookmail.com", "twitter.com",
  // SaaS notifications
  "atlassian.com", "jira.com",
  "dropbox.com", "docusign.net",
  "zoom.us", "calendly.com",
];

// ── Subject patterns indicating technical/automated/promotional emails ──
const JUNK_SUBJECT_PATTERNS = [
  // Tech notifications
  /build (failed|succeeded|passed)/i,
  /deploy(ment)?\s+(failed|succeeded|completed|started)/i,
  /\[alert\]/i,
  /\[monitoring\]/i,
  // Account/security
  /your (invoice|receipt|payment)/i,
  /password reset/i,
  /verify your email/i,
  /security alert/i,
  /sign.?in (from|attempt)/i,
  // Newsletters & promotional (FR + EN)
  /newsletter/i,
  /se\s+d[ée]sinscrire/i,
  /d[ée]sabonnement/i,
  /unsubscribe/i,
  /lettre\s+d['']information/i,
  /offre\s+(sp[ée]ciale|exclusive|promotionnelle)/i,
  /code\s+promo/i,
  /votre\s+facture\s+(est\s+disponible|du\s+\d)/i,
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

/** Deterministic junk detection — these emails skip AI analysis entirely */
export function isJunkEmail(from: string, sujet: string): boolean {
  const addr = extractEmailAddress(from);
  const domain = addr.split("@")[1] ?? "";
  if (JUNK_DOMAINS.some((d) => domain === d || domain.endsWith("." + d))) return true;
  if (JUNK_SUBJECT_PATTERNS.some((p) => p.test(sujet))) return true;
  return false;
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
