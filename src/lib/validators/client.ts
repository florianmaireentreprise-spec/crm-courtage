import { z } from "zod";

// ── Enum whitelists for reseau qualification fields ──
const TYPES_RELATION_IDS = [
  "prescripteur_potentiel",
  "partenaire",
  "client_potentiel_direct",
  "influenceur",
  "ancien_client",
  "autre",
] as const;

const STATUTS_RESEAU_IDS = [
  "identifie",
  "a_qualifier",
  "a_contacter",
  "contacte",
  "echange_fait",
  "suivi_en_cours",
  "client",
  "prescripteur_actif",
  "sans_suite",
] as const;

const NIVEAUX_POTENTIEL_IDS = ["faible", "moyen", "fort"] as const;

const HORIZONS_ACTIVATION_IDS = ["court", "moyen", "long"] as const;

// ── Date coercion helper ──
// HTML date inputs submit "" for empty fields. We normalize:
// - empty string / null / undefined → null
// - valid date string → Date object
const optionalDate = z
  .union([z.coerce.date(), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v instanceof Date && !isNaN(v.getTime()) ? v : null));

export const clientSchema = z.object({
  raisonSociale: z.string().min(1, "La raison sociale est requise"),
  siret: z.string().optional().nullable(),
  formeJuridique: z.string().optional().nullable(),
  secteurActivite: z.string().optional().nullable(),
  nbSalaries: z.coerce.number().int().min(0).optional().nullable(),
  chiffreAffaires: z.coerce.number().min(0).optional().nullable(),
  conventionCollective: z.string().optional().nullable(),
  // Couverture actuelle
  mutuelleActuelle: z.string().optional().nullable(),
  prevoyanceActuelle: z.string().optional().nullable(),
  dateEcheanceMutuelle: optionalDate,
  dateEcheancePrevoyance: optionalDate,
  // Dirigeant
  civilite: z.string().optional().nullable(),
  prenom: z.string().min(1, "Le prenom est requis"),
  nom: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide").optional().nullable().or(z.literal("")),
  telephone: z.string().optional().nullable(),
  adresse: z.string().optional().nullable(),
  codePostal: z.string().optional().nullable(),
  ville: z.string().optional().nullable(),
  dateNaissance: optionalDate,
  // Metadonnees
  sourceAcquisition: z.string().optional().nullable(),
  prescripteurId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  statut: z.string().default("prospect"),
  assigneA: z.string().optional().nullable(),
  categorieReseau: z.string().optional().nullable(),
  // Qualification reseau — strict enum validation
  typeRelation: z.enum(TYPES_RELATION_IDS).optional().nullable().or(z.literal("")),
  statutReseau: z.enum(STATUTS_RESEAU_IDS).optional().nullable().or(z.literal("")),
  niveauPotentiel: z.enum(NIVEAUX_POTENTIEL_IDS).optional().nullable().or(z.literal("")),
  potentielEstimeAnnuel: z.coerce.number().min(0).optional().nullable(),
  horizonActivation: z.enum(HORIZONS_ACTIVATION_IDS).optional().nullable().or(z.literal("")),
  prochaineActionReseau: z.string().optional().nullable(),
  dateRelanceReseau: optionalDate,
  dateDernierContact: optionalDate,
  commentaireReseau: z.string().optional().nullable(),
  // Veille concurrentielle
  courtierActuel: z.string().optional().nullable(),
  assureurActuelSante: z.string().optional().nullable(),
  dateDerniereRevision: optionalDate,
  motifChangement: z.string().optional().nullable(),
});

export type ClientFormData = z.infer<typeof clientSchema>;
