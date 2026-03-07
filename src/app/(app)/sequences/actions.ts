"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { inscrireClientSequence, initDefaultSequences } from "@/lib/sequences";

export async function getSequences() {
  return prisma.sequence.findMany({
    where: { active: true },
    include: {
      inscriptions: {
        include: { client: { select: { id: true, raisonSociale: true } } },
        orderBy: { dateInscription: "desc" },
      },
    },
    orderBy: { dateCreation: "asc" },
  });
}

export async function inscrireClient(clientId: string, sequenceId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifie" };

  try {
    await inscrireClientSequence(clientId, sequenceId);
    revalidatePath("/sequences");
    revalidatePath(`/clients/${clientId}`);
    return { success: true };
  } catch (err) {
    console.error("Erreur inscription sequence:", err);
    return { error: "Erreur lors de l'inscription" };
  }
}

export async function annulerInscription(inscriptionId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifie" };

  await prisma.sequenceInscription.update({
    where: { id: inscriptionId },
    data: { statut: "annulee" },
  });
  revalidatePath("/sequences");
  return { success: true };
}

export async function initSequences() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifie" };

  const created = await initDefaultSequences();
  revalidatePath("/sequences");
  return { success: true, created };
}

export async function getClientsForSequence() {
  return prisma.client.findMany({
    where: { statut: { in: ["prospect", "client_actif"] } },
    select: { id: true, raisonSociale: true, prenom: true, nom: true, statut: true },
    orderBy: { raisonSociale: "asc" },
  });
}
