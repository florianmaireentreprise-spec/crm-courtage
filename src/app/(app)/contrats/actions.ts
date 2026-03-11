"use server";

import { prisma } from "@/lib/prisma";
import { getEnvironnement } from "@/lib/environnement";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";

const contratSchema = z.object({
  clientId: z.string().min(1),
  typeProduit: z.string().min(1),
  compagnieId: z.string().optional().nullable(),
  nomProduit: z.string().optional().nullable(),
  numeroContrat: z.string().optional().nullable(),
  primeAnnuelle: z.coerce.number().min(0),
  tauxCommApport: z.coerce.number().min(0).max(1).optional().nullable(),
  tauxCommGestion: z.coerce.number().min(0).max(1).optional().nullable(),
  modeVersement: z.string().optional().nullable(),
  frequenceVersement: z.string().optional().nullable(),
  dateEffet: z.string().min(1),
  dateEcheance: z.string().optional().nullable(),
  nbBeneficiaires: z.coerce.number().int().min(0).optional().nullable(),
  cotisationUnitaire: z.coerce.number().min(0).optional().nullable(),
  statut: z.string().default("actif"),
  notes: z.string().optional().nullable(),
});

export async function createContrat(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = contratSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const commissionAnnuelle =
    data.primeAnnuelle * (data.tauxCommGestion ?? 0);

  const env = await getEnvironnement();
  const contrat = await prisma.contrat.create({
    data: {
      environnement: env,
      clientId: data.clientId,
      typeProduit: data.typeProduit,
      compagnieId: data.compagnieId || null,
      nomProduit: data.nomProduit || null,
      numeroContrat: data.numeroContrat || null,
      primeAnnuelle: data.primeAnnuelle,
      tauxCommApport: data.tauxCommApport ?? null,
      tauxCommGestion: data.tauxCommGestion ?? null,
      commissionAnnuelle,
      modeVersement: data.modeVersement || null,
      frequenceVersement: data.frequenceVersement || null,
      dateEffet: new Date(data.dateEffet),
      dateEcheance: data.dateEcheance ? new Date(data.dateEcheance) : null,
      nbBeneficiaires: data.nbBeneficiaires ?? null,
      cotisationUnitaire: data.cotisationUnitaire ?? null,
      statut: data.statut,
      notes: data.notes || null,
    },
  });

  // Auto-generate commission entries
  if (data.tauxCommApport && data.tauxCommApport > 0) {
    await prisma.commission.create({
      data: {
        contratId: contrat.id,
        montant: data.primeAnnuelle * data.tauxCommApport,
        type: "APPORT",
        periode: new Date(data.dateEffet).toISOString().slice(0, 7),
        statut: "prevu",
      },
    });
  }

  if (data.tauxCommGestion && data.tauxCommGestion > 0) {
    await prisma.commission.create({
      data: {
        contratId: contrat.id,
        montant: commissionAnnuelle,
        type: "GESTION",
        periode: new Date().getFullYear().toString(),
        statut: "prevu",
      },
    });
  }

  // Update compagnie stats
  if (data.compagnieId) {
    const stats = await prisma.contrat.aggregate({
      where: { compagnieId: data.compagnieId, statut: "actif" },
      _count: true,
      _sum: { primeAnnuelle: true },
    });
    await prisma.compagnie.update({
      where: { id: data.compagnieId },
      data: {
        nbContratsActifs: stats._count,
        primesCumulees: stats._sum.primeAnnuelle ?? 0,
      },
    });
  }

  revalidatePath("/contrats");
  revalidatePath("/clients");
  revalidatePath("/");
  redirect(`/contrats/${contrat.id}`);
}

export async function updateContrat(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = contratSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const commissionAnnuelle = data.primeAnnuelle * (data.tauxCommGestion ?? 0);

  const oldContrat = await prisma.contrat.findUnique({ where: { id } });

  await prisma.contrat.update({
    where: { id },
    data: {
      clientId: data.clientId,
      typeProduit: data.typeProduit,
      compagnieId: data.compagnieId || null,
      nomProduit: data.nomProduit || null,
      numeroContrat: data.numeroContrat || null,
      primeAnnuelle: data.primeAnnuelle,
      tauxCommApport: data.tauxCommApport ?? null,
      tauxCommGestion: data.tauxCommGestion ?? null,
      commissionAnnuelle,
      modeVersement: data.modeVersement || null,
      frequenceVersement: data.frequenceVersement || null,
      dateEffet: new Date(data.dateEffet),
      dateEcheance: data.dateEcheance ? new Date(data.dateEcheance) : null,
      nbBeneficiaires: data.nbBeneficiaires ?? null,
      cotisationUnitaire: data.cotisationUnitaire ?? null,
      statut: data.statut,
      notes: data.notes || null,
    },
  });

  // Update compagnie stats if compagnie changed
  const compagnieIds = new Set<string>();
  if (oldContrat?.compagnieId) compagnieIds.add(oldContrat.compagnieId);
  if (data.compagnieId) compagnieIds.add(data.compagnieId);

  for (const cId of compagnieIds) {
    const stats = await prisma.contrat.aggregate({
      where: { compagnieId: cId, statut: "actif" },
      _count: true,
      _sum: { primeAnnuelle: true },
    });
    await prisma.compagnie.update({
      where: { id: cId },
      data: {
        nbContratsActifs: stats._count,
        primesCumulees: stats._sum.primeAnnuelle ?? 0,
      },
    });
  }

  revalidatePath("/contrats");
  revalidatePath("/clients");
  revalidatePath("/commissions");
  revalidatePath("/");
  redirect(`/contrats/${id}`);
}

export async function deleteContrat(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifie" };
  const contrat = await prisma.contrat.findUnique({ where: { id } });
  await prisma.contrat.delete({ where: { id } });

  if (contrat?.compagnieId) {
    const stats = await prisma.contrat.aggregate({
      where: { compagnieId: contrat.compagnieId, statut: "actif" },
      _count: true,
      _sum: { primeAnnuelle: true },
    });
    await prisma.compagnie.update({
      where: { id: contrat.compagnieId },
      data: {
        nbContratsActifs: stats._count,
        primesCumulees: stats._sum.primeAnnuelle ?? 0,
      },
    });
  }

  revalidatePath("/contrats");
  revalidatePath("/clients");
  redirect("/contrats");
}
