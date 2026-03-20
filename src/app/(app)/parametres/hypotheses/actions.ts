"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateAssumptionSchema = z.object({
  id: z.string().min(1),
  estimatedPremium: z.coerce.number().min(0),
  commissionRate: z.coerce.number().min(0).max(100), // Input as percentage, stored as decimal
  enabled: z.coerce.boolean(),
});

export async function updateBaseAssumption(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  // Handle checkbox: unchecked = not present
  raw.enabled = formData.has("enabled") ? "true" : "false";
  const parsed = updateAssumptionSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { id, estimatedPremium, commissionRate, enabled } = parsed.data;

  await prisma.potentielBaseAssumption.update({
    where: { id },
    data: {
      estimatedPremium,
      commissionRate: commissionRate / 100, // Store as decimal
      enabled,
    },
  });

  revalidatePath("/parametres/hypotheses");
  revalidatePath("/clients");
  revalidatePath("/reseau");
  return { success: true };
}

// ── Client-level override actions ──

const upsertOverrideSchema = z.object({
  clientId: z.string().min(1),
  typeProduit: z.string().min(1),
  recurringOverride: z.union([z.coerce.number().min(0), z.literal(""), z.null()]).transform((v) =>
    typeof v === "number" && !isNaN(v) ? v : null
  ),
  upfrontOverride: z.union([z.coerce.number().min(0), z.literal(""), z.null()]).transform((v) =>
    typeof v === "number" && !isNaN(v) ? v : null
  ),
});

export async function upsertPotentielOverride(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = upsertOverrideSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: "Donnees invalides" };
  }

  const { clientId, typeProduit, recurringOverride, upfrontOverride } = parsed.data;

  // If both null, delete the override (return to derived)
  if (recurringOverride === null && upfrontOverride === null) {
    await prisma.clientPotentielOverride.deleteMany({
      where: { clientId, typeProduit },
    });
  } else {
    await prisma.clientPotentielOverride.upsert({
      where: { clientId_typeProduit: { clientId, typeProduit } },
      create: { clientId, typeProduit, recurringOverride, upfrontOverride },
      update: { recurringOverride, upfrontOverride },
    });
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/reseau");
  return { success: true };
}

export async function deletePotentielOverride(clientId: string, typeProduit: string): Promise<{ error?: string } | void> {
  await prisma.clientPotentielOverride.deleteMany({
    where: { clientId, typeProduit },
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/reseau");
}
