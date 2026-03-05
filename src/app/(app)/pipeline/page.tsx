import { prisma } from "@/lib/prisma";
import { ETAPES_PIPELINE } from "@/lib/constants";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import type { PipelineColumn } from "@/types";

export default async function PipelinePage() {
  const deals = await prisma.deal.findMany({
    include: { client: true },
    orderBy: { dateMaj: "desc" },
  });

  const columns: PipelineColumn[] = ETAPES_PIPELINE.map((etape) => ({
    id: etape.id,
    label: etape.label,
    color: etape.color,
    deals: deals.filter((d) => d.etape === etape.id),
  }));

  const clients = await prisma.client.findMany({
    select: { id: true, raisonSociale: true },
    orderBy: { raisonSociale: "asc" },
  });

  const users = await prisma.user.findMany({
    select: { id: true, prenom: true, nom: true },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pipeline commercial</h1>
      <KanbanBoard columns={columns} clients={clients} users={users} />
    </div>
  );
}
