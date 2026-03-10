# Workflows n8n — CRM Courtage (GargarineV1)

Ce dossier contient les 10 workflows n8n Cloud qui automatisent les processus du CRM.

## Architecture

```
CRM (Vercel)                    n8n Cloud
+-------------------+     +---------------------------+
| Interface UI      |     | 10 workflows              |
| API /api/n8n/*    |<--->| (schedule + webhook)      |
| Gmail OAuth2      |     | Gmail, Gemini 2.0 Flash   |
+--------+----------+     +---------------------------+
         |
    Neon PostgreSQL
```

**Architecture n8n-native** : n8n orchestre toute l'automatisation email (sync Gmail, analyse IA, creation brouillons, fermeture taches). Le CRM est UI + database shell.

## Variables n8n a configurer

Dans **n8n Cloud > Settings > Variables**, creer :

| Variable | Valeur |
|----------|--------|
| `CRM_BASE_URL` | `https://crm-courtage.vercel.app` |
| `CRM_N8N_SECRET` | Le meme secret que `N8N_WEBHOOK_SECRET` dans Vercel |
| `GEMINI_API_KEY` | Cle API Google Gemini |
| `N8N_WEBHOOK_BASE` | `https://gargarinev1.app.n8n.cloud/webhook` |
| `GMAIL_ADDRESS` | Adresse Gmail du cabinet |

## Variables Vercel requises

Dans **Vercel > Project Settings > Environment Variables** :

| Variable | Description |
|----------|-------------|
| `N8N_WEBHOOK_SECRET` | Secret partage avec n8n (header `x-n8n-secret`) |
| `N8N_WEBHOOK_URL` | `https://gargarinev1.app.n8n.cloud/webhook/email-received` |
| `N8N_GENERATE_REPLY_URL` | `https://gargarinev1.app.n8n.cloud/webhook/generate-reply` |

## Credentials n8n

| Credential | Type | Utilise par |
|-----------|------|------------|
| Gmail OAuth2 | Google OAuth2 | WF 04 (rapport), WF 07 (sync) |
| Gemini API | Google Gemini Chat Model | WF 05v2 (analyse), WF 09 (reply) |

## Import des workflows

1. Aller sur [gargarinev1.app.n8n.cloud](https://gargarinev1.app.n8n.cloud)
2. Cliquer sur **Create workflow** > **Import from file**
3. Importer chaque fichier JSON
4. Configurer les variables et credentials
5. Remplacer les IDs de credentials par les vrais (chercher `GMAIL_CREDENTIAL_ID`, `GEMINI_CREDENTIAL_ID`)
6. Tester avec **Execute workflow**
7. Activer le workflow une fois valide

## Liste des workflows

| # | Fichier | Nom | Schedule | Description |
|---|---------|-----|----------|-------------|
| 01 | `01-auto-tasks.json` | Taches automatiques | Tous les jours 7h | Detecte echeances, deals inactifs, clients sans interaction, prescripteurs inactifs, couverture incomplete. |
| 02 | `02-sequences.json` | Sequences prospection | Tous les jours 8h | Execute les etapes de sequences de prospection. |
| 03 | `03-campagnes.json` | Campagnes saisonnieres | 1er du mois 9h | Campagnes ciblees (sante, PER, effectifs, fiscalite). |
| 04 | `04-rapport-hebdo.json` | Rapport hebdomadaire | Lundi 8h | KPIs + email resume via Gmail. |
| **05v2** | `05-email-intelligence-v2.json` | **Analyse emails IA v2** | Webhook | **Remplace 05.** Recoit email.received, analyse avec Gemini 2.0 Flash (JSON structure), cree taches + brouillons Gmail. |
| 06 | `06-prescripteur-tracking.json` | Suivi prescripteurs | Lundi 7h30 | Detecte prescripteurs inactifs, cree taches relance. |
| **07** | `07-gmail-sync.json` | **Sync Gmail** | Toutes les 15min | **Nouveau.** Lit INBOX + SENT via Gmail API, filtre les nouveaux, stocke en CRM, declenche WF05v2 (entrant) ou WF08 (sortant). |
| **08** | `08-auto-close-tasks.json` | **Auto-fermeture taches** | Webhook | **Nouveau.** Recoit email.outgoing, ferme les taches "Repondre" liees au client. |
| **09** | `09-generate-reply.json` | **Generation reponse IA** | Webhook sync | **Nouveau.** Appele depuis le CRM (bouton Regenerer), genere une reponse IA avec contexte client, retourne la reponse de facon synchrone. |

## Flux email complet

```
WF07 (15min) → Gmail API → filtre nouveaux → POST /api/n8n/emails/store
  ↓ (si entrant)
  WF05v2 → Gemini analyse → POST /api/n8n/emails (resultat IA)
    ↓ (si action requise) → POST /api/n8n/taches + POST /api/n8n/emails/create-draft
  ↓ (si sortant)
  WF08 → GET /api/n8n/taches/pending-replies → POST /api/n8n/taches/auto-close

CRM bouton "Regenerer" → WF09 (synchrone) → Gemini → reponse IA
```

## API du CRM utilisees

| Methode | Route | Utilise par |
|---------|-------|------------|
| GET | `/api/n8n/contrats?joursAvant=60` | 01 |
| GET | `/api/n8n/pipeline?joursInactivite=14` | 01 |
| GET | `/api/n8n/clients/sans-interaction?mois=6` | 01 |
| GET | `/api/n8n/prescripteurs/inactifs?semaines=N` | 01, 06 |
| GET | `/api/n8n/dirigeants/couverture-incomplete` | 01 |
| POST | `/api/n8n/taches` | 01, 02, 03, 05v2, 06 |
| GET | `/api/n8n/sequences/actions-dues` | 02 |
| POST | `/api/n8n/sequences` | 02 |
| POST | `/api/n8n/deals/mark-lost` | 02 |
| GET | `/api/n8n/campagnes/clients-cibles?filtre=X` | 03 |
| GET | `/api/n8n/kpis` | 04 |
| POST | `/api/n8n/emails/check-existing` | 07 |
| POST | `/api/n8n/emails/store` | 07 |
| POST | `/api/n8n/emails` | 05v2 |
| POST | `/api/n8n/emails/create-draft` | 05v2 |
| GET | `/api/n8n/emails/{emailId}/context` | 09 |
| GET | `/api/n8n/taches/pending-replies?clientId=X` | 08 |
| POST | `/api/n8n/taches/auto-close` | 08 |

Toutes les routes necessitent le header `x-n8n-secret` avec la valeur de la variable `CRM_N8N_SECRET`.

## Deduplication des taches

L'API `POST /api/n8n/taches` integre une deduplication : si une tache avec le meme `clientId + type + sourceAuto` existe deja en statut `a_faire` ou `en_cours`, elle n'est pas recree.

## Securite

- Toutes les API sont protegees par le header `x-n8n-secret`
- Le middleware `withN8nAuth` valide ce header contre `N8N_WEBHOOK_SECRET`
- Le code est dans `src/app/api/n8n/middleware.ts`

## Tester

1. Dans n8n, ouvrir un workflow
2. Cliquer **Execute workflow** (Run once)
3. Verifier dans le CRM que les taches/donnees apparaissent
4. Activer le workflow une fois valide
