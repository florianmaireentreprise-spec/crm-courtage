"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const prescripteurSchema = z.object({
  type: z.string().min(1),
  civilite: z.string().optional().nullable(),
  prenom: z.string().min(1),
  nom: z.string().min(1),
  entreprise: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  telephone: z.string().optional().nullable(),
  adresse: z.string().optional().nullable(),
  ville: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function createPrescripteur(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = prescripteurSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  await prisma.prescripteur.create({
    data: {
      type: data.type,
      civilite: data.civilite || null,
      prenom: data.prenom,
      nom: data.nom,
      entreprise: data.entreprise || null,
      email: data.email || null,
      telephone: data.telephone || null,
      adresse: data.adresse || null,
      ville: data.ville || null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/prescripteurs");
  redirect("/prescripteurs");
}

export async function updatePrescripteur(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = prescripteurSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  await prisma.prescripteur.update({
    where: { id },
    data: {
      type: data.type,
      civilite: data.civilite || null,
      prenom: data.prenom,
      nom: data.nom,
      entreprise: data.entreprise || null,
      email: data.email || null,
      telephone: data.telephone || null,
      adresse: data.adresse || null,
      ville: data.ville || null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/prescripteurs");
  redirect("/prescripteurs");
}

export async function deletePrescripteur(id: string) {
  await prisma.prescripteur.delete({ where: { id } });
  revalidatePath("/prescripteurs");
  redirect("/prescripteurs");
}

export async function updatePrescripteurStats(prescripteurId: string, field: "dossiersEnvoyes" | "clientsSignes", increment: number = 1) {
  await prisma.prescripteur.update({
    where: { id: prescripteurId },
    data: {
      [field]: { increment },
      derniereRecommandation: new Date(),
    },
  });

  revalidatePath("/prescripteurs");
}
