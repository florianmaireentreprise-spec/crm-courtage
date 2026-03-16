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
import {
  Play, Pause, Users, Clock, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Mail, Phone, Calendar, Ban, Bot,
  AlertCircle,
} from "lucide-react";
import { inscrireClient, annulerInscription } from "@/app/(app)/sequences/actions";
import type { EtapeSequence } from "@/lib/sequences";

type SequenceInscription = {
  id: string;
  etapeActuelle: number;
  statut: string;
  dateInscription: Date;
  dateProchaineAction: Date | null;
  dateMaj: Date;
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

// ── Helpers ──

function getStepDate(dateInscription: Date, jourOffset: number): Date {
  const d = new Date(dateInscription);
  d.setDate(d.getDate() + jourOffset);
  return d;
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)}j en retard`;
  if (diff === 0) return "aujourd\u2019hui";
  if (diff === 1) return "demain";
  return `dans ${diff}j`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function StepIcon({ etape }: { etape: EtapeSequence }) {
  if (etape.action === "auto_perdu") return <Ban className="h-3 w-3" />;
  if (etape.action === "email_ia") return <Bot className="h-3 w-3" />;
  if (etape.type === "APPEL") return <Phone className="h-3 w-3" />;
  if (etape.type === "RDV") return <Calendar className="h-3 w-3" />;
  return <Mail className="h-3 w-3" />;
}

function getStepStatus(
  stepIndex: number,
  etapeActuelle: number,
  statut: string
): "done" | "current" | "upcoming" | "stopped" {
  if (statut === "terminee") return "done";
  if (statut === "annulee") {
    if (stepIndex < etapeActuelle) return "done";
    if (stepIndex === etapeActuelle) return "stopped";
    return "upcoming";
  }
  // en_cours
  if (stepIndex < etapeActuelle) return "done";
  if (stepIndex === etapeActuelle) return "current";
  return "upcoming";
}

// ── Main Component ──

export function SequencesList({ sequences, clients }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedInscId, setExpandedInscId] = useState<string | null>(null);
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
        const terminees = seq.inscriptions.filter(
          (i) => i.statut === "terminee" || i.statut === "annulee"
        );
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
              {/* Sequence template timeline */}
              <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
                {etapes.map((etape, i) => (
                  <div key={i} className="flex items-center gap-1 flex-shrink-0">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                          etape.action === "auto_perdu"
                            ? "bg-red-100 text-red-600"
                            : "bg-blue-100 text-blue-600"
                        }`}
                      >
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

              {/* Enrollments detail */}
              {isExpanded && (
                <div className="space-y-3">
                  {/* En cours */}
                  {enCours.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        En cours ({enCours.length})
                      </p>
                      <div className="space-y-2">
                        {enCours.map((insc) => {
                          const currentEtape = etapes[insc.etapeActuelle];
                          const isInscExpanded = expandedInscId === insc.id;
                          const isLate =
                            insc.dateProchaineAction &&
                            new Date(insc.dateProchaineAction) < new Date();

                          return (
                            <div
                              key={insc.id}
                              className="border rounded-lg overflow-hidden"
                            >
                              {/* Summary line */}
                              <div
                                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50"
                                onClick={() =>
                                  setExpandedInscId(isInscExpanded ? null : insc.id)
                                }
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <Play className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                  <span className="text-sm font-medium truncate">
                                    {insc.client.raisonSociale}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] flex-shrink-0"
                                  >
                                    {insc.etapeActuelle + 1}/{etapes.length}
                                  </Badge>
                                  {currentEtape && (
                                    <span className="text-xs text-blue-600 truncate hidden sm:inline">
                                      {currentEtape.titre}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {insc.dateProchaineAction && (
                                    <span
                                      className={`text-[10px] flex items-center gap-0.5 ${
                                        isLate
                                          ? "text-red-500 font-medium"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      {isLate ? (
                                        <AlertCircle className="h-2.5 w-2.5" />
                                      ) : (
                                        <Clock className="h-2.5 w-2.5" />
                                      )}
                                      {formatRelativeDate(
                                        new Date(insc.dateProchaineAction)
                                      )}
                                    </span>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-[10px] text-red-500 hover:text-red-600"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAnnuler(insc.id);
                                    }}
                                  >
                                    <Pause className="h-3 w-3 mr-0.5" />
                                    Arreter
                                  </Button>
                                  {isInscExpanded ? (
                                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                </div>
                              </div>

                              {/* Expanded step timeline */}
                              {isInscExpanded && (
                                <div className="px-3 pb-3 pt-1 border-t bg-muted/30">
                                  <div className="space-y-0">
                                    {etapes.map((etape, i) => {
                                      const status = getStepStatus(
                                        i,
                                        insc.etapeActuelle,
                                        insc.statut
                                      );
                                      const stepDate = getStepDate(
                                        new Date(insc.dateInscription),
                                        etape.jour
                                      );

                                      return (
                                        <div key={i} className="flex items-start gap-3 relative">
                                          {/* Vertical line connector */}
                                          {i < etapes.length - 1 && (
                                            <div
                                              className={`absolute left-[9px] top-[22px] w-px h-[calc(100%-6px)] ${
                                                status === "done"
                                                  ? "bg-green-300"
                                                  : status === "current"
                                                    ? "bg-blue-200"
                                                    : "bg-border"
                                              }`}
                                            />
                                          )}

                                          {/* Status icon */}
                                          <div className="flex-shrink-0 mt-1 z-10">
                                            {status === "done" && (
                                              <CheckCircle2 className="h-[18px] w-[18px] text-green-500" />
                                            )}
                                            {status === "current" && (
                                              <div className="h-[18px] w-[18px] rounded-full bg-blue-500 flex items-center justify-center">
                                                <Play className="h-2.5 w-2.5 text-white ml-0.5" />
                                              </div>
                                            )}
                                            {status === "upcoming" && (
                                              <div className="h-[18px] w-[18px] rounded-full border-2 border-muted-foreground/30" />
                                            )}
                                            {status === "stopped" && (
                                              <XCircle className="h-[18px] w-[18px] text-red-400" />
                                            )}
                                          </div>

                                          {/* Step content */}
                                          <div
                                            className={`flex-1 pb-3 min-w-0 ${
                                              status === "upcoming"
                                                ? "opacity-50"
                                                : ""
                                            }`}
                                          >
                                            <div className="flex items-center gap-2">
                                              <span
                                                className={`text-[10px] font-mono ${
                                                  status === "current"
                                                    ? "text-blue-600 font-semibold"
                                                    : "text-muted-foreground"
                                                }`}
                                              >
                                                J{etape.jour}
                                              </span>
                                              <span className="text-muted-foreground">
                                                <StepIcon etape={etape} />
                                              </span>
                                              <span
                                                className={`text-xs ${
                                                  status === "current"
                                                    ? "font-semibold text-foreground"
                                                    : status === "done"
                                                      ? "text-foreground"
                                                      : "text-muted-foreground"
                                                }`}
                                              >
                                                {etape.titre}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                              <span className="text-[10px] text-muted-foreground">
                                                {formatDate(stepDate)}
                                              </span>
                                              {status === "current" && (
                                                <Badge className="text-[9px] h-4 bg-blue-100 text-blue-700 hover:bg-blue-100">
                                                  {formatRelativeDate(stepDate)}
                                                </Badge>
                                              )}
                                              {status === "done" && (
                                                <span className="text-[10px] text-green-600">
                                                  Fait
                                                </span>
                                              )}
                                              {status === "stopped" && (
                                                <span className="text-[10px] text-red-500">
                                                  Arretee ici
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground mt-1 pt-2 border-t">
                                    Inscrit le{" "}
                                    {new Date(insc.dateInscription).toLocaleDateString(
                                      "fr-FR"
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Terminated / Cancelled */}
                  {terminees.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                        Terminees ({terminees.length})
                      </p>
                      {terminees.slice(0, 5).map((insc) => {
                        const isCancelled = insc.statut === "annulee";
                        return (
                          <div
                            key={insc.id}
                            className="flex items-center justify-between py-1.5 text-muted-foreground"
                          >
                            <div className="flex items-center gap-2">
                              {isCancelled ? (
                                <XCircle className="h-3 w-3 text-red-400" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              )}
                              <span className="text-xs">
                                {insc.client.raisonSociale}
                              </span>
                              {isCancelled && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] text-red-400 border-red-200"
                                >
                                  Etape {insc.etapeActuelle + 1}/{etapes.length}{" "}
                                  atteinte
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[10px]">
                              <span>
                                {formatDate(new Date(insc.dateInscription))}
                              </span>
                              <span>—</span>
                              <span>
                                {formatDate(new Date(insc.dateMaj))}
                              </span>
                            </div>
                          </div>
                        );
                      })}
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
