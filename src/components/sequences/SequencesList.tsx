"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Pause, Users, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { inscrireClient, annulerInscription } from "@/app/(app)/sequences/actions";
import type { EtapeSequence } from "@/lib/sequences";

type SequenceInscription = {
  id: string;
  etapeActuelle: number;
  statut: string;
  dateInscription: Date;
  dateProchaineAction: Date | null;
  client: { id: string; raisonSociale: string };
};

type SequenceData = {
  id: string;
  nom: string;
  description: string | null;
  etapes: string;
  active: boolean;
  inscriptions: SequenceInscription[];
};

type Props = {
  sequences: SequenceData[];
  clients: { id: string; raisonSociale: string; statut: string }[];
};

export function SequencesList({ sequences, clients }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleInscrire(sequenceId: string) {
    if (!selectedClient) return;
    setLoading(true);
    await inscrireClient(selectedClient, sequenceId);
    setSelectedClient("");
    setLoading(false);
  }

  async function handleAnnuler(inscriptionId: string) {
    await annulerInscription(inscriptionId);
  }

  return (
    <div className="space-y-4">
      {sequences.map((seq) => {
        const etapes: EtapeSequence[] = JSON.parse(seq.etapes);
        const enCours = seq.inscriptions.filter((i) => i.statut === "en_cours");
        const terminees = seq.inscriptions.filter((i) => i.statut === "terminee");
        const isExpanded = expandedId === seq.id;

        return (
          <Card key={seq.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{seq.nom}</CardTitle>
                    <Badge variant="outline" className="text-[10px]">
                      {etapes.length} etapes
                    </Badge>
                    {enCours.length > 0 && (
                      <Badge className="text-[10px] bg-blue-100 text-blue-700">
                        <Play className="h-2.5 w-2.5 mr-0.5" />
                        {enCours.length} en cours
                      </Badge>
                    )}
                  </div>
                  {seq.description && (
                    <p className="text-sm text-muted-foreground mt-1">{seq.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setExpandedId(isExpanded ? null : seq.id)}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {/* Etapes timeline */}
              <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
                {etapes.map((etape, i) => (
                  <div key={i} className="flex items-center gap-1 flex-shrink-0">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                        etape.action === "auto_perdu"
                          ? "bg-red-100 text-red-600"
                          : "bg-blue-100 text-blue-600"
                      }`}>
                        J{etape.jour}
                      </div>
                      <span className="text-[9px] text-muted-foreground mt-0.5 max-w-[80px] text-center truncate">
                        {etape.titre}
                      </span>
                    </div>
                    {i < etapes.length - 1 && (
                      <div className="w-4 h-px bg-border flex-shrink-0 mt-[-10px]" />
                    )}
                  </div>
                ))}
              </div>

              {/* Inscrire un client */}
              <div className="flex items-center gap-2 mb-3">
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="flex-1 h-8 text-xs">
                    <SelectValue placeholder="Selectionner un client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.raisonSociale}
                        <span className="text-muted-foreground ml-1 text-[10px]">
                          ({c.statut === "prospect" ? "Prospect" : "Client"})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={() => handleInscrire(seq.id)}
                  disabled={!selectedClient || loading}
                >
                  <Users className="h-3.5 w-3.5" />
                  Inscrire
                </Button>
              </div>

              {/* Inscriptions en cours */}
              {isExpanded && (
                <div className="space-y-2">
                  {enCours.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                        En cours ({enCours.length})
                      </p>
                      {enCours.map((insc) => (
                        <div key={insc.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                          <div className="flex items-center gap-2">
                            <Play className="h-3 w-3 text-blue-500" />
                            <span className="text-sm font-medium">{insc.client.raisonSociale}</span>
                            <Badge variant="outline" className="text-[10px]">
                              Etape {insc.etapeActuelle + 1}/{etapes.length}
                            </Badge>
                            {insc.dateProchaineAction && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                Prochaine: {new Date(insc.dateProchaineAction).toLocaleDateString("fr-FR")}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-red-500 hover:text-red-600"
                            onClick={() => handleAnnuler(insc.id)}
                          >
                            <Pause className="h-3 w-3 mr-0.5" />
                            Arreter
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {terminees.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                        Terminees ({terminees.length})
                      </p>
                      {terminees.slice(0, 5).map((insc) => (
                        <div key={insc.id} className="flex items-center gap-2 py-1 text-muted-foreground">
                          {insc.statut === "terminee" ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-400" />
                          )}
                          <span className="text-xs">{insc.client.raisonSociale}</span>
                          <span className="text-[10px]">
                            {new Date(insc.dateInscription).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
