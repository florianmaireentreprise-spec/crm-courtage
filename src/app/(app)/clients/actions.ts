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
      codeNAF: data.codeNAF || null,
      trancheEffectifs: data.trancheEffectifs || null,
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
      codeNAF: data.codeNAF || null,
      trancheEffectifs: data.trancheEffectifs || null,
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

export async function archiveClient(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifie" };
  await prisma.client.update({
    where: { id },
    data: { archived: true, archivedAt: new Date() },
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
}

export async function unarchiveClient(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifie" };
  await prisma.client.update({
    where: { id },
    data: { archived: false, archivedAt: null },
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
}

export async function deleteClient(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non authentifie" };

  // Guard: count ALL linked data that would be CASCADE-deleted
  // Tache (SetNull) and Email (SetNull) are safe — they just get unlinked
  const [contrats, deals, documents, opportunites, dirigeant, inscriptions, signaux] = await Promise.all([
    prisma.contrat.count({ where: { clientId: id } }),
    prisma.deal.count({ where: { clientId: id } }),
    prisma.document.count({ where: { clientId: id } }),
    prisma.opportuniteCommerciale.count({ where: { clientId: id } }),
    prisma.dirigeant.count({ where: { clientId: id } }),
    prisma.sequenceInscription.count({ where: { clientId: id } }),
    prisma.signalCommercial.count({ where: { clientId: id } }),
  ]);

  if (contrats > 0 || deals > 0 || documents > 0 || opportunites > 0 || dirigeant > 0 || inscriptions > 0 || signaux > 0) {
    const parts: string[] = [];
    if (contrats > 0) parts.push(`${contrats} contrat${contrats > 1 ? "s" : ""}`);
    if (deals > 0) parts.push(`${deals} deal${deals > 1 ? "s" : ""}`);
    if (documents > 0) parts.push(`${documents} document${documents > 1 ? "s" : ""}`);
    if (opportunites > 0) parts.push(`${opportunites} opportunite${opportunites > 1 ? "s" : ""}`);
    if (dirigeant > 0) parts.push("1 dirigeant");
    if (inscriptions > 0) parts.push(`${inscriptions} inscription${inscriptions > 1 ? "s" : ""} sequence`);
    if (signaux > 0) parts.push(`${signaux} ${signaux > 1 ? "signaux commerciaux" : "signal commercial"}`);
    return {
      error: `Impossible de supprimer : ce client a ${parts.join(", ")}. Archivez-le ou supprimez d'abord ses donnees liees.`,
    };
  }

  await prisma.client.delete({ where: { id } });
  revalidatePath("/clients");
  redirect("/clients");
}
