"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { markActionTraitee } from "@/app/(app)/emails/actions";

type EmailItem = {
  id: string;
  sujet: string;
  expediteur: string;
  destinataires: string | null;
  dateEnvoi: Date;
  direction: string;
  extrait: string | null;
  resume: string | null;
  analyseStatut: string | null;
  analyseIA: string | null;
  typeEmail: string | null;
  urgence: string | null;
  sentiment: string | null;
  actionRequise: boolean;
  actionTraitee: boolean;
  reponseProposee: string | null;
  produitsMentionnes: string | null;
  notes: string | null;
  threadId: string;
};

type Props = {
  emails: EmailItem[];
};

type ThreadGroup = {
  threadId: string;
  threadSubject: string;
  emails: EmailItem[];
  lastDate: Date;
  hasIncoming: boolean;
  hasOutgoing: boolean;
  hasUrgent: boolean;
  hasPendingAction: boolean;
};

function groupByThread(emails: EmailItem[]): ThreadGroup[] {
  const threadMap = new Map<string, EmailItem[]>();

  for (const email of emails) {
    // Group by threadId (Gmail thread grouping)
    const key = email.threadId;
    if (!threadMap.has(key)) {
      threadMap.set(key, []);
    }
    threadMap.get(key)!.push(email);
  }

  const groups: ThreadGroup[] = [];
  for (const [threadId, threadEmails] of threadMap) {
    // Sort emails within thread chronologically
    threadEmails.sort(
      (a, b) =>
        new Date(a.dateEnvoi).getTime() - new Date(b.dateEnvoi).getTime()
    );

    const baseSubject = threadEmails[0].sujet
      .replace(/^(Re|Fwd|Tr|RE|FWD|TR):\s*/gi, "")
      .trim();

    groups.push({
      threadId,
      threadSubject: baseSubject,
      emails: threadEmails,
      lastDate: new Date(threadEmails[threadEmails.length - 1].dateEnvoi),
      hasIncoming: threadEmails.some((e) => e.direction === "entrant"),
      hasOutgoing: threadEmails.some((e) => e.direction === "sortant"),
      hasUrgent: threadEmails.some((e) => e.urgence === "haute"),
      hasPendingAction: threadEmails.some((e) => e.actionRequise && !e.actionTraitee),
    });
  }

  // Sort threads by most recent email
  groups.sort((a, b) => b.lastDate.getTime() - a.lastDate.getTime());
  return groups;
}

function EmailContextPanel({ email }: { email: EmailItem }) {
  if (!email.analyseIA || email.analyseStatut !== "analyse") return null;

  let analysis: {
    summary?: string;
    intent?: string;
    urgencyScore?: number;
    priority?: string;
    sentiment?: string;
    replySuggestion?: string;
    productsDetected?: string[];
    actions?: Array<{ type: string; titre: string; priorite: string; _executed?: boolean; _ignored?: boolean }>;
  } = {};

  try {
    analysis = JSON.parse(email.analyseIA);
  } catch {
    return null;
  }

  const urgenceConfig: Record<string, { label: string; class: string }> = {
    haute: { label: "Urgent", class: "bg-red-100 text-red-700 border-red-200" },
    normale: { label: "Normal", class: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    basse: { label: "Basse", class: "bg-green-100 text-green-700 border-green-200" },
  };

  const urg = urgenceConfig[email.urgence ?? ""] ?? urgenceConfig.normale;

  return (
    <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3 text-xs space-y-2">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-amber-600" />
        <span className="font-semibold text-amber-800">Analyse IA</span>
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className={`text-[10px] ${urg.class}`}>
          {urg.label}
        </Badge>
        {analysis.urgencyScore !== undefined && (
          <Badge variant="outline" className="text-[10px]">
            Score: {analysis.urgencyScore}/10
          </Badge>
        )}
        {analysis.intent && (
          <Badge variant="secondary" className="text-[10px]">
            {analysis.intent.replace(/_/g, " ")}
          </Badge>
        )}
        {email.sentiment && (
          <Badge variant="outline" className="text-[10px]">
            {email.sentiment}
          </Badge>
        )}
      </div>

      {/* Summary */}
      {(analysis.summary || email.resume) && (
        <p className="text-muted-foreground italic">
          {analysis.summary || email.resume}
        </p>
      )}

      {/* Products detected */}
      {analysis.productsDetected && analysis.productsDetected.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-muted-foreground">Produits:</span>
          {analysis.productsDetected.map((p, i) => (
            <Badge key={i} variant="secondary" className="text-[10px]">
              {p.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      )}

      {/* Suggested reply */}
      {(analysis.replySuggestion || email.reponseProposee) && (
        <div className="bg-white/60 rounded p-2 border border-amber-100">
          <span className="font-medium text-amber-700 block mb-1">Reponse suggeree:</span>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {analysis.replySuggestion || email.reponseProposee}
          </p>
        </div>
      )}

      {/* Actions */}
      {analysis.actions && analysis.actions.filter(a => !a._executed && !a._ignored).length > 0 && (
        <div>
          <span className="font-medium text-amber-700">Actions suggerees:</span>
          <ul className="mt-1 space-y-0.5">
            {analysis.actions.filter(a => !a._executed && !a._ignored).map((action, i) => (
              <li key={i} className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                {action.titre}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MarkTraiteeButton({ emailId, actionTraitee }: { emailId: string; actionTraitee: boolean }) {
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(actionTraitee);

  if (done) return null;

  async function handleClick() {
    setProcessing(true);
    await markActionTraitee(emailId);
    setDone(true);
    setProcessing(false);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-[10px] h-5 px-1.5 gap-0.5 text-green-700 border-green-200 hover:bg-green-50"
      onClick={handleClick}
      disabled={processing}
    >
      {processing ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      ) : (
        <CheckCircle2 className="h-2.5 w-2.5" />
      )}
      Traite
    </Button>
  );
}

export function ClientEmailHistory({ emails }: Props) {
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(
    new Set()
  );
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  if (emails.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-4">
        Aucun email lie a ce client
      </p>
    );
  }

  const threads = groupByThread(emails);

  function toggleThread(threadId: string) {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  }

  const selectedEmail = selectedEmailId
    ? emails.find((e) => e.id === selectedEmailId) ?? null
    : null;

  return (
    <div className="flex gap-4">
      {/* Thread list */}
      <div className={`space-y-2 ${selectedEmail ? "flex-1" : "w-full"}`}>
        {threads.map((thread) => {
          const isExpanded = expandedThreads.has(thread.threadId);
          const msgCount = thread.emails.length;

          return (
            <Card key={thread.threadId}>
              <CardContent className="py-3">
                <button
                  onClick={() => toggleThread(thread.threadId)}
                  className="w-full text-left flex items-start justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {thread.threadSubject}
                        </p>
                        {msgCount > 1 && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5"
                          >
                            {msgCount} msgs
                          </Badge>
                        )}
                        {thread.hasUrgent && (
                          <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
                        )}
                        {thread.hasPendingAction && (
                          <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-600 border-orange-200">
                            Action
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {thread.hasIncoming && (
                          <ArrowDownLeft className="h-3 w-3 text-green-500" />
                        )}
                        {thread.hasOutgoing && (
                          <ArrowUpRight className="h-3 w-3 text-blue-500" />
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {format(thread.lastDate, "dd MMM yyyy", { locale: fr })}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-3 space-y-1.5">
                    {thread.emails.map((email) => {
                      const isOutgoing = email.direction === "sortant";
                      const isSelected = selectedEmailId === email.id;

                      return (
                        <div key={email.id} className="space-y-1">
                          {/* Bubble-style message */}
                          <div
                            className={`relative py-2 px-3 rounded-xl text-sm cursor-pointer transition-colors ${
                              isOutgoing
                                ? "bg-blue-50 ml-8 rounded-br-sm border border-blue-100"
                                : "bg-gray-50 mr-8 rounded-bl-sm border border-gray-100"
                            } ${isSelected ? "ring-2 ring-blue-400" : "hover:shadow-sm"}`}
                            onClick={() =>
                              setSelectedEmailId(
                                isSelected ? null : email.id
                              )
                            }
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                {isOutgoing ? (
                                  <ArrowUpRight className="h-3 w-3 text-blue-500" />
                                ) : (
                                  <ArrowDownLeft className="h-3 w-3 text-green-500" />
                                )}
                                <span className="text-xs font-medium">
                                  {isOutgoing ? "Vous" : email.expediteur}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {email.urgence === "haute" && (
                                  <AlertTriangle className="h-2.5 w-2.5 text-red-500" />
                                )}
                                {email.actionRequise && !email.actionTraitee && (
                                  <MarkTraiteeButton emailId={email.id} actionTraitee={email.actionTraitee} />
                                )}
                                <span className="text-[10px] text-muted-foreground">
                                  {format(
                                    new Date(email.dateEnvoi),
                                    "dd MMM HH:mm",
                                    { locale: fr }
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* AI resume (inline) */}
                            {email.resume && (
                              <p className="text-xs text-blue-600 mt-1 italic flex items-start gap-1">
                                <Sparkles className="h-3 w-3 flex-shrink-0 mt-0.5 text-amber-500" />
                                {email.resume}
                              </p>
                            )}

                            {email.extrait && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                                {email.extrait}
                              </p>
                            )}

                            {email.notes && (
                              <div className="flex items-start gap-1 mt-1">
                                <MessageSquare className="h-3 w-3 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-yellow-700">
                                  {email.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Email Context Panel (right side) */}
      {selectedEmail && (
        <div className="w-80 flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Detail email
            </h4>
            <button
              onClick={() => setSelectedEmailId(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* AI Context Panel */}
          <EmailContextPanel email={selectedEmail} />

          {/* Original email content */}
          {selectedEmail.extrait && (
            <div className="bg-muted/30 rounded-lg p-3 text-xs">
              <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Email original
              </p>
              <div className="text-muted-foreground whitespace-pre-wrap max-h-64 overflow-y-auto">
                {selectedEmail.extrait}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
