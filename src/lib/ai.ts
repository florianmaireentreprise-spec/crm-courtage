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
  "actionItems": ["Action 1", "Action 2"],
  "clientId": "ID_du_client_ou_null",
  "draftReply": "Proposition de réponse en français ou null",
  "tachesAFermer": ["id_tache_1"],
  "enrichissementClient": {
    "notes": "Info pertinente à retenir sur le client ou null",
    "statutSuggere": "nouveau_statut_ou_null"
  },
  "contratMentionne": "TYPE_PRODUIT_ou_null"
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
- actionItems = tâches concrètes à faire suite à cet email (ex: "Rappeler M. Dupont", "Envoyer devis santé collective"). Si email sortant = probablement moins d'actions.
- clientId : trouver correspondance expéditeur/destinataire ↔ clients (email ou nom) — null si aucune
- draftReply = réponse professionnelle adaptée au courtage — null si pas de réponse nécessaire ou si c'est un email SORTANT
- tachesAFermer = IDs des tâches ouvertes du client que cet email résout (ex: si on a envoyé un devis, fermer la tâche "Envoyer devis"). Liste vide si aucune.
- enrichissementClient.notes = info business à retenir (ex: "Le client souhaite renégocier sa mutuelle en septembre", "Changement de dirigeant prévu"). null si rien de notable.
- enrichissementClient.statutSuggere = suggérer un changement de statut du client si pertinent (ex: "prospect" → "en_cours", "client_actif"). null si pas de changement.
- contratMentionne = si l'email mentionne un type de produit d'assurance, indiquer le code (SANTE_COLLECTIVE, PREVOYANCE_COLLECTIVE, SANTE_MADELIN, PREVOYANCE_MADELIN, RETRAITE_PER, PROTECTION_JURIDIQUE, RCP, ASSURANCE_VIE, MULTIRISQUE). null sinon.
- Répondre UNIQUEMENT avec le JSON, sans texte avant ni après`;
}

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
    };
  }
}
