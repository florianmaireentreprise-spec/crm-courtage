"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Archive, ArchiveRestore, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  prescripteurId: string;
  archived: boolean;
  archiveAction: (id: string) => Promise<void | { error?: string }>;
  unarchiveAction: (id: string) => Promise<void | { error?: string }>;
  deleteAction: (id: string) => Promise<void | { error?: string }>;
};

export function PrescripteurArchiveActions({
  prescripteurId,
  archived,
  archiveAction,
  unarchiveAction,
  deleteAction,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleArchive() {
    setError(null);
    startTransition(async () => {
      await archiveAction(prescripteurId);
      router.refresh();
    });
  }

  function handleUnarchive() {
    setError(null);
    startTransition(async () => {
      await unarchiveAction(prescripteurId);
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAction(prescripteurId);
      if (result && "error" in result && result.error) {
        setError(typeof result.error === "string" ? result.error : "Erreur inconnue");
        setConfirmDelete(false);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {archived ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleUnarchive}
          disabled={isPending}
          className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4" />}
          Restaurer
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleArchive}
          disabled={isPending}
          className="gap-1.5"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
          Archiver
        </Button>
      )}

      {confirmDelete ? (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-red-600 font-medium">Supprimer definitivement ?</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
            className="h-7 text-xs"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmer"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setConfirmDelete(false); setError(null); }}
            disabled={isPending}
            className="h-7 text-xs"
          >
            Annuler
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setConfirmDelete(true); setError(null); }}
          disabled={isPending}
          className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          Supprimer
        </Button>
      )}

      {error && (
        <p className="text-xs text-red-600 max-w-md">{error}</p>
      )}
    </div>
  );
}
