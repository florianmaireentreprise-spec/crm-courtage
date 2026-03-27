"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowUpRight,
  ArrowDownLeft,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AnalysisPanel } from "./AnalysisPanel";
import type { EmailWithClient } from "./EmailPageTabs";

type Props = {
  email: EmailWithClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const typeConfig: Record<string, { label: string; class: string }> = {
  client: { label: "Client", class: "bg-blue-100 text-blue-700 border-blue-200" },
  prospect: { label: "Prospect", class: "bg-purple-100 text-purple-700 border-purple-200" },
  assureur: { label: "Assureur", class: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  prescripteur: { label: "Prescripteur", class: "bg-amber-100 text-amber-700 border-amber-200" },
  newsletter: { label: "Newsletter", class: "bg-gray-100 text-gray-500" },
  spam: { label: "Spam", class: "bg-gray-100 text-gray-400" },
  autre: { label: "Autre", class: "bg-gray-100 text-gray-600" },
};

const urgenceConfig: Record<string, { label: string; class: string }> = {
  haute: { label: "Urgent", class: "bg-red-100 text-red-700 border-red-200" },
  normale: { label: "Normal", class: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  basse: { label: "Basse", class: "bg-green-100 text-green-700 border-green-200" },
};

const sentimentIcons: Record<string, string> = {
  positif: "+",
  neutre: "=",
  negatif: "-",
};

export function EmailDetailSheet({ email, open, onOpenChange }: Props) {
  if (!email) return null;

  const isSortant = email.direction === "sortant";
  const emailType = typeConfig[email.typeEmail ?? ""] ?? typeConfig.autre;
  const emailUrgence = urgenceConfig[email.urgence ?? ""] ?? urgenceConfig.normale;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left text-base font-semibold leading-tight">
            {email.sujet}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Header info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {isSortant ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-blue-500" />
              ) : (
                <ArrowDownLeft className="h-3.5 w-3.5 text-green-500" />
              )}
              <Badge variant="outline" className={`text-[10px] ${emailType.class}`}>
                {emailType.label}
              </Badge>
              <Badge variant="outline" className={`text-[10px] ${emailUrgence.class}`}>
                {emailUrgence.label}
              </Badge>
              {email.sentiment && (
                <span className="text-xs text-muted-foreground">
                  Sentiment: {sentimentIcons[email.sentiment] ?? "="} {email.sentiment}
                </span>
              )}
            </div>

            <div className="text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">De : </span>
                <span className="font-medium">{email.expediteur}</span>
              </p>
              <p>
                <span className="text-muted-foreground">A : </span>
                <span>{email.destinataires.replace(/[[\]"]/g, "")}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(email.dateEnvoi), "EEEE dd MMMM yyyy 'a' HH:mm", { locale: fr })}
              </p>
            </div>

            {/* Client linked */}
            {email.client && (
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs text-muted-foreground">Lie a :</span>
                <a href={`/clients/${email.client.id}`} className="hover:underline">
                  <Badge variant="secondary" className="text-xs cursor-pointer">
                    {email.client.raisonSociale}
                  </Badge>
                </a>
              </div>
            )}

            {/* New contact badge */}
            {!email.clientId && email.typeEmail && !["newsletter", "spam", "autre"].includes(email.typeEmail) && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                Nouveau contact
              </Badge>
            )}
          </div>

          <Separator />

          {/* AI Analysis Panel — shown FIRST for quick reading */}
          {email.analyseStatut === "analyse" && (
            <AnalysisPanel email={email} />
          )}

          {email.analyseStatut === "non_analyse" && (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">Cet email n&apos;a pas encore ete analyse par l&apos;IA</p>
            </div>
          )}

          {email.analyseStatut === "erreur" && (
            <div className="text-center py-6 text-red-500">
              <p className="text-sm">Erreur lors de l&apos;analyse IA</p>
            </div>
          )}

          <Separator />

          {/* Original email body — below AI analysis */}
          {email.extrait && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Email original
              </p>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-3 max-h-64 overflow-y-auto">
                {email.extrait}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
