import { prisma } from "@/lib/prisma";
import { ETAPES_PIPELINE } from "@/lib/constants";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import type { PipelineColumn } from "@/types";

export default async function PipelinePage() {
  const [deals, clients, users, prescripteurs] = await Promise.all([
    prisma.deal.findMany({
      include: {
        client: {
          include: { dirigeant: true },
        },
        prescripteur: true,
      },
      orderBy: { dateMaj: "desc" },
    }),
    prisma.client.findMany({
      select: { id: true, raisonSociale: true },
      orderBy: { raisonSociale: "asc" },
    }),
    prisma.user.findMany({
      select: { id: true, prenom: true, nom: true },
    }),
    prisma.prescripteur.findMany({
      select: { id: true, prenom: true, nom: true, entreprise: true },
      where: { statut: "actif" },
      orderBy: { nom: "asc" },
    }),
  ]);

  const columns: PipelineColumn[] = ETAPES_PIPELINE.map((etape) => ({
    id: etape.id,
    label: etape.label,
    color: etape.color,
    description: etape.description,
    deals: deals.filter((d) => d.etape === etape.id),
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pipeline commercial</h1>
      <KanbanBoard columns={columns} clients={clients} users={users} prescripteurs={prescripteurs} />
    </div>
  );
}
