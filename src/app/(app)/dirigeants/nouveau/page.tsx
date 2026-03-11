import { prisma } from "@/lib/prisma";
import { DirigeantForm } from "@/components/dirigeants/DirigeantForm";
import { createDirigeant } from "../actions";
import { getEnvironnement } from "@/lib/environnement";

export default async function NouveauDirigeantPage() {
  const env = await getEnvironnement();

  const clientsSansDirigeant = await prisma.client.findMany({
    where: { dirigeant: null, environnement: env },
    select: { id: true, raisonSociale: true, prenom: true, nom: true },
    orderBy: { raisonSociale: "asc" },
  });

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Nouveau dirigeant</h1>
      <DirigeantForm
        clients={clientsSansDirigeant}
        action={async (formData) => {
          "use server";
          await createDirigeant(formData);
        }}
      />
    </div>
  );
}
