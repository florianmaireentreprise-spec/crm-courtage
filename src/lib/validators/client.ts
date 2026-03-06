import { z } from "zod";

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
  dateEcheanceMutuelle: z.string().optional().nullable(),
  dateEcheancePrevoyance: z.string().optional().nullable(),
  // Dirigeant
  civilite: z.string().optional().nullable(),
  prenom: z.string().min(1, "Le prenom est requis"),
  nom: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide").optional().nullable().or(z.literal("")),
  telephone: z.string().optional().nullable(),
  adresse: z.string().optional().nullable(),
  codePostal: z.string().optional().nullable(),
  ville: z.string().optional().nullable(),
  dateNaissance: z.string().optional().nullable(),
  // Metadonnees
  sourceAcquisition: z.string().optional().nullable(),
  prescripteurId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  statut: z.string().default("prospect"),
  assigneA: z.string().optional().nullable(),
  categorieReseau: z.string().optional().nullable(),
  // Veille concurrentielle
  courtierActuel: z.string().optional().nullable(),
  assureurActuelSante: z.string().optional().nullable(),
  dateDerniereRevision: z.string().optional().nullable(),
  motifChangement: z.string().optional().nullable(),
});

export type ClientFormData = z.infer<typeof clientSchema>;
