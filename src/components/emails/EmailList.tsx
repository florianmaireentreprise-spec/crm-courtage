"use client";

import { useState } from "react";
import { EmailCard } from "./EmailCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Email, Client } from "@prisma/client";

type EmailWithClient = Email & { client: Client | null };

type Props = {
  emails: EmailWithClient[];
};

export function EmailList({ emails }: Props) {
  const [filterStatut, setFilterStatut] = useState<string>("all");
  const [filterLu, setFilterLu] = useState<string>("all");

  const filtered = emails.filter((e) => {
    if (filterStatut !== "all" && e.analyseStatut !== filterStatut) return false;
    if (filterLu === "non_lu" && e.lu) return false;
    if (filterLu === "lu" && !e.lu) return false;
    return true;
  });

  const nonLuCount = emails.filter((e) => !e.lu).length;
  const nonAnalyseCount = emails.filter((e) => e.analyseStatut === "non_analyse").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{emails.length} emails</span>
          {nonLuCount > 0 && (
            <span className="text-blue-600 font-medium">· {nonLuCount} non lus</span>
          )}
          {nonAnalyseCount > 0 && (
            <span className="text-orange-500 font-medium">· {nonAnalyseCount} à analyser</span>
          )}
        </div>
        <div className="flex gap-2">
          <Select value={filterStatut} onValueChange={setFilterStatut}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Statut analyse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="non_analyse">Non analysé</SelectItem>
              <SelectItem value="analyse">Analysé</SelectItem>
              <SelectItem value="erreur">Erreur</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterLu} onValueChange={setFilterLu}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Lu / Non lu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="non_lu">Non lus</SelectItem>
              <SelectItem value="lu">Lus</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Aucun email à afficher</p>
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
