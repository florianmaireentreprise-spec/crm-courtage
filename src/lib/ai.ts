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
  // Nouveaux champs v2
  type: "client" | "prospect" | "assureur" | "prescripteur" | "autre";
  urgence: "haute" | "normale" | "basse";
  sentiment: "positif" | "neutre" | "negatif";
  actionRequise: boolean;
  actionSuggeree: string | null;
  dealUpdate: { etapeSuggeree: string; raison: string } | null;
  produitsMentionnes: string[];
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
  "clientId": "ID_du_client_ou_null",
  "draftReply": "Proposition de réponse en français ou null",
  "tachesAFermer": ["id_tache_1"],
  "enrichissementClient": {
    "notes": "Info pertinente à retenir sur le client ou null",
    "statutSuggere": "nouveau_statut_ou_null"
  },
  "contratMentionne": "TYPE_PRODUIT_ou_null",
  "dealUpdate": { "etapeSuggeree": "ETAPE_PIPELINE", "raison": "explication" } ou null,
  "produitsMentionnes": ["SANTE_COLLECTIVE", "PER"]
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
- actionItems = tâches concrètes à faire suite à cet email (ex: "Rappeler M. Dupont", "Envoyer devis santé collective"). Si email sortant = probablement moins d'actions.
- clientId : trouver correspondance expéditeur/destinataire ↔ clients (email ou nom) — null si aucune
- draftReply = réponse professionnelle adaptée au courtage — null si pas de réponse nécessaire ou si c'est un email SORTANT
- tachesAFermer = IDs des tâches ouvertes du client que cet email résout (ex: si on a envoyé un devis, fermer la tâche "Envoyer devis"). Liste vide si aucune.
- enrichissementClient.notes = info business à retenir (ex: "Le client souhaite renégocier sa mutuelle en septembre", "Changement de dirigeant prévu"). null si rien de notable.
- enrichissementClient.statutSuggere = suggérer un changement de statut du client si pertinent (ex: "prospect" → "en_cours", "client_actif"). null si pas de changement.
- contratMentionne = si l'email mentionne un type de produit d'assurance, indiquer le code (SANTE_COLLECTIVE, PREVOYANCE_COLLECTIVE, SANTE_MADELIN, PREVOYANCE_MADELIN, PER, PROTECTION_JURIDIQUE, RCP_PRO, ASSURANCE_VIE). null sinon.
- dealUpdate = si l'email justifie un changement d'étape pipeline (ex: email d'un assureur confirmant mise en place → SIGNATURE). null sinon.
- produitsMentionnes = tous les codes produits mentionnés dans l'email. Liste vide si aucun.
- Répondre UNIQUEMENT avec le JSON, sans texte avant ni après`;
}

const VALID_TYPES = ["client", "prospect", "assureur", "prescripteur", "autre"] as const;
const VALID_URGENCES = ["haute", "normale", "basse"] as const;
const VALID_SENTIMENTS = ["positif", "neutre", "negatif"] as const;

export function parseAIResponse(text: string): AIEmailAnalysis {
  try {
    const clean = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(clean);
    return {
      resume: typeof parsed.resume === "string" ? parsed.resume : "Résumé non disponible",
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      clientId: typeof parsed.clientId === "string" && parsed.clientId !== "null" ? parsed.clientId : null,
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
    };
  }
}
