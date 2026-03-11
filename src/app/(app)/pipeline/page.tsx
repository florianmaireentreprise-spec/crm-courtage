import { prisma } from "@/lib/prisma";
import { getEnvironnement } from "@/lib/environnement";
import { ETAPES_PIPELINE } from "@/lib/constants";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import type { PipelineColumn } from "@/types";

export default async function PipelinePage() {
  const env = await getEnvironnement();
  const deals = await prisma.deal.findMany({
    where: { environnement: env },
    include: { client: true },
    orderBy: { dateMaj: "desc" },
  });

  const columns: PipelineColumn[] = ETAPES_PIPELINE.map((etape) => ({
    id: etape.id,
    label: etape.label,
    color: etape.color,
    description: etape.description,
    deals: deals.filter((d) => d.etape === etape.id),
  }));

  const clients = await prisma.client.findMany({
    where: { environnement: env },
    select: { id: true, raisonSociale: true },
    orderBy: { raisonSociale: "asc" },
  });

  const users = await prisma.user.findMany({
    select: { id: true, prenom: true, nom: true },
  });

  const prescripteurs = await prisma.prescripteur.findMany({
    select: { id: true, prenom: true, nom: true, entreprise: true },
    where: { environnement: env, statut: "actif" },
    orderBy: { nom: "asc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pipeline commercial</h1>
      <KanbanBoard columns={columns} clients={clients} users={users} prescripteurs={prescripteurs} />
    </div>
  );
}
