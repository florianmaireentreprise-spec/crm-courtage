"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import type { Tache, Client } from "@prisma/client";
import { PRIORITES, TYPES_TACHE } from "@/lib/constants";

type TacheWithClient = Tache & { client: Client | null };

export function TasksWidget({ taches }: { taches: TacheWithClient[] }) {
  if (taches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Tâches du jour
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucune tâche pour aujourd&apos;hui
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Tâches du jour
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {taches.map((tache) => {
          const prioriteConfig = PRIORITES.find((p) => p.id === tache.priorite);
          const typeConfig = TYPES_TACHE.find((t) => t.id === tache.type);
          const isOverdue = isPast(tache.dateEcheance) && !isToday(tache.dateEcheance);

          return (
            <div
              key={tache.id}
              className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50"
            >
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{tache.titre}</p>
                <div className="flex items-center gap-2 mt-1">
                  {tache.client && (
                    <span className="text-xs text-muted-foreground">
                      {tache.client.raisonSociale}
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1 py-0"
                    style={{ borderColor: prioriteConfig?.color }}
                  >
                    {prioriteConfig?.label}
                  </Badge>
                  {typeConfig && (
                    <span className="text-[10px] text-muted-foreground">
                      {typeConfig.label}
                    </span>
                  )}
                  {isOverdue && (
                    <Badge variant="destructive" className="text-[10px] px-1 py-0">
                      En retard
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
