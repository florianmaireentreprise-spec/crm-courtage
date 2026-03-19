"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap, ShoppingCart, TrendingUp, TrendingDown,
  AlertCircle, Target, Radio, RefreshCw, Heart,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { TYPES_PRODUITS } from "@/lib/constants";

type Signal = {
  id: string;
  typeSignal: string;
  valeur: string;
  details: string | null;
  dateSignal: Date;
  client: { id: string; raisonSociale: string };
};

type Opportunite = {
  id: string;
  titre: string;
  typeProduit: string | null;
  statut: string;
  sourceType: string;
  confiance: string;
  derniereActivite: Date;
  client: { id: string; raisonSociale: string };
};

const signalConfig: Record<string, { icon: typeof Zap; color: string; label: string }> = {
  produit_mentionne: { icon: ShoppingCart, color: "#3B82F6", label: "Produit" },
  sentiment_positif: { icon: TrendingUp, color: "#22C55E", label: "Positif" },
  sentiment_negatif: { icon: TrendingDown, color: "#EF4444", label: "Negatif" },
  objection: { icon: AlertCircle, color: "#F97316", label: "Objection" },
  besoin: { icon: Target, color: "#8B5CF6", label: "Besoin" },
  urgence: { icon: Radio, color: "#EF4444", label: "Urgence" },
  deal_update: { icon: RefreshCw, color: "#F59E0B", label: "Deal" },
};

const confianceColors: Record<string, string> = {
  haute: "bg-green-100 text-green-700",
  moyenne: "bg-amber-100 text-amber-700",
  basse: "bg-gray-100 text-gray-600",
};

export function SignauxCommerciaux({
  signaux,
  opportunites,
}: {
  signaux: Signal[];
  opportunites: Opportunite[];
}) {
  const total = signaux.length + opportunites.length;

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Signaux IA recents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucun signal detecte. Les signaux apparaitront lors de l&apos;analyse IA de vos emails.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Signaux IA recents
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {signaux.length} signal{signaux.length !== 1 ? "x" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Signals */}
        {signaux.length > 0 && (
          <div className="space-y-1.5">
            {signaux.slice(0, 6).map((s) => {
              const cfg = signalConfig[s.typeSignal] || signalConfig.besoin;
              const Icon = cfg.icon;
              return (
                <div key={s.id} className="flex items-start gap-2.5 p-1.5 rounded-md hover:bg-muted/50">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: cfg.color + "20" }}
                  >
                    <Icon className="h-3 w-3" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/clients/${s.client.id}`}>
                        <span className="text-xs font-semibold text-foreground hover:text-indigo-600 transition-colors">
                          {s.client.raisonSociale}
                        </span>
                      </Link>
                      <Badge variant="outline" className="text-[9px] h-4" style={{ borderColor: cfg.color, color: cfg.color }}>
                        {cfg.label}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {s.valeur}{s.details ? ` — ${s.details}` : ""}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                    {format(new Date(s.dateSignal), "dd MMM", { locale: fr })}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Opportunities */}
        {opportunites.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Opportunites en cours ({opportunites.length})
            </p>
            <div className="space-y-1.5">
              {opportunites.slice(0, 5).map((o) => {
                const prodConfig = o.typeProduit
                  ? TYPES_PRODUITS[o.typeProduit as keyof typeof TYPES_PRODUITS]
                  : null;
                return (
                  <div key={o.id} className="flex items-center gap-2 text-xs">
                    <Heart className="w-3 h-3 text-pink-500 shrink-0" />
                    <Link
                      href={`/clients/${o.client.id}`}
                      className="font-medium text-foreground hover:text-indigo-600 truncate transition-colors"
                    >
                      {o.client.raisonSociale}
                    </Link>
                    <span className="text-muted-foreground truncate flex-1">{o.titre}</span>
                    {prodConfig && (
                      <Badge variant="outline" className="text-[9px] h-4 shrink-0" style={{ borderColor: prodConfig.color, color: prodConfig.color }}>
                        {prodConfig.label}
                      </Badge>
                    )}
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold ${confianceColors[o.confiance] || confianceColors.basse}`}>
                      {o.confiance}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
