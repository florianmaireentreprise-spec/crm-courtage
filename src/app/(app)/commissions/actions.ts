"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
