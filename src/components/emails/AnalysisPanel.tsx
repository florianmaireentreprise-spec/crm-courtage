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
  Play,
  X,
  AlertTriangle,
  ArrowRight,
  Zap,
  Save,
  FileText,
  Briefcase,
  Users,
  RefreshCw,
  StickyNote,
  EyeOff,
} from "lucide-react";
import { useState, useTransition } from "react";
import {
  sendReply,
  createDealFromEmail,
  createClientFromEmail,
  createContactFromEmail,
  saveDraft,
  sendDraft,
  executeEmailAction,
  ignoreEmailAction,
  closeTaskFromEmail,
  regenerateReply,
  ignorerEmail,
  ajouterNoteEmail,
} from "@/app/(app)/emails/actions";
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

const ACTION_TYPE_LABELS: Record<string, { label: string; class: string }> = {
  tache: { label: "Tâche", class: "bg-blue-50 text-blue-700 border-blue-200" },
  relance: { label: "Relance", class: "bg-purple-50 text-purple-700 border-purple-200" },
  deal: { label: "Deal", class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  enrichissement: { label: "Info", class: "bg-amber-50 text-amber-700 border-amber-200" },
  alerte: { label: "Alerte", class: "bg-red-50 text-red-700 border-red-200" },
};

type ParsedAction = {
  type: string;
  titre: string;
  priorite: string;
  details: string | null;
  _executed?: boolean;
  _ignored?: boolean;
};

type ParsedTacheFermerDetail = {
  id: string;
  raison: string;
  motsClesTache: string[];
};

export function AnalysisPanel({ email }: Props) {
  const [replyText, setReplyText] = useState(email.reponseProposee ?? "");
  const [sendingReply, startSendReply] = useTransition();
  const [replySent, setReplySent] = useState(email.draftStatut === "envoye");
  const [replyError, setReplyError] = useState<string | null>(null);

  // Draft states
  const [savingDraft, startSaveDraft] = useTransition();
  const [sendingDraft, startSendDraft] = useTransition();
  const [draftSaved, setDraftSaved] = useState(!!email.gmailDraftId);
  const [draftError, setDraftError] = useState<string | null>(null);

  // Regeneration states
  const [regenerating, startRegenerate] = useTransition();
  const [regenInstructions, setRegenInstructions] = useState("");

  // Note states
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, startSaveNote] = useTransition();
  const [noteSaved, setNoteSaved] = useState(false);

  const [creatingDeal, startCreateDeal] = useTransition();
  const [dealCreated, setDealCreated] = useState(false);

  const [creatingClient, startCreateClient] = useTransition();
  const [clientCreated, setClientCreated] = useState<string | null>(null);

  // Contact type creation
  const [creatingContact, setCreatingContact] = useState<string | null>(null);
  const [contactCreated, setContactCreated] = useState<{ name: string; type: string } | null>(null);

  const [executingAction, setExecutingAction] = useState<number | null>(null);
  const [actionStates, setActionStates] = useState<Record<number, "executed" | "ignored">>({});
  const [closingTask, setClosingTask] = useState<string | null>(null);
  const [closedTasks, setClosedTasks] = useState<Set<string>>(new Set());

  // Parse stored data
  const produitsMentionnes: string[] = email.produitsMentionnes
    ? (() => { try { return JSON.parse(email.produitsMentionnes); } catch { return []; } })()
    : [];

  // Parse AI analysis
  let expediteurNom = "";
  let expediteurEntreprise = "";
  let actions: ParsedAction[] = [];
  let tachesAFermerDetails: ParsedTacheFermerDetail[] = [];
  let clientMatch: { found: boolean; clientName: string | null; confidence: string } | null = null;

  if (email.analyseIA) {
    try {
      const analysis = JSON.parse(email.analyseIA);
      expediteurNom = analysis.expediteurNom || "";
      expediteurEntreprise = analysis.expediteurEntreprise || "";
      actions = Array.isArray(analysis.actions) ? analysis.actions : [];
      tachesAFermerDetails = Array.isArray(analysis.tachesAFermerDetails) ? analysis.tachesAFermerDetails : [];
      if (analysis.clientMatch) clientMatch = analysis.clientMatch;
    } catch { /* ignore */ }
  }

  // Legacy actionItems fallback
  const legacyActionItems: string[] = email.actionsItems
    ? (() => { try { return JSON.parse(email.actionsItems); } catch { return []; } })()
    : [];

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

  async function handleCreateContact(type: "prospect" | "client" | "prescripteur") {
    setCreatingContact(type);
    const result = await createContactFromEmail(email.id, type);
    if (result.success) {
      setContactCreated({ name: result.contactName ?? "Contact créé", type: result.contactType ?? type });
    }
    setCreatingContact(null);
  }

  function handleSaveDraft() {
    if (!replyText.trim()) return;
    setDraftError(null);
    startSaveDraft(async () => {
      const result = await saveDraft(email.id, replyText);
      if (result.error) {
        setDraftError(result.error);
      } else {
        setDraftSaved(true);
      }
    });
  }

  function handleSendDraft() {
    startSendDraft(async () => {
      const result = await sendDraft(email.id);
      if (result.error) {
        setDraftError(result.error);
      } else {
        setReplySent(true);
      }
    });
  }

  async function handleExecuteAction(index: number) {
    setExecutingAction(index);
    const result = await executeEmailAction(email.id, index);
    if (result.success) {
      setActionStates(prev => ({ ...prev, [index]: "executed" }));
    }
    setExecutingAction(null);
  }

  async function handleIgnoreAction(index: number) {
    setExecutingAction(index);
    const result = await ignoreEmailAction(email.id, index);
    if (result.success) {
      setActionStates(prev => ({ ...prev, [index]: "ignored" }));
    }
    setExecutingAction(null);
  }

  async function handleCloseTask(taskId: string) {
    setClosingTask(taskId);
    const result = await closeTaskFromEmail(taskId);
    if (result.success) {
      setClosedTasks(prev => new Set([...prev, taskId]));
    }
    setClosingTask(null);
  }

  const hasClient = !!email.client || !!clientCreated;

  // Count pending actions
  const pendingActions = actions.filter((a, i) => {
    const state = actionStates[i] ?? (a._executed ? "executed" : a._ignored ? "ignored" : null);
    return !state;
  });

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
            {clientMatch?.confidence && (
              <span className="text-[10px] text-muted-foreground">
                (confiance: {clientMatch.confidence})
              </span>
            )}
          </div>
        ) : contactCreated ? (
          <div className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-green-600" />
            <span className="text-xs text-green-600 font-medium">
              {contactCreated.type === "prescripteur" ? "Prescripteur" : "Client"} créé : {contactCreated.name}
            </span>
          </div>
        ) : clientCreated ? (
          <div className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-green-600" />
            <span className="text-xs text-green-600 font-medium">
              Client créé : {clientCreated}
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <UserPlus className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-xs text-muted-foreground">
                Aucun contact correspondant
                {expediteurNom && <> — <span className="font-medium">{expediteurNom}</span></>}
                {expediteurEntreprise && <> ({expediteurEntreprise})</>}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={`h-7 px-3 text-xs gap-1.5 ${email.typeEmail === "prospect" ? "bg-purple-50 text-purple-700 border-purple-300" : "text-purple-600 border-purple-200 hover:bg-purple-50"}`}
                onClick={() => handleCreateContact("prospect")}
                disabled={!!creatingContact}
              >
                {creatingContact === "prospect" ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                Prospect
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`h-7 px-3 text-xs gap-1.5 ${email.typeEmail === "client" ? "bg-blue-50 text-blue-700 border-blue-300" : "text-blue-600 border-blue-200 hover:bg-blue-50"}`}
                onClick={() => handleCreateContact("client")}
                disabled={!!creatingContact}
              >
                {creatingContact === "client" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Briefcase className="h-3 w-3" />}
                Client
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`h-7 px-3 text-xs gap-1.5 ${email.typeEmail === "prescripteur" ? "bg-amber-50 text-amber-700 border-amber-300" : "text-amber-600 border-amber-200 hover:bg-amber-50"}`}
                onClick={() => handleCreateContact("prescripteur")}
                disabled={!!creatingContact}
              >
                {creatingContact === "prescripteur" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Users className="h-3 w-3" />}
                Prescripteur
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Structured actions (v3) */}
      {actions.length > 0 && (
        <>
          <Separator />
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Actions IA ({actions.length})
              </p>
              {pendingActions.length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-600 border-orange-200">
                  {pendingActions.length} en attente
                </Badge>
              )}
            </div>
            <ul className="space-y-2">
              {actions.map((action, i) => {
                const state = actionStates[i] ?? (action._executed ? "executed" : action._ignored ? "ignored" : null);
                const typeInfo = ACTION_TYPE_LABELS[action.type] ?? ACTION_TYPE_LABELS.tache;
                const isLoading = executingAction === i;

                return (
                  <li key={i} className={`flex items-start gap-2 p-2 rounded-md border ${
                    state === "executed" ? "bg-green-50/50 border-green-200" :
                    state === "ignored" ? "bg-muted/50 border-muted opacity-60" :
                    "bg-background border-border"
                  }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeInfo.class}`}>
                          {typeInfo.label}
                        </Badge>
                        {action.priorite === "haute" && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-50 text-red-700 border-red-200">
                            <AlertTriangle className="h-2 w-2 mr-0.5" />
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium">{action.titre}</p>
                      {action.details && (
                        <p className="text-xs text-muted-foreground mt-0.5">{action.details}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {state === "executed" ? (
                        <Badge variant="outline" className="text-[10px] bg-green-50 text-green-600 border-green-200">
                          <Check className="h-2.5 w-2.5 mr-0.5" />
                          Fait
                        </Badge>
                      ) : state === "ignored" ? (
                        <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
                          Ignoré
                        </Badge>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => handleExecuteAction(i)}
                            disabled={isLoading}
                          >
                            {isLoading ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Play className="h-2.5 w-2.5 mr-0.5" />}
                            Exécuter
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-red-600"
                            onClick={() => handleIgnoreAction(i)}
                            disabled={isLoading}
                          >
                            <X className="h-2.5 w-2.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      {/* Legacy action items (fallback if no structured actions) */}
      {actions.length === 0 && legacyActionItems.length > 0 && (
        <>
          <Separator />
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Tâches créées ({legacyActionItems.length})
              </p>
            </div>
            <ul className="space-y-1">
              {legacyActionItems.map((item, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* Tasks to close */}
      {tachesAFermerDetails.length > 0 && (
        <>
          <Separator />
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Tâches à fermer
              </p>
            </div>
            <ul className="space-y-1.5">
              {tachesAFermerDetails.map((t) => {
                const isClosed = closedTasks.has(t.id);
                return (
                  <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground">{t.raison}</span>
                    </div>
                    {isClosed ? (
                      <Badge variant="outline" className="text-[10px] bg-green-50 text-green-600 border-green-200">
                        <Check className="h-2.5 w-2.5 mr-0.5" />
                        Fermée
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-orange-600 border-orange-200 hover:bg-orange-50"
                        onClick={() => handleCloseTask(t.id)}
                        disabled={closingTask === t.id}
                      >
                        {closingTask === t.id ? (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : (
                          <CheckSquare className="h-2.5 w-2.5 mr-0.5" />
                        )}
                        Fermer
                      </Button>
                    )}
                  </li>
                );
              })}
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

      {/* Draft reply — draft-aware with save/send */}
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
                {draftSaved && !replySent && (
                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200">
                    <FileText className="h-2.5 w-2.5 mr-0.5" />
                    Brouillon Gmail
                  </Badge>
                )}
              </div>
            </div>

            {/* Regenerate section */}
            {!replySent && (
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={regenInstructions}
                  onChange={(e) => setRegenInstructions(e.target.value)}
                  placeholder="Instructions pour l'IA (optionnel)..."
                  className="flex-1 text-xs px-2 py-1.5 border rounded-md bg-background"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50"
                  onClick={() => {
                    startRegenerate(async () => {
                      const result = await regenerateReply(email.id, regenInstructions || undefined);
                      if (result.draftReply) {
                        setReplyText(result.draftReply);
                        setDraftSaved(false);
                        setRegenInstructions("");
                      }
                    });
                  }}
                  disabled={regenerating}
                >
                  {regenerating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {regenerating ? "Génération..." : "Regénérer"}
                </Button>
              </div>
            )}

            {replySent ? (
              <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 border border-green-200">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">Réponse envoyée</span>
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => {
                    setReplyText(e.target.value);
                    if (draftSaved) setDraftSaved(false);
                  }}
                  rows={5}
                  className="text-sm resize-y"
                  placeholder="Modifiez la réponse avant d'envoyer..."
                />
                {(replyError || draftError) && (
                  <div className="flex items-center gap-2 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {replyError || draftError}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={handleSaveDraft}
                    disabled={savingDraft || !replyText.trim()}
                  >
                    {savingDraft ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    {draftSaved ? "Mettre à jour" : "Sauvegarder brouillon"}
                  </Button>
                  {draftSaved ? (
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={handleSendDraft}
                      disabled={sendingDraft}
                    >
                      {sendingDraft ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Envoyer
                    </Button>
                  ) : (
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
                      Envoyer directement
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
