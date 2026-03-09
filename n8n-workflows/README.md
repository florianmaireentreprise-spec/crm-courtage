# Workflows n8n — CRM Courtage

## Variables n8n a configurer

Dans n8n Cloud : Settings > Variables, creer :

| Variable | Valeur |
|----------|--------|
| `CRM_BASE_URL` | `https://ton-domaine.vercel.app` (URL Vercel du CRM) |
| `CRM_N8N_SECRET` | Le meme secret que `N8N_WEBHOOK_SECRET` dans les env vars Vercel |

## Credentials Gmail

Le workflow **04-rapport-hebdo** envoie un email via Gmail.
Creer une credential Gmail OAuth2 dans n8n et la connecter au noeud Gmail du workflow.

## Import des workflows

1. Aller dans n8n Cloud
2. Cliquer sur **Import from file**
3. Importer chaque fichier JSON dans l'ordre

## Liste des workflows

| # | Fichier | Nom | Schedule | Description |
|---|---------|-----|----------|-------------|
| 01 | `01-auto-tasks.json` | Taches automatiques | Tous les jours 7h | Detecte echeances, deals inactifs, clients sans interaction, prescripteurs inactifs, couverture incomplete. Cree des taches dans le CRM. |
| 02 | `02-sequences.json` | Sequences prospection | Tous les jours 8h | Recupere les actions dues des sequences, execute chaque etape (tache, email, auto_perdu), avance la sequence. |
| 03 | `03-campagnes.json` | Campagnes saisonnieres | 1er du mois 9h | Verifie le calendrier campagnes (jan: sante, mars: PER, sept: effectifs, oct: fiscalite), cree les taches pour les clients cibles. |
| 04 | `04-rapport-hebdo.json` | Rapport hebdomadaire | Lundi 8h | Recupere les KPIs de la semaine, genere un email HTML resume, l'envoie via Gmail. |
| 05 | `05-email-intelligence.json` | Analyse emails IA | Webhook (email.received) | Declenche sur chaque nouvel email synce. Recupere le client associe, analyse via IA (ajouter le noeud AI), stocke les resultats. |
| 06 | `06-prescripteur-tracking.json` | Suivi prescripteurs | Lundi 7h30 | Detecte les prescripteurs inactifs depuis 3+ semaines, cree des taches de relance. |

## API du CRM utilisees

| Methode | Route | Utilise par |
|---------|-------|------------|
| GET | `/api/n8n/contrats?echeance=90` | 01 |
| GET | `/api/n8n/pipeline?statut=stale&jours=14` | 01 |
| GET | `/api/n8n/clients/sans-interaction?mois=6` | 01 |
| GET | `/api/n8n/prescripteurs/inactifs?semaines=8` | 01, 06 |
| GET | `/api/n8n/dirigeants/couverture-incomplete` | 01 |
| POST | `/api/n8n/taches` | 01, 02, 03, 06 |
| GET | `/api/n8n/sequences/actions-dues` | 02 |
| POST | `/api/n8n/sequences/avancer` | 02 |
| GET | `/api/n8n/campagnes/clients-cibles?filtre=X` | 03 |
| POST | `/api/n8n/deals/mark-lost` | 02 |
| GET | `/api/n8n/kpis` | 04 |

Toutes les routes necessitent le header `x-n8n-secret` avec la valeur de la variable `CRM_N8N_SECRET`.

## Tester

1. Dans n8n, ouvrir un workflow
2. Cliquer **Test workflow** (ou Run once)
3. Verifier dans le CRM que les taches/donnees apparaissent
4. Activer le workflow une fois valide
