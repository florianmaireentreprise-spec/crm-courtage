"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { objectifSchema } from "@/lib/validators/objectif";

export async function createObjectif(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = objectifSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const data = parsed.data;
  await prisma.objectif.create({
    data: {
      type: data.type,
      periode: data.periode,
      annee: data.annee,
      mois: data.mois ?? null,
      trimestre: data.trimestre ?? null,
      valeurCible: data.valeurCible,
      userId: data.userId ?? null,
    },
  });

  revalidatePath("/objectifs");
}

export async function updateObjectif(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = objectifSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const data = parsed.data;
  await prisma.objectif.update({
    where: { id },
    data: {
      type: data.type,
      periode: data.periode,
      annee: data.annee,
      mois: data.mois ?? null,
      trimestre: data.trimestre ?? null,
      valeurCible: data.valeurCible,
      userId: data.userId ?? null,
    },
  });

  revalidatePath("/objectifs");
}

export async function deleteObjectif(id: string) {
  await prisma.objectif.delete({ where: { id } });
  revalidatePath("/objectifs");
}
