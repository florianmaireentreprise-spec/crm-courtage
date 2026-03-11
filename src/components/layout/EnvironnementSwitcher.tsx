"use client";

import { useTransition } from "react";
import { switchEnvironnement } from "@/app/(app)/actions";
import type { Environnement } from "@/lib/environnement";

type Props = {
  current: Environnement;
};

export function EnvironnementSwitcher({ current }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleSwitch(env: Environnement) {
    if (env === current) return;
    startTransition(() => {
      switchEnvironnement(env);
    });
  }

  return (
    <div className="flex items-center rounded-lg bg-muted p-0.5 text-xs">
      <button
        onClick={() => handleSwitch("DEMO")}
        disabled={isPending}
        className={`px-3 py-1.5 rounded-md font-medium transition-all ${
          current === "DEMO"
            ? "bg-amber-500 text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Demo
      </button>
      <button
        onClick={() => handleSwitch("PRODUCTION")}
        disabled={isPending}
        className={`px-3 py-1.5 rounded-md font-medium transition-all ${
          current === "PRODUCTION"
            ? "bg-emerald-600 text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Production
      </button>
    </div>
  );
}
