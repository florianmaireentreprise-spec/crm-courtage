import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GmailConnectButton } from "@/components/emails/GmailConnectButton";
import { EmailList } from "@/components/emails/EmailList";
import { Mail, Inbox } from "lucide-react";

export const metadata = { title: "Emails — CRM Courtage" };

export default async function EmailsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const connection = userId
    ? await prisma.gmailConnection.findUnique({ where: { userId } })
    : null;

  const emails = connection && userId
    ? await prisma.email.findMany({
        where: { userId },
        include: { client: true },
        orderBy: { dateEnvoi: "desc" },
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Emails</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Synchronisez vos emails Gmail et analysez-les avec l&apos;IA
          </p>
        </div>
        <GmailConnectButton
          isConnected={!!connection}
          gmailEmail={connection?.gmailEmail}
        />
      </div>

      {/* Content */}
      {!connection ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="p-4 rounded-full bg-muted">
            <Mail className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-lg">Aucun compte Gmail connecté</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Connectez votre compte Gmail pour synchroniser vos emails, les analyser
              avec l&apos;IA et alimenter automatiquement vos fiches clients et tâches.
            </p>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1 mt-2">
            <li>✓ Résumé automatique de chaque email</li>
            <li>✓ Création de tâches à partir des emails</li>
            <li>✓ Association automatique aux fiches clients</li>
            <li>✓ Réponse pré-rédigée par l&apos;IA</li>
          </ul>
        </div>
      ) : emails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="p-4 rounded-full bg-muted">
            <Inbox className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-lg">Aucun email synchronisé</p>
            <p className="text-sm text-muted-foreground">
              Cliquez sur &quot;Synchroniser&quot; pour importer vos derniers emails Gmail.
            </p>
          </div>
        </div>
      ) : (
        <EmailList emails={emails} />
      )}
    </div>
  );
}
