"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckSquare,
  MessageSquare,
  User,
  UserPlus,
  Send,
  Loader2,
  ShoppingBag,
  Package,
  Check,
  AlertCircle,
} from "lucide-react";
import { useState, useTransition } from "react";
import { sendReply, createDealFromEmail, createClientFromEmail } from "@/app/(app)/emails/actions";
import type { Email, Client } from "@prisma/client";

type Props = {
  email: Email & { client: Client | null };
};

const PRODUCT_LABELS: Record<string, string> = {
  SANTE_COLLECTIVE: "Mutuelle collective",
  PREVOYANCE_COLLECTIVE: "Prévoyance collective",
  PREVOYANCE_MADELIN: "Prévoyance Madelin",
  SANTE_MADELIN: "Santé Madelin",
  RCP_PRO: "RC Professionnelle",
  PER: "PER",
  ASSURANCE_VIE: "Assurance vie",
  PROTECTION_JURIDIQUE: "Protection juridique",
};

export function AnalysisPanel({ email }: Props) {
  const [replyText, setReplyText] = useState(email.reponseProposee ?? "");
  const [sendingReply, startSendReply] = useTransition();
  const [replySent, setReplySent] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [creatingDeal, startCreateDeal] = useTransition();
  const [dealCreated, setDealCreated] = useState(false);

  const [creatingClient, startCreateClient] = useTransition();
  const [clientCreated, setClientCreated] = useState<string | null>(null);

  // Parse stored data
  const actionItems: string[] = email.actionsItems
    ? (() => { try { return JSON.parse(email.actionsItems); } catch { return []; } })()
    : [];

  const produitsMentionnes: string[] = email.produitsMentionnes
    ? (() => { try { return JSON.parse(email.produitsMentionnes); } catch { return []; } })()
    : [];

  // Parse AI analysis for sender info
  let expediteurNom = "";
  let expediteurEntreprise = "";
  if (email.analyseIA) {
    try {
      const analysis = JSON.parse(email.analyseIA);
      expediteurNom = analysis.expediteurNom || "";
      expediteurEntreprise = analysis.expediteurEntreprise || "";
    } catch { /* ignore */ }
  }

  function handleSendReply() {
    if (!replyText.trim()) return;
    setReplyError(null);
    startSendReply(async () => {
      const result = await sendReply(email.id, replyText);
      if (result.error) {
        setReplyError(result.error);
      } else {
        setReplySent(true);
      }
    });
  }

  function handleCreateDeal() {
    startCreateDeal(async () => {
      const result = await createDealFromEmail(email.id);
      if (result.success) setDealCreated(true);
    });
  }

  function handleCreateClient() {
    startCreateClient(async () => {
      const result = await createClientFromEmail(email.id);
      if (result.success) {
        setClientCreated(result.clientName ?? "Client créé");
      }
    });
  }

  const hasClient = !!email.client || !!clientCreated;

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

      {/* Products detected */}
      {produitsMentionnes.length > 0 && (
        <>
          <Separator />
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Produits détectés
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {produitsMentionnes.map((p) => (
                <Badge key={p} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  {PRODUCT_LABELS[p] || p}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Client match or create */}
      <Separator />
      <div>
        {email.client ? (
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-green-600" />
            <span className="text-xs text-muted-foreground">Client rattaché :</span>
            <a href={`/clients/${email.client.id}`} className="hover:underline">
              <Badge variant="secondary" className="text-xs cursor-pointer">
                {email.client.raisonSociale}
              </Badge>
            </a>
          </div>
        ) : clientCreated ? (
          <div className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-green-600" />
            <span className="text-xs text-green-600 font-medium">
              Client créé : {clientCreated}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-xs text-muted-foreground">
                Aucun client correspondant
                {expediteurNom && <> — <span className="font-medium">{expediteurNom}</span></>}
                {expediteurEntreprise && <> ({expediteurEntreprise})</>}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={handleCreateClient}
              disabled={creatingClient}
            >
              {creatingClient ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <UserPlus className="h-3 w-3" />
              )}
              Créer fiche client
            </Button>
          </div>
        )}
      </div>

      {/* Action items / tasks */}
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

      {/* Create deal suggestion */}
      {produitsMentionnes.length > 0 && (
        <>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-xs text-muted-foreground">
                Suggérer un deal :
                <span className="font-medium ml-1">
                  {produitsMentionnes.map(p => PRODUCT_LABELS[p] || p).join(", ")}
                </span>
              </span>
            </div>
            {dealCreated ? (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200">
                <Check className="h-3 w-3 mr-1" />
                Deal créé
              </Badge>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50"
                onClick={handleCreateDeal}
                disabled={creatingDeal || !hasClient}
                title={!hasClient ? "Créez d'abord une fiche client" : ""}
              >
                {creatingDeal ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ShoppingBag className="h-3 w-3" />
                )}
                Créer un deal
              </Button>
            )}
          </div>
          {!hasClient && !dealCreated && (
            <p className="text-[11px] text-orange-500 ml-6">
              Créez d&apos;abord une fiche client pour pouvoir créer un deal
            </p>
          )}
        </>
      )}

      {/* Draft reply — editable with send */}
      {(email.reponseProposee || replyText) && (
        <>
          <Separator />
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Réponse suggérée
                </p>
              </div>
            </div>

            {replySent ? (
              <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 border border-green-200">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">Réponse envoyée</span>
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={5}
                  className="text-sm resize-y"
                  placeholder="Modifiez la réponse avant d'envoyer..."
                />
                {replyError && (
                  <div className="flex items-center gap-2 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {replyError}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyText.trim()}
                  >
                    {sendingReply ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Envoyer la réponse
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
