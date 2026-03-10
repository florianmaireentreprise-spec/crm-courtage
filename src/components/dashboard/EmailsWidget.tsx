import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, ArrowDownLeft, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type EmailPending = {
  id: string;
  sujet: string;
  expediteur: string;
  dateEnvoi: Date;
  urgence: string | null;
  typeEmail: string | null;
  client: { raisonSociale: string } | null;
};

type Props = {
  emails: EmailPending[];
  totalPending: number;
};

export function EmailsWidget({ emails, totalPending }: Props) {
  if (totalPending === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Emails en attente
          </CardTitle>
          <Link href="/emails" className="text-xs text-blue-600 hover:underline">
            Voir tous ({totalPending})
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {emails.map((email) => (
          <Link key={email.id} href="/emails" className="block">
            <div className="flex items-center justify-between py-1.5 hover:bg-muted/30 rounded px-2 -mx-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <ArrowDownLeft className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{email.sujet}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {email.client?.raisonSociale || email.expediteur}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                {email.urgence === "haute" && (
                  <Badge variant="destructive" className="text-[10px] px-1.5">Urgent</Badge>
                )}
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {format(email.dateEnvoi, "dd MMM", { locale: fr })}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
