import { prisma } from "@/lib/prisma";
import { SequencesList } from "@/components/sequences/SequencesList";
import { initDefaultSequences } from "@/lib/sequences";

export const dynamic = "force-dynamic";

type SequenceWithInscriptions = {
  id: string;
  nom: string;
  description: string | null;
  etapes: string;
  active: boolean;
  dateCreation: Date;
  dateMaj: Date;
  inscriptions: {
    id: string;
    etapeActuelle: number;
    statut: string;
    dateInscription: Date;
    dateProchaineAction: Date | null;
    dateMaj: Date;
    client: { id: string; raisonSociale: string };
  }[];
};

export default async function SequencesPage() {
  let sequences: SequenceWithInscriptions[] = [];
  let clients: { id: string; raisonSociale: string; statut: string }[] = [];

  try {
    // Init default sequences if none exist
    const count = await prisma.sequence.count();
    if (count === 0) {
      await initDefaultSequences();
    }

    sequences = await prisma.sequence.findMany({
      where: { active: true },
      include: {
        inscriptions: {
          include: { client: { select: { id: true, raisonSociale: true } } },
          orderBy: { dateInscription: "desc" },
        },
      },
      orderBy: { dateCreation: "asc" },
    });
  } catch (err) {
    console.error("Erreur chargement sequences:", err);
  }

  clients = await prisma.client.findMany({
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
