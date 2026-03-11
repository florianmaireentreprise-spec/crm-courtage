import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEnvironnement } from "@/lib/environnement";
import { buildOAuth2Client, GMAIL_SCOPES } from "@/lib/email/gmail";
import { GmailConnectButton } from "@/components/emails/GmailConnectButton";
import { EmailPageTabs } from "@/components/emails/EmailPageTabs";
import { Mail, Inbox } from "lucide-react";

export const metadata = { title: "Emails — CRM Courtage" };

export default async function EmailsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const connection = userId
    ? await prisma.gmailConnection.findUnique({ where: { userId } })
    : null;

  let gmailAuthUrl: string | null = null;
  if (userId && !connection) {
    const oauth2Client = buildOAuth2Client();
    gmailAuthUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: GMAIL_SCOPES,
      prompt: "consent",
      state: userId,
    });
  }

  const env = await getEnvironnement();
  const emails = connection && userId
    ? await prisma.email.findMany({
        where: { environnement: env, userId },
        include: { client: true },
        orderBy: { dateEnvoi: "desc" },
        take: 200,
      })
    : [];

  const pendingCount = emails.filter((e) => e.actionRequise && !e.actionTraitee).length;
  const unknownCount = emails.filter(
    (e) => !e.clientId && e.typeEmail && !["newsletter", "spam", "autre"].includes(e.typeEmail) && e.analyseStatut === "analyse"
  ).length;

  return (
    <div className="space-y-6">
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
          authUrl={gmailAuthUrl}
        />
      </div>

      {!connection ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="p-4 rounded-full bg-muted">
            <Mail className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-lg">Aucun compte Gmail connect&eacute;</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Connectez votre compte Gmail pour synchroniser vos emails, les analyser
              avec l&apos;IA et alimenter automatiquement vos fiches clients et t&acirc;ches.
            </p>
          </div>
        </div>
      ) : emails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="p-4 rounded-full bg-muted">
            <Inbox className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-lg">Aucun email synchronis&eacute;</p>
            <p className="text-sm text-muted-foreground">
              Cliquez sur &quot;Synchroniser&quot; pour importer vos derniers emails Gmail.
            </p>
          </div>
        </div>
      ) : (
        <EmailPageTabs
          emails={emails}
          pendingCount={pendingCount}
          unknownCount={unknownCount}
        />
      )}
    </div>
  );
}
