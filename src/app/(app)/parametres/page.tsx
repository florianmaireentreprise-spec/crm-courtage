import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { UserManagement } from "@/components/parametres/UserManagement";
import { CommissionSettings } from "@/components/parametres/CommissionSettings";
import { CabinetSettings } from "@/components/parametres/CabinetSettings";
import { getSettings, getTauxCommission } from "@/lib/settings";
import { FileBarChart, ChevronRight } from "lucide-react";

export default async function ParametresPage() {
  const [users, settings] = await Promise.all([
    prisma.user.findMany({ orderBy: { dateCreation: "asc" } }),
    getSettings(),
  ]);

  const taux = getTauxCommission(settings);

  const cabinet = {
    raisonSociale: settings.raisonSociale,
    formeJuridique: settings.formeJuridique,
    gerants: settings.gerants,
    zone: settings.zone,
    cible: settings.cible,
  };

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Parametres</h1>

      {/* Liens rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/parametres/rapports">
          <Card className="hover:border-blue-300 transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <FileBarChart className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Rapports hebdomadaires</p>
                  <p className="text-xs text-muted-foreground">Historique des rapports auto-generes</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/sequences">
          <Card className="hover:border-blue-300 transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <FileBarChart className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium">Sequences de prospection</p>
                  <p className="text-xs text-muted-foreground">Automatiser les relances clients</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <UserManagement users={users} />

      <CommissionSettings taux={taux} />

      <CabinetSettings cabinet={cabinet} />
    </div>
  );
}
