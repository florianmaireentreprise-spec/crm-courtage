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
  { id: "medecin", label: "Medecins", color: "#10B981" },
  { id: "avocat", label: "Avocats", color: "#F59E0B" },
  { id: "profession_liberale", label: "Professions liberales", color: "#F97316" },
  { id: "expert_comptable", label: "Experts-comptables", color: "#06B6D4" },
  { id: "autre", label: "Autres", color: "#94A3B8" },
] as const;

// Checklist items pour l'audit protection sociale
export const AUDIT_CHECKLIST_ITEMS = [
  { id: "mutuelle_entreprise", label: "Mutuelle entreprise" },
  { id: "prevoyance_entreprise", label: "Prevoyance entreprise" },
  { id: "protection_dirigeant", label: "Protection dirigeant" },
  { id: "retraite_epargne", label: "Retraite / Epargne" },
] as const;
