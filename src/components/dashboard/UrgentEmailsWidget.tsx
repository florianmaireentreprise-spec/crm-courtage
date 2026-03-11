"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Mail, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type UrgentEmail = {
  id: string;
  sujet: string;
  expediteur: string;
  direction: string;
  urgence: string | null;
  scoreRelevance: number | null;
  dateEnvoi: Date;
  resume: string | null;
  actionTraitee: boolean;
  client: { id: string; raisonSociale: string } | null;
};

export function UrgentEmailsWidget({ emails }: { emails: UrgentEmail[] }) {
  if (emails.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Emails urgents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucun email urgent
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Emails urgents
          </CardTitle>
          <Badge variant="destructive" className="text-[10px]">
            {emails.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {emails.map((email) => (
          <Link key={email.id} href="/emails" className="block">
            <div className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50">
              <div className="mt-0.5">
                {email.direction === "sortant" ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-blue-500" />
                ) : (
                  <ArrowDownLeft className="h-3.5 w-3.5 text-green-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{email.sujet}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground truncate">
                    {email.expediteur}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(email.dateEnvoi), "dd MMM", { locale: fr })}
                  </span>
                </div>
                {email.resume && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 italic">
                    {email.resume}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {email.client && (
                  <Badge variant="secondary" className="text-[10px]">
                    {email.client.raisonSociale}
                  </Badge>
                )}
                {!email.actionTraitee && (
                  <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-600 border-orange-200">
                    A traiter
                  </Badge>
                )}
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
