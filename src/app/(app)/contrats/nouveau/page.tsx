import { prisma } from "@/lib/prisma";
import { ContratForm } from "@/components/contrats/ContratForm";
import { createContrat } from "../actions";

export default async function NouveauContratPage() {
  const [clients, compagnies] = await Promise.all([
    prisma.client.findMany({ select: { id: true, raisonSociale: true }, orderBy: { raisonSociale: "asc" } }),
    prisma.compagnie.findMany({ select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
  ]);

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Nouveau contrat</h1>
      <ContratForm clients={clients} compagnies={compagnies} action={async (formData) => { "use server"; await createContrat(formData); }} />
    </div>
  );
}
