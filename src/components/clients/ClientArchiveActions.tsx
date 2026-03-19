"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Archive, ArchiveRestore, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  clientId: string;
  clientName: string;
  archived: boolean;
  archiveAction: (id: string) => Promise<void | { error?: string }>;
  unarchiveAction: (id: string) => Promise<void | { error?: string }>;
  deleteAction: (id: string) => Promise<void | { error?: string }>;
  forceDeleteAction: (id: string) => Promise<void | { error?: string }>;
};

export function ClientArchiveActions({
  clientId,
  clientName,
  archived,
  archiveAction,
  unarchiveAction,
  deleteAction,
  forceDeleteAction,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showForceDelete, setShowForceDelete] = useState(false);
  const [forceConfirmText, setForceConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleArchive() {
    setError(null);
    startTransition(async () => {
      await archiveAction(clientId);
      router.refresh();
    });
  }

  function handleUnarchive() {
    setError(null);
    startTransition(async () => {
      await unarchiveAction(clientId);
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAction(clientId);
      if (result && "error" in result && result.error) {
        setError(typeof result.error === "string" ? result.error : "Erreur inconnue");
        setConfirmDelete(false);
      }
    });
  }

  function handleForceDelete() {
    setError(null);
    startTransition(async () => {
      const result = await forceDeleteAction(clientId);
      if (result && "error" in result && result.error) {
        setError(typeof result.error === "string" ? result.error : "Erreur inconnue");
      }
    });
  }

  function resetAll() {
    setConfirmDelete(false);
    setShowForceDelete(false);
    setForceConfirmText("");
    setError(null);
  }

  const forceConfirmMatch = forceConfirmText.trim().toLowerCase() === clientName.trim().toLowerCase();

  // Force-delete panel: type client name to confirm
  if (showForceDelete) {
    return (
      <div className="space-y-3">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Suppression definitive</p>
              <p className="text-xs text-red-700 mt-0.5">
                Toutes les donnees liees seront supprimees : contrats, deals, documents, opportunites, dirigeant, signaux, preconisations, inscriptions.
              </p>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xs text-red-700 mb-1">
              Tapez <span className="font-bold">{clientName}</span> pour confirmer :
            </p>
            <Input
              value={forceConfirmText}
              onChange={(e) => setForceConfirmText(e.target.value)}
              placeholder={clientName}
              className="text-sm h-8 border-red-300 focus-visible:ring-red-400"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleForceDelete}
              disabled={!forceConfirmMatch || isPending}
              className="h-7 text-xs"
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Supprimer definitivement"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetAll}
              disabled={isPending}
              className="h-7 text-xs"
            >
              Annuler
            </Button>
          </div>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
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
              onClick={resetAll}
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
      </div>

      {error && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-red-600 max-w-md">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForceDelete(true)}
            className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 shrink-0"
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Forcer la suppression
          </Button>
        </div>
      )}
    </div>
  );
}
