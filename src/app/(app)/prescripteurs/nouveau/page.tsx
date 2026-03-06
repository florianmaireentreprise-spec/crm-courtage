import { PrescripteurForm } from "@/components/prescripteurs/PrescripteurForm";
import { createPrescripteur } from "../actions";

export default function NouveauPrescripteurPage() {
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Nouveau prescripteur</h1>
      <PrescripteurForm action={async (formData) => { "use server"; await createPrescripteur(formData); }} />
    </div>
  );
}
