"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowUpRight,
  ArrowDownLeft,
  User,
  CheckCircle2,
  Loader2,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { markActionTraitee } from "@/app/(app)/emails/actions";
import type { Email, Client } from "@prisma/client";

type EmailWithClient = Email & { client: Client | null };

export function UrgentEmailsList({ emails }: { emails: EmailWithClient[] }) {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  async function handleMarkTraitee(emailId: string) {
    setProcessingIds((prev) => new Set(prev).add(emailId));
    await markActionTraitee(emailId);
    setHiddenIds((prev) => new Set(prev).add(emailId));
    setProcessingIds((prev) => {
      const next = new Set(prev);
      next.delete(emailId);
      return next;
    });
  }

  const visibleEmails = emails.filter((e) => !hiddenIds.has(e.id));

  if (visibleEmails.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500" />
        <p className="font-medium">Tous les emails urgents sont traites</p>
        <p className="text-sm mt-1">
          <Link href="/emails" className="text-blue-600 hover:underline">
            Retour a la boite de reception
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {visibleEmails.map((email) => {
        const isSortant = email.direction === "sortant";
        const isProcessing = processingIds.has(email.id);

        // Parse AI analysis
        let resume = email.resume;
        let intent = "";
        let urgencyScore: number | null = null;
        if (email.analyseIA) {
          try {
            const analysis = JSON.parse(email.analyseIA);
            resume = resume || analysis.summary;
            intent = analysis.intent || "";
            urgencyScore = analysis.urgencyScore ?? null;
          } catch { /* ignore */ }
        }

        const clientLink = email.client
          ? `/clients/${email.client.id}`
          : null;

        return (
          <Card key={email.id} className="hover:bg-muted/30 transition-colors">
            <CardContent className="py-3">
              <div className="flex items-start gap-3">
                {/* Direction icon */}
                <div className="mt-1 flex-shrink-0">
                  {isSortant ? (
                    <ArrowUpRight className="h-4 w-4 text-blue-500" />
                  ) : (
                    <ArrowDownLeft className="h-4 w-4 text-green-500" />
                  )}
                </div>

                {/* Main content — clickable to client page */}
                <div className="flex-1 min-w-0">
                  {clientLink ? (
                    <Link href={clientLink} className="block group">
                      <p className="text-sm font-medium truncate group-hover:text-blue-600 transition-colors">
                        {email.sujet}
                      </p>
                    </Link>
                  ) : (
                    <p className="text-sm font-medium truncate">{email.sujet}</p>
                  )}

                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground truncate">
                      {email.expediteur}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(email.dateEnvoi), "dd MMM HH:mm", { locale: fr })}
                    </span>
                    {email.urgence === "haute" && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Urgent
                      </Badge>
                    )}
                    {urgencyScore !== null && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Score: {urgencyScore}/10
                      </Badge>
                    )}
                    {intent && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {intent.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </div>

                  {/* AI Summary */}
                  {resume && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic flex items-start gap-1">
                      <Sparkles className="h-3 w-3 flex-shrink-0 mt-0.5 text-amber-500" />
                      {resume}
                    </p>
                  )}
                </div>

                {/* Right side: client badge + action */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {email.client ? (
                    <Link href={`/clients/${email.client.id}`}>
                      <Badge variant="secondary" className="text-[10px] cursor-pointer hover:bg-muted gap-0.5">
                        <User className="h-2.5 w-2.5" />
                        {email.client.raisonSociale}
                      </Badge>
                    </Link>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-yellow-50 text-yellow-700 border-yellow-200">
                      Non rattache
                    </Badge>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-6 px-2 gap-1 text-green-700 border-green-200 hover:bg-green-50"
                    onClick={() => handleMarkTraitee(email.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                    Traite
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
