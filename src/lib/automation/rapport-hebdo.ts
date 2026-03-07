import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

// ── Types ──

export type RapportData = {
  semaine: string;
  periode: { debut: string; fin: string };
  prospects: { nouveaux: number; precedent: number; variation: number };
  deals: { avances: number; signes: number; caSignes: number; perdus: number };
  caRecurrent: { actuel: number; variation: number };
  taches: { completees: number; enRetard: number; aFaire: number };
  renouvellements: { prochains15j: number; details: { client: string; produit: string; date: string }[] };
  leadsPrescripteurs: number;
};

// ── Calcul du numero de semaine ISO ──

function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

// ── Generation du rapport ──

export async function genererRapportHebdo(): Promise<RapportData> {
  const now = new Date();
  const debutSemaine = new Date(now);
  debutSemaine.setDate(now.getDate() - 7);
  const debutSemainePrecedente = new Date(now);
  debutSemainePrecedente.setDate(now.getDate() - 14);

  const semaine = getISOWeek(now);

  // Verifier si deja genere cette semaine
  const existing = await prisma.rapportHebdo.findFirst({ where: { semaine } });
  if (existing) {
    return JSON.parse(existing.contenu);
  }

  const [
    nouveauxProspects,
    prospectsPrecedent,
    dealsAvances,
    dealsSignes,
    dealsPerdus,
    caGestion,
    caGestionPrecedent,
    tachesCompletees,
    tachesEnRetard,
    tachesAFaire,
    renouvellements15j,
    leadsPrescripteurs,
  ] = await Promise.all([
    prisma.client.count({
      where: { dateCreation: { gte: debutSemaine }, statut: "prospect" },
    }),
    prisma.client.count({
      where: { dateCreation: { gte: debutSemainePrecedente, lt: debutSemaine }, statut: "prospect" },
    }),
    prisma.deal.count({
      where: { dateMaj: { gte: debutSemaine }, etape: { notIn: ["PERDU", "PROSPECT_IDENTIFIE"] } },
    }),
    prisma.deal.findMany({
      where: { dateSignature: { gte: debutSemaine } },
      select: { commissionsAttendues: true },
    }),
    prisma.deal.count({
      where: { dateMaj: { gte: debutSemaine }, etape: "PERDU" },
    }),
    prisma.commission.aggregate({
      _sum: { montant: true },
      where: { type: "GESTION" },
    }),
    prisma.commission.aggregate({
      _sum: { montant: true },
      where: {
        type: "GESTION",
        dateCreation: { lt: debutSemaine },
      },
    }),
    prisma.tache.count({
      where: { statut: "terminee", dateRealisation: { gte: debutSemaine } },
    }),
    prisma.tache.count({
      where: { statut: { in: ["a_faire", "en_cours"] }, dateEcheance: { lt: now } },
    }),
    prisma.tache.count({
      where: {
        statut: { in: ["a_faire", "en_cours"] },
        dateEcheance: { gte: now, lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.contrat.findMany({
      where: {
        statut: "actif",
        dateEcheance: { gte: now, lte: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) },
      },
      include: { client: { select: { raisonSociale: true } } },
      orderBy: { dateEcheance: "asc" },
    }),
    prisma.client.count({
      where: {
        prescripteurId: { not: null },
        dateCreation: { gte: debutSemaine },
      },
    }),
  ]);

  const caActuel = caGestion._sum.montant ?? 0;
  const caPrecedent = caGestionPrecedent._sum.montant ?? 0;
  const variation = caPrecedent > 0 ? ((caActuel - caPrecedent) / caPrecedent) * 100 : 0;
  const caSignes = dealsSignes.reduce((sum, d) => sum + (d.commissionsAttendues ?? 0), 0);

  const rapport: RapportData = {
    semaine,
    periode: {
      debut: debutSemaine.toISOString().slice(0, 10),
      fin: now.toISOString().slice(0, 10),
    },
    prospects: {
      nouveaux: nouveauxProspects,
      precedent: prospectsPrecedent,
      variation: nouveauxProspects - prospectsPrecedent,
    },
    deals: { avances: dealsAvances, signes: dealsSignes.length, caSignes: Math.round(caSignes), perdus: dealsPerdus },
    caRecurrent: { actuel: Math.round(caActuel), variation: Math.round(variation) },
    taches: { completees: tachesCompletees, enRetard: tachesEnRetard, aFaire: tachesAFaire },
    renouvellements: {
      prochains15j: renouvellements15j.length,
      details: renouvellements15j.map((r) => ({
        client: r.client.raisonSociale,
        produit: r.typeProduit,
        date: r.dateEcheance?.toISOString().slice(0, 10) ?? "",
      })),
    },
    leadsPrescripteurs,
  };

  // Stocker en base
  let resumeIA: string | null = null;
  let actionsIA: string | null = null;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [{
        role: "user",
        content: `Tu es l'assistant IA de GargarineV1, cabinet de courtage en assurances TPE/PME.

Voici les metriques de la semaine ${rapport.semaine} :
- Nouveaux prospects : ${rapport.prospects.nouveaux} (vs ${rapport.prospects.precedent} semaine precedente)
- Deals avances : ${rapport.deals.avances}, signes : ${rapport.deals.signes} (CA: ${rapport.deals.caSignes}€), perdus : ${rapport.deals.perdus}
- CA recurrent annuel : ${rapport.caRecurrent.actuel}€ (${rapport.caRecurrent.variation > 0 ? "+" : ""}${rapport.caRecurrent.variation}%)
- Taches completees : ${rapport.taches.completees}, en retard : ${rapport.taches.enRetard}, a faire cette semaine : ${rapport.taches.aFaire}
- Renouvellements sous 15j : ${rapport.renouvellements.prochains15j}
- Leads prescripteurs : ${rapport.leadsPrescripteurs}

Reponds en JSON avec :
{
  "resume": "Resume de la semaine en 3 lignes max, ton professionnel et encourageant",
  "actions": ["Action prioritaire 1", "Action prioritaire 2", "Action prioritaire 3"]
}`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean);
    resumeIA = parsed.resume ?? null;
    actionsIA = JSON.stringify(parsed.actions ?? []);
  } catch {
    // IA optionnelle, on continue sans
  }

  await prisma.rapportHebdo.create({
    data: {
      semaine,
      contenu: JSON.stringify(rapport),
      resumeIA,
      actionsIA,
    },
  });

  return rapport;
}
