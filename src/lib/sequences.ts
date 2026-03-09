import { prisma } from "@/lib/prisma";

// ── Types ──

export type EtapeSequence = {
  jour: number;
  action: "email_ia" | "tache" | "auto_perdu";
  titre: string;
  type?: string;
  prompt?: string;
  motif?: string;
};

// ── Sequences par defaut ──

export const SEQUENCES_DEFAUT = [
  {
    nom: "Nouveau prospect TPE/PME",
    description: "Sequence d'approche pour nouveaux prospects identifies",
    etapes: [
      { jour: 0, action: "tache", titre: "Email d'introduction personnalise", type: "ADMIN" },
      { jour: 3, action: "tache", titre: "Relancer par telephone", type: "APPEL" },
      { jour: 7, action: "tache", titre: "Email de valeur (checklist obligations employeur)", type: "ADMIN" },
      { jour: 14, action: "tache", titre: "Dernier appel ou archiver", type: "APPEL" },
      { jour: 21, action: "auto_perdu", titre: "Cloturer si pas de reponse", motif: "Pas de reponse" },
    ],
  },
  {
    nom: "Post-devis en attente",
    description: "Relance apres envoi de devis sans reponse",
    etapes: [
      { jour: 3, action: "tache", titre: "Relance douce post-devis", type: "ADMIN" },
      { jour: 7, action: "tache", titre: "Appeler pour debriefer le devis", type: "APPEL" },
      { jour: 14, action: "tache", titre: "Derniere relance avec urgence", type: "ADMIN" },
    ],
  },
  {
    nom: "Onboarding nouveau client",
    description: "Suivi post-signature pour un nouveau client",
    etapes: [
      { jour: 0, action: "tache", titre: "Email de bienvenue", type: "ADMIN" },
      { jour: 7, action: "tache", titre: "Verifier mise en place contrats", type: "ADMIN" },
      { jour: 30, action: "tache", titre: "Appel de satisfaction 1 mois", type: "APPEL" },
      { jour: 90, action: "tache", titre: "Proposer audit dirigeant / epargne", type: "RDV" },
    ],
  },
] as const;

// ── Initialisation des sequences par defaut ──

export async function initDefaultSequences(): Promise<number> {
  let created = 0;
  for (const seq of SEQUENCES_DEFAUT) {
    const exists = await prisma.sequence.findFirst({ where: { nom: seq.nom } });
    if (!exists) {
      await prisma.sequence.create({
        data: {
          nom: seq.nom,
          description: seq.description,
          etapes: JSON.stringify(seq.etapes),
        },
      });
      created++;
    }
  }
  return created;
}

// ── Inscrire un client dans une sequence ──

export async function inscrireClientSequence(clientId: string, sequenceId: string) {
  const existing = await prisma.sequenceInscription.findFirst({
    where: { clientId, sequenceId, statut: "en_cours" },
  });
  if (existing) return existing;

  const sequence = await prisma.sequence.findUnique({ where: { id: sequenceId } });
  if (!sequence) throw new Error("Sequence introuvable");

  const etapes: EtapeSequence[] = JSON.parse(sequence.etapes);
  const premierJour = etapes[0]?.jour ?? 0;
  const prochaineAction = new Date(Date.now() + premierJour * 24 * 60 * 60 * 1000);

  return prisma.sequenceInscription.create({
    data: {
      sequenceId,
      clientId,
      etapeActuelle: 0,
      dateProchaineAction: prochaineAction,
    },
  });
}
