"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Rocket } from "lucide-react";
import { ObjectifCard } from "./ObjectifCard";
import { ObjectifForm } from "./ObjectifForm";
import { chargerObjectifsDefaut } from "@/app/(app)/objectifs/actions";
import type { Objectif } from "@prisma/client";
import type { ForecastResult } from "@/lib/objectifs";

type ObjectifWithProgress = Objectif & {
  valeurActuelle: number;
  forecast: ForecastResult;
  projectedPace: number;
};

type Props = {
  objectifs: ObjectifWithProgress[];
  users: { id: string; prenom: string; nom: string }[];
};

export function ObjectifGrid({ objectifs, users }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingObjectif, setEditingObjectif] = useState<Objectif | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loadResult, setLoadResult] = useState<string | null>(null);

  function handleChargerDefaut() {
    startTransition(async () => {
      const result = await chargerObjectifsDefaut();
      setLoadResult(result.message);
      setTimeout(() => setLoadResult(null), 5000);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {objectifs.length} objectif{objectifs.length !== 1 ? "s" : ""} défini{objectifs.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleChargerDefaut}
            disabled={isPending}
          >
            <Rocket className="h-4 w-4 mr-2" />
            {isPending ? "Chargement..." : "Charger objectifs business plan"}
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvel objectif
          </Button>
        </div>
      </div>

      {loadResult && (
        <div className="rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
          {loadResult}
        </div>
      )}

      {objectifs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground space-y-3">
          <p className="text-4xl">🎯</p>
          <p className="font-medium">Aucun objectif défini</p>
          <p className="text-sm">Créez votre premier objectif ou chargez le business plan.</p>
          <div className="flex items-center justify-center gap-2">
            <Button size="sm" variant="outline" onClick={handleChargerDefaut} disabled={isPending}>
              <Rocket className="h-4 w-4 mr-2" />
              {isPending ? "Chargement..." : "Charger business plan"}
            </Button>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un objectif
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {objectifs.map((obj) => (
            <ObjectifCard
              key={obj.id}
              objectif={obj}
              valeurActuelle={obj.valeurActuelle}
              forecast={obj.forecast}
              projectedPace={obj.projectedPace}
              onEdit={(o) => setEditingObjectif(o)}
            />
          ))}
        </div>
      )}

      {(showForm || editingObjectif) && (
        <ObjectifForm
          open={showForm || !!editingObjectif}
          onClose={() => {
            setShowForm(false);
            setEditingObjectif(null);
          }}
          editingObjectif={editingObjectif}
          users={users}
        />
      )}
    </div>
  );
}
