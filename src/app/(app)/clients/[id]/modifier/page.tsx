import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClientForm } from "@/components/clients/ClientForm";
import { updateClient } from "../../actions";

export default async function ModifierClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [client, users] = await Promise.all([
    prisma.client.findUnique({ where: { id } }),
    prisma.user.findMany({ select: { id: true, prenom: true, nom: true } }),
  ]);

  if (!client) notFound();

  const action = updateClient.bind(null, id);

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Modifier : {client.raisonSociale}</h1>
      <ClientForm client={client} users={users} action={action} />
    </div>
  );
}
