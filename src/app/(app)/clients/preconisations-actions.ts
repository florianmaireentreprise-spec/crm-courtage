"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getActorId } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const preconisationSchema = z.object({
  clientId: z.string().min(1),
  dealId: z.string().optional().nullable(),
  theme: z.string().min(1),
  titre: z.string().min(1),
  justification: z.string().optional().nullable(),
  priorite: z.string().default("moyenne"),
  statut: z.string().default("a_preparer"),
  prochainePas: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function createPreconisation(formData: FormData) {
  const session = await auth();
  const actorId = getActorId(session);

  // Verify actorId exists in User table before using as FK
  let validActorId: string | undefined = undefined;
  if (actorId) {
    const user = await prisma.user.findUnique({ where: { id: actorId }, select: { id: true } });
    if (user) validActorId = actorId;
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = preconisationSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  await prisma.preconisation.create({
    data: {
      clientId: data.clientId,
      dealId: data.dealId || null,
      theme: data.theme,
      titre: data.titre,
      justification: data.justification || null,
      priorite: data.priorite,
      statut: data.statut,
      prochainePas: data.prochainePas || null,
      notes: data.notes || null,
      createdByUserId: validActorId,
      updatedByUserId: validActorId,
    },
  });

  revalidatePath(`/clients/${data.clientId}`);
  revalidatePath("/");
}

export async function updatePreconisation(precoId: string, formData: FormData) {
  const session = await auth();
  const actorId = getActorId(session);

  let validActorId: string | undefined = undefined;
  if (actorId) {
    const user = await prisma.user.findUnique({ where: { id: actorId }, select: { id: true } });
    if (user) validActorId = actorId;
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = preconisationSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  await prisma.preconisation.update({
    where: { id: precoId },
    data: {
      dealId: data.dealId || null,
      theme: data.theme,
      titre: data.titre,
      justification: data.justification || null,
      priorite: data.priorite,
      statut: data.statut,
      prochainePas: data.prochainePas || null,
      notes: data.notes || null,
      updatedByUserId: validActorId,
    },
  });

  revalidatePath(`/clients/${data.clientId}`);
  revalidatePath("/");
}

export async function updatePreconisationStatut(precoId: string, clientId: string, statut: string) {
  const session = await auth();
  const actorId = getActorId(session);

  let validActorId: string | undefined = undefined;
  if (actorId) {
    const user = await prisma.user.findUnique({ where: { id: actorId }, select: { id: true } });
    if (user) validActorId = actorId;
  }

  await prisma.preconisation.update({
    where: { id: precoId },
    data: {
      statut,
      updatedByUserId: validActorId,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/");
}

export async function deletePreconisation(precoId: string, clientId: string) {
  await prisma.preconisation.delete({ where: { id: precoId } });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/");
}
