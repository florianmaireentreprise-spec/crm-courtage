import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Thermometer, ShoppingBag, AlertCircle, Target, Clock } from "lucide-react";
import { TYPES_PRODUITS } from "@/lib/constants";

type CommercialMemoryProps = {
  temperatureCommerciale: string | null;
  produitsDiscutes: string | null;
  objectionsConnues: string | null;
  besoinsIdentifies: string | null;
  dernierSignalDate: Date | null;
  dernierSignalResume: string | null;
  nbSignaux: number | null;
};

const TEMPERATURE_STYLES: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  chaud: { label: "Chaud", color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500" },
  tiede: { label: "Tiede", color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" },
  froid: { label: "Froid", color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500" },
};

function safeParse(json: string | null): string[] {
  if (!json) return [];
  try { return JSON.parse(json) as string[]; } catch { return []; }
}

function formatRelativeDate(date: Date | null): string {
  if (!date) return "";
  const jours = Math.round((Date.now() - new Date(date).getTime()) / 86400000);
  if (jours === 0) return "Aujourd'hui";
  if (jours === 1) return "Hier";
  if (jours < 7) return `Il y a ${jours} jours`;
  if (jours < 30) return `Il y a ${Math.round(jours / 7)} semaine(s)`;
  return `Il y a ${Math.round(jours / 30)} mois`;
}

export function CommercialMemoryCard(props: CommercialMemoryProps) {
  const {
    temperatureCommerciale,
    produitsDiscutes,
    objectionsConnues,
    besoinsIdentifies,
    dernierSignalDate,
    dernierSignalResume,
    nbSignaux,
  } = props;

  // Hide card if no data at all
  const hasData = temperatureCommerciale || produitsDiscutes || objectionsConnues ||
    besoinsIdentifies || dernierSignalDate || (nbSignaux && nbSignaux > 0);
  if (!hasData) return null;

  const produits = safeParse(produitsDiscutes);
  const objections = safeParse(objectionsConnues);
  const besoins = safeParse(besoinsIdentifies);
  const tempStyle = TEMPERATURE_STYLES[temperatureCommerciale ?? ""] ?? null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Thermometer className="h-4 w-4 text-orange-500" />
          Memoire commerciale
          {nbSignaux && nbSignaux > 0 ? (
            <Badge variant="secondary" className="text-[10px] ml-auto">
              {nbSignaux} signal{nbSignaux > 1 ? "x" : ""}
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Temperature */}
        {tempStyle && (
          <div className={`flex items-center gap-2 p-2 rounded-lg ${tempStyle.bg}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${tempStyle.dot}`} />
            <span className={`text-sm font-medium ${tempStyle.color}`}>
              Temperature : {tempStyle.label}
            </span>
          </div>
        )}

        {/* Produits discutes */}
        {produits.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Produits discutes</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {produits.map((p) => {
                const info = TYPES_PRODUITS[p as keyof typeof TYPES_PRODUITS];
                return (
                  <Badge
                    key={p}
                    variant="outline"
                    className="text-[10px]"
                    style={info ? { borderColor: info.color, color: info.color } : undefined}
                  >
                    {info?.label ?? p}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Besoins identifies */}
        {besoins.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Target className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs text-muted-foreground font-medium">Besoins identifies</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {besoins.map((b) => {
                const info = TYPES_PRODUITS[b as keyof typeof TYPES_PRODUITS];
                return (
                  <Badge key={b} variant="outline" className="text-[10px] border-green-300 text-green-700">
                    {info?.label ?? b}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Objections */}
        {objections.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
              <span className="text-xs text-muted-foreground font-medium">Objections connues</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {objections.map((o) => (
                <Badge key={o} variant="outline" className="text-[10px] border-red-300 text-red-600">
                  {o.charAt(0).toUpperCase() + o.slice(1)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Dernier signal */}
        {dernierSignalDate && (
          <div className="flex items-start gap-1.5 pt-1 border-t">
            <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <div>
              <span className="text-xs text-muted-foreground">
                {formatRelativeDate(dernierSignalDate)}
              </span>
              {dernierSignalResume && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {dernierSignalResume}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
