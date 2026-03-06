import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DirigeantForm } from "@/components/dirigeants/DirigeantForm";
import { updateDirigeant } from "../../actions";

export default async function ModifierDirigeantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dirigeant = await prisma.dirigeant.findUnique({
    where: { id },
    include: { client: { select: { raisonSociale: true } } },
  });
  if (!dirigeant) notFound();

  const action = updateDirigeant.bind(null, id);

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Modifier : {dirigeant.prenom} {dirigeant.nom}</h1>
      <p className="text-muted-foreground">Dirigeant de {dirigeant.client.raisonSociale}</p>
      <DirigeantForm dirigeant={dirigeant} action={action} />
    </div>
  );
}
