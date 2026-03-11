"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Mail, FileText, Target, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type ActivityItem = {
  type: "email" | "contrat" | "deal" | "tache";
  date: Date;
  title: string;
  detail?: string;
  clientId?: string;
  clientNom?: string;
};

const typeIcons = {
  email: Mail,
  contrat: FileText,
  deal: Target,
  tache: CheckCircle2,
};

const typeColors = {
  email: "#06B6D4",
  contrat: "#8B5CF6",
  deal: "#F59E0B",
  tache: "#3B82F6",
};

const typeLabels = {
  email: "Email",
  contrat: "Contrat",
  deal: "Deal",
  tache: "Tache",
};

export function RecentActivityWidget({ activities }: { activities: ActivityItem[] }) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activite recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune activite recente</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Activite recente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {activities.map((item, i) => {
          const Icon = typeIcons[item.type];
          const color = typeColors[item.type];
          return (
            <div key={i} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: color + "20" }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.clientNom && item.clientId && (
                    <Link href={`/clients/${item.clientId}`}>
                      <Badge variant="secondary" className="text-[10px] cursor-pointer hover:bg-muted">
                        {item.clientNom}
                      </Badge>
                    </Link>
                  )}
                  {item.detail && (
                    <span className="text-[10px] text-muted-foreground">{item.detail}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <Badge variant="outline" className="text-[10px]" style={{ borderColor: color, color }}>
                  {typeLabels[item.type]}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(item.date), "dd MMM HH:mm", { locale: fr })}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
