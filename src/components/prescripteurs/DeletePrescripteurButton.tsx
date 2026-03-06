"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useTransition } from "react";

interface DeletePrescripteurButtonProps {
  action: () => Promise<void>;
}

export function DeletePrescripteurButton({ action }: DeletePrescripteurButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm("Supprimer ce prescripteur ? Cette action est irreversible.")) return;
    startTransition(() => action());
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
      className="text-destructive hover:text-destructive"
    >
      <Trash2 className="h-4 w-4 mr-2" />
      {isPending ? "Suppression..." : "Supprimer"}
    </Button>
  );
}
