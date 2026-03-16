import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Play, Clock, AlertCircle, ArrowRight } from "lucide-react";
import type { EtapeSequence } from "@/lib/sequences";

type SequenceInscriptionData = {
  id: string;
  etapeActuelle: number;
  statut: string;
  dateInscription: Date;
  dateProchaineAction: Date | null;
  sequence: {
    id: string;
    nom: string;
    etapes: string;
  };
};

function formatRelativeDate(date: Date): { label: string; isLate: boolean } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `${Math.abs(diff)}j en retard`, isLate: true };
  if (diff === 0) return { label: "aujourd\u2019hui", isLate: false };
  if (diff === 1) return { label: "demain", isLate: false };
  return { label: `dans ${diff}j`, isLate: false };
}

export function SequenceCard({ inscriptions }: { inscriptions: SequenceInscriptionData[] }) {
  if (inscriptions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Play className="h-4 w-4 text-blue-500" />
          Sequences actives
          <Badge variant="outline" className="text-[10px] ml-auto">
            {inscriptions.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {inscriptions.map((insc) => {
          let etapes: EtapeSequence[] = [];
          try {
            etapes = JSON.parse(insc.sequence.etapes);
          } catch { /* ignore */ }

          const currentStep = etapes[insc.etapeActuelle];
          const totalSteps = etapes.length;

          const relative = insc.dateProchaineAction
            ? formatRelativeDate(new Date(insc.dateProchaineAction))
            : null;

          return (
            <div key={insc.id} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {insc.sequence.nom}
                </span>
                <Badge variant="outline" className="text-[10px] flex-shrink-0">
                  {insc.etapeActuelle + 1}/{totalSteps}
                </Badge>
              </div>

              {currentStep && (
                <div className="flex items-center gap-1.5">
                  <div className="h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <Play className="h-2 w-2 text-white ml-px" />
                  </div>
                  <span className="text-xs text-foreground truncate">
                    {currentStep.titre}
                  </span>
                </div>
              )}

              {relative && (
                <div className="flex items-center gap-1">
                  {relative.isLate ? (
                    <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                  ) : (
                    <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                  <span
                    className={`text-[11px] ${
                      relative.isLate ? "text-red-500 font-medium" : "text-muted-foreground"
                    }`}
                  >
                    Prochaine action : {relative.label}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        <Link
          href="/sequences"
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 pt-1"
        >
          Voir les sequences
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
