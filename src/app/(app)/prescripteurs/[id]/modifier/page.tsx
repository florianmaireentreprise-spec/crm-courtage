import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PrescripteurForm } from "@/components/prescripteurs/PrescripteurForm";
import { updatePrescripteur } from "../../actions";

export default async function ModifierPrescripteurPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prescripteur = await prisma.prescripteur.findUnique({ where: { id } });
  if (!prescripteur) notFound();

  const action = updatePrescripteur.bind(null, id);

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Modifier : {prescripteur.prenom} {prescripteur.nom}</h1>
      <PrescripteurForm prescripteur={prescripteur} action={action} />
    </div>
  );
}
