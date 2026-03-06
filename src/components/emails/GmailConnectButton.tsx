"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Unplug, RefreshCw } from "lucide-react";
import { disconnectGmail, syncEmails } from "@/app/(app)/emails/actions";
import { useState } from "react";

type Props = {
  isConnected: boolean;
  gmailEmail?: string | null;
  authUrl?: string | null;
};

export function GmailConnectButton({ isConnected, gmailEmail, authUrl }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    const result = await syncEmails();
    setSyncing(false);
    if (result?.newCount !== undefined) {
      setLastSync(`${result.newCount} nouveaux emails`);
    }
  }

  if (!isConnected) {
    return (
      <Button onClick={() => { if (authUrl) window.location.href = authUrl; }}>
        <Mail className="h-4 w-4 mr-2" />
        Connecter Gmail
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-sm text-muted-foreground">{gmailEmail}</span>
      </div>
      {lastSync && (
        <Badge variant="secondary" className="text-xs">
          {lastSync}
        </Badge>
      )}
      <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
        <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Synchronisation..." : "Synchroniser"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive"
        onClick={() => disconnectGmail()}
      >
        <Unplug className="h-4 w-4" />
      </Button>
    </div>
  );
}
