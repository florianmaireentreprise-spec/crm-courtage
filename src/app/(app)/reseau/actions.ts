"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

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
  // Qualification reseau
  typeRelation: z.string().optional(),
  statutReseau: z.string().optional(),
  niveauPotentiel: z.string().optional(),
  potentielEstimeAnnuel: z.coerce.number().min(0).optional(),
  horizonActivation: z.string().optional(),
  prochaineActionReseau: z.string().optional(),
  dateRelanceReseau: z.string().optional(),
  dateDernierContact: z.string().optional(),
  commentaireReseau: z.string().optional(),
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
      typeRelation: data.typeRelation || null,
      statutReseau: data.statutReseau || "identifie",
      niveauPotentiel: data.niveauPotentiel || null,
      potentielEstimeAnnuel: data.potentielEstimeAnnuel ?? null,
      horizonActivation: data.horizonActivation || null,
      prochaineActionReseau: data.prochaineActionReseau || null,
      dateRelanceReseau: data.dateRelanceReseau ? new Date(data.dateRelanceReseau) : null,
      dateDernierContact: data.dateDernierContact ? new Date(data.dateDernierContact) : null,
      commentaireReseau: data.commentaireReseau || null,
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
