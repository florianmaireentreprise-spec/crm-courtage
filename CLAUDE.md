# GargarineV1 — CRM Courtage d'Assurances

Internal cabinet tool for insurance brokerage. Pre-launch phase. Single-user (gerant). No client portal.

## Stack Technique
- **Framework**: Next.js 16.1.6 (App Router) + React 19.2.3 + TypeScript strict
- **ORM**: Prisma 6.19 + PostgreSQL (Neon)
- **UI**: shadcn/ui + Tailwind CSS 4 + Radix UI + Lucide icons
- **Auth**: NextAuth v5 beta.30 (credentials provider, bcryptjs)
- **IA**: Mistral Small via n8n — analyse emails (queue-based pipeline)
- **Email**: Gmail API (googleapis) — OAuth2
- **Automations**: n8n Cloud (9 workflows) — taches auto, sequences, campagnes, rapports, emails, prescripteurs
- **Storage**: Vercel Blob (private access) — document management
- **Charts**: Recharts 3.7
- **DnD**: @hello-pangea/dnd (Kanban pipeline)
- **Search**: cmdk (Cmd+K) — async server-side search, `shouldFilter={false}`
- **Deploy**: Vercel (zero config, gratuit)
- **Validation**: Zod 4

## Commandes
```bash
npm run dev       # Dev server
npm run build     # prisma generate && next build
npx prisma db push  # Sync schema (pas de migrations)
npx prisma studio   # GUI base de donnees
```

---

## Current Implemented State

### Core CRM (stable, production-ready)
- Client CRUD + fiche detaillee with KPI cards (contrats, CA, score, potentiel, couverture 360)
- Dirigeant CRUD (1:1 with Client)
- Contrat CRUD with commission tracking
- Compagnie CRUD
- Prescripteur CRUD with activity tracking
- 8-stage pipeline (Kanban DnD) with automatic task/contrat creation on stage transitions
- Commission tracking
- Objectifs commerciaux
- Taches/relances system (manual + auto-generated)
- Reseau de prospection (category-based objectives)
- Sequences de prospection

### Email Intelligence (stable)
- Gmail sync (OAuth2, bidirectional via n8n WF07)
- AI analysis queue (n8n WF10, Mistral Small, batch=10, 30min cron)
- Urgent emails inbox (/emails/urgent)
- AI-generated draft replies with qualification rules for collective products
- Auto-close reply tasks on outbound email detection (WF08)
- On-demand AI regeneration (WF09 webhook)
- AnalysisPanel: full email cockpit with type/urgence/sentiment, actions, draft management

### Commercial Intelligence Engine (Stages 1-9, implemented March 2026)
Built in 9 incremental stages. All code compiles and deploys. Core logic is deterministic (no AI), triggered by email analysis results.

**Stage 1** — Signal extraction (`lib/scoring/signals.ts`)
- `extraireSignauxCommerciaux()`: deterministic extraction from AI email analysis JSON
- Signal types: produit_mentionne, sentiment_positif/negatif, objection, besoin, urgence, deal_update

**Stage 2** — Commercial memory (cached fields on Client model)
- `mettreAJourMemoireCommerciale()`: persists SignalCommercial rows + recalculates 7 cached fields on Client
- Cached fields: temperatureCommerciale, produitsDiscutes, besoinsIdentifies, objectionsConnues, dernierSignalDate, dernierSignalResume, nbSignaux
- Temperature scoring: weighted 30-day window (chaud >= 4, tiede >= 1, froid < 1)

**Stage 3** — Opportunity detection (`lib/opportunities/detection.ts`)
- `detecterOpportunitesDepuisEmail()`: 5 rules (product interest, quote request, renewal, new need, urgent signal)
- `persistOpportunites()`: deduplication by dedupeKey (clientId:typeProduit:sourceType) + 30-day cooldown on rejected opportunities
- Cross-sell rules (`lib/scoring/opportunities.ts`): 5 portfolio-based rules (health/prevoyance gap, director coverage, renewals)
- `persisterOpportunitesCrossSell()`: idempotent persistence with cooldown

**Stage 4** — Email-to-prospect bridge (`emails/actions.ts: createProspectAndOpportunity`)
- One-click: creates prospect Client from unknown sender, links email, extracts signals, detects opportunities
- 3-step client resolution: email.clientId → matchClientByEmail → create new
- Idempotent (multi-click safe via existing guards on signals + opportunities)
- UI: emerald button in AnalysisPanel, conditional on `hasCommercialIntent`
- **Validation status**: code implemented and builds, pending end-to-end validation with a real unlinked prospect email

**Stage 5** — Opportunity lifecycle
- Status transitions: detectee → qualifiee → en_cours → gagnee/perdue/rejetee
- UI actions on OpportunitesCard with optional motif for reject/loss

**Stages 6-6C** — Email inbox as commercial cockpit
- AnalysisPanel enhanced with signal display, product badges, draft management
- Feedback tracking (FeedbackIA model) for AI corrections
- Manual analysis trigger (immediate via WF09)

**Stage 7** — Polling hardening + feedback stats

**Stage 8** — Explainability improvements
- `sourceType` field on OpportuniteCommerciale: "signal" | "email_analysis" | "cross_sell" | "manual"
- `origineSignal` field: produit_mentionne, besoin, demande_devis, renouvellement, etc.
- `metadata` JSON: stores regleId, confiance, details for full traceability
- Detection quality stats displayed in AnalysisPanel

**Stage 8b** — Hardening
- Cross-stage consistency fixes between signals, memory, and opportunity persistence

**Stage 9** — Cross-sell persistence
- `persisterOpportunitesCrossSell()` called on client page load (server-side, awaited)
- Portfolio-based cross-sell rules create opportunities with sourceType="cross_sell"
- OpportunitesCard shows full labels for both sourceType and origineSignal on active AND closed opportunities

### Client Page Intelligence Cards
The client detail page (`clients/[id]/page.tsx`) renders three intelligence cards:
- **NextActionWidget**: up to 10 prioritized actions from `calculerProchainesActions()` (15 rules)
- **CommercialMemoryCard**: temperature badge, products discussed, needs, objections, signal count
- **OpportunitesCard**: active opportunities with lifecycle actions, closed opportunities with sourceType labels

### Document Management — GED V1 (implemented, stable)
- Vercel Blob private storage (10MB max per file)
- 4 categories: administratif, conseil, contractuel, echange
- 18 document types (piece identite, KBIS, contrat, avenant, comparatif, etc.)
- Upload with metadata (categorie, typeDocument, nomAffiche, dateDocument, notes)
- Optional linking to contrat, opportunite, or deal
- Actions: download (stream private blob), archive (soft delete), delete (blob + DB, with confirmation)
- DocumentsTab component on client detail page
- API routes: GET list, POST upload, PATCH update, DELETE, GET download

### Global Search (implemented, browser-validated)
- Cmd+K or click search bar → CommandDialog
- 8 entity types: clients, dirigeants, contrats, deals, prescripteurs, compagnies, documents, emails
- Server-side search via `/api/search?q=` (Prisma contains/insensitive, max 5 per type)
- Critical fix: `shouldFilter={false}` on cmdk CommandDialog (without this, cmdk's client-side filter hides async-loaded results)
- **Validation status**: API confirmed returning correct results. UI confirmed displaying results and navigating to client page via browser automation (March 13, 2026). Not yet validated by human manual testing.

---

## Architectural Decisions

### Settled
1. **CRM is an internal cabinet tool** — single-user (gerant), no client portal planned, no multi-tenant
2. **Insurer tools remain source of truth** for compliance, signature workflows, insurer-specific processes. CRM stores cabinet working/reference copies of documents only
3. **One `OpportuniteCommerciale` table** supports both email-driven (sourceType="signal"/"email_analysis") and portfolio cross-sell (sourceType="cross_sell") opportunities. Unified lifecycle
4. **Opportunity traceability** uses three distinct fields:
   - `sourceType`: how the opportunity was detected (signal, email_analysis, cross_sell, manual)
   - `origineSignal`: what specific trigger caused it (produit_mentionne, besoin, demande_devis, etc.)
   - `metadata.regleId`: which detection rule fired (for debugging/audit)
5. **Commercial memory is cached on Client** — no separate MemoireCommerciale model. 7 denormalized fields recalculated on each signal update
6. **n8n-native automation architecture** — CRM is UI + database shell, n8n orchestrates all automated workflows. No cron jobs in the CRM itself
7. **No service layer** — Prisma queries direct in server pages, mutations via Server Actions
8. **Vercel Blob for document storage** — private access mode, server-side streaming for downloads. No signed URLs
9. **Pre-launch business orientation**: network/reseau as launch engine. Product-selling automation is secondary until real client activity provides data

### Not yet decided / open
- Recommendation/preconisation object structure (currently no formal object, just free-text in deal fields)
- How reseau/network model evolves into a launch cockpit (current model is category + objective counts)
- Whether scoring models need calibration once real data exists (currently using reasonable defaults)

---

## Known Limitations

### Intentionally not implemented
- **No recommendation/preconisation object**: deal fields (propositionCommerciale, comparatifAssureurs, simulationCotisations) serve as free-text placeholders. No structured recommendation workflow
- **No compliance workflow in CRM**: DDA compliance, regulatory checks, suitability assessments are handled in insurer tools. CRM has no compliance layer
- **No insurer-integrated signature workflow**: e-signature, document collection, insurer API integrations are out of scope. CRM tracks deal stages only
- **No client portal**: all interactions are through the cabinet's internal CRM interface
- **No multi-user permissions**: single gerant user, no role-based access beyond basic auth

### Technical debt / open issues
- `parseAIResponse()` in `src/lib/email/ai.ts` is dead code (never imported)
- Railway still auto-deploys from repo (build fails). Should disconnect from Railway dashboard
- Junk filter retroactive cleanup on `/emails` page may have Vercel SSR caching issue

### Validation gaps
- Stage 4 (createProspectAndOpportunity): code implemented, builds clean, but not yet validated end-to-end with a real unlinked prospect email in production
- Global search: validated via browser automation (API returns correct results, UI displays them, click-through navigation works). Pending human manual confirmation
- Commercial intelligence engine (Stages 1-9): core logic is deterministic and testable, but no automated test suite exists. Behavior validated through manual testing during development
- n8n workflows: running in production but monitoring is manual (no alerting beyond n8n Cloud built-in)

---

## Next Priorities

Based on actual business direction (pre-launch cabinet tool, network-driven launch):

1. **Reseau/network as launch cockpit** — current model (category + objective counts) needs to evolve into an actionable prospection pipeline: contact tracking per category, conversion funnel, activity logging, forecasting from network potential
2. **Stronger prospect/client dossier structure** — currently prospect → client transition is a status field change. Needs structured qualification data, meeting notes, needs assessment before the recommendation phase
3. **Pre-launch business forecasting** — estimate pipeline from network objectives: categories × conversion rates × average deal size. Dashboard widget for launch readiness
4. **Search stabilization** — confirm human manual validation of global search, fix any edge cases found
5. **Recommendation/compliance layers** — postponed until real activity/product reality is clearer. Will need: structured recommendation object, DDA compliance checkpoints, document checklist per product type

---

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
│       ├── search/             # Recherche globale (8 entity types)
│       ├── documents/          # GED V1 (upload, list, update, delete, download)
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
│   ├── clients/          # ClientForm, ClientEmailHistory,
│   │                     # OpportunitesCard, CommercialMemoryCard,
│   │                     # NextActionWidget, DocumentsTab
│   ├── commissions/      # CommissionTable, CompagnieProgress
│   ├── compagnies/       # CompagnieForm
│   ├── contrats/         # ContratForm
│   ├── dashboard/        # KPICards, PipelineChart, RevenueChart,
│   │                     # CAEvolutionChart, ProductPieChart,
│   │                     # TasksWidget, RenewalsWidget,
│   │                     # PrescripteursWidget, CampagnesWidget,
│   │                     # EmailsWidget, UrgentEmailsWidget,
│   │                     # RecentActivityWidget
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
│   └── ui/               # shadcn/ui components
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
│   ├── n8n.ts            # emitN8nEvent() + callN8nWebhook() — CRM <-> n8n
│   ├── email/
│   │   ├── ai.ts         # Prompts (reference, IA via n8n) + qualification rules
│   │   ├── gmail.ts      # Client Gmail API (OAuth2, fetch, send, drafts)
│   │   └── sync.ts       # Helpers (matchClient, extractEmail, classifyPertinence)
│   ├── scoring/
│   │   ├── prospect.ts       # Score prospect (0-100, 6 factors)
│   │   ├── potentiel.ts      # Potentiel CA client (6-product upsell model)
│   │   ├── opportunities.ts  # Cross-sell rules (5 portfolio-based rules)
│   │   ├── couverture360.ts  # Couverture 360 dirigeant (6 products)
│   │   ├── signals.ts        # Signal extraction + commercial memory update
│   │   └── next-actions.ts   # Next-best-action engine (15 rules, max 10 actions)
│   └── opportunities/
│       └── detection.ts      # Email-triggered opportunity detection (5 rules + dedup)
└── middleware.ts         # Auth middleware
```

## Modeles Prisma (22 tables)

### Core Business
**User** — `id` `email` (unique) `password` `prenom` `nom` `role` (defaut: "gerant") `dateCreation`

**Client** — `id` `raisonSociale` `siret` `formeJuridique` `secteurActivite` `nbSalaries` `chiffreAffaires` `conventionCollective` `mutuelleActuelle` `prevoyanceActuelle` `dateEcheanceMutuelle` `dateEcheancePrevoyance` `civilite` `prenom` `nom` `email` `telephone` `adresse` `codePostal` `ville` `dateNaissance` `sourceAcquisition` `prescripteurId` → Prescripteur `notes` `statut` (defaut: "prospect") `dateCreation` `dateMaj` `assigneA` `derniereInteraction` `noteEmails` `categorieReseau` `courtierActuel` `assureurActuelSante` `dateDerniereRevision` `motifChangement` `scoreProspect` `potentielCA` `scoreCouverture`
Commercial memory cached fields: `temperatureCommerciale` `produitsDiscutes` (JSON) `besoinsIdentifies` (JSON) `objectionsConnues` (JSON) `dernierSignalDate` `dernierSignalResume` `nbSignaux`
Relations: contrats[], deals[], taches[], emails[], dirigeant?, sequenceInscriptions[], signauxCommerciaux[], opportunites[], documents[]

**Dirigeant** — `id` `clientId` (unique) → Client `civilite` `prenom` `nom` `email` `telephone` `dateNaissance` `statutProfessionnel` (TNS/assimile_salarie) `mutuellePerso` `prevoyancePerso` `protectionActuelle` `regimeRetraite` `complementaireRetraite` `epargneActuelle` `montantEpargne` `besoinsPatrimoniaux` `objectifsRetraite` `dateAuditDirigeant` `notes` `dateCreation` `dateMaj`

**Prescripteur** — `id` `type` (expert_comptable/avocat/partenaire/client_prescripteur) `civilite` `prenom` `nom` `entreprise` `email` `telephone` `adresse` `ville` `dossiersEnvoyes` `clientsSignes` `commissionsGenerees` `derniereRecommandation` `notes` `statut` (defaut: "actif") `dateCreation` `dateMaj`
Relations: clients[], deals[]

### Sales & Financial
**Deal** (Pipeline) — `id` `clientId` → Client `titre` `etape` (defaut: "PROSPECT_IDENTIFIE") `montantEstime` `probabilite` `produitsCibles` `sourceProspect` `prescripteurId` → Prescripteur? `qualificationNotes` `problematiqueDirigeant` `checklistAudit` (JSON) `rapportAudit` `syntheseClient` `propositionCommerciale` `comparatifAssureurs` `simulationCotisations` `assureurChoisi` `commissionsAttendues` `documentsNotes` `dateCreation` `dateMaj` `dateClosingPrev` `dateClosingReel` `dateSignature` `dateOnboarding` `motifPerte` `notes` `assigneA`

**Contrat** — `id` `clientId` → Client `typeProduit` `compagnieId` → Compagnie? `nomProduit` `numeroContrat` `primeAnnuelle` `tauxCommApport` `tauxCommGestion` `commissionAnnuelle` `dateEffet` `dateEcheance` `dateResiliation` `dateRenouvellement` `nbBeneficiaires` `cotisationUnitaire` `statut` (defaut: "actif") `notes` `dateCreation` `dateMaj`
Relations: commissions[]

**Commission** — `id` `contratId` → Contrat `montant` `type` `periode` `dateVersement` `statut` (defaut: "prevu") `notes` `dateCreation`

**Compagnie** — `id` `nom` (unique) `type` `contactNom` `contactEmail` `contactTelephone` `conventionSignee` `dateConvention` `seuilSurcommission` `tauxSurcommission` `nbContratsActifs` `primesCumulees` `notes`
Relations: contrats[]

### Email & Communication
**Email** — `id` `userId` `gmailId` (unique) `threadId` `sujet` `expediteur` `destinataires` `dateEnvoi` `extrait` `direction` `pertinence` `scoreRelevance` `resume` `actionsItems` `reponseProposee` `typeEmail` `urgence` `sentiment` `actionRequise` `actionTraitee` `analyseIA` (JSON) `dealUpdateSuggestion` (JSON) `produitsMentionnes` (JSON) `clientId` → Client? `analyseStatut` `lu` `notes` `gmailDraftId` `draftStatut` `dateCreation` `dateMaj`
Relations: taches[], feedbacks[], opportunites[]

**GmailConnection** — `id` `userId` (unique) `gmailEmail` `accessToken` `refreshToken` `tokenExpiry` `dateConnecte` `dateMaj`

### Commercial Intelligence (Stages 1-9)
**SignalCommercial** — `id` `clientId` → Client `emailId?` `typeSignal` (produit_mentionne | sentiment_positif | sentiment_negatif | objection | besoin | urgence | deal_update) `valeur` `details` `source` (email_analysis | manual) `dateSignal`
Indexes: [clientId, dateSignal], [clientId, typeSignal]

**OpportuniteCommerciale** — `id` `clientId` → Client `sourceType` (signal | email_analysis | cross_sell | manual) `sourceEmailId?` → Email `typeProduit?` `titre` `description?` `statut` (defaut: "detectee") `confiance` (defaut: "moyenne") `temperature?` `origineSignal?` `dedupeKey` `detecteeLe` `derniereActivite` `convertieEnDealId?` `motifRejet?` `closedAt?` `closeReason?` `metadata` (JSON)
Indexes: [clientId], [statut], [dedupeKey]

**FeedbackIA** — `id` `emailId` → Email `userId` `type` (action_executed | action_ignored | type_corrected | urgence_corrected | etc.) `champ?` `valeurIA?` `valeurUser?` `metadata?` (JSON)

### Document Management (GED V1)
**Document** — `id` `clientId` → Client `contratId?` `opportuniteId?` `dealId?` `sourceEmailId?` `nomFichier` `nomAffiche` `categorie` (administratif | conseil | contractuel | echange) `typeDocument` `source` (defaut: "upload_manuel") `mimeType` `tailleOctets` `storageKey` `storageUrl` `dateDocument?` `dateExpiration?` `archive` (defaut: false) `notes?` `tags?` `createdAt` `updatedAt`
Indexes: [clientId], [clientId, archive], [categorie]

### Workflow & Automation
**Tache** — `id` `clientId?` → Client `emailId?` → Email `titre` `description?` `type` `priorite` (defaut: "normale") `dateEcheance?` `dateRealisation?` `statut` (defaut: "a_faire") `assigneA?` `recurrence?` `autoGenerated` `sourceAuto?` `autoFermee` `raisonFermeture?` `dateCreation`

**Sequence** — `id` `nom` `description?` `etapes` (JSON) `active` (defaut: true) `dateCreation` `dateMaj`
Relations: inscriptions[]

**SequenceInscription** — `id` `sequenceId` → Sequence `clientId` → Client `etapeActuelle` `statut` (en_cours/terminee/annulee) `dateInscription` `dateProchaineAction?` `dateMaj`

**Objectif** — `id` `userId?` `type` `periode` `annee` `mois?` `trimestre?` `valeurCible` `dateCreation` `dateMaj`

**ReseauObjectif** — `id` `categorie` (unique) `contactsObjectif` `tauxConversionObj` `potentielUnitaire` `notes?` `dateCreation` `dateMaj`

### Reporting & System
**RapportHebdo** — `id` `semaine` (format "2026-W10") `contenu` (JSON) `resumeIA?` `actionsIA?` (JSON) `dateGeneration`

**N8nLog** — `id` `direction` (crm_to_n8n | n8n_to_crm) `eventType` `payload?` (JSON) `statut` `erreur?` `dureeMs?` `createdAt`

**Settings** — `id` (defaut: "default") `raisonSociale?` `formeJuridique?` `gerants?` `zone?` `cible?` `tauxCommission?` (JSON) `dateMaj`

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

### Analyse Email IA (n8n WF10 queue-based)
L'analyse IA est entierement geree par n8n (architecture n8n-native) :
1. WF07 sync Gmail → stocke email via POST /api/n8n/emails/store
2. WF10 (cron 30min) poll pending emails → Mistral Small analysis (JSON)
3. Resultat stocke via POST /api/n8n/emails (type, urgence, resume, actions)
4. Si action requise : cree tache "Repondre" + brouillon Gmail via CRM OAuth
5. WF08 : quand email sortant detecte → ferme auto les taches "Repondre"
6. WF09 : regeneration reponse IA a la demande (bouton CRM → webhook synchrone)

### Automations (n8n Cloud) — Architecture n8n-native
9 workflows n8n orchestrent toute l'automatisation. Le CRM est UI + database shell :
- **01-auto-tasks** (7h) — echeances, deals inactifs, fidelisation, prescripteurs, couverture
- **02-sequences** (8h) — execute les etapes de sequences de prospection
- **03-campagnes** (1er du mois) — campagnes saisonnieres ciblees
- **04-rapport-hebdo** (lundi 8h) — KPIs + email resume via Gmail
- **10-email-analysis-queue** (30min) — queue-based email analysis with Mistral Small (batch=10)
- **06-prescripteur-tracking** (lundi 7h30) — relance prescripteurs inactifs
- **07-gmail-sync** (30min) — sync Gmail INBOX + SENT, stocke en CRM, declenche WF08
- **08-auto-close-tasks** (webhook) — ferme auto les taches "Repondre" quand email sortant detecte
- **09-generate-reply** (webhook sync) — generation reponse IA a la demande depuis le CRM

### Client Page Load — Intelligence Pipeline
On server-side render of `/clients/[id]`:
1. Fetch client + all relations (contrats, deals, dirigeant, taches, emails, opportunites, signauxCommerciaux)
2. `calculerScoreProspect()` → prospect quality score
3. `calculerPotentielCA()` → revenue potential estimate
4. `calculerCouverture360()` → 360 coverage score (6 products)
5. `calculerProchainesActions()` → next-best-action recommendations (15 rules)
6. `persisterOpportunitesCrossSell()` → detect and persist cross-sell opportunities (awaited)
7. Render: KPI cards, NextActionWidget, CommercialMemoryCard, OpportunitesCard, tabs (Contrats, Pipeline, Taches, Emails, Documents, Historique)

## Variables d'Environnement
```
DATABASE_URL=            # PostgreSQL Neon (pooler)
DIRECT_URL=              # PostgreSQL Neon (direct)
NEXTAUTH_SECRET=         # Secret NextAuth
NEXTAUTH_URL=            # URL de l'app
GMAIL_CLIENT_ID=         # OAuth2 Gmail
GMAIL_CLIENT_SECRET=     # OAuth2 Gmail
BLOB_READ_WRITE_TOKEN=   # Vercel Blob (private access)
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

## Recent Work Log (March 2026)

### Commits (chronological, newest first)
```
3f6de8d fix: disable cmdk client-side filter so async search results display
b55f3b0 feat: expand global search to 8 entity types + fix navigation
12806b2 feat: add delete action with confirmation on document cards
da51411 fix: use blobResult.stream instead of .body in download route
d759300 feat: add document management V1 (GED interne)
f1360cb show full sourceType label on closed opportunities
2c383af add sourceType origin badge on opportunity cards
36dc878 await cross-sell persistence before rendering client page
c25d7cc feat: persist cross-sell opportunities to DB (Stage 9)
195f2eb fix: harden Stage 8 observability (Stage 8b)
fcb7e29 feat: add opportunity provenance + detection quality stats (Stage 8)
95ecb3d feat: harden polling + add feedback tracking & stats (Stages 6C/7)
6b80b2c feat: make manual email analysis immediate (Stage 6C)
5007074 feat: turn email inbox into commercial cockpit (Stage 6)
29c32ee feat: add opportunity lifecycle with status transitions (Stage 5)
02fdfac feat: add email-to-prospect-opportunity bridge (Stage 4)
fa564f5 fix: harden Stages 1-3 cross-stage consistency
11c7740 feat: add opportunity engine (Stage 3)
4c383ac feat: add structured commercial memory (Stage 2)
c706b93 feat: add commercial intelligence layer (Stage 1)
```

### Key queries that MUST stay in sync
Dashboard and /emails/urgent use the SAME query:
```
where: { userId, actionTraitee: false, OR: [{ urgence: "haute" }, { scoreRelevance: { gte: 70 } }] }
```

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
