import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContratForm } from "@/components/contrats/ContratForm";
import { updateContrat } from "../../actions";
import { getEnvironnement } from "@/lib/environnement";

export default async function ModifierContratPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const env = await getEnvironnement();

  const [contrat, clients, compagnies] = await Promise.all([
    prisma.contrat.findUnique({ where: { id } }),
    prisma.client.findMany({ where: { environnement: env }, select: { id: true, raisonSociale: true }, orderBy: { raisonSociale: "asc" } }),
    prisma.compagnie.findMany({ where: { environnement: env }, select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
  ]);

  if (!contrat) notFound();

  const action = updateContrat.bind(null, id);

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Modifier le contrat</h1>
      <ContratForm contrat={contrat} clients={clients} compagnies={compagnies} action={action} />
    </div>
  );
}
