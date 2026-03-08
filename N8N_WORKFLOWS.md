# n8n Workflows — CRM Courtage Assurances (GargarineV1)

## Setup initial

### Variables d'environnement CRM (Railway / .env.local)
```
N8N_WEBHOOK_URL=https://ton-instance.app.n8n.cloud
N8N_WEBHOOK_SECRET=<secret-partage>
N8N_API_KEY=<cle-api-n8n>
```

### Variables d'environnement n8n
```
CRM_BASE_URL=https://ton-crm.up.railway.app
CRM_N8N_SECRET=<meme-secret-partage>
GOOGLE_AI_API_KEY=<cle-gemini>
```

### Headers d'authentification
Toutes les requetes vers le CRM doivent inclure :
```
x-n8n-secret: <CRM_N8N_SECRET>
```

---

## Workflow 1 : Email Intelligence Pipeline

**Trigger** : Webhook `email.received` (appele par le CRM a chaque nouvel email)

### Nodes :
1. **Webhook Trigger** — Ecoute `POST /webhook/email.received`
   - Body attendu : `{ type, timestamp, payload: { emailId, gmailId, expediteur, sujet, extrait, dateEnvoi, direction } }`

2. **HTTP Request — Chercher client** — `GET {CRM_BASE_URL}/api/n8n/clients/by-email?email={expediteur}`
   - Header: `x-n8n-secret: {CRM_N8N_SECRET}`

3. **IF — Client trouve?** — Branche selon `client !== null`

4. **HTTP Request — Contexte client** (si client trouve) — `GET {CRM_BASE_URL}/api/n8n/clients/{clientId}`
   - Recupere contrats, deals, taches ouvertes

5. **AI Agent — Analyse email** — Appel Gemini 2.0 Flash
   - Prompt : analyse structuree (resume, type, urgence, actions, sentiment, produits)
   - Inclure contexte client si disponible

6. **HTTP Request — Envoyer resultat** — `POST {CRM_BASE_URL}/api/n8n/emails/analyze-result`
   - Body : `{ emailId, analyseIA, clientId, resumeIA, urgence, typeEmail, actionRequise, reponseSuggeree, produitsMentionnes }`

---

## Workflow 2 : Auto-Tasks Generator

**Trigger** : Schedule — 7h00 lun-ven (cron: `0 7 * * 1-5`)

### Nodes :
1. **Schedule Trigger** — Quotidien 7h00

2. **HTTP Request — Deals inactifs** — `GET {CRM_BASE_URL}/api/n8n/pipeline/deals-inactifs?joursInactivite=14`

3. **Loop — Pour chaque deal inactif** :
   - **HTTP Request** — `POST {CRM_BASE_URL}/api/n8n/taches`
   - Body : `{ titre: "Relancer {clientNom} — deal inactif depuis {joursInactif}j", clientId, type: "RELANCE_PROSPECT", priorite: "haute", sourceAuto: "n8n_auto_tasks" }`

4. **HTTP Request — Echeances contrats** — `GET {CRM_BASE_URL}/api/n8n/contrats/echeances?joursAvant=60`

5. **Loop — Pour chaque contrat** :
   - **HTTP Request** — `POST {CRM_BASE_URL}/api/n8n/taches`
   - Body : `{ titre: "Preparer renouvellement {typeProduit} — {clientNom}", clientId, type: "RENOUVELLEMENT", priorite: joursRestants < 30 ? "haute" : "normale", sourceAuto: "n8n_echeance" }`

---

## Workflow 3 : Sequence Engine

**Trigger** : Schedule — 8h00 quotidien (cron: `0 8 * * *`)

### Nodes :
1. **Schedule Trigger** — Quotidien 8h00

2. **HTTP Request — Actions dues** — `GET {CRM_BASE_URL}/api/n8n/sequences/actions-dues`

3. **Loop — Pour chaque inscription** :
   - **Switch** selon `etapeCourante.action` :
     - `"tache"` : Creer tache via `POST /api/n8n/taches`
     - `"email_ia"` : Generer email IA via Gemini, envoyer via Gmail API
   - **HTTP Request — Confirmer envoi** — `POST {CRM_BASE_URL}/api/n8n/sequences/email-sent`
   - Body : `{ inscriptionId, etapeIndex, emailSujet, emailEnvoyeAt }`

---

## Workflow 4 : Scoring Refresh

**Trigger** : Schedule — 6h00 quotidien (cron: `0 6 * * *`)

### Nodes :
1. **Schedule Trigger** — Quotidien 6h00

2. **HTTP Request — Tous les clients prospects** — `GET {CRM_BASE_URL}/api/n8n/clients/by-email?email=*` (ou requete directe PostgreSQL)

3. **AI Agent — Calculer scores** — Pour chaque client, calculer :
   - Score prospect (0-100) base sur secteur, taille, interactions
   - Potentiel CA base sur nb salaries et produits cibles

4. **HTTP Request — Pousser scores** — `POST {CRM_BASE_URL}/api/n8n/scoring/update`
   - Body : `{ scores: [{ clientId, scoreProspect, potentielCA }] }`

---

## Workflow 5 : Weekly Report

**Trigger** : Schedule — Lundi 8h00 (cron: `0 8 * * 1`)

### Nodes :
1. **Schedule Trigger** — Lundi 8h00

2. **HTTP Request — KPIs** — `GET {CRM_BASE_URL}/api/n8n/dashboard/kpis`

3. **AI Agent — Generer rapport** — Gemini genere un resume hebdomadaire
   - Inclure : nouveaux prospects, deals signes, CA recurrent, taches en retard, renouvellements

4. **Email — Envoyer rapport** — Gmail Send
   - Destinataires : gerants du cabinet
   - Format : HTML avec KPIs + resume IA + top 3 actions prioritaires

---

## Endpoints CRM disponibles pour n8n

### Endpoints en ECRITURE (POST)

| Route | Description | Body |
|-------|-------------|------|
| `POST /api/n8n/taches` | Creer une tache | `{ titre, clientId?, emailId?, type, priorite, dateEcheance?, description?, sourceAuto }` |
| `POST /api/n8n/emails/analyze-result` | Resultat d'analyse email | `{ emailId, analyseIA, clientId?, resumeIA, urgence, typeEmail, actionRequise, reponseSuggeree }` |
| `POST /api/n8n/deals/stage-suggest` | Suggerer changement d'etape | `{ dealId, etapeSuggeree, raison, emailId }` |
| `POST /api/n8n/scoring/update` | Pousser scores batch | `{ scores: [{ clientId, scoreProspect, potentielCA }] }` |
| `POST /api/n8n/sequences/email-sent` | Confirmer email de sequence | `{ inscriptionId, etapeIndex, emailSujet, emailEnvoyeAt }` |

### Endpoints en LECTURE (GET)

| Route | Description | Parametres |
|-------|-------------|------------|
| `GET /api/n8n/health` | Health check (pas d'auth) | — |
| `GET /api/n8n/clients/[id]` | Client complet + contrats + deals + taches | — |
| `GET /api/n8n/clients/by-email?email=xxx` | Chercher client par email | `email` |
| `GET /api/n8n/pipeline/deals-inactifs?joursInactivite=14` | Deals sans MAJ depuis N jours | `joursInactivite` (defaut: 14) |
| `GET /api/n8n/contrats/echeances?joursAvant=60` | Contrats bientot a echeance | `joursAvant` (defaut: 60) |
| `GET /api/n8n/sequences/actions-dues` | Sequences avec action en attente | — |
| `GET /api/n8n/dashboard/kpis` | KPIs du rapport hebdomadaire | — |

### Authentification
Toutes les routes (sauf `/health`) necessitent le header :
```
x-n8n-secret: <secret-partage>
```

---

## Evenements emis par le CRM vers n8n

| Evenement | Declencheur | Payload |
|-----------|-------------|---------|
| `email.received` | Nouvel email synchronise | `{ emailId, gmailId, expediteur, sujet, extrait, dateEnvoi, direction }` |
| `deal.stage_changed` | Deal deplace dans le pipeline | `{ dealId, dealTitre, clientId, clientRaisonSociale, ancienneEtape, nouvelleEtape, montantEstime }` |
| `client.created` | Nouveau client cree | `{ clientId, raisonSociale, siret, secteurActivite, nbSalaries, ville, statut }` |

Le CRM envoie ces evenements en POST vers `{N8N_WEBHOOK_URL}/webhook/{event.type}` avec header `x-n8n-secret`.
