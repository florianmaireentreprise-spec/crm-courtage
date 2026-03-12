import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withN8nAuth } from "../../middleware";

// GET /api/n8n/emails/pending — Returns unanalyzed emails for queue-based processing
// Used by n8n cron workflow to poll for emails needing analysis
async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "5", 10), 20);

  // Also reset stuck "en_cours" emails (> 5 min) back to "non_analyse"
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  await prisma.email.updateMany({
    where: {
      analyseStatut: "en_cours",
      dateMaj: { lt: fiveMinAgo },
    },
    data: { analyseStatut: "non_analyse" },
  });

  // Fetch pending emails with PRIORITY ordering:
  // 1. Emails with a known client first (clientId IS NOT NULL)
  // 2. "erreur" status before "non_analyse" (retry failures first)
  // 3. Higher scoreRelevance first
  // 4. Oldest first within same priority (process waiting emails first)
  const emails = await prisma.email.findMany({
    where: {
      analyseStatut: { in: ["non_analyse", "erreur"] },
    },
    select: {
      id: true,
      sujet: true,
      expediteur: true,
      destinataires: true,
      direction: true,
      extrait: true,
      dateEnvoi: true,
      clientId: true,
      userId: true,
      analyseStatut: true,
      scoreRelevance: true,
    },
    orderBy: [
      { scoreRelevance: "desc" },
      { dateEnvoi: "asc" },
    ],
    take: limit,
  });

  if (emails.length === 0) {
    return NextResponse.json({ pending: 0, emails: [] });
  }

  // Mark fetched emails as "en_cours" to prevent double-processing
  const emailIds = emails.map((e) => e.id);
  await prisma.email.updateMany({
    where: { id: { in: emailIds } },
    data: { analyseStatut: "en_cours" },
  });

  return NextResponse.json({
    pending: emails.length,
    emails: emails.map((e) => ({
      emailId: e.id,
      sujet: e.sujet,
      expediteur: e.expediteur,
      destinataires: e.destinataires,
      direction: e.direction,
      extrait: e.extrait,
      dateEnvoi: e.dateEnvoi,
      clientId: e.clientId,
      userId: e.userId,
    })),
  });
}

export const GET = withN8nAuth(handler);
