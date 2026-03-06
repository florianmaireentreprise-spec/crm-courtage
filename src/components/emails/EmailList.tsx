"use client";

import { useState } from "react";
import { EmailCard } from "./EmailCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Mail, Sparkles, Filter } from "lucide-react";
import type { Email, Client } from "@prisma/client";

type EmailWithClient = Email & { client: Client | null };

type Props = {
  emails: EmailWithClient[];
  stats?: { total: number; clients: number; nonAnalyzed: number };
};

type FilterTab = "all" | "clients" | "important" | "other";

export function EmailList({ emails, stats }: Props) {
  const [activeTab, setActiveTab] = useState<FilterTab>("clients");
  const [filterStatut, setFilterStatut] = useState<string>("all");

  // Separate emails by relevance
  const clientEmails = emails.filter((e) => e.clientId);
  const importantEmails = emails.filter((e) => !e.clientId && isImportant(e));
  const otherEmails = emails.filter((e) => !e.clientId && !isImportant(e));

  const filtered = getFilteredEmails()
    .filter((e) => {
      if (filterStatut !== "all" && e.analyseStatut !== filterStatut) return false;
      return true;
    });

  const tabs: { id: FilterTab; label: string; count: number; icon: React.ReactNode }[] = [
    { id: "clients", label: "Clients", count: clientEmails.length, icon: <Users className="h-3.5 w-3.5" /> },
    { id: "important", label: "Important", count: importantEmails.length, icon: <Sparkles className="h-3.5 w-3.5" /> },
    { id: "all", label: "Tous", count: emails.length, icon: <Mail className="h-3.5 w-3.5" /> },
    { id: "other", label: "Autres", count: otherEmails.length, icon: <Filter className="h-3.5 w-3.5" /> },
  ];

  function getFilteredEmails(): EmailWithClient[] {
    switch (activeTab) {
      case "clients": return clientEmails;
      case "important": return importantEmails;
      case "other": return otherEmails;
      default: return emails;
    }
  }

  const nonAnalyseCount = filtered.filter((e) => e.analyseStatut === "non_analyse").length;
  const nonLuCount = filtered.filter((e) => !e.lu).length;

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      {stats && (
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{stats.total}</span>
            <span className="text-muted-foreground">emails</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-blue-600">{stats.clients}</span>
            <span className="text-muted-foreground">liés à un client</span>
          </div>
          {stats.nonAnalyzed > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
              <Sparkles className="h-4 w-4 text-orange-500" />
              <span className="font-medium text-orange-600">{stats.nonAnalyzed}</span>
              <span className="text-muted-foreground">à analyser</span>
            </div>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
              <Badge
                variant={activeTab === tab.id ? "outline" : "secondary"}
                className="text-[10px] px-1.5 py-0"
              >
                {tab.count}
              </Badge>
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {nonLuCount > 0 && (
            <span className="text-xs text-blue-600 font-medium">{nonLuCount} non lus</span>
          )}
          <Select value={filterStatut} onValueChange={setFilterStatut}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="Statut analyse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="non_analyse">Non analysé</SelectItem>
              <SelectItem value="analyse">Analysé</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="erreur">Erreur</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Contextual hint */}
      {activeTab === "clients" && clientEmails.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Emails automatiquement associés à vos clients par adresse email
        </p>
      )}

      {/* Email list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Aucun email dans cette catégorie</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((email) => (
            <EmailCard key={email.id} email={email} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Check if an email is "important" based on insurance keywords */
function isImportant(email: EmailWithClient): boolean {
  const KEYWORDS = [
    "contrat", "police", "sinistre", "devis", "cotisation", "prime",
    "résiliation", "avenant", "souscription", "adhésion", "garantie",
    "mutuelle", "prévoyance", "santé", "retraite", "assurance",
    "courtage", "indemnisation", "déclaration", "attestation",
    "rcpro", "multirisque", "protection juridique", "madelin",
    "urgent", "important", "signature", "rdv", "rendez-vous",
  ];
  const text = `${email.sujet} ${email.extrait ?? ""}`.toLowerCase();
  return KEYWORDS.some((kw) => text.includes(kw));
}
