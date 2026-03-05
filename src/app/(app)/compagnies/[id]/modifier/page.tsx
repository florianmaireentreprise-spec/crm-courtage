import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CompagnieForm } from "@/components/compagnies/CompagnieForm";
import { updateCompagnie } from "@/app/(app)/compagnies/actions";

export default async function ModifierCompagniePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const compagnie = await prisma.compagnie.findUnique({ where: { id } });
  if (!compagnie) notFound();

  const boundAction = updateCompagnie.bind(null, id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Modifier {compagnie.nom}</h1>
      <CompagnieForm action={boundAction} defaultValues={compagnie} />
    </div>
  );
}
