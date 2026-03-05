"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">Une erreur est survenue</h2>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        {error.message || "Quelque chose s'est mal passé. Veuillez réessayer."}
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
