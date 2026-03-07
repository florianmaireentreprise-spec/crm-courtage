import { prisma } from "@/lib/prisma";
import { SequencesList } from "@/components/sequences/SequencesList";
import { initDefaultSequences } from "@/lib/sequences";

export default async function SequencesPage() {
  // Init default sequences if none exist
  const count = await prisma.sequence.count();
  if (count === 0) {
    await initDefaultSequences();
  }

  const sequences = await prisma.sequence.findMany({
    where: { active: true },
    include: {
      inscriptions: {
        include: { client: { select: { id: true, raisonSociale: true } } },
        orderBy: { dateInscription: "desc" },
      },
    },
    orderBy: { dateCreation: "asc" },
  });

  const clients = await prisma.client.findMany({
    where: { statut: { in: ["prospect", "client_actif"] } },
    select: { id: true, raisonSociale: true, statut: true },
    orderBy: { raisonSociale: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sequences de prospection</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Automatisez vos relances avec des sequences d&apos;actions programmees
        </p>
      </div>
      <SequencesList sequences={sequences} clients={clients} />
    </div>
  );
}
