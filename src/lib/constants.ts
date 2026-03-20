export const TYPES_PRODUITS = {
  SANTE_COLLECTIVE: { label: "Sante collective", icon: "Heart", color: "#3B82F6" },
  PREVOYANCE_COLLECTIVE: { label: "Prevoyance collective", icon: "Shield", color: "#8B5CF6" },
  PREVOYANCE_MADELIN: { label: "Prevoyance Madelin", icon: "ShieldCheck", color: "#6366F1" },
  SANTE_MADELIN: { label: "Sante Madelin (TNS)", icon: "HeartPulse", color: "#06B6D4" },
  RCP_PRO: { label: "RCP Professionnelle", icon: "Briefcase", color: "#F59E0B" },
  PER: { label: "PER / Retraite", icon: "PiggyBank", color: "#10B981" },
  ASSURANCE_VIE: { label: "Assurance vie", icon: "Landmark", color: "#14B8A6" },
  PROTECTION_JURIDIQUE: { label: "Protection juridique", icon: "Scale", color: "#EF4444" },
} as const;

export type TypeProduit = keyof typeof TYPES_PRODUITS;

export const TAUX_COMMISSION_DEFAUT = {
  SANTE_COLLECTIVE: { apport: 0.07, gestion: 0.06 },
  PREVOYANCE_COLLECTIVE: { apport: 0.10, gestion: 0.08 },
  PREVOYANCE_MADELIN: { apport: 0.20, gestion: 0.15 },
  SANTE_MADELIN: { apport: 0.12, gestion: 0.10 },
  RCP_PRO: { apport: 0.15, gestion: 0.12 },
  PER: { apport: 0.03, gestion: 0.007 },
  ASSURANCE_VIE: { apport: 0.03, gestion: 0.007 },
  PROTECTION_JURIDIQUE: { apport: 0.18, gestion: 0.15 },
} as const;

// Pipeline commercial en 7 etapes + Perdu
export const ETAPES_PIPELINE = [
  { id: "PROSPECT_IDENTIFIE", label: "Prospect identifie", color: "#94A3B8", ordre: 1, description: "Contact identifie via reseau, prescripteur, recommandation ou prospection" },
  { id: "QUALIFICATION", label: "Qualification", color: "#3B82F6", ordre: 2, description: "Evaluation: taille, mutuelle actuelle, echeance, problematique" },
  { id: "AUDIT", label: "Audit protection sociale", color: "#8B5CF6", ordre: 3, description: "Audit mutuelle, prevoyance, dirigeant, retraite/epargne" },
  { id: "RECOMMANDATION", label: "Recommandation", color: "#F59E0B", ordre: 4, description: "Proposition contrat, comparatif assureurs, simulation" },
  { id: "SIGNATURE", label: "Signature", color: "#F97316", ordre: 5, description: "Signature, documents, assureur choisi, commissions" },
  { id: "ONBOARDING", label: "Onboarding client", color: "#10B981", ordre: 6, description: "Fiche client, calendrier suivi, rappel revision annuelle" },
  { id: "DEVELOPPEMENT", label: "Developpement", color: "#14B8A6", ordre: 7, description: "Audit dirigeant, optimisation retraite, epargne (6 mois apres)" },
  { id: "PERDU", label: "Perdu", color: "#EF4444", ordre: 8, description: "Opportunite perdue" },
] as const;

export type EtapePipeline = (typeof ETAPES_PIPELINE)[number]["id"];

// Etapes actives du pipeline (hors perdu/post-signature)
export const ETAPES_PIPELINE_OUVERTES = ETAPES_PIPELINE.filter(
  (e) => !["SIGNATURE", "ONBOARDING", "DEVELOPPEMENT", "PERDU"].includes(e.id)
);

// Etapes gagnees
export const ETAPES_PIPELINE_GAGNEES = ["SIGNATURE", "ONBOARDING", "DEVELOPPEMENT"];

export const SOURCES_PROSPECT = [
  { id: "reseau_personnel", label: "Reseau personnel" },
  { id: "prescripteur", label: "Prescripteur" },
  { id: "recommandation", label: "Recommandation client" },
  { id: "prospection", label: "Prospection directe" },
] as const;

export const SOURCES_ACQUISITION = [
  "Reseau personnel",
  "Expert-comptable",
  "Avocat",
  "Partenaire",
  "Recommandation client",
  "LinkedIn",
  "BNI / Reseau affaires",
  "Parrainage client",
  "Site web / SEO",
  "Google Ads",
  "Instagram / TikTok",
  "Salon / Evenement",
  "CCI / Association pro",
  "Cold call",
  "Autre",
] as const;

export const FORMES_JURIDIQUES = [
  "SARL",
  "SAS",
  "SASU",
  "EURL",
  "EI",
  "Auto-entrepreneur",
  "SA",
  "SCI",
  "SNC",
  "Association",
  "Autre",
] as const;

export const STATUTS_CLIENT = [
  { id: "prospect", label: "Prospect", color: "#F59E0B" },
  { id: "client_actif", label: "Client actif", color: "#10B981" },
  { id: "ancien_client", label: "Ancien client", color: "#94A3B8" },
] as const;

export const STATUTS_CONTRAT = [
  { id: "actif", label: "Actif", color: "#10B981" },
  { id: "en_cours", label: "En cours", color: "#3B82F6" },
  { id: "resilie", label: "Resilie", color: "#EF4444" },
  { id: "suspendu", label: "Suspendu", color: "#F59E0B" },
] as const;

export const TYPES_TACHE = [
  { id: "RELANCE_PROSPECT", label: "Relance prospect" },
  { id: "RENOUVELLEMENT", label: "Renouvellement" },
  { id: "SIGNATURE", label: "Signature" },
  { id: "APPEL", label: "Appel" },
  { id: "RDV", label: "Rendez-vous" },
  { id: "ADMIN", label: "Administratif" },
  { id: "AUDIT_DIRIGEANT", label: "Audit dirigeant" },
  { id: "REVISION_ANNUELLE", label: "Revision annuelle" },
  { id: "ONBOARDING", label: "Onboarding client" },
  { id: "DEV_CLIENT", label: "Developpement client" },
  { id: "ECHEANCE_CONTRAT", label: "Echeance contrat" },
  { id: "SUIVI_PRESCRIPTEUR", label: "Suivi prescripteur" },
  { id: "FIDELISATION_CLIENT", label: "Fidelisation client" },
  { id: "AUTRE", label: "Autre" },
] as const;

export const PRIORITES = [
  { id: "haute", label: "Haute", color: "#EF4444" },
  { id: "normale", label: "Normale", color: "#3B82F6" },
  { id: "basse", label: "Basse", color: "#94A3B8" },
] as const;

export const MODES_VERSEMENT = [
  { id: "LINEAIRE", label: "Lineaire" },
  { id: "PRECOMPTE", label: "Precompte" },
  { id: "ESCOMPTE", label: "Escompte" },
] as const;

export const FREQUENCES_VERSEMENT = [
  { id: "MENSUEL", label: "Mensuel" },
  { id: "TRIMESTRIEL", label: "Trimestriel" },
  { id: "ANNUEL", label: "Annuel" },
] as const;

export const TYPES_COMMISSION = [
  { id: "APPORT", label: "Apport" },
  { id: "GESTION", label: "Gestion" },
  { id: "SURCOMMISSION", label: "Surcommission" },
] as const;

export const STATUTS_COMMISSION = [
  { id: "prevu", label: "Prevu", color: "#F59E0B" },
  { id: "verse", label: "Verse", color: "#10B981" },
  { id: "en_attente", label: "En attente", color: "#94A3B8" },
] as const;

export const TYPES_OBJECTIF = [
  { id: "CA_ANNUEL", label: "CA recurrent annuel", format: "currency", icon: "Euro", color: "#10B981" },
  { id: "NB_CLIENTS", label: "Nouveaux clients", format: "number", icon: "Users", color: "#3B82F6" },
  { id: "NB_CONTRATS", label: "Contrats signes", format: "number", icon: "FileText", color: "#8B5CF6" },
  { id: "PIPELINE", label: "Pipeline pondere", format: "currency", icon: "Target", color: "#F59E0B" },
] as const;

export type TypeObjectif = (typeof TYPES_OBJECTIF)[number]["id"];

// Preconisations (Structured Recommendations)
export const THEMES_PRECONISATION = [
  { id: "mutuelle_collective", label: "Mutuelle collective", color: "#3B82F6" },
  { id: "prevoyance", label: "Prevoyance", color: "#8B5CF6" },
  { id: "retraite", label: "Retraite / PER", color: "#10B981" },
  { id: "epargne", label: "Epargne / Assurance vie", color: "#14B8A6" },
  { id: "remuneration", label: "Remuneration dirigeant", color: "#F59E0B" },
  { id: "patrimonial", label: "Patrimonial", color: "#6366F1" },
  { id: "protection_juridique", label: "Protection juridique", color: "#EF4444" },
  { id: "autre", label: "Autre", color: "#94A3B8" },
] as const;

export const STATUTS_PRECONISATION = [
  { id: "a_preparer", label: "A preparer", color: "#94A3B8" },
  { id: "presentee", label: "Presentee", color: "#3B82F6" },
  { id: "en_discussion", label: "En discussion", color: "#F59E0B" },
  { id: "validee", label: "Validee", color: "#10B981" },
  { id: "refusee", label: "Refusee", color: "#EF4444" },
  { id: "reportee", label: "Reportee", color: "#6366F1" },
] as const;

export const PRIORITES_PRECONISATION = [
  { id: "haute", label: "Haute", color: "#EF4444" },
  { id: "moyenne", label: "Moyenne", color: "#F59E0B" },
  { id: "basse", label: "Basse", color: "#94A3B8" },
] as const;

export const PERIODES_OBJECTIF = [
  { id: "ANNUEL", label: "Annuel" },
  { id: "TRIMESTRIEL", label: "Trimestriel" },
  { id: "MENSUEL", label: "Mensuel" },
] as const;

// Prescripteurs
export const TYPES_PRESCRIPTEUR = [
  { id: "expert_comptable", label: "Expert-comptable", color: "#3B82F6" },
  { id: "avocat", label: "Avocat", color: "#8B5CF6" },
  { id: "partenaire", label: "Partenaire", color: "#F59E0B" },
  { id: "client_prescripteur", label: "Client prescripteur", color: "#10B981" },
] as const;

// Dirigeant
export const STATUTS_DIRIGEANT = [
  { id: "TNS", label: "TNS (Travailleur Non Salarie)" },
  { id: "assimile_salarie", label: "Assimile salarie" },
] as const;

// Reseau personnel strategique
export const CATEGORIES_RESEAU = [
  { id: "dirigeant_tpe", label: "Dirigeants TPE", color: "#3B82F6" },
  { id: "dirigeant_pme", label: "Dirigeants PME", color: "#8B5CF6" },
  { id: "dirigeant_eti", label: "Dirigeants ETI", color: "#7C3AED" },
  { id: "medecin", label: "Medecins", color: "#10B981" },
  { id: "avocat", label: "Avocats", color: "#F59E0B" },
  { id: "profession_liberale", label: "Professions liberales", color: "#F97316" },
  { id: "expert_comptable", label: "Experts-comptables", color: "#06B6D4" },
  { id: "autre", label: "Autres", color: "#94A3B8" },
] as const;

// Qualification reseau
export const TYPES_RELATION_RESEAU = [
  { id: "client_potentiel_direct", label: "Client potentiel direct" },
  { id: "prescripteur", label: "Prescripteur" },
  { id: "partenaire", label: "Partenaire" },
  { id: "ancien_client", label: "Ancien client" },
] as const;

// Multi-role reseau (V3 — a contact can have multiple roles)
export const ROLES_RESEAU = [
  { id: "prospect_direct", label: "Prospect direct", color: "#3B82F6" },
  { id: "prescripteur_potentiel", label: "Prescripteur potentiel", color: "#8B5CF6" },
  { id: "partenaire", label: "Partenaire", color: "#F59E0B" },
  { id: "ancien_client", label: "Ancien client", color: "#94A3B8" },
] as const;

export const STATUTS_RESEAU = [
  { id: "aucune_demarche", label: "Aucune demarche", color: "#94a3b8" },
  { id: "a_qualifier", label: "A qualifier", color: "#60a5fa" },
  { id: "a_contacter", label: "A contacter", color: "#818cf8" },
  { id: "premier_echange", label: "Premier echange", color: "#f59e0b" },
  { id: "suivi_en_cours", label: "Suivi en cours", color: "#f97316" },
  { id: "actif", label: "Actif", color: "#22c55e" },
  { id: "sans_suite", label: "Sans suite", color: "#6b7280" },
] as const;

export const NIVEAUX_POTENTIEL = [
  { id: "faible", label: "Faible" },
  { id: "moyen", label: "Moyenne" },
  { id: "fort", label: "Forte" },
] as const;

export const POTENTIELS_AFFAIRES = [
  { id: "faible", label: "Faible" },
  { id: "moyen", label: "Moyen" },
  { id: "fort", label: "Fort" },
  { id: "strategique", label: "Strategique" },
] as const;

export const HORIZONS_ACTIVATION = [
  { id: "lancement", label: "Au lancement" },
  { id: "deuxieme_phase", label: "En deuxieme phase" },
  { id: "installe", label: "Une fois installe" },
] as const;

// ── Enrichissement entreprise (SIRENE) ──

export const TRANCHES_EFFECTIFS: Record<string, { label: string; min: number; max: number }> = {
  "00": { label: "0 salarie", min: 0, max: 0 },
  "01": { label: "1 a 2 salaries", min: 1, max: 2 },
  "02": { label: "3 a 5 salaries", min: 3, max: 5 },
  "03": { label: "6 a 9 salaries", min: 6, max: 9 },
  "11": { label: "10 a 19 salaries", min: 10, max: 19 },
  "12": { label: "20 a 49 salaries", min: 20, max: 49 },
  "21": { label: "50 a 99 salaries", min: 50, max: 99 },
  "22": { label: "100 a 199 salaries", min: 100, max: 199 },
  "31": { label: "200 a 249 salaries", min: 200, max: 249 },
  "32": { label: "250 a 499 salaries", min: 250, max: 499 },
  "41": { label: "500 a 999 salaries", min: 500, max: 999 },
  "42": { label: "1 000 a 1 999 salaries", min: 1000, max: 1999 },
  "51": { label: "2 000 a 4 999 salaries", min: 2000, max: 4999 },
  "52": { label: "5 000 a 9 999 salaries", min: 5000, max: 9999 },
  "53": { label: "10 000 salaries et plus", min: 10000, max: 10000 },
};

export const NATURES_JURIDIQUES: Record<string, string> = {
  "1000": "EI",
  "5410": "SARL",
  "5422": "EURL",
  "5498": "SARL",
  "5505": "SA",
  "5510": "SA",
  "5710": "SAS",
  "5720": "SASU",
  "6540": "SCI",
  "5560": "SNC",
  "9210": "Association",
  "9220": "Association",
  "9300": "Fondation",
  "5202": "SNC",
};

// Coefficients de ponderation par statut reseau pour le forecasting
// Represente la probabilite de conversion en CA reel
export const COEFFICIENTS_STATUT_RESEAU: Record<string, number> = {
  aucune_demarche: 0.05,
  a_qualifier: 0.15,
  a_contacter: 0.25,
  premier_echange: 0.45,
  suivi_en_cours: 0.65,
  actif: 1.00,
  sans_suite: 0,
} as const;

// Checklist items pour l'audit protection sociale
export const AUDIT_CHECKLIST_ITEMS = [
  { id: "mutuelle_entreprise", label: "Mutuelle entreprise" },
  { id: "prevoyance_entreprise", label: "Prevoyance entreprise" },
  { id: "protection_dirigeant", label: "Protection dirigeant" },
  { id: "retraite_epargne", label: "Retraite / Epargne" },
] as const;

// ── Campagnes saisonnieres ──

export type CampagneSaisonniere = {
  mois: number;
  titre: string;
  description: string;
  filtre: string;
  action: string;
};

export const CAMPAGNES: CampagneSaisonniere[] = [
  {
    mois: 1,
    titre: "Renouvellements sante collective",
    description: "Verifier effectifs, renegocier conditions",
    filtre: "SANTE_COLLECTIVE",
    action: "Verifier effectifs et conditions sante collective",
  },
  {
    mois: 3,
    titre: "Campagne defiscalisation PER",
    description: "Avant declarations fiscales, proposer PER aux dirigeants sans epargne retraite",
    filtre: "SANS_PER",
    action: "Proposer simulation PER avec economie fiscale",
  },
  {
    mois: 9,
    titre: "Rentree — mise a jour effectifs",
    description: "Nouvelles embauches = mise a jour sante collective + prevoyance",
    filtre: "SANTE_COLLECTIVE",
    action: "Contacter pour mise a jour effectifs post-rentree",
  },
  {
    mois: 10,
    titre: "Optimisation fiscale avant cloture",
    description: "Derniers versements PER/AV avant le 31 decembre",
    filtre: "PER_OU_AV",
    action: "Proposer versement complementaire avant cloture",
  },
];

// Priorite reseau derivee (A/B/C) — simple, explainable matrix
// Based on: niveauPotentiel (probability) × potentielAffaires (business potential)
export function computePrioriteReseau(
  niveauPotentiel: string | null | undefined,
  potentielAffaires: string | null | undefined
): "A" | "B" | "C" | null {
  if (!niveauPotentiel && !potentielAffaires) return null;
  const prob = niveauPotentiel ?? "faible";
  const pot = potentielAffaires ?? "faible";
  // A: forte probabilite + moyen+ potential, OR moyen probabilite + fort+ potential
  if (prob === "fort" && (pot === "moyen" || pot === "fort" || pot === "strategique")) return "A";
  if (prob === "moyen" && (pot === "fort" || pot === "strategique")) return "A";
  if (prob === "fort" && pot === "strategique") return "A";
  // B: forte prob + faible pot, moyen prob + moyen pot, faible prob + fort+ pot, any × strategique
  if (prob === "fort" && pot === "faible") return "B";
  if (prob === "moyen" && pot === "moyen") return "B";
  if (prob === "faible" && (pot === "fort" || pot === "strategique")) return "B";
  // C: everything else
  return "C";
}

export const PRIORITES_RESEAU_CONFIG: Record<string, { label: string; color: string; bgClass: string }> = {
  A: { label: "Priorite A", color: "#DC2626", bgClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  B: { label: "Priorite B", color: "#F59E0B", bgClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  C: { label: "Priorite C", color: "#94A3B8", bgClass: "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400" },
};

export function getCampagnesActives(): CampagneSaisonniere[] {
  const moisActuel = new Date().getMonth() + 1;
  return CAMPAGNES.filter((c) => c.mois === moisActuel);
}

// ── Intelligence Commerciale : Feedback IA ──

export const FEEDBACK_TYPES = [
  { id: "action_executed", label: "Action executee" },
  { id: "action_ignored", label: "Action ignoree" },
  { id: "type_corrected", label: "Type corrige" },
  { id: "urgence_corrected", label: "Urgence corrigee" },
  { id: "reply_sent", label: "Reponse envoyee" },
  { id: "reply_edited", label: "Reponse editee" },
  { id: "client_linked", label: "Client lie" },
] as const;

export type FeedbackType = (typeof FEEDBACK_TYPES)[number]["id"];
