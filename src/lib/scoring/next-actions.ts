import type { Client, Contrat, Tache, Email, Deal, Dirigeant, OpportuniteCommerciale } from "@prisma/client";
import { TYPES_PRODUITS } from "@/lib/constants";
import { COUVERTURE_360 } from "./couverture360";

export type NextAction = {
  id: string;
  priorite: "haute" | "normale" | "basse";
  titre: string;
  detail: string;
  type: "email" | "tache" | "contrat" | "couverture" | "deal" | "dirigeant" | "relance" | "signal" | "opportunite";
  lien?: string;
};

type ClientData = Pick<Client, "id" | "statut" | "derniereInteraction" | "nbSalaries" | "scoreCouverture" | "temperatureCommerciale" | "produitsDiscutes" | "objectionsConnues" | "besoinsIdentifies" | "dernierSignalDate" | "dernierSignalResume"> & {
  contrats: Pick<Contrat, "id" | "typeProduit" | "statut" | "dateEcheance" | "dateRenouvellement">[];
  taches: Pick<Tache, "id" | "titre" | "statut" | "dateEcheance" | "priorite" | "sourceAuto" | "emailId">[];
  emails: Pick<Email, "id" | "sujet" | "actionRequise" | "actionTraitee" | "urgence" | "analyseStatut" | "direction" | "dateEnvoi">[];
  deals: Pick<Deal, "id" | "titre" | "etape" | "dateMaj" | "produitsCibles">[];
  opportunites?: Pick<OpportuniteCommerciale, "id" | "titre" | "statut" | "confiance" | "typeProduit" | "derniereActivite" | "detecteeLe">[];
  dirigeant: Pick<Dirigeant, "id" | "dateAuditDirigeant" | "mutuellePerso" | "prevoyancePerso"> | null;
};

/**
 * Moteur deterministe de recommandation d'actions.
 * Retourne les actions triees par priorite, max 10.
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

  // 8. Besoin identifie sans deal actif couvrant ce produit
  if (client.besoinsIdentifies) {
    try {
      const besoins: string[] = JSON.parse(client.besoinsIdentifies);
      const dealsActifs = client.deals.filter((d) => !["PERDU"].includes(d.etape));
      const dealProduits = new Set(dealsActifs.flatMap((d) => {
        try { return d.produitsCibles ? JSON.parse(d.produitsCibles) as string[] : []; } catch { return []; }
      }));
      const contratsActifs = new Set(client.contrats.filter((c) => c.statut === "actif").map((c) => c.typeProduit));
      for (const besoin of besoins) {
        if (!dealProduits.has(besoin) && !contratsActifs.has(besoin)) {
          const label = TYPES_PRODUITS[besoin as keyof typeof TYPES_PRODUITS]?.label ?? besoin;
          actions.push({
            id: `besoin-${besoin}`,
            priorite: "haute",
            titre: `Creer deal : ${label}`,
            detail: "Besoin identifie dans les echanges, aucun deal en cours",
            type: "signal",
            lien: "/pipeline",
          });
          break; // Max 1 besoin action
        }
      }
    } catch { /* JSON parse error — skip */ }
  }

  // 9. Objection connue — suggerer contre-argument (skip if active opportunities exist, rule 15 handles that)
  const hasActiveOpps = client.opportunites?.some(o => ["qualifiee", "en_cours"].includes(o.statut));
  if (client.objectionsConnues && !hasActiveOpps) {
    try {
      const objections: string[] = JSON.parse(client.objectionsConnues);
      const CONTRE_ARGUMENTS: Record<string, string> = {
        prix: "Preparer comparatif cout/garanties et ROI",
        timing: "Proposer un rendez-vous de suivi dans 1 mois",
        concurrent: "Mettre en avant la valeur ajoutee du conseil personnalise",
      };
      for (const obj of objections.slice(0, 1)) {
        actions.push({
          id: `objection-${obj}`,
          priorite: "normale",
          titre: `Objection "${obj}" a traiter`,
          detail: CONTRE_ARGUMENTS[obj] ?? "Preparer un argument adapte",
          type: "signal",
          lien: `/clients/${client.id}`,
        });
      }
    } catch { /* JSON parse error — skip */ }
  }

  // 10. Temperature froide + deal actif = urgence
  if (client.temperatureCommerciale === "froid") {
    const dealsActifs = client.deals.filter((d) => !["PERDU", "ONBOARDING", "DEVELOPPEMENT"].includes(d.etape));
    if (dealsActifs.length > 0) {
      actions.push({
        id: "temperature-froide-deal",
        priorite: "haute",
        titre: "Client froid avec deal en cours",
        detail: `${dealsActifs.length} deal(s) actif(s) — relancer pour eviter perte`,
        type: "signal",
        lien: "/pipeline",
      });
    }
  }

  // 11. Signal positif recent = opportunite a saisir
  if (client.temperatureCommerciale === "chaud" && client.dernierSignalDate) {
    const joursDepuisSignal = (now - new Date(client.dernierSignalDate).getTime()) / 86400000;
    if (joursDepuisSignal < 7) {
      const hasTacheActive = client.taches.some(
        (t) => (t.statut === "a_faire" || t.statut === "en_cours") &&
          (t.sourceAuto === "email_reponse_attendue" || t.titre.toLowerCase().includes("relance") || t.titre.toLowerCase().includes("rdv"))
      );
      if (!hasTacheActive) {
        actions.push({
          id: "signal-chaud",
          priorite: "haute",
          titre: "Client chaud — opportunite a saisir",
          detail: client.dernierSignalResume?.slice(0, 100) ?? "Signaux positifs recents detectes",
          type: "signal",
          lien: `/clients/${client.id}`,
        });
      }
    }
  }


  // 12. Opportunite detectee non qualifiee
  if (client.opportunites?.length) {
    const nonQualifiees = client.opportunites.filter(o => o.statut === "detectee" && o.confiance === "haute");
    for (const opp of nonQualifiees.slice(0, 1)) {
      actions.push({
        id: `opp-qualifier-${opp.id}`,
        priorite: "haute",
        titre: `Qualifier : ${opp.titre.slice(0, 50)}`,
        detail: "Opportunite haute confiance detectee automatiquement",
        type: "opportunite",
        lien: `/clients/${client.id}`,
      });
    }

    // 13. Opportunite active sans activite recente (> 14 jours)
    const staleOpps = client.opportunites.filter(o => {
      if (!["qualifiee", "en_cours"].includes(o.statut)) return false;
      const joursInactif = (now - new Date(o.derniereActivite).getTime()) / 86400000;
      return joursInactif > 14;
    });
    for (const opp of staleOpps.slice(0, 1)) {
      const jours = Math.round((now - new Date(opp.derniereActivite).getTime()) / 86400000);
      actions.push({
        id: `opp-relance-${opp.id}`,
        priorite: "normale",
        titre: `Relancer opportunite : ${opp.titre.slice(0, 40)}`,
        detail: `Aucune activite depuis ${jours} jours`,
        type: "opportunite",
        lien: `/clients/${client.id}`,
      });
    }

    // 14. Opportunite tres ancienne (> 30 jours)
    const veryStale = client.opportunites.filter(o => {
      if (!["detectee", "qualifiee", "en_cours"].includes(o.statut)) return false;
      const joursAge = (now - new Date(o.detecteeLe).getTime()) / 86400000;
      return joursAge > 30;
    });
    for (const opp of veryStale.slice(0, 1)) {
      actions.push({
        id: `opp-review-${opp.id}`,
        priorite: "basse",
        titre: `Revoir opportunite : ${opp.titre.slice(0, 40)}`,
        detail: "Opportunite ouverte depuis plus de 30 jours",
        type: "opportunite",
        lien: `/clients/${client.id}`,
      });
    }
  }

  // 15. Objection connue sur opportunite active
  if (client.objectionsConnues && client.opportunites?.length) {
    const activeOpps = client.opportunites.filter(o => ["qualifiee", "en_cours"].includes(o.statut));
    if (activeOpps.length > 0) {
      try {
        const objections = JSON.parse(client.objectionsConnues);
        if (objections.length > 0) {
          actions.push({
            id: "opp-objection",
            priorite: "normale",
            titre: "Objection sur opportunite active",
            detail: `${objections[0]} — preparer contre-argument avant relance`,
            type: "opportunite",
            lien: `/clients/${client.id}`,
          });
        }
      } catch { /* JSON parse error */ }
    }
  }

  // Sort by priority and limit to 10
  const prioOrdre = { haute: 0, normale: 1, basse: 2 };
  actions.sort((a, b) => prioOrdre[a.priorite] - prioOrdre[b.priorite]);

  return actions.slice(0, 10);
}
