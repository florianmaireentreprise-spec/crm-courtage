import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Archive } from "lucide-react";
import { Input } from "@/components/ui/input";
import { STATUTS_CLIENT } from "@/lib/constants";
import { calculerScoreProspect, getScoreColor } from "@/lib/scoring/prospect";
import { calculerPotentielCA } from "@/lib/scoring/potentiel";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; archives?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const statutFilter = params.statut ?? "";
  const showArchived = params.archives === "1";

  const clients = await prisma.client.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { raisonSociale: { contains: q } },
                { nom: { contains: q } },
                { prenom: { contains: q } },
                { ville: { contains: q } },
                { email: { contains: q } },
              ],
            }
          : {},
        statutFilter ? { statut: statutFilter } : {},
        showArchived ? {} : { archived: false },
      ],
    },
    include: {
      contrats: { where: { statut: "actif" } },
    },
    orderBy: { dateMaj: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Link href="/clients/nouveau">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau client
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <form className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              placeholder="Rechercher un client..."
              defaultValue={q}
              className="pl-9"
            />
          </div>
        </form>
        <div className="flex gap-1">
          <Link href="/clients">
            <Badge
              variant={!statutFilter ? "default" : "outline"}
              className="cursor-pointer"
            >
              Tous ({clients.length})
            </Badge>
          </Link>
          {STATUTS_CLIENT.map((s) => (
            <Link key={s.id} href={`/clients?statut=${s.id}${showArchived ? "&archives=1" : ""}`}>
              <Badge
                variant={statutFilter === s.id ? "default" : "outline"}
                className="cursor-pointer"
              >
                {s.label}
              </Badge>
            </Link>
          ))}
          <Link href={showArchived ? "/clients" : "/clients?archives=1"}>
            <Badge
              variant={showArchived ? "secondary" : "outline"}
              className="cursor-pointer gap-1"
            >
              <Archive className="h-3 w-3" />
              {showArchived ? "Archives incluses" : "Voir archives"}
            </Badge>
          </Link>
        </div>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Raison sociale</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Dirigeant</th>
              <th className="text-left p-3 font-medium hidden lg:table-cell">Ville</th>
              <th className="text-center p-3 font-medium">Contrats</th>
              <th className="text-right p-3 font-medium hidden md:table-cell">CA récurrent</th>
              <th className="text-center p-3 font-medium hidden lg:table-cell">Score</th>
              <th className="text-right p-3 font-medium hidden lg:table-cell">Potentiel</th>
              <th className="text-center p-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const statutConfig = STATUTS_CLIENT.find(
                (s) => s.id === client.statut
              );
              const caRecurrent = client.contrats.reduce(
                (sum, c) => sum + (c.commissionAnnuelle ?? 0),
                0
              );
              const score = calculerScoreProspect(client, client.contrats);
              const scoreColor = getScoreColor(score);
              const potentiel = calculerPotentielCA(client, client.contrats);
              return (
                <tr key={client.id} className={`border-b hover:bg-muted/30 ${client.archived ? "opacity-50" : ""}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium hover:underline text-primary"
                      >
                        {client.raisonSociale}
                      </Link>
                      {client.archived && (
                        <Badge variant="outline" className="text-[10px] text-yellow-700 border-yellow-300 bg-yellow-50">
                          Archive
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    {client.civilite} {client.prenom} {client.nom}
                  </td>
                  <td className="p-3 hidden lg:table-cell">{client.ville ?? "-"}</td>
                  <td className="p-3 text-center">{client.contrats.length}</td>
                  <td className="p-3 text-right hidden md:table-cell">
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      maximumFractionDigits: 0,
                    }).format(caRecurrent)}
                  </td>
                  <td className="p-3 text-center hidden lg:table-cell">
                    <Badge variant="outline" style={{ borderColor: scoreColor, color: scoreColor }}>
                      {score}
                    </Badge>
                  </td>
                  <td className="p-3 text-right hidden lg:table-cell">
                    {potentiel > 0 ? (
                      <span className="text-sm text-emerald-600 font-medium">
                        {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(potentiel)}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="p-3 text-center">
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: statutConfig?.color,
                        color: statutConfig?.color,
                      }}
                    >
                      {statutConfig?.label ?? client.statut}
                    </Badge>
                  </td>
                </tr>
              );
            })}
            {clients.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  Aucun client trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
