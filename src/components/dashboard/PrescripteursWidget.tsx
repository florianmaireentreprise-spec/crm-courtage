"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Handshake, AlertTriangle, Heart, TrendingDown } from "lucide-react";
import type { PrescripteurAlerte } from "@/lib/prescripteurs";

type Props = {
  alertes: PrescripteurAlerte[];
};

const iconMap = {
  silencieux: AlertTriangle,
  lead_signe: Heart,
  performance: TrendingDown,
};

const colorMap = {
  silencieux: "text-orange-500",
  lead_signe: "text-green-500",
  performance: "text-red-500",
};

export function PrescripteursWidget({ alertes }: Props) {
  if (alertes.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Handshake className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Prescripteurs — alertes</CardTitle>
          </div>
          <Badge variant="outline">{alertes.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {alertes.slice(0, 5).map((alerte) => {
          const Icon = iconMap[alerte.type];
          const color = colorMap[alerte.type];
          return (
            <Link key={alerte.id} href={`/prescripteurs/${alerte.prescripteurId}`} className="block">
              <div className="flex items-start gap-2 py-1.5 hover:bg-muted/30 rounded px-2 -mx-2">
                <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${color}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{alerte.prescripteurNom}</span>
                    <Badge
                      variant={alerte.priorite === "haute" ? "destructive" : "secondary"}
                      className="text-[10px]"
                    >
                      {alerte.priorite}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{alerte.message}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
