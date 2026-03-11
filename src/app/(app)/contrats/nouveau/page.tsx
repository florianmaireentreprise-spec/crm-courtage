import { prisma } from "@/lib/prisma";
import { ContratForm } from "@/components/contrats/ContratForm";
import { createContrat } from "../actions";
import { getEnvironnement } from "@/lib/environnement";

export default async function NouveauContratPage() {
  const env = await getEnvironnement();

  const [clients, compagnies] = await Promise.all([
    prisma.client.findMany({ where: { environnement: env }, select: { id: true, raisonSociale: true }, orderBy: { raisonSociale: "asc" } }),
    prisma.compagnie.findMany({ where: { environnement: env }, select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
  ]);

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Nouveau contrat</h1>
      <ContratForm clients={clients} compagnies={compagnies} action={async (formData) => { "use server"; await createContrat(formData); }} />
    </div>
  );
}
