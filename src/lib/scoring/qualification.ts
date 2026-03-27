/**
 * Qualification prospect — scoring par complétude de la fiche client.
 *
 * Vérifie la présence des champs essentiels pour qu'un courtier puisse
 * formuler une recommandation. Score = champs remplis / total × 100.
 *
 * Catégories :
 * - Entreprise (6 champs) : raisonSociale ✓, siret, formeJuridique, secteurActivite, nbSalaries, conventionCollective
 * - Contact (4 champs)    : prenom ✓, nom ✓, email, telephone
 * - Couverture (4 champs) : mutuelleActuelle, prevoyanceActuelle, dateEcheanceMutuelle, dateEcheancePrevoyance
 * - Dirigeant (5 champs)  : statutProfessionnel, mutuellePerso, prevoyancePerso, regimeRetraite, dateNaissance
 *
 * Note : les champs marqués ✓ sont requis à la création — ils seront toujours remplis.
 * Le dirigeant est optionnel (1:1 avec Client). S'il n'existe pas, ses champs comptent comme manquants.
 */

type ClientForQualification = {
  raisonSociale: string;
  siret: string | null;
  formeJuridique: string | null;
  secteurActivite: string | null;
  nbSalaries: number | null;
  conventionCollective: string | null;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  mutuelleActuelle: string | null;
  prevoyanceActuelle: string | null;
  dateEcheanceMutuelle: Date | null;
  dateEcheancePrevoyance: Date | null;
  dirigeant?: {
    statutProfessionnel: string | null;
    mutuellePerso: string | null;
    prevoyancePerso: string | null;
    regimeRetraite: string | null;
    dateNaissance: Date | null;
  } | null;
};

type ChampManquant = {
  categorie: "entreprise" | "contact" | "couverture" | "dirigeant";
  champ: string;
  label: string;
};

export type QualificationResult = {
  statut: "non_qualifie" | "en_cours" | "qualifie";
  score: number; // 0–100
  champsRemplis: number;
  champsTotal: number;
  champsManquants: ChampManquant[];
};

// ── Grille de vérification ──

const GRILLE_ENTREPRISE: { champ: keyof ClientForQualification; label: string }[] = [
  { champ: "raisonSociale", label: "Raison sociale" },
  { champ: "siret", label: "SIRET" },
  { champ: "formeJuridique", label: "Forme juridique" },
  { champ: "secteurActivite", label: "Secteur d'activité" },
  { champ: "nbSalaries", label: "Nombre de salariés" },
  { champ: "conventionCollective", label: "Convention collective" },
];

const GRILLE_CONTACT: { champ: keyof ClientForQualification; label: string }[] = [
  { champ: "prenom", label: "Prénom" },
  { champ: "nom", label: "Nom" },
  { champ: "email", label: "Email" },
  { champ: "telephone", label: "Téléphone" },
];

const GRILLE_COUVERTURE: { champ: keyof ClientForQualification; label: string }[] = [
  { champ: "mutuelleActuelle", label: "Mutuelle actuelle" },
  { champ: "prevoyanceActuelle", label: "Prévoyance actuelle" },
  { champ: "dateEcheanceMutuelle", label: "Date échéance mutuelle" },
  { champ: "dateEcheancePrevoyance", label: "Date échéance prévoyance" },
];

type DirigeantField = "statutProfessionnel" | "mutuellePerso" | "prevoyancePerso" | "regimeRetraite" | "dateNaissance";

const GRILLE_DIRIGEANT: { champ: DirigeantField; label: string }[] = [
  { champ: "statutProfessionnel", label: "Statut professionnel" },
  { champ: "mutuellePerso", label: "Mutuelle personnelle" },
  { champ: "prevoyancePerso", label: "Prévoyance personnelle" },
  { champ: "regimeRetraite", label: "Régime retraite" },
  { champ: "dateNaissance", label: "Date de naissance dirigeant" },
];

function estRempli(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  return true;
}

export function calculerQualification(client: ClientForQualification): QualificationResult {
  const champsManquants: ChampManquant[] = [];
  let remplis = 0;

  // Entreprise
  for (const { champ, label } of GRILLE_ENTREPRISE) {
    if (estRempli(client[champ])) {
      remplis++;
    } else {
      champsManquants.push({ categorie: "entreprise", champ, label });
    }
  }

  // Contact
  for (const { champ, label } of GRILLE_CONTACT) {
    if (estRempli(client[champ])) {
      remplis++;
    } else {
      champsManquants.push({ categorie: "contact", champ, label });
    }
  }

  // Couverture
  for (const { champ, label } of GRILLE_COUVERTURE) {
    if (estRempli(client[champ])) {
      remplis++;
    } else {
      champsManquants.push({ categorie: "couverture", champ, label });
    }
  }

  // Dirigeant — inclus dans le calcul uniquement si une fiche dirigeant existe
  const dirigeant = client.dirigeant;
  const inclureDirigeant = !!dirigeant;
  if (inclureDirigeant) {
    for (const { champ, label } of GRILLE_DIRIGEANT) {
      if (estRempli(dirigeant[champ])) {
        remplis++;
      } else {
        champsManquants.push({ categorie: "dirigeant", champ, label });
      }
    }
  }

  const total = GRILLE_ENTREPRISE.length + GRILLE_CONTACT.length + GRILLE_COUVERTURE.length + (inclureDirigeant ? GRILLE_DIRIGEANT.length : 0);
  const score = Math.round((remplis / total) * 100);

  let statut: QualificationResult["statut"];
  if (score >= 80) {
    statut = "qualifie";
  } else if (score >= 50) {
    statut = "en_cours";
  } else {
    statut = "non_qualifie";
  }

  return {
    statut,
    score,
    champsRemplis: remplis,
    champsTotal: total,
    champsManquants,
  };
}
