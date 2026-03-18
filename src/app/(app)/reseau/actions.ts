"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

// ── Enum whitelists (mirrored from constants, kept inline for server action isolation) ──
const TYPES_RELATION_IDS = [
  "client_potentiel_direct", "prescripteur", "partenaire", "ancien_client",
] as const;

const STATUTS_RESEAU_IDS = [
  "aucune_demarche", "a_qualifier", "a_contacter", "premier_echange",
  "suivi_en_cours", "actif", "sans_suite",
] as const;

const NIVEAUX_POTENTIEL_IDS = ["faible", "moyen", "fort"] as const;
const HORIZONS_ACTIVATION_IDS = ["court", "moyen", "long"] as const;

// ── Date coercion helper ──
const optionalDate = z
  .union([z.coerce.date(), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v instanceof Date && !isNaN(v.getTime()) ? v : null));

// ── Objectif schema ──

const objectifSchema = z.object({
  categorie: z.string().min(1),
  contactsObjectif: z.coerce.number().min(0),
  tauxConversionObj: z.coerce.number().min(0).max(100),
  potentielUnitaire: z.coerce.number().min(0),
  notes: z.string().optional().nullable(),
});

export async function upsertReseauObjectif(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = objectifSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  await prisma.reseauObjectif.upsert({
    where: { categorie: data.categorie },
    create: {
      categorie: data.categorie,
      contactsObjectif: data.contactsObjectif,
      tauxConversionObj: data.tauxConversionObj / 100,
      potentielUnitaire: data.potentielUnitaire,
      notes: data.notes || null,
    },
    update: {
      contactsObjectif: data.contactsObjectif,
      tauxConversionObj: data.tauxConversionObj / 100,
      potentielUnitaire: data.potentielUnitaire,
      notes: data.notes || null,
    },
  });

  revalidatePath("/reseau");
}

// ── Add contact schema — lightweight, no commentaireReseau, no dateRelanceReseau ──

const addContactSchema = z.object({
  raisonSociale: z.string().min(1),
  civilite: z.string().optional(),
  prenom: z.string().min(1),
  nom: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  telephone: z.string().optional(),
  categorieReseau: z.string().min(1),
  ville: z.string().optional(),
  secteurActivite: z.string().optional(),
  // SIRENE enrichment fields
  siret: z.string().optional(),
  formeJuridique: z.string().optional(),
  codeNAF: z.string().optional(),
  trancheEffectifs: z.string().optional(),
  nbSalaries: z.coerce.number().min(0).optional().or(z.literal("")),
  adresse: z.string().optional(),
  codePostal: z.string().optional(),
  // Qualification reseau — strict enum validation
  typeRelation: z.enum(TYPES_RELATION_IDS).optional().or(z.literal("")),
  statutReseau: z.enum(STATUTS_RESEAU_IDS).optional().or(z.literal("")),
  niveauPotentiel: z.enum(NIVEAUX_POTENTIEL_IDS).optional().or(z.literal("")),
  potentielEstimeAnnuel: z.coerce.number().min(0).optional(),
  horizonActivation: z.enum(HORIZONS_ACTIVATION_IDS).optional().or(z.literal("")),
  prochaineActionReseau: z.string().optional(),
  dateDernierContact: optionalDate,
  notes: z.string().optional(),
});

export async function addContactReseau(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = addContactSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  await prisma.client.create({
    data: {
      raisonSociale: data.raisonSociale,
      civilite: data.civilite || null,
      prenom: data.prenom,
      nom: data.nom,
      email: data.email || null,
      telephone: data.telephone || null,
      categorieReseau: data.categorieReseau,
      // SIRENE enrichment
      siret: data.siret || null,
      formeJuridique: data.formeJuridique || null,
      codeNAF: data.codeNAF || null,
      trancheEffectifs: data.trancheEffectifs || null,
      nbSalaries: typeof data.nbSalaries === "number" ? data.nbSalaries : null,
      adresse: data.adresse || null,
      codePostal: data.codePostal || null,
      // Qualification reseau
      typeRelation: data.typeRelation || null,
      statutReseau: data.statutReseau || "aucune_demarche",
      niveauPotentiel: data.niveauPotentiel || null,
      potentielEstimeAnnuel: data.potentielEstimeAnnuel ?? null,
      horizonActivation: data.horizonActivation || null,
      prochaineActionReseau: data.prochaineActionReseau || null,
      dateDernierContact: data.dateDernierContact,
      ville: data.ville || null,
      secteurActivite: data.secteurActivite || null,
      notes: data.notes || null,
      statut: "prospect",
      sourceAcquisition: "Reseau personnel",
    },
  });

  revalidatePath("/reseau");
  redirect("/reseau");
}

// ── Quick update schema ──

const quickUpdateSchema = z.object({
  clientId: z.string().min(1),
  statutReseau: z.enum(STATUTS_RESEAU_IDS).optional().or(z.literal("")),
  prochaineActionReseau: z.string().optional(),
  dateRelanceReseau: optionalDate,
});

export async function quickUpdateReseau(data: {
  clientId: string;
  statutReseau?: string;
  prochaineActionReseau?: string;
  dateRelanceReseau?: string;
}) {
  const parsed = quickUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Donnees invalides" };
  }

  const { clientId, ...fields } = parsed.data;

  const updateData: Record<string, unknown> = {};
  if (fields.statutReseau !== undefined) updateData.statutReseau = fields.statutReseau || null;
  if (fields.prochaineActionReseau !== undefined) updateData.prochaineActionReseau = fields.prochaineActionReseau || null;
  if (fields.dateRelanceReseau !== undefined) updateData.dateRelanceReseau = fields.dateRelanceReseau;

  if (Object.keys(updateData).length === 0) {
    return { error: "Aucun champ a mettre a jour" };
  }

  await prisma.client.update({
    where: { id: clientId },
    data: updateData,
  });

  revalidatePath("/reseau");
  return { success: true };
}
