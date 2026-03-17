"use client";

import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { markTacheDone, cancelTache } from "@/app/(app)/relances/actions";

export function ClientTaskActions({ tacheId }: { tacheId: string }) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-green-600"
        title="Marquer comme terminée"
        onClick={() => markTacheDone(tacheId)}
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-orange-500"
        title="Annuler cette tâche"
        onClick={() => cancelTache(tacheId)}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
