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
  Mail,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  typeEmail: string | null;
  notes: string | null;
};

type Props = {
  emails: EmailItem[];
};

type ThreadGroup = {
  threadSubject: string;
  emails: EmailItem[];
  lastDate: Date;
  hasIncoming: boolean;
  hasOutgoing: boolean;
};

function groupByThread(emails: EmailItem[]): ThreadGroup[] {
  const threadMap = new Map<string, EmailItem[]>();

  for (const email of emails) {
    // Group by subject (strip Re: / Fwd: prefixes)
    const baseSubject = email.sujet
      .replace(/^(Re|Fwd|Tr|RE|FWD|TR):\s*/gi, "")
      .trim();
    const key = baseSubject.toLowerCase();

    if (!threadMap.has(key)) {
      threadMap.set(key, []);
    }
    threadMap.get(key)!.push(email);
  }

  const groups: ThreadGroup[] = [];
  for (const [, emails] of threadMap) {
    // Sort emails within thread chronologically
    emails.sort(
      (a, b) =>
        new Date(a.dateEnvoi).getTime() - new Date(b.dateEnvoi).getTime()
    );

    groups.push({
      threadSubject: emails[0].sujet.replace(/^(Re|Fwd|Tr|RE|FWD|TR):\s*/gi, "").trim(),
      emails,
      lastDate: new Date(emails[emails.length - 1].dateEnvoi),
      hasIncoming: emails.some((e) => e.direction === "entrant"),
      hasOutgoing: emails.some((e) => e.direction === "sortant"),
    });
  }

  // Sort threads by most recent email
  groups.sort((a, b) => b.lastDate.getTime() - a.lastDate.getTime());
  return groups;
}

export function ClientEmailHistory({ emails }: Props) {
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(
    new Set()
  );

  if (emails.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-4">
        Aucun email lie a ce client
      </p>
    );
  }

  const threads = groupByThread(emails);

  function toggleThread(subject: string) {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(subject)) {
        next.delete(subject);
      } else {
        next.add(subject);
      }
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {threads.map((thread) => {
        const isExpanded = expandedThreads.has(thread.threadSubject);
        const msgCount = thread.emails.length;

        return (
          <Card key={thread.threadSubject}>
            <CardContent className="py-3">
              <button
                onClick={() => toggleThread(thread.threadSubject)}
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
                <div className="mt-3 ml-5 space-y-2 border-l-2 border-muted pl-3">
                  {thread.emails.map((email) => (
                    <div
                      key={email.id}
                      className={`py-2 px-3 rounded-lg text-sm ${
                        email.direction === "sortant"
                          ? "bg-blue-50 ml-4"
                          : "bg-gray-50 mr-4"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {email.direction === "sortant" ? (
                            <ArrowUpRight className="h-3 w-3 text-blue-500" />
                          ) : (
                            <ArrowDownLeft className="h-3 w-3 text-green-500" />
                          )}
                          <span className="text-xs font-medium">
                            {email.direction === "sortant"
                              ? "Envoye"
                              : email.expediteur}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {format(
                            new Date(email.dateEnvoi),
                            "dd MMM HH:mm",
                            { locale: fr }
                          )}
                        </span>
                      </div>
                      {email.extrait && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                          {email.extrait}
                        </p>
                      )}
                      {email.resume && (
                        <p className="text-xs text-blue-600 mt-1 italic">
                          {email.resume}
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
