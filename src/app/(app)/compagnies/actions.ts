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

const produitSchema = z.object({
  typeProduit: z.string().min(1),
  tauxCommission: z.number().min(0).max(1),
  seuilSurcommission: z.number().int().nullable().optional(),
  tauxSurcommission: z.number().min(0).max(1).nullable().optional(),
  upfront: z.number().nullable().optional(),
});

function parseProduits(formData: FormData): z.infer<typeof produitSchema>[] {
  const raw = formData.get("produits");
  if (!raw || typeof raw !== "string") return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((p: unknown) => produitSchema.safeParse(p).success).map((p: unknown) => produitSchema.parse(p));
  } catch {
    return [];
  }
}

export async function createCompagnie(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = compagnieSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const produits = parseProduits(formData);

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
      produits: {
        create: produits.map((p) => ({
          typeProduit: p.typeProduit,
          tauxCommission: p.tauxCommission,
          seuilSurcommission: p.seuilSurcommission ?? null,
          tauxSurcommission: p.tauxSurcommission ?? null,
          upfront: p.upfront ?? null,
        })),
      },
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
  const produits = parseProduits(formData);

  // Update compagnie fields
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

  // Replace all produits (delete + recreate)
  await prisma.compagnieProduit.deleteMany({ where: { compagnieId: id } });
  if (produits.length > 0) {
    await prisma.compagnieProduit.createMany({
      data: produits.map((p) => ({
        compagnieId: id,
        typeProduit: p.typeProduit,
        tauxCommission: p.tauxCommission,
        seuilSurcommission: p.seuilSurcommission ?? null,
        tauxSurcommission: p.tauxSurcommission ?? null,
        upfront: p.upfront ?? null,
      })),
    });
  }

  revalidatePath("/compagnies");
}

export async function deleteCompagnie(id: string) {
  await prisma.compagnie.delete({ where: { id } });
  revalidatePath("/compagnies");
}
