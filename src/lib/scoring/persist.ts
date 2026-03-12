import { prisma } from "@/lib/prisma";
import { calculerScoreProspect } from "./prospect";
import { calculerPotentielCA } from "./potentiel";
import { calculerCouverture360 } from "./couverture360";

const SCORING_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Calcule et persiste les 3 scores sur un client.
 * Idempotent : ne recalcule pas si dernierScoring < 24h (sauf si force=true).
 * Retourne les scores calcules.
 */
export async function persisterScoresClient(
  clientId: string,
  options?: { force?: boolean }
): Promise<{ scoreProspect: number; potentielCA: number; scoreCouverture: number }> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      nbSalaries: true,
      secteurActivite: true,
      sourceAcquisition: true,
      ville: true,
      dernierScoring: true,
      contrats: {
        select: { typeProduit: true, statut: true, dateEcheance: true },
      },
    },
  });

  if (!client) throw new Error(`Client ${clientId} not found`);

  // Cooldown check
  if (
    !options?.force &&
    client.dernierScoring &&
    Date.now() - client.dernierScoring.getTime() < SCORING_COOLDOWN_MS
  ) {
    // Return existing persisted scores (fallback to computed if null)
    const existing = await prisma.client.findUnique({
      where: { id: clientId },
      select: { scoreProspect: true, potentielCA: true, scoreCouverture: true },
    });
    return {
      scoreProspect: existing?.scoreProspect ?? calculerScoreProspect(client, client.contrats),
      potentielCA: existing?.potentielCA ?? calculerPotentielCA(client, client.contrats),
      scoreCouverture: existing?.scoreCouverture ?? calculerCouverture360(client.contrats).score,
    };
  }

  // Calculate
  const scoreProspect = calculerScoreProspect(client, client.contrats);
  const potentielCA = calculerPotentielCA(client, client.contrats);
  const { score: scoreCouverture } = calculerCouverture360(client.contrats);

  // Persist
  await prisma.client.update({
    where: { id: clientId },
    data: {
      scoreProspect,
      potentielCA,
      scoreCouverture,
      dernierScoring: new Date(),
    },
  });

  return { scoreProspect, potentielCA, scoreCouverture };
}

/**
 * Recalcule les scores de tous les clients dont le dernierScoring est null ou > 24h.
 * Utile pour un cron batch (WF01).
 */
export async function persisterScoresBatch(limit = 50): Promise<number> {
  const cutoff = new Date(Date.now() - SCORING_COOLDOWN_MS);

  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { dernierScoring: null },
        { dernierScoring: { lt: cutoff } },
      ],
    },
    select: { id: true },
    take: limit,
    orderBy: { dernierScoring: { sort: "asc", nulls: "first" } },
  });

  let updated = 0;
  for (const c of clients) {
    try {
      await persisterScoresClient(c.id, { force: true });
      updated++;
    } catch (err) {
      console.error(`[scoring batch] Error for client ${c.id}:`, err);
    }
  }

  return updated;
}
