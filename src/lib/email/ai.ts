export type AIAction = {
  type: "tache" | "relance" | "deal" | "enrichissement" | "alerte";
  titre: string;
  priorite: "haute" | "normale" | "basse";
  details: string | null;
};

export type AITacheFermerDetail = {
  id: string;
  raison: string;
  motsClesTache: string[];
};

export type AIClientMatch = {
  found: boolean;
  clientId: string | null;
  clientEmail: string | null;
  clientName: string | null;
  confidence: "haute" | "moyenne" | "basse";
};

export type AIEmailAnalysis = {
  resume: string;
  actionItems: string[];
  clientId: string | null;
  draftReply: string | null;
  tachesAFermer: string[];
  enrichissementClient: {
    notes: string | null;
    statutSuggere: string | null;
  } | null;
  contratMentionne: string | null;
  // Champs v2
  type: "client" | "prospect" | "assureur" | "prescripteur" | "autre";
  urgence: "haute" | "normale" | "basse";
  sentiment: "positif" | "neutre" | "negatif";
  actionRequise: boolean;
  actionSuggeree: string | null;
  dealUpdate: { etapeSuggeree: string; raison: string } | null;
  produitsMentionnes: string[];
  expediteurNom: string | null;
  expediteurEntreprise: string | null;
  // Champs v3 — enrichis
  clientMatch: AIClientMatch;
  actions: AIAction[];
  tachesAFermerDetails: AITacheFermerDetail[];
};

type ClientMini = {
  id: string;
  raisonSociale: string;
  email: string | null;
  prenom: string;
  nom: string;
};

type TacheMini = {
  id: string;
  titre: string;
  statut: string;
  dateEcheance: Date;
};

type ContratMini = {
  id: string;
  typeProduit: string;
  nomProduit: string | null;
  statut: string;
};

type EmailHistMini = {
  sujet: string;
  direction: string;
  dateEnvoi: Date;
};

export function buildAnalysisPrompt(
  sujet: string,
  expediteur: string,
  extrait: string | null,
  direction: string,
  clients: ClientMini[],
  context?: {
    clientMatched?: ClientMini & { taches?: TacheMini[]; contrats?: ContratMini[] };
    recentEmails?: EmailHistMini[];
  }
): string {
  const clientList = clients
    .map(
      (c) =>
        `- ID:${c.id} | ${c.raisonSociale} | contact: ${c.prenom} ${c.nom} | email: ${c.email ?? "inconnu"}`
    )
    .join("\n");

  let contextBlock = "";

  if (context?.clientMatched) {
    const cm = context.clientMatched;
    contextBlock += `\nCLIENT ASSOCIÉ : ${cm.raisonSociale} (${cm.prenom} ${cm.nom}) — ID: ${cm.id}`;

    if (cm.taches?.length) {
      contextBlock += "\n\nTÂCHES OUVERTES DE CE CLIENT :";
      for (const t of cm.taches) {
        contextBlock += `\n- ID:${t.id} | "${t.titre}" | statut: ${t.statut} | échéance: ${t.dateEcheance.toISOString().slice(0, 10)}`;
      }
    }

    if (cm.contrats?.length) {
      contextBlock += "\n\nCONTRATS ACTIFS DE CE CLIENT :";
      for (const c of cm.contrats) {
        contextBlock += `\n- ${c.typeProduit}${c.nomProduit ? ` (${c.nomProduit})` : ""} — statut: ${c.statut}`;
      }
    }
  }

  if (context?.recentEmails?.length) {
    contextBlock += "\n\nHISTORIQUE EMAILS RÉCENTS (ce fil ou ce client) :";
    for (const e of context.recentEmails.slice(0, 5)) {
      contextBlock += `\n- [${e.direction}] ${e.dateEnvoi.toISOString().slice(0, 10)} — "${e.sujet}"`;
    }
  }

  return `Tu es un assistant CRM pour GargarineV1, courtier en assurances pour TPE/PME.

Analyse cet email ${direction === "sortant" ? "ENVOYÉ PAR le cabinet" : "REÇU PAR le cabinet"} et réponds UNIQUEMENT en JSON valide avec cette structure exacte :
{
  "resume": "Résumé en 3 lignes maximum en français",
  "type": "client | prospect | assureur | prescripteur | autre",
  "urgence": "haute | normale | basse",
  "sentiment": "positif | neutre | negatif",
  "actionRequise": true/false,
  "actionSuggeree": "Description de l'action à faire ou null",
  "actionItems": ["Action 1", "Action 2"],
  "clientMatch": {
    "found": true/false,
    "clientId": "ID_du_client_ou_null",
    "clientEmail": "email@matching.com ou null",
    "clientName": "Nom du client trouvé ou null",
    "confidence": "haute | moyenne | basse"
  },
  "actions": [
    {
      "type": "tache | relance | deal | enrichissement | alerte",
      "titre": "Titre de l'action",
      "priorite": "haute | normale | basse",
      "details": "Détails complémentaires ou null"
    }
  ],
  "draftReply": "Proposition de réponse en français ou null",
  "tachesAFermer": ["id_tache_1"],
  "tachesAFermerDetails": [
    {
      "id": "id_tache",
      "raison": "Pourquoi cette tâche est résolue par cet email",
      "motsClesTache": ["mot1", "mot2"]
    }
  ],
  "enrichissementClient": {
    "notes": "Info pertinente à retenir sur le client ou null",
    "statutSuggere": "nouveau_statut_ou_null"
  },
  "contratMentionne": "TYPE_PRODUIT_ou_null",
  "dealUpdate": { "etapeSuggeree": "ETAPE_PIPELINE", "raison": "explication" } ou null,
  "produitsMentionnes": ["SANTE_COLLECTIVE", "PER"],
  "expediteurNom": "Prénom ou nom de la personne qui envoie l'email",
  "expediteurEntreprise": "Nom de l'entreprise de l'expéditeur ou null"
}

EMAIL (${direction.toUpperCase()}) :
De: ${expediteur}
Objet: ${sujet}
---
${extrait ?? "Contenu non disponible"}

CLIENTS DANS LE CRM :
${clientList}
${contextBlock}

Instructions :
- Le résumé doit être factuel, en français, maximum 3 lignes
- type = catégorie de l'expéditeur : "client" (client existant), "prospect" (potentiel client), "assureur" (compagnie d'assurance), "prescripteur" (expert-comptable, avocat, partenaire), "autre"
- urgence = "haute" si action immédiate requise ou deadline proche, "normale" sinon, "basse" si informatif
- sentiment = tonalité générale de l'email
- actionRequise = true si une action concrète est attendue du cabinet
- actionSuggeree = description courte de l'action principale à faire (null si aucune)
- actionItems = tâches concrètes à faire (liste plate pour rétro-compat). Si email sortant = probablement moins d'actions.

CHAMP clientMatch (IMPORTANT) :
- Chercher la correspondance entre l'expéditeur/destinataire et les clients du CRM (par email OU par nom)
- found = true si une correspondance est trouvée
- clientId = l'ID du client trouvé dans la liste ci-dessus, null sinon
- clientEmail = l'email du client trouvé, null sinon
- clientName = le nom/raison sociale du client trouvé, null sinon
- confidence = "haute" si match email exact, "moyenne" si match sur le nom, "basse" si incertain

CHAMP actions (STRUCTURÉ) :
- Tableau d'actions concrètes avec type, titre, priorité et détails
- type "tache" = tâche à créer (rappeler, envoyer devis, etc.)
- type "relance" = relance commerciale à planifier
- type "deal" = créer ou modifier une affaire dans le pipeline
- type "enrichissement" = info à ajouter sur la fiche client
- type "alerte" = situation urgente nécessitant attention immédiate
- priorite = "haute" si urgent/deadline, "normale" par défaut, "basse" si informatif

CHAMP tachesAFermerDetails :
- Pour chaque tâche ouverte du client que cet email résout, fournir l'ID, la raison de la fermeture, et des mots-clés pour le matching
- motsClesTache = mots-clés du titre de la tâche qui aident au matching (ex: ["devis", "santé"] pour "Envoyer devis santé")
- Si aucune tâche à fermer, tableau vide []

- draftReply = réponse professionnelle adaptée au courtage — null si pas de réponse nécessaire ou si c'est un email SORTANT
- tachesAFermer = IDs des tâches ouvertes à fermer (liste plate pour rétro-compat). Liste vide si aucune.
- enrichissementClient.notes = info business à retenir (ex: "Le client souhaite renégocier sa mutuelle en septembre"). null si rien de notable.
- enrichissementClient.statutSuggere = changement de statut si pertinent (ex: "prospect" → "en_cours"). null sinon.
- contratMentionne = code produit d'assurance mentionné (SANTE_COLLECTIVE, PREVOYANCE_COLLECTIVE, SANTE_MADELIN, PREVOYANCE_MADELIN, PER, PROTECTION_JURIDIQUE, RCP_PRO, ASSURANCE_VIE). null sinon.
- dealUpdate = changement d'étape pipeline si justifié. null sinon.
- produitsMentionnes = tous les codes produits mentionnés. Liste vide si aucun.
- expediteurNom = prénom ou nom de la personne. null si impossible.
- expediteurEntreprise = nom de l'entreprise. null si impossible.
- Répondre UNIQUEMENT avec le JSON, sans texte avant ni après`;
}

const VALID_TYPES = ["client", "prospect", "assureur", "prescripteur", "autre"] as const;
const VALID_URGENCES = ["haute", "normale", "basse"] as const;
const VALID_SENTIMENTS = ["positif", "neutre", "negatif"] as const;

const VALID_ACTION_TYPES = ["tache", "relance", "deal", "enrichissement", "alerte"] as const;
const VALID_PRIORITIES = ["haute", "normale", "basse"] as const;
const VALID_CONFIDENCES = ["haute", "moyenne", "basse"] as const;

function parseActions(raw: unknown): AIAction[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a) => a && typeof a === "object" && typeof a.titre === "string")
    .map((a) => ({
      type: VALID_ACTION_TYPES.includes(a.type) ? a.type : "tache",
      titre: a.titre,
      priorite: VALID_PRIORITIES.includes(a.priorite) ? a.priorite : "normale",
      details: typeof a.details === "string" && a.details !== "null" ? a.details : null,
    }));
}

function parseTachesAFermerDetails(raw: unknown): AITacheFermerDetail[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t) => t && typeof t === "object" && typeof t.id === "string")
    .map((t) => ({
      id: t.id,
      raison: typeof t.raison === "string" ? t.raison : "",
      motsClesTache: Array.isArray(t.motsClesTache) ? t.motsClesTache.filter((m: unknown) => typeof m === "string") : [],
    }));
}

function parseClientMatch(raw: unknown, legacyClientId: string | null): AIClientMatch {
  if (raw && typeof raw === "object" && "found" in raw) {
    const cm = raw as Record<string, unknown>;
    return {
      found: typeof cm.found === "boolean" ? cm.found : false,
      clientId: typeof cm.clientId === "string" && cm.clientId !== "null" ? cm.clientId : legacyClientId,
      clientEmail: typeof cm.clientEmail === "string" && cm.clientEmail !== "null" ? cm.clientEmail : null,
      clientName: typeof cm.clientName === "string" && cm.clientName !== "null" ? cm.clientName : null,
      confidence: VALID_CONFIDENCES.includes(cm.confidence as string) ? cm.confidence as AIClientMatch["confidence"] : "basse",
    };
  }
  // Fallback from legacy clientId field
  return {
    found: !!legacyClientId,
    clientId: legacyClientId,
    clientEmail: null,
    clientName: null,
    confidence: legacyClientId ? "moyenne" : "basse",
  };
}

export function parseAIResponse(text: string): AIEmailAnalysis {
  try {
    const clean = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(clean);

    const legacyClientId = typeof parsed.clientId === "string" && parsed.clientId !== "null" ? parsed.clientId : null;
    const clientMatch = parseClientMatch(parsed.clientMatch, legacyClientId);

    return {
      resume: typeof parsed.resume === "string" ? parsed.resume : "Résumé non disponible",
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      clientId: clientMatch.clientId,
      draftReply: typeof parsed.draftReply === "string" && parsed.draftReply !== "null" ? parsed.draftReply : null,
      tachesAFermer: Array.isArray(parsed.tachesAFermer) ? parsed.tachesAFermer : [],
      enrichissementClient: parsed.enrichissementClient && typeof parsed.enrichissementClient === "object"
        ? {
            notes: typeof parsed.enrichissementClient.notes === "string" ? parsed.enrichissementClient.notes : null,
            statutSuggere: typeof parsed.enrichissementClient.statutSuggere === "string" && parsed.enrichissementClient.statutSuggere !== "null" ? parsed.enrichissementClient.statutSuggere : null,
          }
        : null,
      contratMentionne: typeof parsed.contratMentionne === "string" && parsed.contratMentionne !== "null" ? parsed.contratMentionne : null,
      type: VALID_TYPES.includes(parsed.type) ? parsed.type : "autre",
      urgence: VALID_URGENCES.includes(parsed.urgence) ? parsed.urgence : "normale",
      sentiment: VALID_SENTIMENTS.includes(parsed.sentiment) ? parsed.sentiment : "neutre",
      actionRequise: typeof parsed.actionRequise === "boolean" ? parsed.actionRequise : false,
      actionSuggeree: typeof parsed.actionSuggeree === "string" && parsed.actionSuggeree !== "null" ? parsed.actionSuggeree : null,
      dealUpdate: parsed.dealUpdate && typeof parsed.dealUpdate === "object" && parsed.dealUpdate.etapeSuggeree
        ? { etapeSuggeree: parsed.dealUpdate.etapeSuggeree, raison: parsed.dealUpdate.raison ?? "" }
        : null,
      produitsMentionnes: Array.isArray(parsed.produitsMentionnes) ? parsed.produitsMentionnes : [],
      expediteurNom: typeof parsed.expediteurNom === "string" && parsed.expediteurNom !== "null" ? parsed.expediteurNom : null,
      expediteurEntreprise: typeof parsed.expediteurEntreprise === "string" && parsed.expediteurEntreprise !== "null" ? parsed.expediteurEntreprise : null,
      // v3 fields
      clientMatch,
      actions: parseActions(parsed.actions),
      tachesAFermerDetails: parseTachesAFermerDetails(parsed.tachesAFermerDetails),
    };
  } catch {
    return {
      resume: "Erreur lors de l'analyse",
      actionItems: [],
      clientId: null,
      draftReply: null,
      tachesAFermer: [],
      enrichissementClient: null,
      contratMentionne: null,
      type: "autre",
      urgence: "normale",
      sentiment: "neutre",
      actionRequise: false,
      actionSuggeree: null,
      dealUpdate: null,
      produitsMentionnes: [],
      expediteurNom: null,
      expediteurEntreprise: null,
      clientMatch: { found: false, clientId: null, clientEmail: null, clientName: null, confidence: "basse" },
      actions: [],
      tachesAFermerDetails: [],
    };
  }
}
