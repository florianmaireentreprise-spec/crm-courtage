import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UrgentEmailsList } from "@/components/emails/UrgentEmailsList";
import { AlertTriangle } from "lucide-react";

export const metadata = { title: "Emails urgents — CRM Courtage" };

export default async function UrgentEmailsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const urgentEmails = await prisma.email.findMany({
    where: {
      userId,
      actionTraitee: false,
      analyseStatut: "analyse",
      OR: [
        { urgence: "haute" },
        { scoreRelevance: { gte: 70 } },
      ],
    },
    include: { client: true },
    orderBy: [
      { urgence: "asc" }, // "haute" first alphabetically
      { scoreRelevance: "desc" },
      { dateEnvoi: "desc" },
    ],
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h1 className="text-2xl font-bold tracking-tight">Emails urgents</h1>
          {urgentEmails.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({urgentEmails.length})
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          Emails necessitant une action rapide — urgence haute ou score de pertinence eleve
        </p>
      </div>

      <UrgentEmailsList emails={urgentEmails} />
    </div>
  );
}
