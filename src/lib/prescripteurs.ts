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
