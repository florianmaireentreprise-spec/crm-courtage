"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckSquare, MessageSquare, User, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { Email, Client } from "@prisma/client";

type Props = {
  email: Email & { client: Client | null };
};

export function AnalysisPanel({ email }: Props) {
  const [copied, setCopied] = useState(false);

  const actionItems: string[] = email.actionsItems
    ? (() => {
        try { return JSON.parse(email.actionsItems); }
        catch { return []; }
      })()
    : [];

  async function copyReply() {
    if (!email.reponseProposee) return;
    await navigator.clipboard.writeText(email.reponseProposee);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      {/* Summary */}
      {email.resume && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Résumé IA
          </p>
          <p className="text-sm leading-relaxed">{email.resume}</p>
        </div>
      )}

      {/* Client match */}
      {email.client && (
        <>
          <Separator />
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Client identifié :</span>
            <Badge variant="secondary" className="text-xs">{email.client.raisonSociale}</Badge>
          </div>
        </>
      )}

      {/* Action items */}
      {actionItems.length > 0 && (
        <>
          <Separator />
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Tâches créées ({actionItems.length})
              </p>
            </div>
            <ul className="space-y-1">
              {actionItems.map((item, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* Draft reply */}
      {email.reponseProposee && (
        <>
          <Separator />
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Réponse proposée
                </p>
              </div>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={copyReply}>
                {copied ? (
                  <><Check className="h-3 w-3 mr-1" /> Copié</>
                ) : (
                  <><Copy className="h-3 w-3 mr-1" /> Copier</>
                )}
              </Button>
            </div>
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground border-l-2 border-muted pl-3">
              {email.reponseProposee}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
