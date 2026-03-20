import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getBaseAssumptions } from "@/lib/scoring/assumptions";
import { HypothesesTable } from "@/components/parametres/HypothesesTable";

export default async function HypothesesPage() {
  const assumptions = await getBaseAssumptions();

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/parametres">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Parametres
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Hypotheses de potentiel CA</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Table de base des hypotheses utilisees pour estimer le potentiel commercial par produit. Ces valeurs alimentent toutes les estimations (clients et reseau).
          </p>
        </div>
      </div>

      <HypothesesTable assumptions={assumptions} />
    </div>
  );
}
