import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Zap, Mail, FileText, Shield, Target, UserCheck, Clock,
  ArrowRight, AlertTriangle, CheckCircle2, Lightbulb, Play,
} from "lucide-react";
import type { NextAction } from "@/lib/scoring/next-actions";

const TYPE_ICONS: Record<string, typeof Zap> = {
  email: Mail,
  tache: CheckCircle2,
  contrat: FileText,
  couverture: Shield,
  deal: Target,
  dirigeant: UserCheck,
  relance: Clock,
  signal: Zap,
  opportunite: Lightbulb,
  sequence: Play,
};

const PRIORITE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  haute: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  normale: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  basse: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
};

export function NextActionWidget({ actions }: { actions: NextAction[] }) {
  if (actions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Prochaines actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucune action recommandee pour le moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          Prochaines actions
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {actions.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action) => {
          const Icon = TYPE_ICONS[action.type] || Zap;
          const style = PRIORITE_STYLES[action.priorite] || PRIORITE_STYLES.normale;

          const content = (
            <div
              key={action.id}
              className={`flex items-start gap-3 p-2.5 rounded-lg border ${style.border} ${style.bg} transition-colors hover:opacity-90`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {action.priorite === "haute" ? (
                  <AlertTriangle className={`h-4 w-4 ${style.text}`} />
                ) : (
                  <Icon className={`h-4 w-4 ${style.text}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${style.text} truncate`}>
                  {action.titre}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {action.detail}
                </p>
              </div>
              {action.lien && (
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-1" />
              )}
            </div>
          );

          if (action.lien) {
            return (
              <Link key={action.id} href={action.lien} className="block">
                {content}
              </Link>
            );
          }
          return content;
        })}
      </CardContent>
    </Card>
  );
}
