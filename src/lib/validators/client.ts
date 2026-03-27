import { z } from "zod";
import {
  TYPES_RELATION_IDS,
  ROLES_RESEAU_IDS,
  STATUTS_RESEAU_IDS,
  NIVEAUX_POTENTIEL_IDS,
  POTENTIELS_AFFAIRES_IDS,
  HORIZONS_ACTIVATION_IDS,
} from "@/lib/constants/taxonomies";

// ── Date coercion helper ──
// HTML date inputs submit "" for empty fields. We normalize:
// - empty string / null / undefined → null
// - valid date string → Date object
const optionalDate = z
  .union([z.coerce.date(), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v instanceof Date && !isNaN(v.getTime()) ? v : null));

export const clientSchema = z.object({
  raisonSociale: z.string().default(""),
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
  codeNAF: z.string().optional().nullable(),
  trancheEffectifs: z.string().optional().nullable(),
  categorieReseau: z.string().optional().nullable(),
  // Qualification reseau — strict enum validation
  typeRelation: z.enum(TYPES_RELATION_IDS).optional().nullable().or(z.literal("")),
  rolesReseau: z.array(z.enum(ROLES_RESEAU_IDS)).default([]),
  statutReseau: z.enum(STATUTS_RESEAU_IDS).optional().nullable().or(z.literal("")),
  niveauPotentiel: z.enum(NIVEAUX_POTENTIEL_IDS).optional().nullable().or(z.literal("")),
  potentielAffaires: z.enum(POTENTIELS_AFFAIRES_IDS).optional().nullable().or(z.literal("")),
  potentielEstimeAnnuel: z.coerce.number().min(0).optional().nullable(),
  horizonActivation: z.enum(HORIZONS_ACTIVATION_IDS).optional().nullable().or(z.literal("")).or(z.literal("__clear__")).transform((v) => v === "__clear__" ? "" : v),
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
