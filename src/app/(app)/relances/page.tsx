import { prisma } from "@/lib/prisma";
import { TacheList } from "@/components/relances/TacheList";
import { Card, CardContent } from "@/components/ui/card";
import { isToday, isBefore, startOfDay } from "date-fns";

export default async function RelancesPage() {
  const [taches, clients, users] = await Promise.all([
    prisma.tache.findMany({
      where: { statut: { in: ["a_faire", "en_cours"] } },
      include: { client: true },
      orderBy: { dateEcheance: "asc" },
    }),
    prisma.client.findMany({
      select: { id: true, raisonSociale: true },
      orderBy: { raisonSociale: "asc" },
    }),
    prisma.user.findMany({
      select: { id: true, prenom: true, nom: true },
    }),
  ]);

  const now = startOfDay(new Date());
  const enRetard = taches.filter((t) => isBefore(t.dateEcheance, now)).length;
  const aujourdhui = taches.filter((t) => isToday(t.dateEcheance)).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Relances & Tâches</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-red-600">{enRetard}</p>
            <p className="text-xs text-muted-foreground">En retard</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-blue-600">{aujourdhui}</p>
            <p className="text-xs text-muted-foreground">Aujourd&apos;hui</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{taches.length}</p>
            <p className="text-xs text-muted-foreground">Total à faire</p>
          </CardContent>
        </Card>
      </div>

      <TacheList taches={taches} clients={clients} users={users} />
    </div>
  );
}
