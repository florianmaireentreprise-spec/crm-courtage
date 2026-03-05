"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ObjectifCard } from "./ObjectifCard";
import { ObjectifForm } from "./ObjectifForm";
import type { Objectif } from "@prisma/client";
import type { ForecastResult } from "@/lib/objectifs";

type ObjectifWithProgress = Objectif & {
  valeurActuelle: number;
  forecast: ForecastResult;
};

type Props = {
  objectifs: ObjectifWithProgress[];
  users: { id: string; prenom: string; nom: string }[];
};

export function ObjectifGrid({ objectifs, users }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingObjectif, setEditingObjectif] = useState<Objectif | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {objectifs.length} objectif{objectifs.length !== 1 ? "s" : ""} défini{objectifs.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel objectif
        </Button>
      </div>

      {objectifs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground space-y-3">
          <p className="text-4xl">🎯</p>
          <p className="font-medium">Aucun objectif défini</p>
          <p className="text-sm">Créez votre premier objectif pour suivre votre avancée.</p>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Créer un objectif
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {objectifs.map((obj) => (
            <ObjectifCard
              key={obj.id}
              objectif={obj}
              valeurActuelle={obj.valeurActuelle}
              forecast={obj.forecast}
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
