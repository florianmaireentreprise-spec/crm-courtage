"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const compagnieSchema = z.object({
  nom: z.string().min(1),
  type: z.string().optional().nullable(),
  contactNom: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().or(z.literal("")).nullable(),
  contactTelephone: z.string().optional().nullable(),
  conventionSignee: z.string().optional(),
  dateConvention: z.string().optional().nullable(),
  seuilSurcommission: z.string().optional().nullable(),
  tauxSurcommission: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function createCompagnie(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = compagnieSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  await prisma.compagnie.create({
    data: {
      nom: data.nom,
      type: data.type || null,
      contactNom: data.contactNom || null,
      contactEmail: data.contactEmail || null,
      contactTelephone: data.contactTelephone || null,
      conventionSignee: data.conventionSignee === "on",
      dateConvention: data.dateConvention ? new Date(data.dateConvention) : null,
      seuilSurcommission: data.seuilSurcommission ? parseInt(data.seuilSurcommission) : null,
      tauxSurcommission: data.tauxSurcommission ? parseFloat(data.tauxSurcommission) / 100 : null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/compagnies");
}

export async function updateCompagnie(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = compagnieSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  await prisma.compagnie.update({
    where: { id },
    data: {
      nom: data.nom,
      type: data.type || null,
      contactNom: data.contactNom || null,
      contactEmail: data.contactEmail || null,
      contactTelephone: data.contactTelephone || null,
      conventionSignee: data.conventionSignee === "on",
      dateConvention: data.dateConvention ? new Date(data.dateConvention) : null,
      seuilSurcommission: data.seuilSurcommission ? parseInt(data.seuilSurcommission) : null,
      tauxSurcommission: data.tauxSurcommission ? parseFloat(data.tauxSurcommission) / 100 : null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/compagnies");
}

export async function deleteCompagnie(id: string) {
  await prisma.compagnie.delete({ where: { id } });
  revalidatePath("/compagnies");
}
