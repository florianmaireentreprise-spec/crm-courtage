# Guide de configuration n8n — CRM Courtage

## Architecture

```
Gmail Trigger → Extract sender → Find client → Store email → AI Analysis → Store analysis → Create task
     NODE 1        NODE 2          NODE 3        NODE 4         NODE 5        NODE 6          NODE 7
```

---

## Variables d'environnement requises (CRM .env)

```
N8N_WEBHOOK_URL=https://votre-instance-n8n.com
N8N_WEBHOOK_SECRET=votre-secret-partage
```

Le CRM verifie chaque requete n8n avec le header `x-n8n-secret`.

---

## NODE 1 — Gmail Trigger

**Type:** Gmail Trigger

**Settings:**
- Resource: `Message`
- Event: `Message Received`
- Poll Times: Every 2 minutes
- Simplify: `true`

**Output:** `{ id, threadId, from, to, subject, snippet, date, labelIds }`

---

## NODE 2 — Extract Sender Email

**Type:** Set / Code

Extraire l'adresse email du champ `from`.

```javascript
// Code node
const from = $json.from || '';
const match = from.match(/<([^>]+)>/);
const email = match ? match[1] : from;
return { email: email.toLowerCase().trim(), from, subject: $json.subject, snippet: $json.snippet, threadId: $json.threadId, gmailId: $json.id, date: $json.date };
```

---

## NODE 3 — Find Client in CRM

**Type:** HTTP Request

**Settings:**
- Method: `GET`
- URL: `{{ $env.CRM_URL }}/api/n8n/clients/by-email`
- Query Parameters:
  - `email` = `{{ $json.email }}`
- Headers:
  - `x-n8n-secret` = `{{ $env.N8N_WEBHOOK_SECRET }}`

**Response:**
```json
{
  "client": {
    "id": "clu...",
    "raisonSociale": "Entreprise ABC",
    "email": "contact@abc.fr",
    "statut": "prospect",
    "prenom": "Jean",
    "nom": "Dupont"
  }
}
```

Si `client` est `null` : expediteur inconnu.

---

## NODE 4 — Store Email in CRM (sync alternative)

> **NOTE:** En mode normal, les emails sont synchronises via le bouton "Synchroniser" du CRM (qui appelle `syncEmails()`). Cette etape n'est necessaire QUE si vous voulez que n8n stocke les emails directement sans passer par la sync Gmail du CRM.

Si vous utilisez la sync CRM integree, **sautez cette etape** et passez directement au NODE 5 (AI Analysis).

---

## NODE 5 — AI Analysis (Gemini / OpenAI / Claude)

**Type:** AI Agent ou HTTP Request vers votre LLM

**Prompt systeme:**
```
Tu es un assistant IA pour un cabinet de courtage en assurances (mutuelle, prevoyance, retraite).
Analyse cet email et retourne un JSON avec les champs suivants:

{
  "type": "client" | "prospect" | "prescripteur" | "assureur" | "autre",
  "urgence": "haute" | "normale" | "basse",
  "resume": "Resume en 1-2 phrases",
  "sentiment": "positif" | "neutre" | "negatif",
  "actionRequise": true/false,
  "actionSuggeree": "Description de l'action a faire (ou null)",
  "draftReply": "Proposition de reponse (ou null)",
  "produitsMentionnes": ["SANTE_COLLECTIVE", "PREVOYANCE_COLLECTIVE", ...],
  "expediteurNom": "Nom de l'expediteur",
  "expediteurEntreprise": "Entreprise de l'expediteur"
}

Regles:
- urgence "haute" si: demande de devis, sinistre, resiliation imminente, RDV urgent
- urgence "normale" si: suivi contrat, demande d'info, relance
- urgence "basse" si: newsletter, info generale
- type "client" si l'expediteur est un client existant
- type "prospect" si c'est une demande commerciale d'un inconnu
- type "prescripteur" si c'est un expert-comptable, avocat, partenaire
- type "assureur" si c'est une compagnie d'assurance
- type "autre" pour le reste (tech, notifications, spam)
- actionRequise = true si une reponse ou action humaine est necessaire
- draftReply: propose une reponse professionnelle et courte
```

**Input:**
```
Email de: {{ $json.from }}
Sujet: {{ $json.subject }}
Contenu: {{ $json.snippet }}
Client connu: {{ $json.client ? 'Oui - ' + $json.client.raisonSociale : 'Non' }}
```

**Output:** JSON avec les champs ci-dessus.

---

## NODE 6 — Store Analysis in CRM

**Type:** HTTP Request

**Settings:**
- Method: `POST`
- URL: `{{ $env.CRM_URL }}/api/n8n/emails`
- Headers:
  - `Content-Type`: `application/json`
  - `x-n8n-secret`: `{{ $env.N8N_WEBHOOK_SECRET }}`
- Body (JSON):

```json
{
  "emailId": "{{ ID de l'email dans le CRM }}",
  "type": "{{ $json.type }}",
  "urgence": "{{ $json.urgence }}",
  "resume": "{{ $json.resume }}",
  "sentiment": "{{ $json.sentiment }}",
  "actionRequise": {{ $json.actionRequise }},
  "actionSuggeree": "{{ $json.actionSuggeree }}",
  "draftReply": "{{ $json.draftReply }}",
  "produitsMentionnes": {{ $json.produitsMentionnes }},
  "expediteurNom": "{{ $json.expediteurNom }}",
  "expediteurEntreprise": "{{ $json.expediteurEntreprise }}",
  "clientMatch": {
    "found": {{ $json.client ? true : false }},
    "clientId": "{{ $json.client?.id }}"
  }
}
```

**IMPORTANT:** Le champ `emailId` doit etre l'ID de l'email DEJA stocke dans le CRM (via la sync Gmail). C'est le lien entre l'email Gmail et l'enregistrement CRM.

**Le endpoint accepte les deux formats de champs:**
- Format direct: `urgence`, `type`, `resume`, `actionSuggeree`, `draftReply`
- Format alternatif: `priority`, `intent`, `urgencyScore` (0-10), `summary`, `suggestedTask`, `replySuggestion`

Le CRM normalise automatiquement.

**Response:**
```json
{
  "success": true,
  "emailId": "...",
  "clientId": "...",
  "type": "prospect",
  "urgence": "haute",
  "actionRequise": true
}
```

---

## NODE 7 — Create Task (conditionnel)

**Type:** IF + HTTP Request

**IF condition:** `{{ $json.actionSuggeree }}` is not empty

> **NOTE:** Le CRM cree automatiquement une tache "Repondre a..." pour les emails commerciaux entrants. Ce node n'est necessaire QUE pour des taches supplementaires.

**HTTP Request:**
- Method: `POST`
- URL: `{{ $env.CRM_URL }}/api/n8n/taches`
- Headers:
  - `Content-Type`: `application/json`
  - `x-n8n-secret`: `{{ $env.N8N_WEBHOOK_SECRET }}`
- Body:

```json
{
  "titre": "{{ $json.actionSuggeree }}",
  "clientId": "{{ $json.clientId ou null }}",
  "emailId": "{{ $json.emailId }}",
  "type": "RELANCE_PROSPECT",
  "priorite": "{{ $json.urgence === 'haute' ? 'haute' : 'normale' }}",
  "sourceAuto": "n8n_email_analysis"
}
```

**Anti-doublon:** Le CRM verifie automatiquement les doublons par `clientId` + `type` + `autoGenerated`.

---

## Workflow WF05v2 — Trigger depuis le CRM

Le CRM peut declencher l'analyse via un webhook:

```
POST {{ N8N_WEBHOOK_URL }}/webhook/email-received-v2
Headers: x-n8n-secret: {{ secret }}
Body: { emailId, sujet, expediteur, direction, extrait }
```

Ce webhook est appele quand l'utilisateur clique "Analyser" dans le CRM ou via `reanalyzeUnprocessed()`.

---

## Endpoints CRM disponibles pour n8n

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/n8n/clients/by-email?email=x` | Chercher client par email |
| POST | `/api/n8n/emails` | Stocker analyse IA (endpoint principal) |
| POST | `/api/n8n/email-analysis` | Stocker analyse IA (format alternatif) |
| POST | `/api/n8n/taches` | Creer une tache |

Tous les endpoints requierent le header `x-n8n-secret`.

---

## Troubleshooting

### Emails urgents n'apparaissent pas
- Verifier que `urgence` est bien envoye par n8n (valeurs: "haute", "normale", "basse")
- Verifier que `actionTraitee` est `false` (le CRM le met a false automatiquement)
- Le dashboard et la page `/emails/urgent` utilisent la meme requete

### Classification ne fonctionne pas
- Verifier que `type` est bien envoye (valeurs: "client", "prospect", "prescripteur", "assureur", "autre")
- Le champ `intent` est aussi accepte comme alias de `type`

### Taches en doublon
- Le CRM a un mecanisme anti-doublon: ne cree pas de tache si une tache du meme type/client est deja ouverte
- Les taches "Repondre a..." sont auto-fermees quand un email sortant est detecte vers le meme destinataire
