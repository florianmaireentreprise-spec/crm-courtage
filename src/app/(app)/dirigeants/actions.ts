"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const dirigeantSchema = z.object({
  clientId: z.string().min(1),
  civilite: z.string().optional().nullable(),
  prenom: z.string().min(1),
  nom: z.string().min(1),
  email: z.string().optional().nullable(),
  telephone: z.string().optional().nullable(),
  dateNaissance: z.string().optional().nullable(),
  statutProfessionnel: z.string().optional().nullable(),
  mutuellePerso: z.string().optional().nullable(),
  prevoyancePerso: z.string().optional().nullable(),
  protectionActuelle: z.string().optional().nullable(),
  regimeRetraite: z.string().optional().nullable(),
  complementaireRetraite: z.string().optional().nullable(),
  epargneActuelle: z.string().optional().nullable(),
  montantEpargne: z.coerce.number().optional().nullable(),
  besoinsPatrimoniaux: z.string().optional().nullable(),
  objectifsRetraite: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function createDirigeant(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = dirigeantSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  // Verifier que le client n'a pas deja un dirigeant
  const existing = await prisma.dirigeant.findUnique({ where: { clientId: data.clientId } });
  if (existing) {
    return { error: { clientId: ["Ce client a deja un dirigeant enregistre"] } };
  }

  await prisma.dirigeant.create({
    data: {
      clientId: data.clientId,
      civilite: data.civilite || null,
      prenom: data.prenom,
      nom: data.nom,
      email: data.email || null,
      telephone: data.telephone || null,
      dateNaissance: data.dateNaissance ? new Date(data.dateNaissance) : null,
      statutProfessionnel: data.statutProfessionnel || null,
      mutuellePerso: data.mutuellePerso || null,
      prevoyancePerso: data.prevoyancePerso || null,
      protectionActuelle: data.protectionActuelle || null,
      regimeRetraite: data.regimeRetraite || null,
      complementaireRetraite: data.complementaireRetraite || null,
      epargneActuelle: data.epargneActuelle || null,
      montantEpargne: data.montantEpargne ?? null,
      besoinsPatrimoniaux: data.besoinsPatrimoniaux || null,
      objectifsRetraite: data.objectifsRetraite || null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/dirigeants");
  redirect("/dirigeants");
}
