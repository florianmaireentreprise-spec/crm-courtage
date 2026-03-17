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
  // Build compact context block
  let contextBlock = "";

  if (context?.clientMatched) {
    const cm = context.clientMatched;
    contextBlock += `\nCLIENT ASSOCIÉ : ${cm.raisonSociale} (${cm.prenom} ${cm.nom}) — ID: ${cm.id}`;

    if (cm.taches?.length) {
      contextBlock += `\nTÂCHES OUVERTES :`;
      for (const t of cm.taches.slice(0, 5)) {
        contextBlock += `\n- ID:${t.id} | "${t.titre}" | éch: ${t.dateEcheance.toISOString().slice(0, 10)}`;
      }
    }

    if (cm.contrats?.length) {
      contextBlock += `\nCONTRATS :`;
      for (const c of cm.contrats.slice(0, 5)) {
        contextBlock += `\n- ${c.typeProduit}${c.nomProduit ? ` (${c.nomProduit})` : ""}`;
      }
    }
  }

  if (context?.recentEmails?.length) {
    contextBlock += `\nÉCHANGES RÉCENTS :`;
    for (const e of context.recentEmails.slice(0, 3)) {
      contextBlock += `\n- [${e.direction}] ${e.dateEnvoi.toISOString().slice(0, 10)} "${e.sujet}"`;
    }
  }

  // Only include client list when no client is already matched
  let clientListBlock = "";
  if (!context?.clientMatched && clients.length > 0) {
    const list = clients
      .slice(0, 30)
      .map((c) => `- ${c.raisonSociale} | ${c.prenom} ${c.nom} | ${c.email ?? "?"}`)
      .join("\n");
    clientListBlock = `
CLIENTS CRM :
${list}`;
  }

  return `Assistant CRM pour GargarineV1, courtier assurances TPE/PME.
Analyse cet email ${direction === "sortant" ? "ENVOYÉ" : "REÇU"} et réponds en JSON valide uniquement :

{
  "resume": "Résumé factuel en français, 2-3 phrases",
  "type": "client | prospect | assureur | prescripteur | autre",
  "urgence": "haute | normale | basse",
  "sentiment": "positif | neutre | negatif",
  "actionRequise": true/false,
  "actions": [{"type": "tache|relance|deal|enrichissement|alerte", "titre": "...", "priorite": "haute|normale|basse", "details": "...ou null"}],
  "draftReply": "Réponse professionnelle prête à envoyer, ou null",
  "produitsMentionnes": ["SANTE_COLLECTIVE", "PREVOYANCE_COLLECTIVE", "PER", ...],
  "dealUpdate": {"etapeSuggeree": "ETAPE", "raison": "..."} ou null,
  "tachesAFermerDetails": [{"id": "id_tache", "raison": "pourquoi fermer"}],
  "notes": "Info business à retenir sur le contact, ou null",
  "expediteurNom": "Nom de l'expéditeur ou null",
  "expediteurEntreprise": "Entreprise de l'expéditeur ou null"
}

EMAIL (${direction.toUpperCase()}) :
De: ${expediteur}
Objet: ${sujet}
---
${extrait ?? "Contenu non disponible"}
${clientListBlock}${contextBlock}

RÈGLES :
- type : "client" si expéditeur est un client existant, "prospect" si potentiel client, "assureur" si compagnie d'assurance, "prescripteur" si comptable/avocat/partenaire, "autre" sinon
- urgence : "haute" si action immédiate ou deadline proche, "basse" si purement informatif
- actions : tâches concrètes (tache=rappeler/devis, relance=suivi commercial, deal=affaire pipeline, enrichissement=info fiche, alerte=urgent). Moins d'actions pour emails sortants
- draftReply : commencer par "Bonjour [nom]," terminer par "Cordialement,
GargarineV1 — Courtage en assurances". Concise et pro. null si email sortant ou pas de réponse nécessaire
- draftReply qualification : si l'email mentionne mutuelle collective ou prévoyance collective, demander dans la réponse : (1) convention collective applicable, (2) assureur actuel et échéance du contrat, (3) date souhaitée de mise en place, (4) nombre exact de salariés si non précisé. Rester concis et professionnel
- produitsMentionnes : codes parmi SANTE_COLLECTIVE, PREVOYANCE_COLLECTIVE, SANTE_MADELIN, PREVOYANCE_MADELIN, PER, PROTECTION_JURIDIQUE, RCP_PRO, ASSURANCE_VIE
- tachesAFermerDetails : IDs des tâches ouvertes résolues par cet email. [] si aucune
- notes : info business à retenir (ex: "souhaite changer de mutuelle en sept."). null si rien
- JSON uniquement, sans texte autour`;
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
      confidence: (VALID_CONFIDENCES as ReadonlyArray<string>).includes(cm.confidence as string) ? cm.confidence as AIClientMatch["confidence"] : "basse",
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
