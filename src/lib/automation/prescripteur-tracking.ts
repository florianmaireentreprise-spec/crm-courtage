import { prisma } from "@/lib/prisma";

// ── Types ──

export type PrescripteurAlerte = {
  id: string;
  prescripteurId: string;
  prescripteurNom: string;
  type: "silencieux" | "lead_signe" | "performance";
  message: string;
  priorite: "haute" | "normale";
};

// ── Detection des prescripteurs a relancer ──

export async function detecterPrescripteursARelancer(): Promise<PrescripteurAlerte[]> {
  const alertes: PrescripteurAlerte[] = [];
  const troisSemaines = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);

  // Prescripteurs actifs avec derniere reco > 3 semaines
  const prescripteurs = await prisma.prescripteur.findMany({
    where: { statut: "actif" },
    select: {
      id: true,
      prenom: true,
      nom: true,
      entreprise: true,
      dossiersEnvoyes: true,
      clientsSignes: true,
      derniereRecommandation: true,
    },
  });

  for (const p of prescripteurs) {
    const nomComplet = `${p.prenom} ${p.nom}${p.entreprise ? ` (${p.entreprise})` : ""}`;

    // Prescripteur silencieux
    if (p.dossiersEnvoyes > 0 && p.derniereRecommandation && p.derniereRecommandation < troisSemaines) {
      const joursDepuis = Math.floor((Date.now() - p.derniereRecommandation.getTime()) / (24 * 60 * 60 * 1000));
      alertes.push({
        id: `silencieux-${p.id}`,
        prescripteurId: p.id,
        prescripteurNom: nomComplet,
        type: "silencieux",
        message: `Aucun lead depuis ${joursDepuis} jours. Planifier un dejeuner ou un appel.`,
        priorite: joursDepuis > 45 ? "haute" : "normale",
      });
    }

    // Performance : prescripteur qui envoie mais peu de conversions
    if (p.dossiersEnvoyes >= 5 && p.clientsSignes === 0) {
      alertes.push({
        id: `performance-${p.id}`,
        prescripteurId: p.id,
        prescripteurNom: nomComplet,
        type: "performance",
        message: `${p.dossiersEnvoyes} leads envoyes, 0 signe. Qualifier les leads avec ce prescripteur.`,
        priorite: "normale",
      });
    }
  }

  // Leads recents de prescripteurs qui ont signe
  const clientsSignesRecents = await prisma.client.findMany({
    where: {
      prescripteurId: { not: null },
      statut: "client_actif",
      dateMaj: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    include: { prescripteur: true },
  });

  for (const client of clientsSignesRecents) {
    if (client.prescripteur) {
      const nomComplet = `${client.prescripteur.prenom} ${client.prescripteur.nom}`;
      // Verifier si une tache merci existe deja
      const existingTask = await prisma.tache.findFirst({
        where: {
          titre: { contains: `Remercier ${nomComplet}` },
          statut: { in: ["a_faire", "en_cours"] },
        },
      });
      if (!existingTask) {
        alertes.push({
          id: `lead_signe-${client.id}`,
          prescripteurId: client.prescripteur.id,
          prescripteurNom: nomComplet,
          type: "lead_signe",
          message: `${client.raisonSociale} signe grâce à ${nomComplet}. Envoyer un merci + feedback !`,
          priorite: "haute",
        });
      }
    }
  }

  return alertes;
}

// ── Classement des prescripteurs ──

export async function getClassementPrescripteurs() {
  const prescripteurs = await prisma.prescripteur.findMany({
    where: { statut: "actif" },
    select: {
      id: true,
      prenom: true,
      nom: true,
      entreprise: true,
      type: true,
      dossiersEnvoyes: true,
      clientsSignes: true,
      commissionsGenerees: true,
      derniereRecommandation: true,
    },
    orderBy: { clientsSignes: "desc" },
  });

  return prescripteurs.map((p) => ({
    ...p,
    nomComplet: `${p.prenom} ${p.nom}`,
    tauxConversion: p.dossiersEnvoyes > 0 ? Math.round((p.clientsSignes / p.dossiersEnvoyes) * 100) : 0,
    actif: p.derniereRecommandation
      ? p.derniereRecommandation > new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      : false,
  }));
}
