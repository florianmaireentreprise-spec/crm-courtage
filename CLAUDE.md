# GargarineV1 — CRM Courtage d'Assurances

## Stack Technique
- **Framework**: Next.js 16.1.6 (App Router) + React 19.2.3 + TypeScript strict
- **ORM**: Prisma 6.19 + PostgreSQL (Neon)
- **UI**: shadcn/ui + Tailwind CSS 4 + Radix UI + Lucide icons
- **Auth**: NextAuth v5 beta.30 (credentials provider, bcryptjs)
- **IA**: Claude API (@anthropic-ai/sdk) — analyse emails
- **Email**: Gmail API (googleapis) — OAuth2
- **Charts**: Recharts 3.7
- **DnD**: @hello-pangea/dnd (Kanban pipeline)
- **Search**: cmdk (Cmd+K)
- **Deploy**: Vercel + cron jobs (vercel.json)
- **Validation**: Zod 4

## Commandes
```bash
npm run dev       # Dev server
npm run build     # prisma generate && next build
npx prisma db push  # Sync schema (pas de migrations)
npx prisma studio   # GUI base de donnees
```

## Structure du Projet

```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── login/page.tsx          # Page de connexion
│   ├── (app)/                  # Layout authentifie
│   │   ├── page.tsx            # Dashboard (/)
│   │   ├── clients/            # CRUD clients + fiche detaillee
│   │   ├── contrats/           # CRUD contrats
│   │   ├── compagnies/         # CRUD compagnies d'assurance
│   │   ├── dirigeants/         # CRUD dirigeants
│   │   ├── prescripteurs/      # CRUD prescripteurs (apporteurs)
│   │   ├── pipeline/           # Kanban commercial (DnD)
│   │   ├── commissions/        # Suivi commissions
│   │   ├── objectifs/          # Objectifs commerciaux
│   │   ├── relances/           # Taches et relances
│   │   ├── reseau/             # Reseau de prospection
│   │   ├── emails/             # Inbox IA (Gmail sync + analyse)
│   │   ├── sequences/          # Sequences de prospection
│   │   └── parametres/         # Settings + rapports hebdo
│   └── api/
│       ├── auth/[...nextauth]/ # NextAuth handler
│       ├── gmail/auth + callback/ # OAuth2 Gmail
│       ├── search/             # Recherche globale
│       ├── clients-list/       # API liste clients (select)
│       ├── compagnies-list/    # API liste compagnies (select)
│       ├── automatisations/    # Config automatisations
│       └── cron/               # 5 jobs planifies
│           ├── emails/         # Sync Gmail (*/15 min)
│           ├── auto-tasks/     # Taches auto (7h/jour)
│           ├── sequences/      # Sequences prospection (8h/jour)
│           ├── campagnes/      # Campagnes (1er du mois 9h)
│           └── rapport-hebdo/  # Rapport hebdo (lundi 8h)
├── components/
│   ├── clients/          # ClientForm
│   ├── commissions/      # CommissionTable, CompagnieProgress
│   ├── compagnies/       # CompagnieForm
│   ├── contrats/         # ContratForm
│   ├── dashboard/        # KPICards, PipelineChart, RevenueChart,
│   │                     # CAEvolutionChart, ProductPieChart,
│   │                     # TasksWidget, RenewalsWidget,
│   │                     # PrescripteursWidget, CampagnesWidget
│   ├── dirigeants/       # DirigeantForm
│   ├── emails/           # EmailList, EmailCard, AnalysisPanel,
│   │                     # GmailConnectButton
│   ├── layout/           # Header, Sidebar, MobileNav, SearchDialog
│   ├── objectifs/        # ObjectifCard, ObjectifForm, ObjectifGrid,
│   │                     # ForecastBadge
│   ├── parametres/       # UserManagement
│   ├── pipeline/         # KanbanBoard, KanbanColumn, DealCard, DealForm
│   ├── prescripteurs/    # PrescripteurForm, DeletePrescripteurButton
│   ├── providers/        # SessionProvider
│   ├── relances/         # TacheList, TacheForm
│   ├── reseau/           # AddContactButton, ReseauObjectifForm
│   ├── sequences/        # SequencesList
│   └── ui/               # 23 composants shadcn/ui
├── lib/
│   ├── auth.ts           # Config NextAuth (credentials)
│   ├── prisma.ts         # Singleton Prisma client
│   ├── constants.ts      # Toutes les constantes metier
│   ├── utils.ts          # cn() helper
│   ├── objectifs.ts      # Calcul objectifs commerciaux
│   ├── objectifs-defaut.ts # Objectifs par defaut
│   ├── validators/       # Schemas Zod (client, objectif)
│   ├── email/
│   │   ├── ai.ts         # Prompts + parsing analyse IA (Claude)
│   │   ├── gmail.ts      # Client Gmail API (OAuth2, fetch, send)
│   │   └── sync.ts       # Sync emails (cron + manuel), analyzeEmailById()
│   ├── scoring/
│   │   ├── prospect.ts   # Score prospect (0-100)
│   │   ├── potentiel.ts  # Potentiel CA client
│   │   ├── opportunities.ts # Detection opportunites cross-sell
│   │   └── couverture360.ts # Couverture 360 dirigeant
│   └── automation/
│       ├── auto-tasks.ts # Generation taches automatiques
│       ├── campagnes.ts  # Campagnes marketing mensuelles
│       ├── sequences.ts  # Execution sequences prospection
│       ├── prescripteur-tracking.ts # Suivi prescripteurs
│       └── rapport-hebdo.ts # Generation rapport hebdo
└── middleware.ts         # Auth middleware
```

## Modeles Prisma (17 tables)

### User
`id` `email` (unique) `password` `prenom` `nom` `role` (defaut: "gerant") `dateCreation`

### Client
`id` `raisonSociale` `siret` (unique?) `formeJuridique` `secteurActivite` `nbSalaries` `chiffreAffaires` `conventionCollective` `mutuelleActuelle` `prevoyanceActuelle` `dateEcheanceMutuelle` `dateEcheancePrevoyance` `civilite` `prenom` `nom` `email` `telephone` `adresse` `codePostal` `ville` `dateNaissance` `sourceAcquisition` `prescripteurId` → Prescripteur `notes` `statut` (defaut: "prospect") `dateCreation` `dateMaj` `assigneA` `derniereInteraction` `noteEmails` `categorieReseau` `courtierActuel` `assureurActuelSante` `dateDerniereRevision` `motifChangement`
Relations: contrats[], deals[], taches[], emails[], dirigeant?, sequenceInscriptions[]

### Dirigeant
`id` `clientId` (unique) → Client `civilite` `prenom` `nom` `email` `telephone` `dateNaissance` `statutProfessionnel` (TNS/assimile_salarie) `mutuellePerso` `prevoyancePerso` `protectionActuelle` `regimeRetraite` `complementaireRetraite` `epargneActuelle` `montantEpargne` `besoinsPatrimoniaux` `objectifsRetraite` `dateAuditDirigeant` `notes` `dateCreation` `dateMaj`

### Prescripteur
`id` `type` (expert_comptable/avocat/partenaire/client_prescripteur) `civilite` `prenom` `nom` `entreprise` `email` `telephone` `adresse` `ville` `dossiersEnvoyes` (int, defaut:0) `clientsSignes` (int, defaut:0) `commissionsGenerees` (float, defaut:0) `derniereRecommandation` `notes` `statut` (defaut: "actif") `dateCreation` `dateMaj`
Relations: clients[], deals[]

### Contrat
`id` `clientId` → Client `typeProduit` `compagnieId` → Compagnie? `nomProduit` `numeroContrat` `primeAnnuelle` (float) `tauxCommApport` `tauxCommGestion` `commissionAnnuelle` `modeVersement` `frequenceVersement` `dateEffet` `dateEcheance` `dateResiliation` `dateRenouvellement` `nbBeneficiaires` `cotisationUnitaire` `statut` (defaut: "actif") `notes` `dateCreation` `dateMaj`
Relations: commissions[]

### Compagnie
`id` `nom` (unique) `type` `contactNom` `contactEmail` `contactTelephone` `conventionSignee` (bool) `dateConvention` `seuilSurcommission` `tauxSurcommission` `nbContratsActifs` `primesCumulees` `notes`
Relations: contrats[]

### Deal (Pipeline)
`id` `clientId` → Client `titre` `etape` (defaut: "PROSPECT_IDENTIFIE") `montantEstime` `probabilite` (int 0-100) `produitsCibles` `sourceProspect` `prescripteurId` → Prescripteur? `qualificationNotes` `problematiqueDirigeant` `checklistAudit` (JSON) `rapportAudit` `syntheseClient` `propositionCommerciale` `comparatifAssureurs` `simulationCotisations` `assureurChoisi` `commissionsAttendues` `documentsNotes` `dateCreation` `dateMaj` `dateClosingPrev` `dateClosingReel` `dateSignature` `dateOnboarding` `motifPerte` `notes` `assigneA`

### Commission
`id` `contratId` → Contrat `montant` `type` `periode` `dateVersement` `statut` (defaut: "prevu") `notes` `dateCreation`

### Tache
`id` `clientId` → Client? `emailId` → Email? `titre` `description` `type` `priorite` (defaut: "normale") `dateEcheance` `dateRealisation` `statut` (defaut: "a_faire") `assigneA` `recurrence` `autoGenerated` (bool) `sourceAuto` `dateCreation`

### Objectif
`id` `userId` `type` `periode` `annee` `mois` `trimestre` `valeurCible` `dateCreation` `dateMaj`

### ReseauObjectif
`id` `categorie` (unique) `contactsObjectif` `tauxConversionObj` `potentielUnitaire` `notes` `dateCreation` `dateMaj`

### GmailConnection
`id` `userId` (unique) `gmailEmail` `accessToken` `refreshToken` `tokenExpiry` `dateConnecte` `dateMaj`

### Email
`id` `userId` `gmailId` (unique) `threadId` `sujet` `expediteur` `destinataires` `dateEnvoi` `extrait` `direction` (entrant/sortant) `pertinence` `scoreRelevance` `resume` `actionsItems` `reponseProposee` `typeEmail` (client/prospect/assureur/prescripteur/autre) `urgence` `sentiment` `actionRequise` `actionTraitee` `analyseIA` (JSON) `dealUpdateSuggestion` (JSON) `produitsMentionnes` (JSON) `clientId` → Client? `analyseStatut` `lu` `dateCreation` `dateMaj`
Relations: taches[]

### Sequence
`id` `nom` `description` `etapes` (JSON) `active` (bool) `dateCreation` `dateMaj`
Relations: inscriptions[]

### SequenceInscription
`id` `sequenceId` → Sequence `clientId` → Client `etapeActuelle` `statut` (en_cours/terminee/annulee) `dateInscription` `dateProchaineAction` `dateMaj`

### RapportHebdo
`id` `semaine` (format "2026-W10") `contenu` (JSON) `resumeIA` `actionsIA` (JSON) `dateGeneration`

## Constantes Metier (src/lib/constants.ts)

### Types Produits
SANTE_COLLECTIVE, PREVOYANCE_COLLECTIVE, PREVOYANCE_MADELIN, SANTE_MADELIN, RCP_PRO, PER, ASSURANCE_VIE, PROTECTION_JURIDIQUE

### Etapes Pipeline (8)
PROSPECT_IDENTIFIE → QUALIFICATION → AUDIT → RECOMMANDATION → SIGNATURE → ONBOARDING → DEVELOPPEMENT | PERDU

### Statuts Client
prospect, client_actif, ancien_client

### Types Tache
RELANCE_PROSPECT, RENOUVELLEMENT, SIGNATURE, APPEL, RDV, ADMIN, AUDIT_DIRIGEANT, DEV_CLIENT, ONBOARDING, REVISION_ANNUELLE, FIDELISATION

### Categories Reseau
dirigeant_tpe, dirigeant_pme, medecin, avocat, profession_liberale, expert_comptable, commercant, artisan, association, pharmacien, infirmier, kine, architecte, notaire, consultant

### Taux Commission Defaut
| Produit | Apport | Gestion |
|---------|--------|---------|
| SANTE_COLLECTIVE | 7% | 6% |
| PREVOYANCE_COLLECTIVE | 10% | 8% |
| PREVOYANCE_MADELIN | 20% | 15% |
| SANTE_MADELIN | 12% | 10% |
| RCP_PRO | 15% | 12% |
| PER | 3% | 0.7% |
| ASSURANCE_VIE | 3% | 0.7% |
| PROTECTION_JURIDIQUE | 18% | 15% |

## Logique Metier Cle

### Pipeline — moveDeal() (pipeline/actions.ts)
Quand un deal change d'etape, des actions automatiques se declenchent:
- **AUDIT** → Cree tache "Preparer recommandation" (7j)
- **RECOMMANDATION** → Cree tache "Relancer dans 7 jours"
- **SIGNATURE** → Set dateSignature + dateClosingReel
- **ONBOARDING** → Passe client en "client_actif" + cree 3 taches (completer fiche 3j, planifier suivi 7j, revision annuelle 365j)
- **DEVELOPPEMENT** → Cree 3 taches (audit dirigeant 14j, optimisation retraite 30j, proposition epargne 45j)
- **PERDU** → Set motifPerte + dateClosingReel

### Signature → Contrats (createContractsFromDeal)
Cree automatiquement des contrats avec taux de commission par defaut selon le type de produit.

### Analyse Email IA (email/sync.ts)
`analyzeEmailById(emailId)` — Point d'entree unique pour analyser un email:
1. Charge l'email depuis la DB
2. Construit un prompt metier (email/ai.ts)
3. Appelle Claude API
4. Parse la reponse (type, urgence, sentiment, resume, actions)
5. Rattache automatiquement au client si match email
6. Met a jour les stats prescripteur si email de prescripteur

### Auto-Tasks (automation/auto-tasks.ts)
Cron quotidien 7h — genere des taches pour:
- Echeances contrats a 30/60/90 jours
- Revision annuelle clients actifs
- Relance prospects sans interaction 14j
- Fidelisation clients 90j sans contact
- Couverture incomplete (manque mutuelle ou prevoyance)
- Suivi prescripteurs actifs

### Scoring Prospect (scoring/prospect.ts)
Score 0-100 base sur: taille entreprise, CA, couverture actuelle, echeances proches, engagement email

## Variables d'Environnement
```
DATABASE_URL=            # PostgreSQL Neon (pooler)
DIRECT_URL=              # PostgreSQL Neon (direct)
NEXTAUTH_SECRET=         # Secret NextAuth
NEXTAUTH_URL=            # URL de l'app
ANTHROPIC_API_KEY=       # Cle API Claude
GMAIL_CLIENT_ID=         # OAuth2 Gmail
GMAIL_CLIENT_SECRET=     # OAuth2 Gmail
CRON_SECRET=             # Secret pour crons Vercel (optionnel)
```

## Conventions de Code
- Server Actions dans `actions.ts` par module (pas de fichier actions global)
- Toutes les mutations passent par des Server Actions (pas d'API REST pour les mutations)
- Validation Zod dans les Server Actions
- Auth check (`await auth()`) sur les actions sensibles (delete)
- `revalidatePath()` apres chaque mutation
- Les composants client sont marques `"use client"`
- Prisma queries directes dans les pages serveur (pas de service layer)
- Langue du code: anglais pour les noms de variables/fonctions, francais pour les labels UI et messages
