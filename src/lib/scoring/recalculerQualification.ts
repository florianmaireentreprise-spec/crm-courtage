"use server";

import { prisma } from "@/lib/prisma";
import { calculerQualification } from "./qualification";

/**
 * Recalcule et persiste le qualificationStatut d'un client.
 * Appelé après : update client, update dirigeant, création/modif CR RDV.
 */
export async function recalculerQualificationClient(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      raisonSociale: true,
      siret: true,
      formeJuridique: true,
      secteurActivite: true,
      nbSalaries: true,
      conventionCollective: true,
      prenom: true,
      nom: true,
      email: true,
      telephone: true,
      mutuelleActuelle: true,
      prevoyanceActuelle: true,
      dateEcheanceMutuelle: true,
      dateEcheancePrevoyance: true,
      dirigeant: {
        select: {
          statutProfessionnel: true,
          mutuellePerso: true,
          prevoyancePerso: true,
          regimeRetraite: true,
          dateNaissance: true,
        },
      },
    },
  });

  if (!client) return null;

  const result = calculerQualification(client);

  await prisma.client.update({
    where: { id: clientId },
    data: {
      qualificationStatut: result.statut,
      ...(result.statut === "qualifie" ? { dateQualification: new Date() } : {}),
    },
  });

  return result;
}
