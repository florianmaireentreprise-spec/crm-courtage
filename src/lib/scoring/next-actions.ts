import type { Client, Contrat, Tache, Email, Deal, Dirigeant } from "@prisma/client";
import { TYPES_PRODUITS } from "@/lib/constants";
import { COUVERTURE_360 } from "./couverture360";

export type NextAction = {
  id: string;
  priorite: "haute" | "normale" | "basse";
  titre: string;
  detail: string;
  type: "email" | "tache" | "contrat" | "couverture" | "deal" | "dirigeant" | "relance";
  lien?: string;
};

type ClientData = Pick<Client, "id" | "statut" | "derniereInteraction" | "nbSalaries" | "scoreCouverture"> & {
  contrats: Pick<Contrat, "id" | "typeProduit" | "statut" | "dateEcheance" | "dateRenouvellement">[];
  taches: Pick<Tache, "id" | "titre" | "statut" | "dateEcheance" | "priorite" | "sourceAuto" | "emailId">[];
  emails: Pick<Email, "id" | "sujet" | "actionRequise" | "actionTraitee" | "urgence" | "analyseStatut" | "direction" | "dateEnvoi">[];
  deals: Pick<Deal, "id" | "titre" | "etape" | "dateMaj">[];
  dirigeant: Pick<Dirigeant, "id" | "dateAuditDirigeant" | "mutuellePerso" | "prevoyancePerso"> | null;
};

/**
 * Moteur deterministe de recommandation d'actions.
 * Retourne les actions triees par priorite, max 8.
 */
export function calculerProchainesActions(client: ClientData): NextAction[] {
  const actions: NextAction[] = [];
  const now = Date.now();

  // 1. Taches ouvertes non traitees (priorite haute d'abord)
  const tachesOuvertes = client.taches
    .filter((t) => t.statut === "a_faire" || t.statut === "en_cours")
    .sort((a, b) => {
      const prioOrdre = { haute: 0, normale: 1, basse: 2 };
      return (prioOrdre[a.priorite as keyof typeof prioOrdre] ?? 1) - (prioOrdre[b.priorite as keyof typeof prioOrdre] ?? 1);
    });

  for (const t of tachesOuvertes.slice(0, 3)) {
    const isOverdue = new Date(t.dateEcheance).getTime() < now;
    actions.push({
      id: `tache-${t.id}`,
      priorite: isOverdue ? "haute" : (t.priorite as "haute" | "normale" | "basse") || "normale",
      titre: isOverdue ? `En retard : ${t.titre}` : t.titre,
      detail: `Echeance : ${new Date(t.dateEcheance).toLocaleDateString("fr-FR")}`,
      type: "tache",
      lien: "/relances",
    });
  }

  // 2. Emails non traites avec action requise
  const emailsNonTraites = client.emails
    .filter((e) => e.actionRequise && !e.actionTraitee && e.analyseStatut === "analyse")
    .sort((a, b) => {
      if (a.urgence === "haute" && b.urgence !== "haute") return -1;
      if (b.urgence === "haute" && a.urgence !== "haute") return 1;
      return new Date(b.dateEnvoi).getTime() - new Date(a.dateEnvoi).getTime();
    });

  for (const e of emailsNonTraites.slice(0, 2)) {
    actions.push({
      id: `email-${e.id}`,
      priorite: e.urgence === "haute" ? "haute" : "normale",
      titre: `Repondre : ${e.sujet.slice(0, 60)}`,
      detail: e.urgence === "haute" ? "Email urgent" : "Action requise",
      type: "email",
      lien: "/emails",
    });
  }

  // 3. Echeances de contrats proches (< 90 jours)
  const contratsProches = client.contrats
    .filter((c) => {
      if (c.statut !== "actif" || !c.dateEcheance) return false;
      const jours = (new Date(c.dateEcheance).getTime() - now) / 86400000;
      return jours > 0 && jours < 90;
    })
    .sort((a, b) => new Date(a.dateEcheance!).getTime() - new Date(b.dateEcheance!).getTime());

  for (const c of contratsProches.slice(0, 2)) {
    const jours = Math.round((new Date(c.dateEcheance!).getTime() - now) / 86400000);
    const typeLabel = TYPES_PRODUITS[c.typeProduit as keyof typeof TYPES_PRODUITS]?.label ?? c.typeProduit;
    actions.push({
      id: `contrat-${c.id}`,
      priorite: jours < 30 ? "haute" : "normale",
      titre: `Echeance ${typeLabel}`,
      detail: `Dans ${jours} jours — preparer renouvellement`,
      type: "contrat",
      lien: `/contrats/${c.id}`,
    });
  }

  // 4. Couverture incomplete (si scoreCouverture < 80%)
  if (client.scoreCouverture !== null && client.scoreCouverture !== undefined && client.scoreCouverture < 80) {
    const typesActifs = client.contrats
      .filter((c) => c.statut === "actif")
      .map((c) => c.typeProduit);
    const manquants = COUVERTURE_360
      .filter((item) => !typesActifs.includes(item.id))
      .map((item) => item.label);

    if (manquants.length > 0) {
      actions.push({
        id: "couverture-incomplete",
        priorite: "normale",
        titre: `Couverture ${client.scoreCouverture}% — produits manquants`,
        detail: manquants.slice(0, 3).join(", "),
        type: "couverture",
        lien: `/clients/${client.id}`,
      });
    }
  }

  // 5. Audit dirigeant manquant
  if (client.dirigeant && !client.dirigeant.dateAuditDirigeant) {
    actions.push({
      id: "audit-dirigeant",
      priorite: "normale",
      titre: "Audit dirigeant a realiser",
      detail: "Protection personnelle du dirigeant non evaluee",
      type: "dirigeant",
      lien: `/clients/${client.id}`,
    });
  }

  // 6. Deal inactif depuis > 14 jours
  const dealsInactifs = client.deals.filter((d) => {
    if (["PERDU", "ONBOARDING", "DEVELOPPEMENT"].includes(d.etape)) return false;
    const joursInactif = (now - new Date(d.dateMaj).getTime()) / 86400000;
    return joursInactif > 14;
  });

  for (const d of dealsInactifs.slice(0, 1)) {
    const jours = Math.round((now - new Date(d.dateMaj).getTime()) / 86400000);
    actions.push({
      id: `deal-${d.id}`,
      priorite: "normale",
      titre: `Deal inactif : ${d.titre}`,
      detail: `Aucune activite depuis ${jours} jours`,
      type: "deal",
      lien: "/pipeline",
    });
  }

  // 7. Pas de contact depuis > 60 jours (client actif)
  if (client.statut === "client_actif" && client.derniereInteraction) {
    const joursDepuisContact = (now - new Date(client.derniereInteraction).getTime()) / 86400000;
    if (joursDepuisContact > 60) {
      actions.push({
        id: "relance-inactivite",
        priorite: joursDepuisContact > 90 ? "haute" : "basse",
        titre: "Client sans contact recent",
        detail: `Derniere interaction il y a ${Math.round(joursDepuisContact)} jours`,
        type: "relance",
        lien: `/clients/${client.id}`,
      });
    }
  }

  // Sort by priority and limit to 8
  const prioOrdre = { haute: 0, normale: 1, basse: 2 };
  actions.sort((a, b) => prioOrdre[a.priorite] - prioOrdre[b.priorite]);

  return actions.slice(0, 8);
}
