import { prisma } from "@/lib/prisma";
import { ClientForm } from "@/components/clients/ClientForm";
import { createClient } from "../actions";
import { getEnvironnement } from "@/lib/environnement";

export default async function NouveauClientPage() {
  const env = await getEnvironnement();

  const [users, prescripteurs] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, prenom: true, nom: true },
    }),
    prisma.prescripteur.findMany({
      select: { id: true, prenom: true, nom: true, entreprise: true },
      where: { statut: "actif", environnement: env },
      orderBy: { nom: "asc" },
    }),
  ]);

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Nouveau client</h1>
      <ClientForm users={users} prescripteurs={prescripteurs} action={createClient} />
    </div>
  );
}
