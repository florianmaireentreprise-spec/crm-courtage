"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const tacheSchema = z.object({
  titre: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.string().default("AUTRE"),
  priorite: z.string().default("normale"),
  dateEcheance: z.string().min(1),
  clientId: z.string().optional().nullable(),
  assigneA: z.string().optional().nullable(),
});

export async function createTache(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = tacheSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  await prisma.tache.create({
    data: {
      titre: data.titre,
      description: data.description || null,
      type: data.type,
      priorite: data.priorite,
      dateEcheance: new Date(data.dateEcheance),
      clientId: data.clientId || null,
      assigneA: data.assigneA || null,
    },
  });

  revalidatePath("/relances");
  revalidatePath("/");
}

export async function updateTache(tacheId: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = tacheSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  await prisma.tache.update({
    where: { id: tacheId },
    data: {
      titre: data.titre,
      description: data.description || null,
      type: data.type,
      priorite: data.priorite,
      dateEcheance: new Date(data.dateEcheance),
      clientId: data.clientId || null,
      assigneA: data.assigneA || null,
    },
  });

  revalidatePath("/relances");
  revalidatePath("/");
}

export async function markTacheDone(tacheId: string) {
  await prisma.tache.update({
    where: { id: tacheId },
    data: {
      statut: "terminee",
      dateRealisation: new Date(),
    },
  });

  revalidatePath("/relances");
  revalidatePath("/");
}

export async function deleteTache(tacheId: string) {
  await prisma.tache.delete({ where: { id: tacheId } });
  revalidatePath("/relances");
  revalidatePath("/");
}
