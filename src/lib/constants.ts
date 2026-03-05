export const TYPES_PRODUITS = {
  SANTE_COLLECTIVE: { label: "Santé collective", icon: "Heart", color: "#3B82F6" },
  PREVOYANCE_COLLECTIVE: { label: "Prévoyance collective", icon: "Shield", color: "#8B5CF6" },
  PREVOYANCE_MADELIN: { label: "Prévoyance Madelin", icon: "ShieldCheck", color: "#6366F1" },
  SANTE_MADELIN: { label: "Santé Madelin (TNS)", icon: "HeartPulse", color: "#06B6D4" },
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

export const ETAPES_PIPELINE = [
  { id: "PROSPECTION", label: "Prospection", color: "#94A3B8", ordre: 1 },
  { id: "RDV_PRIS", label: "RDV pris", color: "#3B82F6", ordre: 2 },
  { id: "AUDIT_REALISE", label: "Audit réalisé", color: "#8B5CF6", ordre: 3 },
  { id: "DEVIS_ENVOYE", label: "Devis envoyé", color: "#F59E0B", ordre: 4 },
  { id: "NEGOCE", label: "Négociation", color: "#F97316", ordre: 5 },
  { id: "SIGNE", label: "Signé", color: "#10B981", ordre: 6 },
  { id: "PERDU", label: "Perdu", color: "#EF4444", ordre: 7 },
] as const;

export type EtapePipeline = (typeof ETAPES_PIPELINE)[number]["id"];

export const SOURCES_ACQUISITION = [
  "Expert-comptable",
  "LinkedIn",
  "BNI / Réseau affaires",
  "Parrainage client",
  "Site web / SEO",
  "Google Ads",
  "Instagram / TikTok",
  "Salon / Événement",
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
  { id: "resilie", label: "Résilié", color: "#EF4444" },
  { id: "suspendu", label: "Suspendu", color: "#F59E0B" },
] as const;

export const TYPES_TACHE = [
  { id: "RELANCE_PROSPECT", label: "Relance prospect" },
  { id: "RENOUVELLEMENT", label: "Renouvellement" },
  { id: "SIGNATURE", label: "Signature" },
  { id: "APPEL", label: "Appel" },
  { id: "RDV", label: "Rendez-vous" },
  { id: "ADMIN", label: "Administratif" },
  { id: "AUTRE", label: "Autre" },
] as const;

export const PRIORITES = [
  { id: "haute", label: "Haute", color: "#EF4444" },
  { id: "normale", label: "Normale", color: "#3B82F6" },
  { id: "basse", label: "Basse", color: "#94A3B8" },
] as const;

export const MODES_VERSEMENT = [
  { id: "LINEAIRE", label: "Linéaire" },
  { id: "PRECOMPTE", label: "Précompté" },
  { id: "ESCOMPTE", label: "Escompté" },
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
  { id: "prevu", label: "Prévu", color: "#F59E0B" },
  { id: "verse", label: "Versé", color: "#10B981" },
  { id: "en_attente", label: "En attente", color: "#94A3B8" },
] as const;
