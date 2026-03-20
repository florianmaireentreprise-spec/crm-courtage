import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { UserManagement } from "@/components/parametres/UserManagement";
import { CommissionSettings } from "@/components/parametres/CommissionSettings";
import { CabinetSettings } from "@/components/parametres/CabinetSettings";
import { FeedbackStatsCard, type FeedbackStats } from "@/components/parametres/FeedbackStatsCard";
import { getSettings, getTauxCommission } from "@/lib/settings";
import { FileBarChart, ChevronRight, Calculator } from "lucide-react";

async function getFeedbackStats(): Promise<FeedbackStats> {
  const [feedbacks, oppByRule] = await Promise.all([
    prisma.feedbackIA.groupBy({
      by: ["type"],
      _count: true,
    }),
    // Opportunity counts grouped by origineSignal + statut (for detection quality)
    prisma.opportuniteCommerciale.groupBy({
      by: ["origineSignal", "statut"],
      _count: true,
    }),
  ]);

  const byType: Record<string, number> = {};
  let total = 0;
  for (const f of feedbacks) {
    byType[f.type] = f._count;
    total += f._count;
  }

  // Build per-rule detection quality: { ruleType: { total, rejected, won, lost } }
  const detectionQuality: Record<string, { total: number; rejected: number; won: number; lost: number }> = {};
  for (const row of oppByRule) {
    const rule = row.origineSignal || "inconnu";
    if (!detectionQuality[rule]) {
      detectionQuality[rule] = { total: 0, rejected: 0, won: 0, lost: 0 };
    }
    detectionQuality[rule].total += row._count;
    if (row.statut === "rejetee") detectionQuality[rule].rejected += row._count;
    if (row.statut === "gagnee") detectionQuality[rule].won += row._count;
    if (row.statut === "perdue") detectionQuality[rule].lost += row._count;
  }

  return {
    total,
    byType,
    opportunityOutcomes: {
      won: byType.opportunity_won ?? 0,
      lost: byType.opportunity_lost ?? 0,
      rejected: byType.opportunity_rejected ?? 0,
    },
    replyStats: {
      sent: byType.reply_sent ?? 0,
      edited: byType.reply_edited ?? 0,
    },
    actionStats: {
      executed: byType.action_executed ?? 0,
      ignored: byType.action_ignored ?? 0,
    },
    detectionQuality,
  };
}

export default async function ParametresPage() {
  const [users, settings, feedbackStats] = await Promise.all([
    prisma.user.findMany({ orderBy: { dateCreation: "asc" } }),
    getSettings(),
    getFeedbackStats(),
  ]);

  const taux = getTauxCommission(settings);

  const cabinet = {
    raisonSociale: settings.raisonSociale,
    formeJuridique: settings.formeJuridique,
    gerants: settings.gerants,
    zone: settings.zone,
    cible: settings.cible,
  };

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Parametres</h1>

      {/* Liens rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/parametres/hypotheses">
          <Card className="hover:border-emerald-300 transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Calculator className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium">Hypotheses potentiel CA</p>
                  <p className="text-xs text-muted-foreground">Table de base des estimations par produit</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/parametres/rapports">
          <Card className="hover:border-blue-300 transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <FileBarChart className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Rapports hebdomadaires</p>
                  <p className="text-xs text-muted-foreground">Historique des rapports auto-generes</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/sequences">
          <Card className="hover:border-blue-300 transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <FileBarChart className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium">Sequences de prospection</p>
                  <p className="text-xs text-muted-foreground">Automatiser les relances clients</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <UserManagement users={users} />

      <CommissionSettings taux={taux} />

      <FeedbackStatsCard stats={feedbackStats} />

      <CabinetSettings cabinet={cabinet} />
    </div>
  );
}
