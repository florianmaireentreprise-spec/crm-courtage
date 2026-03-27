/**
 * Shared taxonomy enums for reseau qualification fields.
 *
 * Single source of truth — imported by both:
 * - src/lib/validators/client.ts (client-side Zod schema)
 * - src/app/(app)/reseau/actions.ts (server action Zod schema)
 */

export const TYPES_RELATION_IDS = [
  "client_potentiel_direct",
  "prescripteur",
  "partenaire",
  "ancien_client",
] as const;

export const ROLES_RESEAU_IDS = [
  "prospect_direct",
  "prescripteur_potentiel",
  "partenaire",
  "ancien_client",
] as const;

export const STATUTS_RESEAU_IDS = [
  "aucune_demarche",
  "a_qualifier",
  "a_contacter",
  "premier_echange",
  "suivi_en_cours",
  "actif",
  "sans_suite",
] as const;

export const NIVEAUX_POTENTIEL_IDS = ["faible", "moyen", "fort"] as const;
export const POTENTIELS_AFFAIRES_IDS = ["faible", "moyen", "fort", "strategique"] as const;
export const HORIZONS_ACTIVATION_IDS = ["lancement", "deuxieme_phase", "installe"] as const;
