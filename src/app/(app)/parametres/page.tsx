import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TAUX_COMMISSION_DEFAUT, TYPES_PRODUITS } from "@/lib/constants";
import { UserManagement } from "@/components/parametres/UserManagement";

export default async function ParametresPage() {
  const users = await prisma.user.findMany({
    orderBy: { dateCreation: "asc" },
  });

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Paramètres</h1>

      <UserManagement users={users} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Taux de commission par défaut</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(TAUX_COMMISSION_DEFAUT).map(([key, taux]) => {
              const produit = TYPES_PRODUITS[key as keyof typeof TYPES_PRODUITS];
              return (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: produit.color }}
                    />
                    <span className="text-sm font-medium">{produit.label}</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      Apport: {(taux.apport * 100).toFixed(1)}%
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      Gestion: {(taux.gestion * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Ces taux sont appliqués automatiquement lors de la création d&apos;un contrat.
            Ils peuvent être modifiés individuellement sur chaque contrat.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations Cabinet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Raison sociale :</span> Cabinet JDHM</p>
          <p><span className="text-muted-foreground">Forme juridique :</span> SARL</p>
          <p><span className="text-muted-foreground">Gérants :</span> Florian MAIRE & Jérémy DELCOURT</p>
          <p><span className="text-muted-foreground">Zone :</span> Grand Est, France</p>
          <p><span className="text-muted-foreground">Cible :</span> TPE / PME / TNS</p>
        </CardContent>
      </Card>
    </div>
  );
}
