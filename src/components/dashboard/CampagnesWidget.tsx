"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Megaphone } from "lucide-react";
import type { CampagneSaisonniere } from "@/lib/automation/campagnes";

type Props = {
  campagnes: CampagneSaisonniere[];
};

export function CampagnesWidget({ campagnes }: Props) {
  if (campagnes.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-amber-600" />
          <CardTitle className="text-base text-amber-800">Campagne du mois</CardTitle>
          <Badge className="bg-amber-100 text-amber-700 text-[10px]">{campagnes.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {campagnes.map((c, i) => (
          <div key={i} className="flex items-start gap-3 py-1.5">
            <Calendar className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium">{c.titre}</p>
              <p className="text-xs text-muted-foreground">{c.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
