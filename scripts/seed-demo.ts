/**
 * seed-demo.ts — Canonical source of demo data for the CRM Courtage demo environment.
 *
 * Usage:
 *   DIRECT_URL=<demo-neon-branch-url> npx tsx scripts/seed-demo.ts
 *
 * This script:
 *   1. Wipes ALL data in FK-aware order (leaves → roots)
 *   2. Seeds rich, realistic demo data (roots → leaves)
 *   3. Is idempotent — safe to run multiple times
 *
 * Designed for Neon demo branch only. NEVER run against production.
 */

import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

// ── Helpers ──

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const today = new Date();

async function main() {
  console.log("=== DEMO SEED: Starting full wipe + seed ===\n");

  // ═══════════════════════════════════════════════════════
  // PHASE 1: FK-aware WIPE (leaves → roots)
  // ═══════════════════════════════════════════════════════

  console.log("Phase 1: Wiping all data (FK-aware order)...");

  // Layer 1 — Pure leaves (no children depend on them)
  await prisma.feedbackIA.deleteMany();
  await prisma.signalCommercial.deleteMany();
  await prisma.n8nLog.deleteMany();
  console.log("  [1/11] FeedbackIA, SignalCommercial, N8nLog");

  // Layer 2 — Commission (child of Contrat)
  await prisma.commission.deleteMany();
  console.log("  [2/11] Commission");

  // Layer 3 — Document, OpportuniteCommerciale, Preconisation (children of Client + optional FKs)
  await prisma.document.deleteMany();
  await prisma.opportuniteCommerciale.deleteMany();
  await prisma.preconisation.deleteMany();
  console.log("  [3/11] Document, OpportuniteCommerciale, Preconisation");

  // Layer 4 — Tache, SequenceInscription (children of Client/Email/Sequence)
  await prisma.tache.deleteMany();
  await prisma.sequenceInscription.deleteMany();
  console.log("  [4/11] Tache, SequenceInscription");

  // Layer 5 — Deal, Contrat, Email (children of Client, parents of Commission/Tache)
  await prisma.deal.deleteMany();
  await prisma.contrat.deleteMany();
  await prisma.email.deleteMany();
  console.log("  [5/11] Deal, Contrat, Email");

  // Layer 6 — Dirigeant (1:1 child of Client)
  await prisma.dirigeant.deleteMany();
  console.log("  [6/11] Dirigeant");

  // Layer 7 — Client (parent of many)
  await prisma.client.deleteMany();
  console.log("  [7/11] Client");

  // Layer 8 — Prescripteur, Compagnie (referenced by Client/Contrat/Deal)
  await prisma.prescripteur.deleteMany();
  await prisma.compagnie.deleteMany();
  console.log("  [8/11] Prescripteur, Compagnie");

  // Layer 9 — Sequence, Objectif, ReseauObjectif, RapportHebdo
  await prisma.sequence.deleteMany();
  await prisma.objectif.deleteMany();
  await prisma.reseauObjectif.deleteMany();
  await prisma.rapportHebdo.deleteMany();
  console.log("  [9/11] Sequence, Objectif, ReseauObjectif, RapportHebdo");

  // Layer 10 — GmailConnection, Settings
  await prisma.gmailConnection.deleteMany();
  await prisma.settings.deleteMany();
  console.log("  [10/11] GmailConnection, Settings");

  // Layer 11 — Workspace, then User (nothing references User as FK except session)
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
  console.log("  [11/11] Workspace, User");

  console.log("  Wipe complete.\n");

  // ═══════════════════════════════════════════════════════
  // PHASE 2: SEED (roots → leaves)
  // ═══════════════════════════════════════════════════════

  console.log("Phase 2: Seeding demo data...");

  // ── 1. User ──

  const user = await prisma.user.create({
    data: {
      email: "demo@gargarine.fr",
      password: hashSync("demo123", 10),
      prenom: "Florian",
      nom: "Maire",
      role: "gerant",
    },
  });
  console.log("  [1] User: demo@gargarine.fr / demo123");

  // ── 2. Workspace ──

  const workspace = await prisma.workspace.create({
    data: {
      slug: "real",
      nom: "Cabinet Gargarine (Demo)",
      isDefault: true,
    },
  });
  const wsId = workspace.id;
  console.log("  [2] Workspace: real (default)");

  // ── 3. Compagnies (8) ──

  const compagnies = await Promise.all([
    prisma.compagnie.create({
      data: {
        nom: "Mutex", type: "ASSUREUR_DIRECT",
        contactNom: "Sophie Martin", contactEmail: "s.martin@mutex.fr", contactTelephone: "03 88 12 34 56",
        conventionSignee: true, dateConvention: new Date("2025-01-15"),
        seuilSurcommission: 20, tauxSurcommission: 0.02,
        workspaceId: wsId,
      },
    }),
    prisma.compagnie.create({
      data: {
        nom: "Apicil", type: "ASSUREUR_DIRECT",
        contactNom: "Marc Lefevre", contactEmail: "m.lefevre@apicil.com", contactTelephone: "04 72 45 67 89",
        conventionSignee: true, dateConvention: new Date("2024-06-01"),
        seuilSurcommission: 15, tauxSurcommission: 0.015,
        workspaceId: wsId,
      },
    }),
    prisma.compagnie.create({
      data: {
        nom: "April", type: "GROSSISTE",
        contactNom: "Julie Perrin", contactEmail: "j.perrin@april.fr", contactTelephone: "04 72 36 78 90",
        conventionSignee: true, dateConvention: new Date("2025-03-01"),
        seuilSurcommission: 25, tauxSurcommission: 0.025,
        workspaceId: wsId,
      },
    }),
    prisma.compagnie.create({
      data: {
        nom: "Generali", type: "ASSUREUR_DIRECT",
        contactNom: "Pierre Dubois", contactEmail: "p.dubois@generali.fr", contactTelephone: "01 58 34 56 78",
        conventionSignee: true, dateConvention: new Date("2024-09-15"),
        seuilSurcommission: 30, tauxSurcommission: 0.03,
        workspaceId: wsId,
      },
    }),
    prisma.compagnie.create({
      data: {
        nom: "SwissLife", type: "ASSUREUR_DIRECT",
        contactNom: "Anne Bertrand", contactEmail: "a.bertrand@swisslife.fr", contactTelephone: "01 45 67 89 01",
        conventionSignee: false, seuilSurcommission: 20, tauxSurcommission: 0.02,
        workspaceId: wsId,
      },
    }),
    prisma.compagnie.create({
      data: {
        nom: "AXA", type: "ASSUREUR_DIRECT",
        contactNom: "Luc Moreau", contactEmail: "l.moreau@axa.fr", contactTelephone: "01 55 78 90 12",
        conventionSignee: true, dateConvention: new Date("2025-02-01"),
        seuilSurcommission: 25, tauxSurcommission: 0.02,
        workspaceId: wsId,
      },
    }),
    prisma.compagnie.create({
      data: {
        nom: "Malakoff Humanis", type: "ASSUREUR_DIRECT",
        contactNom: "Claire Roux", contactEmail: "c.roux@malakoffhumanis.com", contactTelephone: "01 56 78 90 23",
        conventionSignee: true, dateConvention: new Date("2024-11-01"),
        seuilSurcommission: 18, tauxSurcommission: 0.018,
        workspaceId: wsId,
      },
    }),
    prisma.compagnie.create({
      data: {
        nom: "Alptis", type: "GROSSISTE",
        contactNom: "David Simon", contactEmail: "d.simon@alptis.org", contactTelephone: "04 72 56 78 90",
        conventionSignee: false,
        workspaceId: wsId,
      },
    }),
  ]);

  const [mutex, apicil, april, generali, , axa, malakoff] = compagnies;
  console.log("  [3] Compagnies: 8");

  // ── 4. Prescripteurs (3) ──

  const prescripteur1 = await prisma.prescripteur.create({
    data: {
      prenom: "Robert", nom: "Schmitt", entreprise: "Cabinet Comptable Alsace",
      type: "EXPERT_COMPTABLE", email: "r.schmitt@cabinet-alsace.fr", telephone: "03 88 56 78 90",
      ville: "Strasbourg", dossiersEnvoyes: 5, clientsSignes: 3, commissionsGenerees: 2800,
      workspaceId: wsId,
    },
  });

  const prescripteur2 = await prisma.prescripteur.create({
    data: {
      prenom: "Stephane", nom: "Koch", entreprise: "Reseau BNI Strasbourg Centre",
      type: "PARTENAIRE", email: "s.koch@bni-strasbourg.fr", telephone: "06 78 90 12 34",
      ville: "Strasbourg", dossiersEnvoyes: 3, clientsSignes: 2, commissionsGenerees: 1200,
      workspaceId: wsId,
    },
  });

  const prescripteur3 = await prisma.prescripteur.create({
    data: {
      prenom: "Catherine", nom: "Weiss", entreprise: "Cabinet Avocat Weiss & Associes",
      type: "AVOCAT", email: "c.weiss@avocat-weiss.fr", telephone: "03 88 23 45 67",
      ville: "Strasbourg", dossiersEnvoyes: 2, clientsSignes: 1, commissionsGenerees: 650,
      workspaceId: wsId,
    },
  });
  console.log("  [4] Prescripteurs: 3");

  // ── 5. Clients (10 — 5 actifs, 2 prospects, 3 reseau contacts) ──

  const client1 = await prisma.client.create({
    data: {
      raisonSociale: "Boulangerie Dupont SARL", siret: "44312345600021", formeJuridique: "SARL",
      secteurActivite: "Boulangerie-Patisserie", nbSalaries: 8, chiffreAffaires: 450000,
      conventionCollective: "Boulangerie-patisserie artisanale",
      civilite: "M.", prenom: "Jean", nom: "Dupont",
      email: "jean.dupont@boulangerie-dupont.fr", telephone: "06 12 34 56 78",
      adresse: "12 rue de la Republique", codePostal: "67000", ville: "Strasbourg",
      dateNaissance: new Date("1975-03-15"),
      sourceAcquisition: "Expert-comptable", prescripteurId: prescripteur1.id,
      statut: "client_actif", assigneA: user.id,
      workspaceId: wsId,
    },
  });

  const client2 = await prisma.client.create({
    data: {
      raisonSociale: "Tech Solutions SAS", siret: "52345678900015", formeJuridique: "SAS",
      secteurActivite: "Services informatiques", nbSalaries: 25, chiffreAffaires: 1800000,
      conventionCollective: "Syntec",
      civilite: "Mme", prenom: "Marie", nom: "Laurent",
      email: "m.laurent@techsolutions.fr", telephone: "06 23 45 67 89",
      adresse: "45 avenue de la Liberte", codePostal: "57000", ville: "Metz",
      dateNaissance: new Date("1982-07-22"),
      sourceAcquisition: "LinkedIn", statut: "client_actif", assigneA: user.id,
      workspaceId: wsId,
    },
  });

  const client3 = await prisma.client.create({
    data: {
      raisonSociale: "Cabinet Architecte Muller", siret: "38912345600018", formeJuridique: "EURL",
      secteurActivite: "Architecture", nbSalaries: 3, chiffreAffaires: 320000,
      civilite: "M.", prenom: "Francois", nom: "Muller",
      email: "f.muller@archi-muller.fr", telephone: "06 34 56 78 90",
      adresse: "8 place Kleber", codePostal: "67000", ville: "Strasbourg",
      dateNaissance: new Date("1968-11-05"),
      sourceAcquisition: "BNI / Reseau affaires", prescripteurId: prescripteur2.id,
      statut: "client_actif", assigneA: user.id,
      workspaceId: wsId,
    },
  });

  const client4 = await prisma.client.create({
    data: {
      raisonSociale: "Restaurant Le Gourmet", siret: "91234567800012", formeJuridique: "SARL",
      secteurActivite: "Restauration", nbSalaries: 12, chiffreAffaires: 680000,
      conventionCollective: "HCR",
      civilite: "M.", prenom: "Philippe", nom: "Bernard",
      email: "p.bernard@legourmet.fr", telephone: "06 45 67 89 01",
      adresse: "22 rue des Orfevres", codePostal: "68000", ville: "Colmar",
      dateNaissance: new Date("1970-05-18"),
      sourceAcquisition: "Parrainage client", statut: "client_actif", assigneA: user.id,
      workspaceId: wsId,
    },
  });

  const client5 = await prisma.client.create({
    data: {
      raisonSociale: "Garage Auto Plus", siret: "78345678900025", formeJuridique: "SAS",
      secteurActivite: "Reparation automobile", nbSalaries: 6, chiffreAffaires: 520000,
      conventionCollective: "Services de l'automobile",
      civilite: "M.", prenom: "Christophe", nom: "Weber",
      email: "c.weber@autoplus.fr", telephone: "06 56 78 90 12",
      adresse: "Zone Industrielle Nord", codePostal: "54000", ville: "Nancy",
      dateNaissance: new Date("1978-09-30"),
      sourceAcquisition: "Cold call", statut: "prospect", assigneA: user.id,
      workspaceId: wsId,
    },
  });

  const client6 = await prisma.client.create({
    data: {
      raisonSociale: "Pharmacie Centrale", siret: "65432198700014", formeJuridique: "SELARL",
      secteurActivite: "Pharmacie", nbSalaries: 5, chiffreAffaires: 950000,
      civilite: "Mme", prenom: "Claire", nom: "Hoffmann",
      email: "c.hoffmann@pharmacie-centrale.fr", telephone: "06 67 89 01 23",
      adresse: "3 place de la Cathedrale", codePostal: "67000", ville: "Strasbourg",
      dateNaissance: new Date("1980-01-12"),
      sourceAcquisition: "Reseau personnel", statut: "client_actif",
      prescripteurId: prescripteur3.id, assigneA: user.id,
      workspaceId: wsId,
    },
  });

  const client7 = await prisma.client.create({
    data: {
      raisonSociale: "SARL Menuiserie Keller", siret: "32165498700028", formeJuridique: "SARL",
      secteurActivite: "Menuiserie", nbSalaries: 4, chiffreAffaires: 280000,
      civilite: "M.", prenom: "Marc", nom: "Keller",
      email: "m.keller@menuiserie-keller.fr", telephone: "06 78 12 34 56",
      adresse: "15 rue du Travail", codePostal: "67200", ville: "Strasbourg",
      dateNaissance: new Date("1972-06-08"),
      sourceAcquisition: "Recommandation", statut: "prospect", assigneA: user.id,
      workspaceId: wsId,
    },
  });

  // ── 3 reseau contacts (with categorieReseau) ──

  const reseauContact1 = await prisma.client.create({
    data: {
      raisonSociale: "Cabinet Dr. Martin", civilite: "Dr", prenom: "Pierre", nom: "Martin",
      email: "p.martin@cabinet-martin.fr", telephone: "06 11 22 33 44",
      ville: "Strasbourg", secteurActivite: "Medecine generale",
      categorieReseau: "medecin",
      typeRelation: "prescripteur_potentiel", statutReseau: "echange_fait",
      niveauPotentiel: "fort", potentielEstimeAnnuel: 5000,
      horizonActivation: "court", prochaineActionReseau: "Inviter dejeuner reseau",
      dateDernierContact: addDays(today, -7),
      statut: "prospect", sourceAcquisition: "Reseau personnel",
      workspaceId: wsId,
    },
  });

  const reseauContact2 = await prisma.client.create({
    data: {
      raisonSociale: "SCP Notaire Vogel & Associes", civilite: "Me", prenom: "Antoine", nom: "Vogel",
      email: "a.vogel@notaire-vogel.fr", telephone: "03 88 45 67 89",
      ville: "Strasbourg", secteurActivite: "Notariat",
      categorieReseau: "notaire",
      typeRelation: "partenaire", statutReseau: "suivi_en_cours",
      niveauPotentiel: "fort", potentielEstimeAnnuel: 8000,
      horizonActivation: "moyen", prochaineActionReseau: "Presentation offre dirigeants",
      dateDernierContact: addDays(today, -14),
      statut: "prospect", sourceAcquisition: "Reseau personnel",
      workspaceId: wsId,
    },
  });

  const reseauContact3 = await prisma.client.create({
    data: {
      raisonSociale: "Cabinet Expertise Comptable Lehmann", civilite: "M.", prenom: "Thomas", nom: "Lehmann",
      email: "t.lehmann@ec-lehmann.fr", telephone: "03 88 34 56 78",
      ville: "Haguenau", secteurActivite: "Expertise comptable",
      categorieReseau: "expert_comptable",
      typeRelation: "prescripteur_potentiel", statutReseau: "contacte",
      niveauPotentiel: "moyen", potentielEstimeAnnuel: 3000,
      horizonActivation: "moyen", prochaineActionReseau: "Envoyer plaquette cabinet",
      dateDernierContact: addDays(today, -21),
      statut: "prospect", sourceAcquisition: "Reseau personnel",
      workspaceId: wsId,
    },
  });

  console.log("  [5] Clients: 10 (7 business + 3 reseau)");

  // ── 6. Dirigeants (4) ──

  await prisma.dirigeant.create({
    data: {
      clientId: client1.id, prenom: "Jean", nom: "Dupont",
      statutProfessionnel: "TNS_GERANT_MAJORITAIRE", regimeRetraite: "RSI / SSI",
      prevoyancePerso: "Contrat Apicil TNS", protectionActuelle: "Madelin April",
      epargneActuelle: "Pas de PER",
      besoinsPatrimoniaux: "Optimiser retraite, proteger famille en cas de deces",
      workspaceId: wsId,
    },
  });

  await prisma.dirigeant.create({
    data: {
      clientId: client3.id, prenom: "Francois", nom: "Muller",
      statutProfessionnel: "TNS_LIBERAL", regimeRetraite: "CIPAV",
      prevoyancePerso: "Contrat April Prevoyance", protectionActuelle: "April Sante TNS Premium",
      epargneActuelle: "Assurance vie Generali",
      besoinsPatrimoniaux: "Developper epargne retraite, etudier PER Madelin",
      workspaceId: wsId,
    },
  });

  await prisma.dirigeant.create({
    data: {
      clientId: client4.id, prenom: "Philippe", nom: "Bernard",
      statutProfessionnel: "TNS_GERANT_MAJORITAIRE", regimeRetraite: "RSI / SSI",
      prevoyancePerso: "Aucune prevoyance individuelle", protectionActuelle: "Mutuelle entreprise HCR",
      epargneActuelle: "PEL ancien",
      besoinsPatrimoniaux: "Prevoyance dirigeant + PER",
      workspaceId: wsId,
    },
  });

  await prisma.dirigeant.create({
    data: {
      clientId: client6.id, prenom: "Claire", nom: "Hoffmann",
      statutProfessionnel: "TNS_LIBERAL", regimeRetraite: "CAVP",
      prevoyancePerso: "Contrat Madelin basique", protectionActuelle: "Sante Madelin ancienne",
      epargneActuelle: "Assurance vie 80k",
      besoinsPatrimoniaux: "Reviser prevoyance + PER defiscalisant",
      workspaceId: wsId,
    },
  });
  console.log("  [6] Dirigeants: 4");

  // ── 7. Contrats (16) ──

  const contrats = await Promise.all([
    // Client 1 — Boulangerie Dupont (3 contrats)
    prisma.contrat.create({
      data: {
        clientId: client1.id, typeProduit: "SANTE_COLLECTIVE", compagnieId: mutex.id,
        nomProduit: "Mutex Sante PME", numeroContrat: "MUT-2024-00145",
        primeAnnuelle: 19200, tauxCommApport: 0.07, tauxCommGestion: 0.06, commissionAnnuelle: 1152,
        modeVersement: "LINEAIRE", frequenceVersement: "TRIMESTRIEL",
        dateEffet: new Date("2024-01-01"), dateEcheance: new Date("2026-01-01"),
        nbBeneficiaires: 8, cotisationUnitaire: 200, statut: "actif",
        workspaceId: wsId,
      },
    }),
    prisma.contrat.create({
      data: {
        clientId: client1.id, typeProduit: "PREVOYANCE_COLLECTIVE", compagnieId: mutex.id,
        nomProduit: "Mutex Prevoyance Entreprise", numeroContrat: "MUT-2024-00146",
        primeAnnuelle: 9600, tauxCommApport: 0.10, tauxCommGestion: 0.08, commissionAnnuelle: 768,
        modeVersement: "LINEAIRE", frequenceVersement: "TRIMESTRIEL",
        dateEffet: new Date("2024-01-01"), dateEcheance: new Date("2026-01-01"),
        nbBeneficiaires: 8, cotisationUnitaire: 100, statut: "actif",
        workspaceId: wsId,
      },
    }),
    prisma.contrat.create({
      data: {
        clientId: client1.id, typeProduit: "PREVOYANCE_MADELIN", compagnieId: apicil.id,
        nomProduit: "Apicil Prevoyance TNS", numeroContrat: "API-2024-03456",
        primeAnnuelle: 3600, tauxCommApport: 0.20, tauxCommGestion: 0.15, commissionAnnuelle: 540,
        modeVersement: "PRECOMPTE", frequenceVersement: "ANNUEL",
        dateEffet: new Date("2024-03-01"), dateEcheance: new Date("2026-03-01"), statut: "actif",
        workspaceId: wsId,
      },
    }),

    // Client 2 — Tech Solutions (4 contrats)
    prisma.contrat.create({
      data: {
        clientId: client2.id, typeProduit: "SANTE_COLLECTIVE", compagnieId: malakoff.id,
        nomProduit: "Malakoff Sante Entreprise", numeroContrat: "MAL-2025-00078",
        primeAnnuelle: 75000, tauxCommApport: 0.07, tauxCommGestion: 0.06, commissionAnnuelle: 4500,
        modeVersement: "LINEAIRE", frequenceVersement: "MENSUEL",
        dateEffet: new Date("2025-01-01"), dateEcheance: new Date("2026-01-01"),
        nbBeneficiaires: 25, cotisationUnitaire: 250, statut: "actif",
        workspaceId: wsId,
      },
    }),
    prisma.contrat.create({
      data: {
        clientId: client2.id, typeProduit: "PREVOYANCE_COLLECTIVE", compagnieId: malakoff.id,
        nomProduit: "Malakoff Prevoyance Pro", numeroContrat: "MAL-2025-00079",
        primeAnnuelle: 37500, tauxCommApport: 0.10, tauxCommGestion: 0.08, commissionAnnuelle: 3000,
        modeVersement: "LINEAIRE", frequenceVersement: "MENSUEL",
        dateEffet: new Date("2025-01-01"), dateEcheance: new Date("2026-01-01"),
        nbBeneficiaires: 25, cotisationUnitaire: 125, statut: "actif",
        workspaceId: wsId,
      },
    }),
    prisma.contrat.create({
      data: {
        clientId: client2.id, typeProduit: "RCP_PRO", compagnieId: axa.id,
        nomProduit: "AXA RC Pro IT", numeroContrat: "AXA-2024-12345",
        primeAnnuelle: 4200, tauxCommApport: 0.15, tauxCommGestion: 0.12, commissionAnnuelle: 504,
        modeVersement: "LINEAIRE", frequenceVersement: "ANNUEL",
        dateEffet: new Date("2024-06-01"), dateEcheance: new Date("2026-06-01"), statut: "actif",
        workspaceId: wsId,
      },
    }),
    prisma.contrat.create({
      data: {
        clientId: client2.id, typeProduit: "PER", compagnieId: generali.id,
        nomProduit: "Generali PER Entreprise", numeroContrat: "GEN-2025-00234",
        primeAnnuelle: 60000, tauxCommApport: 0.03, tauxCommGestion: 0.007, commissionAnnuelle: 420,
        modeVersement: "LINEAIRE", frequenceVersement: "MENSUEL",
        dateEffet: new Date("2025-02-01"), dateEcheance: new Date("2026-02-01"), statut: "actif",
        workspaceId: wsId,
      },
    }),

    // Client 3 — Archi Muller (4 contrats)
    prisma.contrat.create({
      data: {
        clientId: client3.id, typeProduit: "SANTE_MADELIN", compagnieId: april.id,
        nomProduit: "April Sante TNS Premium", numeroContrat: "APR-2024-05678",
        primeAnnuelle: 4800, tauxCommApport: 0.12, tauxCommGestion: 0.10, commissionAnnuelle: 480,
        modeVersement: "LINEAIRE", frequenceVersement: "MENSUEL",
        dateEffet: new Date("2024-04-01"), dateEcheance: new Date("2026-04-01"), statut: "actif",
        workspaceId: wsId,
      },
    }),
    prisma.contrat.create({
      data: {
        clientId: client3.id, typeProduit: "PREVOYANCE_MADELIN", compagnieId: april.id,
        nomProduit: "April Prevoyance Liberal", numeroContrat: "APR-2024-05679",
        primeAnnuelle: 2400, tauxCommApport: 0.20, tauxCommGestion: 0.15, commissionAnnuelle: 360,
        modeVersement: "PRECOMPTE", frequenceVersement: "ANNUEL",
        dateEffet: new Date("2024-04-01"), dateEcheance: new Date("2026-04-01"), statut: "actif",
        workspaceId: wsId,
      },
    }),
    prisma.contrat.create({
      data: {
        clientId: client3.id, typeProduit: "RCP_PRO", compagnieId: axa.id,
        nomProduit: "AXA RC Pro Architecte", numeroContrat: "AXA-2023-09876",
        primeAnnuelle: 3200, tauxCommApport: 0.15, tauxCommGestion: 0.12, commissionAnnuelle: 384,
        modeVersement: "LINEAIRE", frequenceVersement: "ANNUEL",
        dateEffet: new Date("2023-09-01"), dateEcheance: new Date("2026-09-01"), statut: "actif",
        workspaceId: wsId,
      },
    }),
    prisma.contrat.create({
      data: {
        clientId: client3.id, typeProduit: "ASSURANCE_VIE", compagnieId: generali.id,
        nomProduit: "Generali Epargne Vie", numeroContrat: "GEN-2025-00567",
        primeAnnuelle: 12000, tauxCommApport: 0.03, tauxCommGestion: 0.007, commissionAnnuelle: 84,
        modeVersement: "LINEAIRE", frequenceVersement: "ANNUEL",
        dateEffet: new Date("2025-01-15"), dateEcheance: new Date("2026-01-15"), statut: "actif",
        workspaceId: wsId,
      },
    }),

    // Client 4 — Restaurant Le Gourmet (3 contrats)
    prisma.contrat.create({
      data: {
        clientId: client4.id, typeProduit: "SANTE_COLLECTIVE", compagnieId: apicil.id,
        nomProduit: "Apicil Sante HCR", numeroContrat: "API-2025-04567",
        primeAnnuelle: 28800, tauxCommApport: 0.07, tauxCommGestion: 0.06, commissionAnnuelle: 1728,
        modeVersement: "LINEAIRE", frequenceVersement: "TRIMESTRIEL",
        dateEffet: new Date("2025-01-01"), dateEcheance: new Date("2026-01-01"),
        nbBeneficiaires: 12, cotisationUnitaire: 200, statut: "actif",
        workspaceId: wsId,
      },
    }),
    prisma.contrat.create({
      data: {
        clientId: client4.id, typeProduit: "PREVOYANCE_COLLECTIVE", compagnieId: apicil.id,
        nomProduit: "Apicil Prevoyance HCR", numeroContrat: "API-2025-04568",
        primeAnnuelle: 14400, tauxCommApport: 0.10, tauxCommGestion: 0.08, commissionAnnuelle: 1152,
        modeVersement: "LINEAIRE", frequenceVersement: "TRIMESTRIEL",
        dateEffet: new Date("2025-01-01"), dateEcheance: new Date("2026-01-01"),
        nbBeneficiaires: 12, cotisationUnitaire: 100, statut: "actif",
        workspaceId: wsId,
      },
    }),

    // Client 6 — Pharmacie Centrale (2 contrats)
    prisma.contrat.create({
      data: {
        clientId: client6.id, typeProduit: "SANTE_MADELIN", compagnieId: april.id,
        nomProduit: "April Sante Pharmacien", numeroContrat: "APR-2025-07890",
        primeAnnuelle: 5400, tauxCommApport: 0.12, tauxCommGestion: 0.10, commissionAnnuelle: 540,
        modeVersement: "LINEAIRE", frequenceVersement: "MENSUEL",
        dateEffet: new Date("2025-03-01"), dateEcheance: new Date("2026-03-01"), statut: "actif",
        workspaceId: wsId,
      },
    }),
  ]);
  console.log(`  [7] Contrats: ${contrats.length}`);

  // ── 8. Commissions (auto-generated from contrats) ──

  let commissionCount = 0;
  for (const contrat of contrats) {
    if (contrat.tauxCommApport) {
      await prisma.commission.create({
        data: {
          contratId: contrat.id,
          montant: contrat.primeAnnuelle * contrat.tauxCommApport,
          type: "APPORT",
          periode: contrat.dateEffet.toISOString().slice(0, 7),
          dateVersement: contrat.dateEffet,
          statut: "verse",
          workspaceId: wsId,
        },
      });
      commissionCount++;
    }
    if (contrat.tauxCommGestion) {
      await prisma.commission.create({
        data: {
          contratId: contrat.id,
          montant: contrat.primeAnnuelle * (contrat.tauxCommGestion ?? 0),
          type: "GESTION",
          periode: "2026",
          statut: "prevu",
          workspaceId: wsId,
        },
      });
      commissionCount++;
    }
  }
  console.log(`  [8] Commissions: ${commissionCount}`);

  // ── 9. Deals (8 — across all stages) ──

  await Promise.all([
    prisma.deal.create({
      data: {
        clientId: client5.id, titre: "Sante collective + Prevoyance Garage Auto Plus",
        etape: "AUDIT", montantEstime: 2500, probabilite: 60,
        produitsCibles: JSON.stringify(["SANTE_COLLECTIVE", "PREVOYANCE_COLLECTIVE"]),
        dateClosingPrev: addDays(today, 30), assigneA: user.id,
        sourceProspect: "COLD_CALL",
        notes: "Audit realise le 25/02. Le dirigeant compare avec son contrat actuel chez AG2R.",
        workspaceId: wsId,
      },
    }),
    prisma.deal.create({
      data: {
        clientId: client4.id, titre: "PER Dirigeant Philippe Bernard",
        etape: "RECOMMANDATION", montantEstime: 600, probabilite: 70,
        produitsCibles: JSON.stringify(["PER"]),
        dateClosingPrev: addDays(today, 14), assigneA: user.id,
        notes: "Proposition envoyee. Relancer semaine prochaine.",
        workspaceId: wsId,
      },
    }),
    prisma.deal.create({
      data: {
        clientId: client2.id, titre: "Protection Juridique Tech Solutions",
        etape: "QUALIFICATION", montantEstime: 200, probabilite: 40,
        produitsCibles: JSON.stringify(["PROTECTION_JURIDIQUE"]),
        dateClosingPrev: addDays(today, 45), assigneA: user.id,
        sourceProspect: "LINKEDIN",
        workspaceId: wsId,
      },
    }),
    prisma.deal.create({
      data: {
        clientId: client1.id, titre: "PER Madelin Jean Dupont",
        etape: "RECOMMANDATION", montantEstime: 450, probabilite: 80,
        produitsCibles: JSON.stringify(["PER"]),
        dateClosingPrev: addDays(today, 5), assigneA: user.id,
        prescripteurId: prescripteur1.id, sourceProspect: "EXPERT_COMPTABLE",
        notes: "Negociation sur les frais d'entree. Hesite entre Generali et SwissLife.",
        workspaceId: wsId,
      },
    }),
    prisma.deal.create({
      data: {
        clientId: client7.id, titre: "Sante + Prevoyance Menuiserie Keller",
        etape: "PROSPECT_IDENTIFIE", montantEstime: 1800, probabilite: 20,
        produitsCibles: JSON.stringify(["SANTE_COLLECTIVE", "PREVOYANCE_COLLECTIVE"]),
        dateClosingPrev: addDays(today, 60), assigneA: user.id,
        sourceProspect: "PARRAINAGE",
        notes: "Premier contact par recommandation. A qualifier.",
        workspaceId: wsId,
      },
    }),
    prisma.deal.create({
      data: {
        clientId: client6.id, titre: "PER + Prevoyance Madelin Pharmacie Centrale",
        etape: "SIGNATURE", montantEstime: 900, probabilite: 90,
        produitsCibles: JSON.stringify(["PER", "PREVOYANCE_MADELIN"]),
        dateClosingPrev: addDays(today, 3), assigneA: user.id,
        prescripteurId: prescripteur3.id,
        dateSignature: addDays(today, -1),
        notes: "Documents signes, en attente de l'emission du contrat.",
        workspaceId: wsId,
      },
    }),
    // One completed deal (DEVELOPPEMENT)
    prisma.deal.create({
      data: {
        clientId: client2.id, titre: "Sante + Prevoyance Tech Solutions",
        etape: "DEVELOPPEMENT", montantEstime: 7500, probabilite: 100,
        produitsCibles: JSON.stringify(["SANTE_COLLECTIVE", "PREVOYANCE_COLLECTIVE"]),
        dateClosingPrev: new Date("2025-01-01"), dateClosingReel: new Date("2025-01-15"),
        dateSignature: new Date("2024-12-20"), dateOnboarding: new Date("2025-01-15"),
        assigneA: user.id, sourceProspect: "LINKEDIN",
        notes: "Client fidele, en developpement (PER, PJ en cours).",
        workspaceId: wsId,
      },
    }),
    // One lost deal
    prisma.deal.create({
      data: {
        clientId: client5.id, titre: "RCP Pro Garage Auto Plus",
        etape: "PERDU", montantEstime: 400, probabilite: 0,
        produitsCibles: JSON.stringify(["RCP_PRO"]),
        dateClosingPrev: new Date("2025-12-01"), dateClosingReel: new Date("2025-12-15"),
        assigneA: user.id,
        motifPerte: "Prix trop eleve par rapport a la concurrence",
        notes: "Le client a choisi une offre directe moins chere.",
        workspaceId: wsId,
      },
    }),
  ]);
  console.log("  [9] Deals: 8 (all stages)");

  // ── 10. Taches (16) ──

  await Promise.all([
    // Overdue
    prisma.tache.create({
      data: {
        clientId: client5.id, titre: "Relancer Christophe Weber pour le devis sante",
        type: "RELANCE_PROSPECT", priorite: "haute", dateEcheance: addDays(today, -2),
        assigneA: user.id, workspaceId: wsId,
      },
    }),
    prisma.tache.create({
      data: {
        clientId: client7.id, titre: "Qualifier le besoin Menuiserie Keller",
        type: "RELANCE_PROSPECT", priorite: "haute", dateEcheance: addDays(today, -1),
        assigneA: user.id, workspaceId: wsId,
      },
    }),
    // Today
    prisma.tache.create({
      data: {
        clientId: client4.id, titre: "Appeler Philippe Bernard pour le PER",
        type: "APPEL", priorite: "haute", dateEcheance: today,
        assigneA: user.id, workspaceId: wsId,
      },
    }),
    prisma.tache.create({
      data: {
        clientId: client6.id, titre: "Envoyer contrat PER signe a Generali",
        type: "ADMIN", priorite: "haute", dateEcheance: today,
        assigneA: user.id, workspaceId: wsId,
      },
    }),
    // Upcoming
    prisma.tache.create({
      data: {
        clientId: client1.id, titre: "Preparer dossier renouvellement sante collective Dupont",
        description: "Echeance au 01/01/2026 - verifier tarifs et preparer comparatif",
        type: "RENOUVELLEMENT", priorite: "normale", dateEcheance: addDays(today, 5),
        assigneA: user.id, workspaceId: wsId,
      },
    }),
    prisma.tache.create({
      data: {
        clientId: client2.id, titre: "RDV protection juridique avec Marie Laurent",
        description: "RDV prevu au bureau de Metz",
        type: "RDV", priorite: "normale", dateEcheance: addDays(today, 7),
        assigneA: user.id, workspaceId: wsId,
      },
    }),
    prisma.tache.create({
      data: {
        clientId: client1.id, titre: "Finaliser proposition PER Dupont",
        type: "SIGNATURE", priorite: "haute", dateEcheance: addDays(today, 3),
        assigneA: user.id, workspaceId: wsId,
      },
    }),
    prisma.tache.create({
      data: {
        titre: "Envoyer convention partenariat Alptis",
        type: "ADMIN", priorite: "basse", dateEcheance: addDays(today, 14),
        assigneA: user.id, workspaceId: wsId,
      },
    }),
    prisma.tache.create({
      data: {
        clientId: client3.id, titre: "Point annuel avec Francois Muller",
        description: "Verifier satisfaction, proposer optimisation PER",
        type: "REVISION_ANNUELLE", priorite: "normale", dateEcheance: addDays(today, 10),
        assigneA: user.id, workspaceId: wsId,
      },
    }),
    prisma.tache.create({
      data: {
        clientId: client6.id, titre: "Audit dirigeant Claire Hoffmann",
        description: "Reviser couverture prevoyance + epargne retraite",
        type: "AUDIT_DIRIGEANT", priorite: "normale", dateEcheance: addDays(today, 15),
        assigneA: user.id, workspaceId: wsId,
      },
    }),
    prisma.tache.create({
      data: {
        clientId: client4.id, titre: "Verifier onboarding prevoyance collective Restaurant Le Gourmet",
        type: "ONBOARDING", priorite: "normale", dateEcheance: addDays(today, 20),
        assigneA: user.id, workspaceId: wsId,
      },
    }),
    prisma.tache.create({
      data: {
        clientId: client2.id, titre: "Developper epargne salariale Tech Solutions",
        type: "DEV_CLIENT", priorite: "basse", dateEcheance: addDays(today, 30),
        assigneA: user.id, workspaceId: wsId,
      },
    }),
    // Completed tasks
    prisma.tache.create({
      data: {
        clientId: client1.id, titre: "Envoyer comparatif mutuelle Boulangerie Dupont",
        type: "ADMIN", priorite: "normale", dateEcheance: addDays(today, -10),
        dateRealisation: addDays(today, -11), statut: "terminee",
        assigneA: user.id, workspaceId: wsId,
      },
    }),
    prisma.tache.create({
      data: {
        clientId: client6.id, titre: "Premier RDV decouverte Pharmacie Centrale",
        type: "RDV", priorite: "haute", dateEcheance: addDays(today, -14),
        dateRealisation: addDays(today, -14), statut: "terminee",
        assigneA: user.id, workspaceId: wsId,
      },
    }),
    // Auto-generated task
    prisma.tache.create({
      data: {
        clientId: client4.id, titre: "Renouvellement sante collective Restaurant Le Gourmet",
        type: "RENOUVELLEMENT", priorite: "normale", dateEcheance: addDays(today, 25),
        autoGenerated: true, sourceAuto: "echeance_contrat",
        assigneA: user.id, workspaceId: wsId,
      },
    }),
    prisma.tache.create({
      data: {
        clientId: reseauContact1.id, titre: "Relancer Dr. Martin pour dejeuner reseau",
        type: "RELANCE_PROSPECT", priorite: "normale", dateEcheance: addDays(today, 4),
        assigneA: user.id, workspaceId: wsId,
      },
    }),
  ]);
  console.log("  [10] Taches: 16");

  // ── 11. Emails (7 synthetic — pre-analyzed) ──

  const emails = await Promise.all([
    prisma.email.create({
      data: {
        userId: user.id, gmailId: "demo-001", threadId: "thread-001",
        sujet: "Renouvellement mutuelle collective 2026",
        expediteur: "jean.dupont@boulangerie-dupont.fr",
        destinataires: "florian@gargarine.fr",
        dateEnvoi: addDays(today, -3), direction: "entrant",
        extrait: "Bonjour, je souhaiterais discuter du renouvellement de notre mutuelle collective...",
        pertinence: "haute", scoreRelevance: 85,
        resume: "Le client souhaite discuter du renouvellement de sa mutuelle collective avant l'echeance.",
        typeEmail: "client", urgence: "haute", sentiment: "neutre",
        actionRequise: true, actionTraitee: false,
        analyseIA: JSON.stringify({ produits: ["SANTE_COLLECTIVE"], intention: "renouvellement", besoin: "comparatif tarifs" }),
        produitsMentionnes: JSON.stringify(["SANTE_COLLECTIVE"]),
        analyseStatut: "analyse", clientId: client1.id,
        reponseProposee: "Bonjour Jean, je vous confirme que je prepare actuellement le comparatif pour le renouvellement de votre mutuelle collective. Je reviens vers vous d'ici vendredi avec les meilleures options.",
      },
    }),
    prisma.email.create({
      data: {
        userId: user.id, gmailId: "demo-002", threadId: "thread-002",
        sujet: "Demande de devis prevoyance dirigeant",
        expediteur: "p.bernard@legourmet.fr",
        destinataires: "florian@gargarine.fr",
        dateEnvoi: addDays(today, -2), direction: "entrant",
        extrait: "Suite a notre entretien, je souhaiterais recevoir un devis pour une prevoyance dirigeant...",
        pertinence: "haute", scoreRelevance: 90,
        resume: "Demande de devis prevoyance dirigeant suite a un entretien. Le client est motive et souhaite avancer rapidement.",
        typeEmail: "client", urgence: "haute", sentiment: "positif",
        actionRequise: true, actionTraitee: false,
        analyseIA: JSON.stringify({ produits: ["PREVOYANCE_MADELIN"], intention: "demande_devis", besoin: "protection dirigeant" }),
        produitsMentionnes: JSON.stringify(["PREVOYANCE_MADELIN"]),
        analyseStatut: "analyse", clientId: client4.id,
        reponseProposee: "Bonjour Philippe, je vous remercie pour votre interet. Je prepare le devis prevoyance dirigeant et vous l'envoie d'ici demain.",
      },
    }),
    prisma.email.create({
      data: {
        userId: user.id, gmailId: "demo-003", threadId: "thread-003",
        sujet: "Question sur les garanties PER",
        expediteur: "m.laurent@techsolutions.fr",
        destinataires: "florian@gargarine.fr",
        dateEnvoi: addDays(today, -5), direction: "entrant",
        extrait: "J'ai une question sur les garanties du PER Generali...",
        pertinence: "normal", scoreRelevance: 60,
        resume: "Question technique sur les garanties du PER. Pas urgent.",
        typeEmail: "client", urgence: "normale", sentiment: "neutre",
        actionRequise: false, actionTraitee: false,
        analyseIA: JSON.stringify({ produits: ["PER"], intention: "question", besoin: "information" }),
        produitsMentionnes: JSON.stringify(["PER"]),
        analyseStatut: "analyse", clientId: client2.id,
      },
    }),
    prisma.email.create({
      data: {
        userId: user.id, gmailId: "demo-004", threadId: "thread-004",
        sujet: "Nouveau tarif Mutex sante collective 2026",
        expediteur: "s.martin@mutex.fr",
        destinataires: "florian@gargarine.fr",
        dateEnvoi: addDays(today, -1), direction: "entrant",
        extrait: "Veuillez trouver ci-joint les nouveaux tarifs sante collective pour 2026...",
        pertinence: "normal", scoreRelevance: 55,
        resume: "Mutex communique ses nouveaux tarifs sante collective 2026. A integrer dans les comparatifs en cours.",
        typeEmail: "assureur", urgence: "normale", sentiment: "neutre",
        actionRequise: true, actionTraitee: false,
        analyseIA: JSON.stringify({ produits: ["SANTE_COLLECTIVE"], intention: "information_tarifs" }),
        analyseStatut: "analyse",
      },
    }),
    prisma.email.create({
      data: {
        userId: user.id, gmailId: "demo-005", threadId: "thread-005",
        sujet: "Recommandation - Cabinet Avocat Weiss",
        expediteur: "c.weiss@avocat-weiss.fr",
        destinataires: "florian@gargarine.fr",
        dateEnvoi: addDays(today, -4), direction: "entrant",
        extrait: "Je vous adresse un de mes clients qui cherche une solution sante et prevoyance pour son entreprise...",
        pertinence: "haute", scoreRelevance: 80,
        resume: "Recommandation d'un nouveau prospect par la prescriptrice avocat. Potentiel sante + prevoyance collective.",
        typeEmail: "prescripteur", urgence: "haute", sentiment: "positif",
        actionRequise: true, actionTraitee: false,
        analyseIA: JSON.stringify({ produits: ["SANTE_COLLECTIVE", "PREVOYANCE_COLLECTIVE"], intention: "recommandation" }),
        produitsMentionnes: JSON.stringify(["SANTE_COLLECTIVE", "PREVOYANCE_COLLECTIVE"]),
        analyseStatut: "analyse",
      },
    }),
    // Outgoing email
    prisma.email.create({
      data: {
        userId: user.id, gmailId: "demo-006", threadId: "thread-001",
        sujet: "Re: Renouvellement mutuelle collective 2026",
        expediteur: "florian@gargarine.fr",
        destinataires: "jean.dupont@boulangerie-dupont.fr",
        dateEnvoi: addDays(today, -2), direction: "sortant",
        extrait: "Bonjour Jean, je prepare le comparatif pour le renouvellement...",
        pertinence: "normal", scoreRelevance: 50,
        resume: "Reponse au client confirmant la preparation du comparatif renouvellement.",
        typeEmail: "client", urgence: "normale", sentiment: "positif",
        analyseStatut: "analyse", clientId: client1.id,
      },
    }),
    // Unknown sender (for prospect bridge demo)
    prisma.email.create({
      data: {
        userId: user.id, gmailId: "demo-007", threadId: "thread-007",
        sujet: "Demande information assurance groupe",
        expediteur: "d.fischer@fischer-consulting.fr",
        destinataires: "florian@gargarine.fr",
        dateEnvoi: addDays(today, -1), direction: "entrant",
        extrait: "Bonjour, je suis dirigeant d'une societe de conseil et je cherche une mutuelle sante collective pour mes 10 salaries...",
        pertinence: "haute", scoreRelevance: 75,
        resume: "Nouveau prospect inconnu cherchant une mutuelle sante collective pour 10 salaries. Fort potentiel commercial.",
        typeEmail: "prospect", urgence: "normale", sentiment: "positif",
        actionRequise: true, actionTraitee: false,
        analyseIA: JSON.stringify({ produits: ["SANTE_COLLECTIVE"], intention: "demande_information", besoin: "mutuelle groupe" }),
        produitsMentionnes: JSON.stringify(["SANTE_COLLECTIVE"]),
        analyseStatut: "analyse",
      },
    }),
  ]);
  console.log(`  [11] Emails: ${emails.length}`);

  // ── 12. SignauxCommerciaux (8) ──

  await Promise.all([
    prisma.signalCommercial.create({
      data: {
        clientId: client1.id, emailId: emails[0].id,
        typeSignal: "produit_mentionne", valeur: "SANTE_COLLECTIVE",
        details: "Renouvellement mutuelle collective", source: "email_analysis",
        dateSignal: addDays(today, -3),
      },
    }),
    prisma.signalCommercial.create({
      data: {
        clientId: client4.id, emailId: emails[1].id,
        typeSignal: "besoin", valeur: "Prevoyance dirigeant",
        details: "Demande de devis prevoyance dirigeant", source: "email_analysis",
        dateSignal: addDays(today, -2),
      },
    }),
    prisma.signalCommercial.create({
      data: {
        clientId: client4.id, emailId: emails[1].id,
        typeSignal: "sentiment_positif", valeur: "Client motive",
        details: "Sentiment positif, souhaite avancer rapidement", source: "email_analysis",
        dateSignal: addDays(today, -2),
      },
    }),
    prisma.signalCommercial.create({
      data: {
        clientId: client2.id, emailId: emails[2].id,
        typeSignal: "produit_mentionne", valeur: "PER",
        details: "Question sur les garanties PER Generali", source: "email_analysis",
        dateSignal: addDays(today, -5),
      },
    }),
    prisma.signalCommercial.create({
      data: {
        clientId: client1.id,
        typeSignal: "besoin", valeur: "Optimisation retraite",
        details: "Besoin identifie lors du RDV de suivi", source: "manual",
        dateSignal: addDays(today, -15),
      },
    }),
    prisma.signalCommercial.create({
      data: {
        clientId: client6.id,
        typeSignal: "besoin", valeur: "Revision prevoyance",
        details: "Prevoyance actuelle insuffisante", source: "manual",
        dateSignal: addDays(today, -10),
      },
    }),
    prisma.signalCommercial.create({
      data: {
        clientId: client3.id,
        typeSignal: "produit_mentionne", valeur: "PER",
        details: "Interet pour PER Madelin lors du point annuel", source: "manual",
        dateSignal: addDays(today, -20),
      },
    }),
    prisma.signalCommercial.create({
      data: {
        clientId: client2.id,
        typeSignal: "objection", valeur: "Frais de gestion trop eleves",
        details: "Objection sur les frais de gestion du PER", source: "manual",
        dateSignal: addDays(today, -8),
      },
    }),
  ]);
  console.log("  [12] Signaux commerciaux: 8");

  // ── 13. Opportunites commerciales (5) ──

  await Promise.all([
    prisma.opportuniteCommerciale.create({
      data: {
        clientId: client1.id, sourceType: "email_analysis", sourceEmailId: emails[0].id,
        typeProduit: "SANTE_COLLECTIVE", titre: "Renouvellement sante collective Dupont",
        statut: "qualifiee", confiance: "haute", temperature: "chaud",
        origineSignal: "renouvellement",
        dedupeKey: `${client1.id}:SANTE_COLLECTIVE:email_analysis`,
        detecteeLe: addDays(today, -3), derniereActivite: addDays(today, -1),
        workspaceId: wsId,
      },
    }),
    prisma.opportuniteCommerciale.create({
      data: {
        clientId: client4.id, sourceType: "signal", sourceEmailId: emails[1].id,
        typeProduit: "PREVOYANCE_MADELIN", titre: "Prevoyance dirigeant Bernard",
        statut: "en_cours", confiance: "haute", temperature: "chaud",
        origineSignal: "demande_devis",
        dedupeKey: `${client4.id}:PREVOYANCE_MADELIN:signal`,
        detecteeLe: addDays(today, -2), derniereActivite: today,
        workspaceId: wsId,
      },
    }),
    prisma.opportuniteCommerciale.create({
      data: {
        clientId: client1.id, sourceType: "cross_sell",
        typeProduit: "PER", titre: "PER Madelin - Jean Dupont",
        statut: "detectee", confiance: "moyenne", temperature: "tiede",
        origineSignal: "besoin",
        dedupeKey: `${client1.id}:PER:cross_sell`,
        detecteeLe: addDays(today, -15), derniereActivite: addDays(today, -5),
        metadata: { regleId: "no_per_tns", confiance: 0.7 },
        workspaceId: wsId,
      },
    }),
    prisma.opportuniteCommerciale.create({
      data: {
        clientId: client6.id, sourceType: "cross_sell",
        typeProduit: "PER", titre: "PER Defiscalisant Pharmacie Centrale",
        statut: "qualifiee", confiance: "haute", temperature: "chaud",
        origineSignal: "besoin",
        dedupeKey: `${client6.id}:PER:cross_sell`,
        detecteeLe: addDays(today, -10), derniereActivite: addDays(today, -2),
        metadata: { regleId: "no_per_tns", confiance: 0.8 },
        workspaceId: wsId,
      },
    }),
    // One closed opportunity
    prisma.opportuniteCommerciale.create({
      data: {
        clientId: client2.id, sourceType: "cross_sell",
        typeProduit: "PROTECTION_JURIDIQUE", titre: "Protection Juridique Tech Solutions",
        statut: "gagnee", confiance: "haute",
        origineSignal: "besoin",
        dedupeKey: `${client2.id}:PROTECTION_JURIDIQUE:cross_sell`,
        detecteeLe: addDays(today, -60), derniereActivite: addDays(today, -30),
        closedAt: addDays(today, -30), closeReason: "Deal signe",
        workspaceId: wsId,
      },
    }),
  ]);
  console.log("  [13] Opportunites commerciales: 5");

  // ── 14. ReseauObjectifs (4) ──

  await Promise.all([
    prisma.reseauObjectif.create({
      data: {
        categorie: "medecin",
        contactsObjectif: 10, tauxConversionObj: 0.15, potentielUnitaire: 4000,
        notes: "Cible prioritaire: medecins generalistes et specialistes de Strasbourg",
      },
    }),
    prisma.reseauObjectif.create({
      data: {
        categorie: "expert_comptable",
        contactsObjectif: 5, tauxConversionObj: 0.30, potentielUnitaire: 6000,
        notes: "Partenariat strategique: prescripteurs naturels pour les dirigeants",
      },
    }),
    prisma.reseauObjectif.create({
      data: {
        categorie: "avocat",
        contactsObjectif: 4, tauxConversionObj: 0.20, potentielUnitaire: 5000,
        notes: "Avocats d'affaires orientant les dirigeants",
      },
    }),
    prisma.reseauObjectif.create({
      data: {
        categorie: "pharmacien",
        contactsObjectif: 8, tauxConversionObj: 0.20, potentielUnitaire: 4500,
        notes: "Pharmaciens titulaires — bon potentiel sante Madelin + prevoyance",
      },
    }),
  ]);
  console.log("  [14] Reseau objectifs: 4");

  // ── 15. Settings ──

  await prisma.settings.create({
    data: {
      id: "default",
      raisonSociale: "Gargarine - Protection sociale des dirigeants",
      formeJuridique: "Courtier en assurance",
      gerants: "Florian Maire",
      zone: "Grand Est (Alsace, Lorraine)",
      cible: "Dirigeants TPE/PME, professions liberales",
      tauxCommission: JSON.stringify({
        SANTE_COLLECTIVE: { apport: 7, gestion: 6 },
        PREVOYANCE_COLLECTIVE: { apport: 10, gestion: 8 },
        PREVOYANCE_MADELIN: { apport: 20, gestion: 15 },
        SANTE_MADELIN: { apport: 12, gestion: 10 },
        RCP_PRO: { apport: 15, gestion: 12 },
        PER: { apport: 3, gestion: 0.7 },
        ASSURANCE_VIE: { apport: 3, gestion: 0.7 },
        PROTECTION_JURIDIQUE: { apport: 18, gestion: 15 },
      }),
    },
  });
  console.log("  [15] Settings: 1");

  // ── Update compagnie stats ──

  const compagnieStats = [
    { id: mutex.id, nb: 2, primes: 28800 },
    { id: apicil.id, nb: 3, primes: 46800 },
    { id: april.id, nb: 3, primes: 12600 },
    { id: generali.id, nb: 2, primes: 72000 },
    { id: axa.id, nb: 2, primes: 7400 },
    { id: malakoff.id, nb: 2, primes: 112500 },
  ];
  for (const stat of compagnieStats) {
    await prisma.compagnie.update({
      where: { id: stat.id },
      data: { nbContratsActifs: stat.nb, primesCumulees: stat.primes },
    });
  }

  // ═══════════════════════════════════════════════════════

  // ── 16. Preconisations (4) ──

  console.log('  Preconisations...');
  const allClientsForPreco = await prisma.client.findMany({ take: 3, orderBy: { dateCreation: 'asc' }, select: { id: true } });
  if (allClientsForPreco.length >= 2) {
    await Promise.all([
      prisma.preconisation.create({
        data: {
          clientId: allClientsForPreco[0].id,
          theme: 'mutuelle_collective',
          titre: 'Mise en place mutuelle collective obligatoire',
          justification: 'Obligation legale ANI. Le client n'a pas de mutuelle collective.',
          priorite: 'haute', statut: 'presentee',
          prochainePas: 'Envoyer comparatif 3 compagnies',
          datePresentation: addDays(today, -10),
          workspaceId: wsId,
        },
      }),
      prisma.preconisation.create({
        data: {
          clientId: allClientsForPreco[0].id,
          theme: 'prevoyance',
          titre: 'Prevoyance dirigeant TNS — couverture deces/invalidite',
          justification: 'Le dirigeant TNS n'a aucune prevoyance personnelle.',
          priorite: 'haute', statut: 'en_discussion',
          prochainePas: 'Attente retour dirigeant sur budget mensuel',
          datePresentation: addDays(today, -5),
          workspaceId: wsId,
        },
      }),
      prisma.preconisation.create({
        data: {
          clientId: allClientsForPreco[1].id,
          theme: 'retraite',
          titre: 'Optimisation retraite via PER individuel',
          justification: 'Dirigeant sans complement retraite. Fort potentiel defiscalisation.',
          priorite: 'moyenne', statut: 'a_preparer',
          workspaceId: wsId,
        },
      }),
      prisma.preconisation.create({
        data: {
          clientId: allClientsForPreco[1].id,
          theme: 'epargne',
          titre: 'Assurance vie pour constitution de tresorerie',
          justification: 'Tresorerie excedentaire non placee.',
          priorite: 'moyenne', statut: 'validee',
          datePresentation: addDays(today, -20),
          dateDecision: addDays(today, -7),
          prochainePas: 'Preparer bulletin de souscription SwissLife',
          workspaceId: wsId,
        },
      }),
    ]);
  }
  console.log('  [16] Preconisations: 4');

  // SUMMARY
  // ═══════════════════════════════════════════════════════

  console.log("\n=== DEMO SEED: Complete ===");
  console.log(`
Summary:
  - 1 user (demo@gargarine.fr / demo123)
  - 1 workspace (real, default)
  - 8 compagnies
  - 3 prescripteurs
  - 10 clients (7 business + 3 reseau contacts)
  - 4 dirigeants
  - ${contrats.length} contrats
  - ${commissionCount} commissions
  - 8 deals (all pipeline stages)
  - 16 taches (overdue, today, upcoming, completed, auto)
  - ${emails.length} emails (pre-analyzed, various types)
  - 8 signaux commerciaux
  - 5 opportunites commerciales
  - 4 reseau objectifs
  - 4 preconisations
  - 1 settings

Login: demo@gargarine.fr / demo123
`);
}

main()
  .catch((e) => {
    console.error("SEED FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
