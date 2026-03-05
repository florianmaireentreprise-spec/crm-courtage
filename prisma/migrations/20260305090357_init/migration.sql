-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'gerant',
    "dateCreation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "raisonSociale" TEXT NOT NULL,
    "siret" TEXT,
    "formeJuridique" TEXT,
    "secteurActivite" TEXT,
    "nbSalaries" INTEGER,
    "chiffreAffaires" REAL,
    "conventionCollective" TEXT,
    "civilite" TEXT,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "adresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "dateNaissance" DATETIME,
    "sourceAcquisition" TEXT,
    "prescripteur" TEXT,
    "notes" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'prospect',
    "dateCreation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateMaj" DATETIME NOT NULL,
    "assigneA" TEXT
);

-- CreateTable
CREATE TABLE "Contrat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "typeProduit" TEXT NOT NULL,
    "compagnieId" TEXT,
    "nomProduit" TEXT,
    "numeroContrat" TEXT,
    "primeAnnuelle" REAL NOT NULL,
    "tauxCommApport" REAL,
    "tauxCommGestion" REAL,
    "commissionAnnuelle" REAL,
    "modeVersement" TEXT,
    "frequenceVersement" TEXT,
    "dateEffet" DATETIME NOT NULL,
    "dateEcheance" DATETIME,
    "dateResiliation" DATETIME,
    "nbBeneficiaires" INTEGER,
    "cotisationUnitaire" REAL,
    "statut" TEXT NOT NULL DEFAULT 'actif',
    "notes" TEXT,
    "dateCreation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateMaj" DATETIME NOT NULL,
    CONSTRAINT "Contrat_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Contrat_compagnieId_fkey" FOREIGN KEY ("compagnieId") REFERENCES "Compagnie" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Compagnie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "type" TEXT,
    "contactNom" TEXT,
    "contactEmail" TEXT,
    "contactTelephone" TEXT,
    "conventionSignee" BOOLEAN NOT NULL DEFAULT false,
    "dateConvention" DATETIME,
    "seuilSurcommission" INTEGER,
    "tauxSurcommission" REAL,
    "nbContratsActifs" INTEGER NOT NULL DEFAULT 0,
    "primesCumulees" REAL NOT NULL DEFAULT 0,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "etape" TEXT NOT NULL DEFAULT 'PROSPECTION',
    "montantEstime" REAL,
    "probabilite" INTEGER,
    "produitsCibles" TEXT,
    "dateCreation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateMaj" DATETIME NOT NULL,
    "dateClosingPrev" DATETIME,
    "dateClosingReel" DATETIME,
    "motifPerte" TEXT,
    "notes" TEXT,
    "assigneA" TEXT,
    CONSTRAINT "Deal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contratId" TEXT NOT NULL,
    "montant" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "dateVersement" DATETIME,
    "statut" TEXT NOT NULL DEFAULT 'prevu',
    "notes" TEXT,
    "dateCreation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Commission_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "Contrat" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "priorite" TEXT NOT NULL DEFAULT 'normale',
    "dateEcheance" DATETIME NOT NULL,
    "dateRealisation" DATETIME,
    "statut" TEXT NOT NULL DEFAULT 'a_faire',
    "assigneA" TEXT,
    "recurrence" TEXT,
    "dateCreation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tache_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_siret_key" ON "Client"("siret");

-- CreateIndex
CREATE UNIQUE INDEX "Compagnie_nom_key" ON "Compagnie"("nom");
