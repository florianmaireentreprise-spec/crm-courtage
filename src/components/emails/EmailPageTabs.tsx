"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Zap,
  UserPlus,
  Sparkles,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Briefcase,
} from "lucide-react";
import { EmailCard } from "./EmailCard";
import { EmailDetailSheet } from "./EmailDetailSheet";
import {
  syncEmails,
  reanalyzeUnprocessed,
  batchProcessAllPending,
} from "@/app/(app)/emails/actions";
import type { Email, Client } from "@prisma/client";

type EmailWithClient = Email & { client: Client | null };

type Props = {
  emails: EmailWithClient[];
  pendingCount: number;
  unknownCount: number;
};

export function EmailPageTabs({ emails, pendingCount, unknownCount }: Props) {
  const [selectedEmail, setSelectedEmail] = useState<EmailWithClient | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);

  // Filters for Inbox tab
  const [filterType, setFilterType] = useState<string>("all");
  const [filterUrgence, setFilterUrgence] = useState<string>("all");
  const [filterDirection, setFilterDirection] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");

  // Inbox filtered emails
  const inboxFiltered = emails.filter((e) => {
    if (filterType !== "all" && e.typeEmail !== filterType) return false;
    if (filterUrgence !== "all" && e.urgence !== filterUrgence) return false;
    if (filterDirection !== "all" && e.direction !== filterDirection) return false;
    if (filterClient === "linked" && !e.clientId) return false;
    if (filterClient === "unlinked" && e.clientId) return false;
    return true;
  });

  // Commerciaux: client, prospect, prescripteur
  const commercialEmails = emails.filter(
    (e) => e.typeEmail && ["client", "prospect", "prescripteur"].includes(e.typeEmail)
  );

  // Actions IA: pending actions
  const actionEmails = emails.filter((e) => e.actionRequise && !e.actionTraitee);

  // Nouveaux contacts: analyzed, not linked, not spam/newsletter
  const unknownEmails = emails.filter(
    (e) => !e.clientId && e.typeEmail && !["newsletter", "spam", "autre"].includes(e.typeEmail) && e.analyseStatut === "analyse"
  );

  const nonAnalyzedCount = emails.filter(
    (e) => e.analyseStatut === "non_analyse" || e.analyseStatut === "erreur"
  ).length;

  // Stats
  const totalEmails = emails.length;
  const clientEmails = emails.filter((e) => e.clientId).length;
  const entrants = emails.filter((e) => e.direction === "entrant").length;
  const sortants = emails.filter((e) => e.direction === "sortant").length;
  const autoAnalyzed = emails.filter((e) => e.analyseStatut === "analyse").length;

  function handleEmailClick(email: EmailWithClient) {
    setSelectedEmail(email);
    setSheetOpen(true);
  }

  async function handleSync() {
    setSyncing(true);
    await syncEmails();
    setSyncing(false);
  }

  async function handleReanalyze() {
    setReanalyzing(true);
    await reanalyzeUnprocessed();
    setReanalyzing(false);
  }

  async function handleBatchProcess() {
    setBatchProcessing(true);
    await batchProcessAllPending();
    setBatchProcessing(false);
  }

  return (
    <>
      {/* Stats bar */}
      <div className="flex flex-wrap gap-3 text-sm">
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{totalEmails}</span>
          <span className="text-muted-foreground">emails</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
          <Users className="h-4 w-4 text-blue-500" />
          <span className="font-medium text-blue-600">{clientEmails}</span>
          <span className="text-muted-foreground">clients</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
          <ArrowDownLeft className="h-4 w-4 text-green-500" />
          <span className="font-medium">{entrants}</span>
          <ArrowUpRight className="h-4 w-4 text-blue-500 ml-1" />
          <span className="font-medium">{sortants}</span>
        </div>
        {autoAnalyzed > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
            <Zap className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-600">{autoAnalyzed}</span>
            <span className="text-muted-foreground">analyses</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSync} disabled={syncing}>
          {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
          Synchroniser
        </Button>
        {nonAnalyzedCount > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={handleReanalyze} disabled={reanalyzing}>
            {reanalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Analyser tout ({nonAnalyzedCount})
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inbox" className="gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Inbox
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">{totalEmails}</Badge>
          </TabsTrigger>
          <TabsTrigger value="commerciaux" className="gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            Commerciaux
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1 bg-blue-100 text-blue-600">
              {commercialEmails.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Actions IA
            {pendingCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1 bg-orange-100 text-orange-600">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5">
            <UserPlus className="h-3.5 w-3.5" />
            Nouveaux contacts
            {unknownCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1 bg-green-100 text-green-600">
                {unknownCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Inbox Tab */}
        <TabsContent value="inbox" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="assureur">Assureur</SelectItem>
                <SelectItem value="prescripteur">Prescripteur</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterUrgence} onValueChange={setFilterUrgence}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Urgence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="haute">Haute</SelectItem>
                <SelectItem value="normale">Normale</SelectItem>
                <SelectItem value="basse">Basse</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDirection} onValueChange={setFilterDirection}>
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="entrant">Recus</SelectItem>
                <SelectItem value="sortant">Envoyes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="linked">Lies</SelectItem>
                <SelectItem value="unlinked">Non lies</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {inboxFiltered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Aucun email dans cette categorie</p>
            </div>
          ) : (
            <div className="space-y-2">
              {inboxFiltered.map((email) => (
                <EmailCard key={email.id} email={email} onClick={() => handleEmailClick(email)} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Commerciaux Tab */}
        <TabsContent value="commerciaux" className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Emails de clients, prospects et prescripteurs
          </p>

          {commercialEmails.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Aucun email commercial</p>
            </div>
          ) : (
            <div className="space-y-2">
              {commercialEmails.map((email) => (
                <EmailCard key={email.id} email={email} onClick={() => handleEmailClick(email)} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Actions IA Tab */}
        <TabsContent value="actions" className="space-y-4">
          {actionEmails.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Actions suggerees par l&apos;IA en attente de validation
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50"
                onClick={handleBatchProcess}
                disabled={batchProcessing}
              >
                {batchProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                Tout traiter ({actionEmails.length})
              </Button>
            </div>
          )}

          {actionEmails.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Aucune action en attente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {actionEmails.map((email) => (
                <EmailCard key={email.id} email={email} onClick={() => handleEmailClick(email)} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Nouveaux contacts Tab */}
        <TabsContent value="contacts" className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Emails d&apos;expediteurs inconnus — creez une fiche client pour les convertir en prospects
          </p>

          {unknownEmails.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Aucun nouveau contact</p>
            </div>
          ) : (
            <div className="space-y-2">
              {unknownEmails.map((email) => (
                <EmailCard key={email.id} email={email} onClick={() => handleEmailClick(email)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Sheet */}
      <EmailDetailSheet
        email={selectedEmail}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
