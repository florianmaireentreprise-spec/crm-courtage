"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, FileText, Target, CheckSquare, Users } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

type ContratEcheance = {
  id: string;
  typeProduit: string;
  dateEcheance: Date | null;
  client: { raisonSociale: string };
  compagnie: { nom: string } | null;
};

type DealEcheance = {
  id: string;
  titre: string;
  etape: string;
  dateClosingPrev: Date | null;
  client: { id: string; raisonSociale: string };
};

type TacheEcheance = {
  id: string;
  titre: string;
  type: string;
  dateEcheance: Date;
  priorite: string;
  client: { id: string; raisonSociale: string } | null;
};

type RelanceEcheance = {
  id: string;
  raisonSociale: string;
  categorieReseau: string | null;
  dateRelanceReseau: Date | null;
};

type TimelineItem = {
  type: "contrat" | "deal" | "tache" | "relance";
  date: Date;
  label: string;
  sublabel: string;
  href?: string;
  daysUntil: number;
};

const typeConfig = {
  contrat: { icon: FileText, color: "#8B5CF6", label: "Contrat" },
  deal: { icon: Target, color: "#F59E0B", label: "Deal" },
  tache: { icon: CheckSquare, color: "#3B82F6", label: "Tache" },
  relance: { icon: Users, color: "#14B8A6", label: "Reseau" },
};

export function CalendrierEcheances({
  contrats,
  deals,
  taches,
  relances,
}: {
  contrats: ContratEcheance[];
  deals: DealEcheance[];
  taches: TacheEcheance[];
  relances: RelanceEcheance[];
}) {
  const now = new Date();

  // Merge all sources into unified timeline
  const items: TimelineItem[] = [];

  for (const c of contrats) {
    if (!c.dateEcheance) continue;
    items.push({
      type: "contrat",
      date: new Date(c.dateEcheance),
      label: `Renouvellement ${c.typeProduit.replace(/_/g, " ").toLowerCase()}`,
      sublabel: `${c.client.raisonSociale}${c.compagnie ? ` · ${c.compagnie.nom}` : ""}`,
      daysUntil: differenceInDays(new Date(c.dateEcheance), now),
    });
  }

  for (const d of deals) {
    if (!d.dateClosingPrev) continue;
    items.push({
      type: "deal",
      date: new Date(d.dateClosingPrev),
      label: d.titre,
      sublabel: `${d.client.raisonSociale} · ${d.etape.replace(/_/g, " ").toLowerCase()}`,
      href: `/clients/${d.client.id}`,
      daysUntil: differenceInDays(new Date(d.dateClosingPrev), now),
    });
  }

  for (const t of taches) {
    items.push({
      type: "tache",
      date: new Date(t.dateEcheance),
      label: t.titre,
      sublabel: t.client?.raisonSociale || t.type.replace(/_/g, " ").toLowerCase(),
      href: t.client ? `/clients/${t.client.id}` : "/relances",
      daysUntil: differenceInDays(new Date(t.dateEcheance), now),
    });
  }

  for (const r of relances) {
    if (!r.dateRelanceReseau) continue;
    items.push({
      type: "relance",
      date: new Date(r.dateRelanceReseau),
      label: `Relance: ${r.raisonSociale}`,
      sublabel: r.categorieReseau?.replace(/_/g, " ") || "reseau",
      href: `/clients/${r.id}`,
      daysUntil: differenceInDays(new Date(r.dateRelanceReseau), now),
    });
  }

  // Sort by date, take first 12
  items.sort((a, b) => a.date.getTime() - b.date.getTime());
  const display = items.slice(0, 12);

  if (display.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Echeances a venir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucune echeance a venir. Les echeances apparaitront avec vos contrats, deals et taches.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          Echeances a venir
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {items.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {display.map((item, i) => {
          const cfg = typeConfig[item.type];
          const Icon = cfg.icon;
          const urgencyColor =
            item.daysUntil <= 3 ? "bg-red-100 text-red-700" :
            item.daysUntil <= 7 ? "bg-orange-100 text-orange-700" :
            item.daysUntil <= 14 ? "bg-amber-100 text-amber-700" :
            "bg-muted text-muted-foreground";

          const content = (
            <div className="flex items-start gap-2.5 p-1.5 rounded-md hover:bg-muted/50 transition-colors">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: cfg.color + "20" }}
              >
                <Icon className="h-3 w-3" style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{item.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{item.sublabel}</p>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${urgencyColor}`}>
                  {item.daysUntil === 0 ? "Aujourd'hui" : `${item.daysUntil}j`}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {format(item.date, "dd MMM", { locale: fr })}
                </span>
              </div>
            </div>
          );

          return item.href ? (
            <Link key={i} href={item.href}>{content}</Link>
          ) : (
            <div key={i}>{content}</div>
          );
        })}
      </CardContent>
    </Card>
  );
}
