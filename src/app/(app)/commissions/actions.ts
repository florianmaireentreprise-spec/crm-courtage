"use server";

import { prisma } from "@/lib/prisma";
import { getEnvironnement } from "@/lib/environnement";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function updateCommissionStatut(commissionId: string, statut: string) {
  await prisma.commission.update({
    where: { id: commissionId },
    data: {
      statut,
      dateVersement: statut === "verse" ? new Date() : null,
    },
  });

  revalidatePath("/commissions");
}

const commissionSchema = z.object({
  montant: z.coerce.number().min(0),
  type: z.string().min(1),
  periode: z.string().min(1),
  statut: z.string().min(1),
  notes: z.string().optional().nullable(),
});

export async function updateCommission(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = commissionSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  await prisma.commission.update({
    where: { id },
    data: {
      montant: data.montant,
      type: data.type,
      periode: data.periode,
      statut: data.statut,
      dateVersement: data.statut === "verse" ? new Date() : null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/commissions");
  revalidatePath("/contrats");
}

export async function deleteCommission(id: string) {
  await prisma.commission.delete({ where: { id } });
  revalidatePath("/commissions");
  revalidatePath("/contrats");
}
