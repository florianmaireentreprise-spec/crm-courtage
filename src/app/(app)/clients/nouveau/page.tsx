import { prisma } from "@/lib/prisma";
import { ClientForm } from "@/components/clients/ClientForm";
import { createClient } from "../actions";

export default async function NouveauClientPage() {
  const users = await prisma.user.findMany({
    select: { id: true, prenom: true, nom: true },
  });

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Nouveau client</h1>
      <ClientForm users={users} action={createClient} />
    </div>
  );
}
