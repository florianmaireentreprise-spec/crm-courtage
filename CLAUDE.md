# GargarineV1 — CRM Courtage d'Assurances

## Stack Technique
- **Framework**: Next.js 16.1.6 (App Router) + React 19.2.3 + TypeScript strict
- **ORM**: Prisma 6.19 + PostgreSQL (Neon)
- **UI**: shadcn/ui + Tailwind CSS 4 + Radix UI + Lucide icons
- **Auth**: NextAuth v5 beta.30 (credentials provider, bcryptjs)
- **IA**: Gemini 2.0 Flash via n8n — analyse emails (n8n-native)
- **Email**: Gmail API (googleapis) — OAuth2
- **Automations**: n8n Cloud (10 workflows) — taches auto, sequences, campagnes, rapports, emails, prescripteurs
- **Charts**: Recharts 3.7
- **DnD**: @hello-pangea/dnd (Kanban pipeline)
- **Search**: cmdk (Cmd+K)
- **Deploy**: Vercel (zero config, gratuit)
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
│       ├── cron/
│       │   └── emails/         # Sync Gmail (declenche par n8n ou manuel)
│       └── n8n/                # API routes pour n8n Cloud
│           ├── middleware.ts    # Auth (x-n8n-secret) + logging
│           ├── emails/         # check-existing, store, create-draft, [emailId]/context
│           ├── taches/         # CRUD taches + pending-replies + auto-close
│           ├── contrats/       # Echeances contrats
│           ├── pipeline/       # Deals stale
│           ├── clients/sans-interaction/  # Clients inactifs
│           ├── prescripteurs/inactifs/    # Prescripteurs inactifs
│           ├── dirigeants/couverture-incomplete/  # Couverture incomplete
│           ├── deals/mark-lost/           # Marquer deals perdus
│           ├── campagnes/clients-cibles/  # Clients cibles campagnes
│           ├── sequences/      # Actions dues + avancer
│           ├── kpis/           # KPIs pour rapport hebdo
│           └── health/         # Health check
├── components/
│   ├── clients/          # ClientForm, ClientEmailHistory
│   ├── commissions/      # CommissionTable, CompagnieProgress
│   ├── compagnies/       # CompagnieForm
│   ├── contrats/         # ContratForm
│   ├── dashboard/        # KPICards, PipelineChart, RevenueChart,
│   │                     # CAEvolutionChart, ProductPieChart,
│   │                     # TasksWidget, RenewalsWidget,
│   │                     # PrescripteursWidget, CampagnesWidget,
│   │                     # EmailsWidget
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
│   ├── prescripteurs.ts  # Alertes prescripteurs (types + detection)
│   ├── sequences.ts      # Sequences de prospection (types + init + inscrire)
│   ├── n8n.ts            # emitN8nEvent() + callN8nWebhook() — CRM ↔ n8n
│   ├── email/
│   │   ├── ai.ts         # Prompts (reference, IA via n8n)
│   │   ├── gmail.ts      # Client Gmail API (OAuth2, fetch, send, drafts)
│   │   └── sync.ts       # Helpers (matchClient, extractEmail, classifyPertinence)
│   └── scoring/
│       ├── prospect.ts   # Score prospect (0-100)
│       ├── potentiel.ts  # Potentiel CA client
│       ├── opportunities.ts # Detection opportunites cross-sell
│       └── couverture360.ts # Couverture 360 dirigeant
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
`id` `clientId` → Client? `emailId` → Email? `titre` `description` `type` `priorite` (defaut: "normale") `dateEcheance` `dateRealisation` `statut` (defaut: "a_faire") `assigneA` `recurrence` `autoGenerated` (bool) `sourceAuto` `autoFermee` (bool) `raisonFermeture` `dateCreation`

### Objectif
`id` `userId` `type` `periode` `annee` `mois` `trimestre` `valeurCible` `dateCreation` `dateMaj`

### ReseauObjectif
`id` `categorie` (unique) `contactsObjectif` `tauxConversionObj` `potentielUnitaire` `notes` `dateCreation` `dateMaj`

### GmailConnection
`id` `userId` (unique) `gmailEmail` `accessToken` `refreshToken` `tokenExpiry` `dateConnecte` `dateMaj`

### Email
`id` `userId` `gmailId` (unique) `threadId` `sujet` `expediteur` `destinataires` `dateEnvoi` `extrait` `direction` (entrant/sortant) `pertinence` `scoreRelevance` `resume` `actionsItems` `reponseProposee` `typeEmail` (client/prospect/assureur/prescripteur/autre) `urgence` `sentiment` `actionRequise` `actionTraitee` `analyseIA` (JSON) `dealUpdateSuggestion` (JSON) `produitsMentionnes` (JSON) `clientId` → Client? `analyseStatut` `lu` `notes` `gmailDraftId` `draftStatut` `dateCreation` `dateMaj`
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

### Analyse Email IA (n8n WF05v2)
L'analyse IA est entierement geree par n8n (architecture n8n-native) :
1. WF07 sync Gmail → stocke email via POST /api/n8n/emails/store
2. WF05v2 recoit email.received → charge contexte client → Gemini 2.0 Flash (JSON)
3. Resultat stocke via POST /api/n8n/emails (type, urgence, resume, actions)
4. Si action requise : cree tache "Repondre" + brouillon Gmail via CRM OAuth
5. WF08 : quand email sortant detecte → ferme auto les taches "Repondre"
6. WF09 : regeneration reponse IA a la demande (bouton CRM → webhook synchrone)

### Automations (n8n Cloud) — Architecture n8n-native
10 workflows n8n orchestrent toute l'automatisation. Le CRM est UI + database shell :
- **01-auto-tasks** (7h) — echeances, deals inactifs, fidelisation, prescripteurs, couverture
- **02-sequences** (8h) — execute les etapes de sequences de prospection
- **03-campagnes** (1er du mois) — campagnes saisonnieres ciblees
- **04-rapport-hebdo** (lundi 8h) — KPIs + email resume via Gmail
- **05-email-intelligence-v2** (webhook) — analyse IA avec Gemini 2.0 Flash, cree taches + brouillons
- **06-prescripteur-tracking** (lundi 7h30) — relance prescripteurs inactifs
- **07-gmail-sync** (15min) — sync Gmail INBOX + SENT, stocke en CRM, declenche WF05/WF08
- **08-auto-close-tasks** (webhook) — ferme auto les taches "Repondre" quand email sortant detecte
- **09-generate-reply** (webhook sync) — generation reponse IA a la demande depuis le CRM
Voir `n8n-workflows/README.md` pour la config.

### Scoring Prospect (scoring/prospect.ts)
Score 0-100 base sur: taille entreprise, CA, couverture actuelle, echeances proches, engagement email

## Variables d'Environnement
```
DATABASE_URL=            # PostgreSQL Neon (pooler)
DIRECT_URL=              # PostgreSQL Neon (direct)
NEXTAUTH_SECRET=         # Secret NextAuth
NEXTAUTH_URL=            # URL de l'app
# GOOGLE_AI_API_KEY     # Plus necessaire (IA via n8n)
GMAIL_CLIENT_ID=         # OAuth2 Gmail
GMAIL_CLIENT_SECRET=     # OAuth2 Gmail
N8N_WEBHOOK_SECRET=      # Secret partage avec n8n Cloud
N8N_WEBHOOK_URL=         # URL webhook n8n (pour emitN8nEvent)
N8N_GENERATE_REPLY_URL=  # URL webhook n8n pour WF09 (generate-reply)
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

## Bug Resolution Protocol
When you encounter a bug (build error, runtime error, unexpected behavior, failed test), you must NEVER attempt to fix it immediately. You MUST follow this 4-step protocol in order:

### Step 1 — Reproduce
- Identify the exact conditions that trigger the bug
- Run the command or action that produces the error
- Read the COMPLETE error message (full stack trace, line number, file path)
- If the bug is intermittent, trigger it multiple times to confirm the pattern
- Copy the exact error output before doing anything else

### Step 2 — Isolate
- Trace back through the stack trace to identify the source file and function
- Read the relevant code using `view` — do NOT rely on your memory of the file
- Identify what input data causes the problem
- Determine whether the bug comes from recently modified code or pre-existing code
- Check related files that interact with the broken code (imports, callers, dependencies)

### Step 3 — Understand and explain BEFORE touching any code
- Before making ANY edit, you MUST explain:
  - What is the ROOT CAUSE (not the symptom)
  - Why the current code produces this behavior
  - What is the data flow that leads to the bug
- If you are uncertain about the cause, say so explicitly and run a diagnostic test first (console.log, assertion, Prisma query, minimal reproduction) to confirm your hypothesis
- Do NOT proceed to Step 4 until the root cause is clearly identified

### Step 4 — Fix
- Only after explaining the root cause, propose and apply the fix
- The fix MUST target the root cause, not work around the symptom
- After applying the fix, verify it works by re-running the failing command
- Run `npm run build` to check for regressions
- If the fix is non-trivial, explain why this approach over alternatives

### Strictly forbidden
- Modifying code "blindly" to see if it resolves the problem
- Chaining multiple fix attempts without understanding why the previous one failed
- Deleting working code to bypass an error
- Writing try/catch blocks that silently swallow errors without handling them
- Adding `// @ts-ignore` or `as any` to suppress type errors instead of fixing them
- Reverting unrelated code changes as a "just in case" measure
