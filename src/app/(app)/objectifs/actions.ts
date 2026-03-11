"use server";

import { prisma } from "@/lib/prisma";
import { getEnvironnement } from "@/lib/environnement";
import { revalidatePath } from "next/cache";
import { objectifSchema } from "@/lib/validators/objectif";
import { OBJECTIFS_DEFAUT } from "@/lib/objectifs-defaut";

export async function createObjectif(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = objectifSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const data = parsed.data;
  const env = await getEnvironnement();
  await prisma.objectif.create({
    data: {
      environnement: env,
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

export async function chargerObjectifsDefaut() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Fetch existing objectives for the current year to avoid duplicates
  const existingObjectifs = await prisma.objectif.findMany({
    where: { annee: currentYear },
    select: { type: true, periode: true, valeurCible: true },
  });

  const objectifsToCreate = OBJECTIFS_DEFAUT.filter((def) => {
    // Check if an objectif with the same type, periode and cible already exists for this year
    return !existingObjectifs.some(
      (existing) =>
        existing.type === def.type &&
        existing.periode === def.periode &&
        existing.valeurCible === def.cible
    );
  });

  if (objectifsToCreate.length === 0) {
    return { created: 0, message: "Tous les objectifs business plan existent deja." };
  }

  await prisma.objectif.createMany({
    data: objectifsToCreate.map((def) => ({
      type: def.type,
      periode: def.periode,
      annee: currentYear,
      mois: def.periode === "MENSUEL" ? currentMonth : null,
      trimestre: null,
      valeurCible: def.cible,
      userId: null,
    })),
  });

  revalidatePath("/objectifs");
  return {
    created: objectifsToCreate.length,
    message: `${objectifsToCreate.length} objectif(s) business plan cree(s) pour ${currentYear}.`,
  };
}
