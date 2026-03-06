import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.commission.deleteMany();
  await prisma.tache.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.dirigeant.deleteMany();
  await prisma.contrat.deleteMany();
  await prisma.client.deleteMany();
  await prisma.prescripteur.deleteMany();
  await prisma.compagnie.deleteMany();
  await prisma.user.deleteMany();

  // --- Users ---
  const user1 = await prisma.user.create({
    data: {
      email: "florian@gargarine.fr",
      password: hashSync("admin123", 10),
      prenom: "Florian",
      nom: "Maire",
      role: "gerant",
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: "associe@gargarine.fr",
      password: hashSync("admin123", 10),
      prenom: "Thomas",
      nom: "Durand",
      role: "gerant",
    },
  });

  // --- Compagnies ---
  const compagnies = await Promise.all([
    prisma.compagnie.create({
      data: {
        nom: "Mutex",
        type: "ASSUREUR_DIRECT",
        contactNom: "Sophie Martin",
        contactEmail: "s.martin@mutex.fr",
        contactTelephone: "03 88 12 34 56",
        conventionSignee: true,
        dateConvention: new Date("2025-01-15"),
        seuilSurcommission: 20,
        tauxSurcommission: 0.02,
      },
    }),
    prisma.compagnie.create({
      data: {
        nom: "Apicil",
        type: "ASSUREUR_DIRECT",
        contactNom: "Marc Lefèvre",
        contactEmail: "m.lefevre@apicil.com",
        contactTelephone: "04 72 45 67 89",
        conventionSignee: true,
        dateConvention: new Date("2024-06-01"),
        seuilSurcommission: 15,
        tauxSurcommission: 0.015,
      },
    }),
    prisma.compagnie.create({
      data: {
        nom: "April",
        type: "GROSSISTE",
        contactNom: "Julie Perrin",
        contactEmail: "j.perrin@april.fr",
        contactTelephone: "04 72 36 78 90",
        conventionSignee: true,
        dateConvention: new Date("2025-03-01"),
        seuilSurcommission: 25,
        tauxSurcommission: 0.025,
      },
    }),
    prisma.compagnie.create({
      data: {
        nom: "Generali",
        type: "ASSUREUR_DIRECT",
        contactNom: "Pierre Dubois",
        contactEmail: "p.dubois@generali.fr",
        contactTelephone: "01 58 34 56 78",
        conventionSignee: true,
        dateConvention: new Date("2024-09-15"),
        seuilSurcommission: 30,
        tauxSurcommission: 0.03,
      },
    }),
    prisma.compagnie.create({
      data: {
        nom: "SwissLife",
        type: "ASSUREUR_DIRECT",
        contactNom: "Anne Bertrand",
        contactEmail: "a.bertrand@swisslife.fr",
        contactTelephone: "01 45 67 89 01",
        conventionSignee: false,
        seuilSurcommission: 20,
        tauxSurcommission: 0.02,
      },
    }),
    prisma.compagnie.create({
      data: {
        nom: "AXA",
        type: "ASSUREUR_DIRECT",
        contactNom: "Luc Moreau",
        contactEmail: "l.moreau@axa.fr",
        contactTelephone: "01 55 78 90 12",
        conventionSignee: true,
        dateConvention: new Date("2025-02-01"),
        seuilSurcommission: 25,
        tauxSurcommission: 0.02,
      },
    }),
    prisma.compagnie.create({
      data: {
        nom: "Malakoff Humanis",
        type: "ASSUREUR_DIRECT",
        contactNom: "Claire Roux",
        contactEmail: "c.roux@malakoffhumanis.com",
        contactTelephone: "01 56 78 90 23",
        conventionSignee: true,
        dateConvention: new Date("2024-11-01"),
        seuilSurcommission: 18,
        tauxSurcommission: 0.018,
      },
    }),
    prisma.compagnie.create({
      data: {
        nom: "Alptis",
        type: "GROSSISTE",
        contactNom: "David Simon",
        contactEmail: "d.simon@alptis.org",
        contactTelephone: "04 72 56 78 90",
        conventionSignee: false,
      },
    }),
  ]);

  const [mutex, apicil, april, generali, swisslife, axa, malakoff] = compagnies;

  // --- Prescripteurs ---
  const prescripteur1 = await prisma.prescripteur.create({
    data: {
      prenom: "Robert",
      nom: "Schmitt",
      entreprise: "Cabinet Comptable Alsace",
      type: "EXPERT_COMPTABLE",
      email: "r.schmitt@cabinet-alsace.fr",
      telephone: "03 88 56 78 90",
      ville: "Strasbourg",
      dossiersEnvoyes: 3,
      clientsSignes: 2,
      commissionsGenerees: 1200,
    },
  });

  const prescripteur2 = await prisma.prescripteur.create({
    data: {
      prenom: "Stéphane",
      nom: "Koch",
      entreprise: "Réseau BNI Strasbourg Centre",
      type: "BNI",
      email: "s.koch@bni-strasbourg.fr",
      telephone: "06 78 90 12 34",
      ville: "Strasbourg",
      dossiersEnvoyes: 2,
      clientsSignes: 1,
      commissionsGenerees: 480,
    },
  });

  // --- Clients ---
  const client1 = await prisma.client.create({
    data: {
      raisonSociale: "Boulangerie Dupont SARL",
      siret: "44312345600021",
      formeJuridique: "SARL",
      secteurActivite: "Boulangerie-Pâtisserie",
      nbSalaries: 8,
      chiffreAffaires: 450000,
      conventionCollective: "Boulangerie-pâtisserie artisanale",
      civilite: "M.",
      prenom: "Jean",
      nom: "Dupont",
      email: "jean.dupont@boulangerie-dupont.fr",
      telephone: "06 12 34 56 78",
      adresse: "12 rue de la République",
      codePostal: "67000",
      ville: "Strasbourg",
      dateNaissance: new Date("1975-03-15"),
      sourceAcquisition: "Expert-comptable",
      prescripteurId: prescripteur1.id,
      statut: "client_actif",
      assigneA: user1.id,
    },
  });

  const client2 = await prisma.client.create({
    data: {
      raisonSociale: "Tech Solutions SAS",
      siret: "52345678900015",
      formeJuridique: "SAS",
      secteurActivite: "Services informatiques",
      nbSalaries: 25,
      chiffreAffaires: 1800000,
      conventionCollective: "Syntec",
      civilite: "Mme",
      prenom: "Marie",
      nom: "Laurent",
      email: "m.laurent@techsolutions.fr",
      telephone: "06 23 45 67 89",
      adresse: "45 avenue de la Liberté",
      codePostal: "57000",
      ville: "Metz",
      dateNaissance: new Date("1982-07-22"),
      sourceAcquisition: "LinkedIn",
      statut: "client_actif",
      assigneA: user1.id,
    },
  });

  const client3 = await prisma.client.create({
    data: {
      raisonSociale: "Cabinet Architecte Muller",
      siret: "38912345600018",
      formeJuridique: "EURL",
      secteurActivite: "Architecture",
      nbSalaries: 3,
      chiffreAffaires: 320000,
      civilite: "M.",
      prenom: "François",
      nom: "Muller",
      email: "f.muller@archi-muller.fr",
      telephone: "06 34 56 78 90",
      adresse: "8 place Kléber",
      codePostal: "67000",
      ville: "Strasbourg",
      dateNaissance: new Date("1968-11-05"),
      sourceAcquisition: "BNI / Réseau affaires",
      prescripteurId: prescripteur2.id,
      statut: "client_actif",
      assigneA: user2.id,
    },
  });

  const client4 = await prisma.client.create({
    data: {
      raisonSociale: "Restaurant Le Gourmet",
      siret: "91234567800012",
      formeJuridique: "SARL",
      secteurActivite: "Restauration",
      nbSalaries: 12,
      chiffreAffaires: 680000,
      conventionCollective: "HCR",
      civilite: "M.",
      prenom: "Philippe",
      nom: "Bernard",
      email: "p.bernard@legourmet.fr",
      telephone: "06 45 67 89 01",
      adresse: "22 rue des Orfèvres",
      codePostal: "68000",
      ville: "Colmar",
      dateNaissance: new Date("1970-05-18"),
      sourceAcquisition: "Parrainage client",
      statut: "client_actif",
      assigneA: user2.id,
    },
  });

  const client5 = await prisma.client.create({
    data: {
      raisonSociale: "Garage Auto Plus",
      siret: "78345678900025",
      formeJuridique: "SAS",
      secteurActivite: "Réparation automobile",
      nbSalaries: 6,
      chiffreAffaires: 520000,
      conventionCollective: "Services de l'automobile",
      civilite: "M.",
      prenom: "Christophe",
      nom: "Weber",
      email: "c.weber@autoplus.fr",
      telephone: "06 56 78 90 12",
      adresse: "Zone Industrielle Nord",
      codePostal: "54000",
      ville: "Nancy",
      dateNaissance: new Date("1978-09-30"),
      sourceAcquisition: "Cold call",
      statut: "prospect",
      assigneA: user1.id,
    },
  });

  // --- Dirigeants ---
  await prisma.dirigeant.create({
    data: {
      clientId: client1.id,
      prenom: "Jean",
      nom: "Dupont",
      statutProfessionnel: "TNS_GERANT_MAJORITAIRE",
      regimeRetraite: "RSI / SSI",
      prevoyancePerso: "Contrat Apicil TNS",
      protectionActuelle: "Madelin April",
      epargneActuelle: "Pas de PER",
      besoinsPatrimoniaux: "Optimiser retraite, protéger famille en cas de décès",
    },
  });

  await prisma.dirigeant.create({
    data: {
      clientId: client3.id,
      prenom: "François",
      nom: "Muller",
      statutProfessionnel: "TNS_LIBERAL",
      regimeRetraite: "CIPAV",
      prevoyancePerso: "Contrat April Prévoyance",
      protectionActuelle: "April Santé TNS Premium",
      epargneActuelle: "Assurance vie Generali",
      besoinsPatrimoniaux: "Développer épargne retraite, étudier PER Madelin",
    },
  });

  // --- Contrats ---
  const contrats = await Promise.all([
    // Client 1 - Boulangerie Dupont
    prisma.contrat.create({
      data: {
        clientId: client1.id,
        typeProduit: "SANTE_COLLECTIVE",
        compagnieId: mutex.id,
        nomProduit: "Mutex Santé PME",
        numeroContrat: "MUT-2024-00145",
        primeAnnuelle: 19200,
        tauxCommApport: 0.07,
        tauxCommGestion: 0.06,
        commissionAnnuelle: 1152,
        modeVersement: "LINEAIRE",
        frequenceVersement: "TRIMESTRIEL",
        dateEffet: new Date("2024-01-01"),
        dateEcheance: new Date("2026-01-01"),
        nbBeneficiaires: 8,
        cotisationUnitaire: 200,
        statut: "actif",
      },
    }),
    prisma.contrat.create({
      data: {
        clientId: client1.id,
        typeProduit: "PREVOYANCE_COLLECTIVE",
        compagnieId: mutex.id,
        nomProduit: "Mutex Prévoyance Entreprise",
        numeroContrat: "MUT-2024-00146",
        primeAnnuelle: 9600,
        tauxCommApport: 0.10,
        tauxCommGestion: 0.08,
        commissionAnnuelle: 768,
        modeVersement: "LINEAIRE",
        frequenceVersement: "TRIMESTRIEL",
        dateEffet: new Date("2024-01-01"),
        dateEcheance: new Date("2026-01-01"),
        nbBeneficiaires: 8,
        cotisationUnitaire: 100,
        statut: "actif",
      },
    }),
    prisma.contrat.create({
      data: {
        clientId: client1.id,
        typeProduit: "PREVOYANCE_MADELIN",
        compagnieId: apicil.id,
        nomProduit: "Apicil Prévoyance TNS",
        numeroContrat: "API-2024-03456",
        primeAnnuelle: 3600,
        tauxCommApport: 0.20,
        tauxCommGestion: 0.15,
        commissionAnnuelle: 540,
        modeVersement: "PRECOMPTE",
        frequenceVersement: "ANNUEL",
        dateEffet: new Date("2024-03-01"),
        dateEcheance: new Date("2026-03-01"),
        statut: "actif",
      },
    }),

    // Client 2 - Tech Solutions
    prisma.contrat.create({
      data: {
        clientId: client2.id,
        typeProduit: "SANTE_COLLECTIVE",
        compagnieId: malakoff.id,
        nomProduit: "Malakoff Santé Entreprise",
        numeroContrat: "MAL-2025-00078",
        primeAnnuelle: 75000,
        tauxCommApport: 0.07,
        tauxCommGestion: 0.06,
        commissionAnnuelle: 4500,
        modeVersement: "LINEAIRE",
        frequenceVersement: "MENSUEL",
        dateEffet: new Date("2025-01-01"),
        dateEcheance: new Date("2026-01-01"),
        nbBeneficiaires: 25,
        cotisationUnitaire: 250,
        statut: "actif",
      },
    }),
    prisma.contrat.create({
      data: {
        clientId: client2.id,
        typeProduit: "PREVOYANCE_COLLECTIVE",
        compagnieId: malakoff.id,
        nomProduit: "Malakoff Prévoyance Pro",
        numeroContrat: "MAL-2025-00079",
        primeAnnuelle: 37500,
        tauxCommApport: 0.10,
        tauxCommGestion: 0.08,
        commissionAnnuelle: 3000,
        modeVersement: "LINEAIRE",
        frequenceVersement: "MENSUEL",
        dateEffet: new Date("2025-01-01"),
        dateEcheance: new Date("2026-01-01"),
        nbBeneficiaires: 25,
        cotisationUnitaire: 125,
        statut: "actif",
      },
    }),
    prisma.contrat.create({
      data: {
        clientId: client2.id,
        typeProduit: "RCP_PRO",
        compagnieId: axa.id,
        nomProduit: "AXA RC Pro IT",
        numeroContrat: "AXA-2024-12345",
        primeAnnuelle: 4200,
        tauxCommApport: 0.15,
        tauxCommGestion: 0.12,
        commissionAnnuelle: 504,
        modeVersement: "LINEAIRE",
        frequenceVersement: "ANNUEL",
        dateEffet: new Date("2024-06-01"),
        dateEcheance: new Date("2026-06-01"),
        statut: "actif",
      },
    }),
    prisma.contrat.create({
      data: {
        clientId: client2.id,
        typeProduit: "PER",
        compagnieId: generali.id,
        nomProduit: "Generali PER Entreprise",
        numeroContrat: "GEN-2025-00234",
        primeAnnuelle: 60000,
        tauxCommApport: 0.03,
        tauxCommGestion: 0.007,
        commissionAnnuelle: 420,
        modeVersement: "LINEAIRE",
        frequenceVersement: "MENSUEL",
        dateEffet: new Date("2025-02-01"),
        dateEcheance: new Date("2026-02-01"),
        statut: "actif",
      },
    }),

    // Client 3 - Cabinet Muller
    prisma.contrat.create({
      data: {
        clientId: client3.id,
        typeProduit: "SANTE_MADELIN",
        compagnieId: april.id,
        nomProduit: "April Santé TNS Premium",
        numeroContrat: "APR-2024-05678",
        primeAnnuelle: 4800,
        tauxCommApport: 0.12,
        tauxCommGestion: 0.10,
        commissionAnnuelle: 480,
        modeVersement: "LINEAIRE",
        frequenceVersement: "MENSUEL",
        dateEffet: new Date("2024-04-01"),
        dateEcheance: new Date("2026-04-01"),
        statut: "actif",
      },
    }),
    prisma.contrat.create({
      data: {
        clientId: client3.id,
        typeProduit: "PREVOYANCE_MADELIN",
        compagnieId: april.id,
        nomProduit: "April Prévoyance Libéral",
        numeroContrat: "APR-2024-05679",
        primeAnnuelle: 2400,
        tauxCommApport: 0.20,
        tauxCommGestion: 0.15,
        commissionAnnuelle: 360,
        modeVersement: "PRECOMPTE",
        frequenceVersement: "ANNUEL",
        dateEffet: new Date("2024-04-01"),
        dateEcheance: new Date("2026-04-01"),
        statut: "actif",
      },
    }),
    prisma.contrat.create({
      data: {
        clientId: client3.id,
        typeProduit: "RCP_PRO",
        compagnieId: axa.id,
        nomProduit: "AXA RC Pro Architecte",
        numeroContrat: "AXA-2023-09876",
        primeAnnuelle: 3200,
        tauxCommApport: 0.15,
        tauxCommGestion: 0.12,
        commissionAnnuelle: 384,
        modeVersement: "LINEAIRE",
        frequenceVersement: "ANNUEL",
        dateEffet: new Date("2023-09-01"),
        dateEcheance: new Date("2026-09-01"),
        statut: "actif",
      },
    }),
    prisma.contrat.create({
      data: {
        clientId: client3.id,
        typeProduit: "ASSURANCE_VIE",
        compagnieId: generali.id,
        nomProduit: "Generali Épargne Vie",
        numeroContrat: "GEN-2025-00567",
        primeAnnuelle: 12000,
        tauxCommApport: 0.03,
        tauxCommGestion: 0.007,
        commissionAnnuelle: 84,
        modeVersement: "LINEAIRE",
        frequenceVersement: "ANNUEL",
        dateEffet: new Date("2025-01-15"),
        dateEcheance: new Date("2026-01-15"),
        statut: "actif",
      },
    }),

    // Client 4 - Restaurant Le Gourmet
    prisma.contrat.create({
      data: {
        clientId: client4.id,
        typeProduit: "SANTE_COLLECTIVE",
        compagnieId: apicil.id,
        nomProduit: "Apicil Santé HCR",
        numeroContrat: "API-2025-04567",
        primeAnnuelle: 28800,
        tauxCommApport: 0.07,
        tauxCommGestion: 0.06,
        commissionAnnuelle: 1728,
        modeVersement: "LINEAIRE",
        frequenceVersement: "TRIMESTRIEL",
        dateEffet: new Date("2025-01-01"),
        dateEcheance: new Date("2026-01-01"),
        nbBeneficiaires: 12,
        cotisationUnitaire: 200,
        statut: "actif",
      },
    }),
    prisma.contrat.create({
      data: {
        clientId: client4.id,
        typeProduit: "PREVOYANCE_COLLECTIVE",
        compagnieId: apicil.id,
        nomProduit: "Apicil Prévoyance HCR",
        numeroContrat: "API-2025-04568",
        primeAnnuelle: 14400,
        tauxCommApport: 0.10,
        tauxCommGestion: 0.08,
        commissionAnnuelle: 1152,
        modeVersement: "LINEAIRE",
        frequenceVersement: "TRIMESTRIEL",
        dateEffet: new Date("2025-01-01"),
        dateEcheance: new Date("2026-01-01"),
        nbBeneficiaires: 12,
        cotisationUnitaire: 100,
        statut: "actif",
      },
    }),
    prisma.contrat.create({
      data: {
        clientId: client4.id,
        typeProduit: "PROTECTION_JURIDIQUE",
        compagnieId: axa.id,
        nomProduit: "AXA Protection Juridique Pro",
        numeroContrat: "AXA-2025-11234",
        primeAnnuelle: 600,
        tauxCommApport: 0.18,
        tauxCommGestion: 0.15,
        commissionAnnuelle: 90,
        modeVersement: "LINEAIRE",
        frequenceVersement: "ANNUEL",
        dateEffet: new Date("2025-03-01"),
        dateEcheance: new Date("2026-03-01"),
        statut: "actif",
      },
    }),
  ]);

  // Update compagnie stats
  const compagnieStats = [
    { id: mutex.id, nb: 2, primes: 28800 },
    { id: apicil.id, nb: 3, primes: 46800 },
    { id: april.id, nb: 2, primes: 7200 },
    { id: generali.id, nb: 2, primes: 72000 },
    { id: axa.id, nb: 3, primes: 8000 },
    { id: malakoff.id, nb: 2, primes: 112500 },
  ];
  for (const stat of compagnieStats) {
    await prisma.compagnie.update({
      where: { id: stat.id },
      data: { nbContratsActifs: stat.nb, primesCumulees: stat.primes },
    });
  }

  // --- Commissions ---
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
        },
      });
    }
    if (contrat.tauxCommGestion) {
      await prisma.commission.create({
        data: {
          contratId: contrat.id,
          montant: contrat.primeAnnuelle * contrat.tauxCommGestion,
          type: "GESTION",
          periode: "2026",
          statut: "prevu",
        },
      });
    }
  }

  // --- Deals ---
  await prisma.deal.create({
    data: {
      clientId: client5.id,
      titre: "Santé collective + Prévoyance Garage Auto Plus",
      etape: "AUDIT",
      montantEstime: 2500,
      probabilite: 60,
      produitsCibles: JSON.stringify(["SANTE_COLLECTIVE", "PREVOYANCE_COLLECTIVE"]),
      dateClosingPrev: new Date("2026-04-15"),
      assigneA: user1.id,
      sourceProspect: "COLD_CALL",
      notes: "Audit réalisé le 25/02. Le dirigeant compare avec son contrat actuel chez AG2R.",
    },
  });

  await prisma.deal.create({
    data: {
      clientId: client4.id,
      titre: "PER Dirigeant Philippe Bernard",
      etape: "RECOMMANDATION",
      montantEstime: 600,
      probabilite: 70,
      produitsCibles: JSON.stringify(["PER"]),
      dateClosingPrev: new Date("2026-03-31"),
      assigneA: user2.id,
      notes: "Proposition envoyée le 01/03. Relancer semaine prochaine.",
    },
  });

  await prisma.deal.create({
    data: {
      clientId: client2.id,
      titre: "Protection Juridique Tech Solutions",
      etape: "QUALIFICATION",
      montantEstime: 200,
      probabilite: 40,
      produitsCibles: JSON.stringify(["PROTECTION_JURIDIQUE"]),
      dateClosingPrev: new Date("2026-05-01"),
      assigneA: user1.id,
      sourceProspect: "LINKEDIN",
    },
  });

  await prisma.deal.create({
    data: {
      clientId: client1.id,
      titre: "PER Madelin Jean Dupont",
      etape: "RECOMMANDATION",
      montantEstime: 450,
      probabilite: 80,
      produitsCibles: JSON.stringify(["PER"]),
      dateClosingPrev: new Date("2026-03-20"),
      assigneA: user1.id,
      prescripteurId: prescripteur1.id,
      sourceProspect: "EXPERT_COMPTABLE",
      notes: "Négociation sur les frais d'entrée. Le client hésite entre Generali et SwissLife.",
    },
  });

  // --- Tâches ---
  const today = new Date();
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

  await Promise.all([
    prisma.tache.create({
      data: {
        clientId: client5.id,
        titre: "Relancer Christophe Weber pour le devis santé",
        type: "RELANCE_PROSPECT",
        priorite: "haute",
        dateEcheance: addDays(today, -2),
        assigneA: user1.id,
      },
    }),
    prisma.tache.create({
      data: {
        clientId: client4.id,
        titre: "Appeler Philippe Bernard pour le PER",
        type: "APPEL",
        priorite: "haute",
        dateEcheance: today,
        assigneA: user2.id,
      },
    }),
    prisma.tache.create({
      data: {
        clientId: client1.id,
        titre: "Préparer dossier renouvellement santé collective Dupont",
        description: "Échéance au 01/01/2026 - vérifier les tarifs et préparer comparatif",
        type: "RENOUVELLEMENT",
        priorite: "normale",
        dateEcheance: addDays(today, 5),
        assigneA: user1.id,
      },
    }),
    prisma.tache.create({
      data: {
        clientId: client2.id,
        titre: "RDV protection juridique avec Marie Laurent",
        description: "RDV prévu au bureau de Metz",
        type: "RDV",
        priorite: "normale",
        dateEcheance: addDays(today, 7),
        assigneA: user1.id,
      },
    }),
    prisma.tache.create({
      data: {
        clientId: client1.id,
        titre: "Finaliser proposition PER Dupont",
        type: "SIGNATURE",
        priorite: "haute",
        dateEcheance: addDays(today, 3),
        assigneA: user1.id,
      },
    }),
    prisma.tache.create({
      data: {
        titre: "Envoyer convention partenariat Alptis",
        type: "ADMIN",
        priorite: "basse",
        dateEcheance: addDays(today, 14),
        assigneA: user2.id,
      },
    }),
    prisma.tache.create({
      data: {
        clientId: client3.id,
        titre: "Point annuel avec François Muller",
        description: "Vérifier satisfaction, proposer optimisation PER",
        type: "APPEL",
        priorite: "normale",
        dateEcheance: addDays(today, 10),
        assigneA: user2.id,
      },
    }),
  ]);

  console.log("Seed completed successfully!");
  console.log(`- 2 users`);
  console.log(`- ${compagnies.length} compagnies`);
  console.log(`- 2 prescripteurs`);
  console.log(`- 5 clients`);
  console.log(`- 2 dirigeants`);
  console.log(`- ${contrats.length} contrats`);
  console.log(`- ${contrats.length * 2} commissions`);
  console.log(`- 4 deals`);
  console.log(`- 7 tâches`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
