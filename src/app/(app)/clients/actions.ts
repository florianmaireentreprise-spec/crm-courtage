"use server";

import { prisma } from "@/lib/prisma";
import { clientSchema } from "@/lib/validators/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { emitN8nEvent } from "@/lib/n8n";

export async function createClient(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = clientSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const client = await prisma.client.create({
    data: {
      raisonSociale: data.raisonSociale,
      siret: data.siret || null,
      formeJuridique: data.formeJuridique || null,
      secteurActivite: data.secteurActivite || null,
      nbSalaries: data.nbSalaries ?? null,
      chiffreAffaires: data.chiffreAffaires ?? null,
      conventionCollective: data.conventionCollective || null,
      mutuelleActuelle: data.mutuelleActuelle || null,
      prevoyanceActuelle: data.prevoyanceActuelle || null,
      dateEcheanceMutuelle: data.dateEcheanceMutuelle,
      dateEcheancePrevoyance: data.dateEcheancePrevoyance,
      civilite: data.civilite || null,
      prenom: data.prenom,
      nom: data.nom,
      email: data.email || null,
      telephone: data.telephone || null,
      adresse: data.adresse || null,
      codePostal: data.codePostal || null,
      ville: data.ville || null,
      dateNaissance: data.dateNaissance,
      sourceAcquisition: data.sourceAcquisition || null,
      prescripteurId: data.prescripteurId || null,
      notes: data.notes || null,
      statut: data.statut,
      assigneA: data.assigneA || null,
      categorieReseau: data.categorieReseau || null,
      typeRelation: data.typeRelation || null,
      statutReseau: data.statutReseau || null,
      niveauPotentiel: data.niveauPotentiel || null,
      potentielEstimeAnnuel: data.potentielEstimeAnnuel ?? null,
      horizonActivation: data.horizonActivation || null,
      prochaineActionReseau: data.prochaineActionReseau || null,
      dateRelanceReseau: data.dateRelanceReseau,
      dateDernierContact: data.dateDernierContact,
      commentaireReseau: data.commentaireReseau || null,
      courtierActuel: data.courtierActuel || null,
      assureurActuelSante: data.assureurActuelSante || null,
      dateDerniereRevision: data.dateDerniereRevision,
      motifChangement: data.motifChangement || null,
    },
  });

  void emitN8nEvent({
    type: "client.created",
    timestamp: new Date().toISOString(),
    payload: {
      clientId: client.id,
      raisonSociale: client.raisonSociale,
      siret: client.siret,
      secteurActivite: client.secteurActivite,
      nbSalaries: client.nbSalaries,
      ville: client.ville,
      statut: client.statut,
      sourceAcquisition: client.sourceAcquisition,
    },
  });

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function updateClient(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = clientSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  await prisma.client.update({
    where: { id },
    data: {
      raisonSociale: data.raisonSociale,
      siret: data.siret || null,
      formeJuridique: data.formeJuridique || null,
      secteurActivite: data.secteurActivite || null,
      nbSalaries: data.nbSalaries ?? null,
      chiffreAffaires: data.chiffreAffaires ?? null,
      conventionCollective: data.conventionCollective || null,
      mutuelleActuelle: data.mutuelleActuelle || null,
      prevoyanceActuelle: data.prevoyanceActuelle || null,
      dateEcheanceMutuelle: data.dateEcheanceMutuelle,
      dateEcheancePrevoyance: data.dateEcheancePrevoyance,
      civilite: data.civilite || null,
      prenom: data.prenom,
      nom: data.nom,
      email: data.email || null,
      telephone: data.telephone || null,
      adresse: data.adresse || null,
      codePostal: data.codePostal || null,
      ville: data.ville || null,
      dateNaissance: data.dateNaissance,
      sourceAcquisition: data.sourceAcquisition || null,
      prescripteurId: data.prescripteurId || null,
      notes: data.notes || null,
      statut: data.statut,
      assigneA: data.assigneA || null,
      categorieReseau: data.categorieReseau || null,
      typeRelation: data.typeRelation || null,
      statutReseau: data.statutReseau || null,
      niveauPotentiel: data.niveauPotentiel || null,
      potentielEstimeAnnuel: data.potentielEstimeAnnuel ?? null,
      horizonActivation: data.horizonActivation || null,
      prochaineActionReseau: data.prochaineActionReseau || null,
      dateRelanceReseau: data.dateRelanceReseau,
      dateDernierContact: data.dateDernierContact,
      commentaireReseau: data.commentaireReseau || null,
      courtierActuel: data.courtierActuel || null,
      assureurActuelSante: data.assureurActuelSante || null,
      dateDerniereRevision: data.dateDerniereRevision,
      motifChangement: data.motifChangement || null,
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}

export async function deleteClient(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifie" };
  await prisma.client.delete({ where: { id } });
  revalidatePath("/clients");
  redirect("/clients");
}
