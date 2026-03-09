# Workflows n8n — CRM Courtage (GargarineV1)

Ce dossier contient les 6 workflows n8n Cloud qui automatisent les processus du CRM.

## Architecture

```
CRM (Vercel)                    n8n Cloud
+-------------------+     +------------------------+
| Interface UI      |     | 6 workflows            |
| API /api/n8n/*    |<--->| (schedule + webhook)   |
| Sync Gmail        |     | Gmail, AI (Gemini)     |
+--------+----------+     +------------------------+
         |
    Neon PostgreSQL
```

## Variables n8n a configurer

Dans **n8n Cloud > Settings > Variables**, creer :

| Variable | Valeur |
|----------|--------|
| `CRM_BASE_URL` | `https://crm-courtage.vercel.app` |
| `CRM_N8N_SECRET` | Le meme secret que `N8N_WEBHOOK_SECRET` dans Vercel |
| `GOOGLE_AI_API_KEY` | Cle API Google Gemini (pour le workflow 05) |

## Variables Vercel requises

Dans **Vercel > Project Settings > Environment Variables** :

| Variable | Description |
|----------|-------------|
| `N8N_WEBHOOK_SECRET` | Secret partage avec n8n (header `x-n8n-secret`) |
| `N8N_WEBHOOK_URL` | `https://gargarinev1.app.n8n.cloud/webhook/email-received` |
| `GOOGLE_AI_API_KEY` | Cle API Google Gemini |

## Credentials Gmail

Le workflow **04-rapport-hebdo** envoie un email via Gmail.
Creer une credential Gmail OAuth2 dans n8n et la connecter au noeud "Envoyer par Gmail".

## Import des workflows

1. Aller sur [gargarinev1.app.n8n.cloud](https://gargarinev1.app.n8n.cloud)
2. Cliquer sur **Create workflow** > **Import from file**
3. Importer chaque fichier JSON
4. Verifier que les variables `CRM_BASE_URL` et `CRM_N8N_SECRET` sont configurees
5. Pour le workflow 04, configurer les credentials Gmail OAuth2
6. Pour le workflow 05, ajouter un noeud AI (Gemini) entre "Preparer prompt IA" et "Stocker analyse dans CRM"
7. Tester avec **Execute workflow**
8. Activer le workflow une fois valide

## Liste des workflows

| # | Fichier | Nom | Schedule | Description |
|---|---------|-----|----------|-------------|
| 01 | `01-auto-tasks.json` | Taches automatiques | Tous les jours 7h | Detecte echeances, deals inactifs, clients sans interaction, prescripteurs inactifs, couverture incomplete. Cree des taches dans le CRM. |
| 02 | `02-sequences.json` | Sequences prospection | Tous les jours 8h | Recupere les actions dues des sequences, filtre par type (tache/email/auto_perdu), execute et avance la sequence. |
| 03 | `03-campagnes.json` | Campagnes saisonnieres | 1er du mois 9h | Verifie le calendrier campagnes (jan: sante, mars: PER, sept: effectifs, oct: fiscalite), cree les taches pour les clients cibles. |
| 04 | `04-rapport-hebdo.json` | Rapport hebdomadaire | Lundi 8h | Recupere les KPIs, genere un email HTML, envoie via Gmail. |
| 05 | `05-email-intelligence.json` | Analyse emails IA | Webhook POST | Analyse chaque email recu avec Gemini, identifie urgence/type/actions, stocke dans le CRM. |
| 06 | `06-prescripteur-tracking.json` | Suivi prescripteurs | Lundi 7h30 | Detecte les prescripteurs inactifs (3+ semaines), cree des taches de relance. |

## API du CRM utilisees

| Methode | Route | Utilise par |
|---------|-------|------------|
| GET | `/api/n8n/contrats?joursAvant=60` | 01 |
| GET | `/api/n8n/pipeline?joursInactivite=14` | 01 |
| GET | `/api/n8n/clients/sans-interaction?mois=6` | 01 |
| GET | `/api/n8n/prescripteurs/inactifs?semaines=N` | 01 (8sem), 06 (3sem) |
| GET | `/api/n8n/dirigeants/couverture-incomplete` | 01 |
| POST | `/api/n8n/taches` | 01, 02, 03, 06 |
| GET | `/api/n8n/sequences/actions-dues` | 02 |
| POST | `/api/n8n/sequences` | 02 |
| POST | `/api/n8n/deals/mark-lost` | 02 |
| GET | `/api/n8n/campagnes/clients-cibles?filtre=X` | 03 |
| GET | `/api/n8n/dashboard` | 04 |
| GET | `/api/n8n/clients/by-email?email=X` | 05 |
| POST | `/api/n8n/emails` | 05 |

Toutes les routes necessitent le header `x-n8n-secret` avec la valeur de la variable `CRM_N8N_SECRET`.

## Deduplication des taches

L'API `POST /api/n8n/taches` integre une deduplication : si une tache avec le meme `clientId + type + sourceAuto` existe deja en statut `a_faire` ou `en_cours`, elle n'est pas recree. Cela evite les doublons lors des executions quotidiennes.

## Securite

- Toutes les API sont protegees par le header `x-n8n-secret`
- Le middleware `withN8nAuth` valide ce header contre `N8N_WEBHOOK_SECRET`
- Le code est dans `src/app/api/n8n/middleware.ts`

## Tester

1. Dans n8n, ouvrir un workflow
2. Cliquer **Execute workflow** (Run once)
3. Verifier dans le CRM que les taches/donnees apparaissent
4. Activer le workflow une fois valide
