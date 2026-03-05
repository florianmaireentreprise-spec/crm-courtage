export type AIEmailAnalysis = {
  resume: string;
  actionItems: string[];
  clientId: string | null;
  draftReply: string | null;
};

type ClientMini = {
  id: string;
  raisonSociale: string;
  email: string | null;
  prenom: string;
  nom: string;
};

export function buildAnalysisPrompt(
  sujet: string,
  expediteur: string,
  extrait: string | null,
  clients: ClientMini[]
): string {
  const clientList = clients
    .map(
      (c) =>
        `- ID:${c.id} | ${c.raisonSociale} | contact: ${c.prenom} ${c.nom} | email: ${c.email ?? "inconnu"}`
    )
    .join("\n");

  return `Tu es un assistant CRM pour le Cabinet JDHM, un courtier en assurances pour TPE/PME.

Analyse cet email et réponds UNIQUEMENT en JSON valide avec cette structure exacte :
{
  "resume": "Résumé en 3 lignes maximum en français",
  "actionItems": ["Action 1", "Action 2"],
  "clientId": "ID_du_client_ou_null",
  "draftReply": "Proposition de réponse en français ou null"
}

EMAIL :
De: ${expediteur}
Objet: ${sujet}
---
${extrait ?? "Contenu non disponible"}

CLIENTS DANS LE CRM :
${clientList}

Instructions :
- Le résumé doit être factuel, en français, maximum 3 lignes
- actionItems = liste de tâches concrètes à faire suite à cet email (ex: "Rappeler M. Dupont", "Envoyer devis santé collective")
- Pour clientId : trouver une correspondance entre l'expéditeur/destinataire et les clients (email ou nom) — null si aucune correspondance
- draftReply = réponse professionnelle, chaleureuse, adaptée au courtage assurances — null si l'email ne nécessite pas de réponse
- Si aucune action requise, actionItems = []
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
    };
  } catch {
    return {
      resume: "Erreur lors de l'analyse",
      actionItems: [],
      clientId: null,
      draftReply: null,
    };
  }
}
