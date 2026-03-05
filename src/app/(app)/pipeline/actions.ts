"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const dealSchema = z.object({
  clientId: z.string().min(1),
  titre: z.string().min(1),
  etape: z.string().default("PROSPECTION"),
  montantEstime: z.coerce.number().optional().nullable(),
  probabilite: z.coerce.number().int().min(0).max(100).optional().nullable(),
  produitsCibles: z.string().optional().nullable(),
  dateClosingPrev: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  assigneA: z.string().optional().nullable(),
});

export async function createDeal(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = dealSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  await prisma.deal.create({
    data: {
      clientId: data.clientId,
      titre: data.titre,
      etape: data.etape,
      montantEstime: data.montantEstime ?? null,
      probabilite: data.probabilite ?? null,
      produitsCibles: data.produitsCibles || null,
      dateClosingPrev: data.dateClosingPrev ? new Date(data.dateClosingPrev) : null,
      notes: data.notes || null,
      assigneA: data.assigneA || null,
    },
  });

  revalidatePath("/pipeline");
}

export async function moveDeal(dealId: string, newEtape: string, motifPerte?: string) {
  const updateData: Record<string, unknown> = { etape: newEtape };

  if (newEtape === "SIGNE") {
    updateData.dateClosingReel = new Date();
  }
  if (newEtape === "PERDU" && motifPerte) {
    updateData.motifPerte = motifPerte;
    updateData.dateClosingReel = new Date();
  }

  await prisma.deal.update({
    where: { id: dealId },
    data: updateData,
  });

  revalidatePath("/pipeline");
  revalidatePath("/");
}

export async function deleteDeal(dealId: string) {
  await prisma.deal.delete({ where: { id: dealId } });
  revalidatePath("/pipeline");
}
