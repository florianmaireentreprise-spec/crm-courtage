"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getActorId } from "@/lib/audit";
import { recalculerQualificationClient } from "@/lib/scoring/recalculerQualification";

/** Convert newline-separated text to JSON array string, or null if empty */
function linesToJson(v?: string): string | null {
  if (!v) return null;
  const lines = v.split("\n").map((s) => s.trim()).filter(Boolean);
  return lines.length > 0 ? JSON.stringify(lines) : null;
}

const TYPES_RDV = ["decouverte", "audit", "recommandation", "signature", "suivi", "autre"] as const;
const LIEUX = ["cabinet", "client", "visio", "telephone", "autre"] as const;

const crSchema = z.object({
  clientId: z.string().min(1),
  dealId: z.string().optional().transform((v) => v || null),
  dateRDV: z.coerce.date(),
  typeRDV: z.enum(TYPES_RDV),
  lieu: z.enum(LIEUX),
  interlocuteurs: z.string().min(1, "Interlocuteurs requis"),
  resume: z.string().min(1, "Résumé requis"),
  pointsCles: z.string().optional().transform((v) => linesToJson(v)),
  decisionsActions: z.string().optional().transform((v) => linesToJson(v)),
  prochainRDV: z.union([z.coerce.date(), z.literal(""), z.null()]).optional().transform((v) =>
    v instanceof Date && !isNaN(v.getTime()) ? v : null
  ),
  notes: z.string().optional().transform((v) => v?.trim() || null),
});

export async function createCompteRendu(formData: FormData) {
  const session = await auth();
  const actorId = getActorId(session);

  const raw = Object.fromEntries(formData.entries());
  const parsed = crSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  await prisma.compteRenduRDV.create({
    data: {
      clientId: data.clientId,
      dealId: data.dealId,
      dateRDV: data.dateRDV,
      typeRDV: data.typeRDV,
      lieu: data.lieu,
      interlocuteurs: data.interlocuteurs,
      resume: data.resume,
      pointsCles: data.pointsCles,
      decisionsActions: data.decisionsActions,
      prochainRDV: data.prochainRDV,
      notes: data.notes,
      createdByUserId: actorId,
    },
  });

  // Recalcul qualification après CR (les CR decouverte/audit déclenchent la progression)
  await recalculerQualificationClient(data.clientId);

  revalidatePath(`/clients/${data.clientId}`);
  return { success: true };
}

export async function updateCompteRendu(id: string, formData: FormData) {
  const session = await auth();
  const actorId = getActorId(session);

  const raw = Object.fromEntries(formData.entries());
  const parsed = crSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  await prisma.compteRenduRDV.update({
    where: { id },
    data: {
      dateRDV: data.dateRDV,
      typeRDV: data.typeRDV,
      lieu: data.lieu,
      interlocuteurs: data.interlocuteurs,
      resume: data.resume,
      pointsCles: data.pointsCles,
      decisionsActions: data.decisionsActions,
      prochainRDV: data.prochainRDV,
      notes: data.notes,
      updatedByUserId: actorId,
    },
  });

  revalidatePath(`/clients/${data.clientId}`);
  return { success: true };
}

export async function deleteCompteRendu(id: string, clientId: string) {
  await prisma.compteRenduRDV.delete({ where: { id } });
  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}
