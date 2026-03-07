import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileBarChart, TrendingUp, TrendingDown, Users, Target, Clock, AlertTriangle } from "lucide-react";
import type { RapportData } from "@/lib/rapport-hebdo";

export const dynamic = "force-dynamic";

export default async function RapportsPage() {
  let rapports: { id: string; semaine: string; contenu: string; resumeIA: string | null; actionsIA: string | null; dateGeneration: Date }[] = [];
  try {
    rapports = await prisma.rapportHebdo.findMany({
      orderBy: { dateGeneration: "desc" },
      take: 12,
    });
  } catch (err) {
    console.error("Erreur chargement rapports:", err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rapports hebdomadaires</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generes automatiquement chaque lundi a 8h
        </p>
      </div>

      {rapports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileBarChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Aucun rapport genere pour le moment.</p>
            <p className="text-xs mt-1">Le premier rapport sera genere lundi prochain a 8h.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rapports.map((r) => {
            const data: RapportData = JSON.parse(r.contenu);
            const actions: string[] = r.actionsIA ? JSON.parse(r.actionsIA) : [];

            return (
              <Card key={r.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileBarChart className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">Semaine {data.semaine}</CardTitle>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {data.periode.debut} → {data.periode.fin}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Resume IA */}
                  {r.resumeIA && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-sm leading-relaxed">{r.resumeIA}</p>
                    </div>
                  )}

                  {/* KPIs grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="flex items-center gap-2 p-2 rounded border">
                      <Users className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-lg font-bold">{data.prospects.nouveaux}</p>
                        <p className="text-[10px] text-muted-foreground">Nouveaux prospects</p>
                      </div>
                      {data.prospects.variation !== 0 && (
                        <Badge
                          variant={data.prospects.variation > 0 ? "default" : "destructive"}
                          className="text-[10px] ml-auto"
                        >
                          {data.prospects.variation > 0 ? (
                            <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                          ) : (
                            <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                          )}
                          {data.prospects.variation > 0 ? "+" : ""}{data.prospects.variation}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded border">
                      <Target className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-lg font-bold">{data.deals.signes}</p>
                        <p className="text-[10px] text-muted-foreground">Deals signes</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded border">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <div>
                        <p className="text-lg font-bold">{data.taches.enRetard}</p>
                        <p className="text-[10px] text-muted-foreground">Taches en retard</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded border">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <div>
                        <p className="text-lg font-bold">{data.renouvellements.prochains15j}</p>
                        <p className="text-[10px] text-muted-foreground">Renouvellements 15j</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions prioritaires IA */}
                  {actions.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                        Top 3 actions prioritaires (IA)
                      </p>
                      <ol className="space-y-1">
                        {actions.map((action, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="text-blue-500 font-bold text-xs mt-0.5">{i + 1}.</span>
                            {action}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
