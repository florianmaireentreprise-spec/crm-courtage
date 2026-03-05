import { CompagnieForm } from "@/components/compagnies/CompagnieForm";
import { createCompagnie } from "@/app/(app)/compagnies/actions";

export default function NouvelleCompagniePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Nouvelle compagnie</h1>
      <CompagnieForm action={createCompagnie} />
    </div>
  );
}
