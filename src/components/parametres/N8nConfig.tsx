"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Wifi,
  Mail,
  Clock,
  RefreshCw,
  BarChart3,
  FileText,
  Zap,
} from "lucide-react";

type N8nLogEntry = {
  id: string;
  direction: string;
  eventType: string;
  payload: unknown;
  statut: string;
  erreur: string | null;
  dureeMs: number | null;
  dateCreation: Date;
};

type Props = {
  logs: N8nLogEntry[];
  envStatus: {
    N8N_WEBHOOK_URL: boolean;
    N8N_WEBHOOK_SECRET: boolean;
    N8N_API_KEY: boolean;
  };
};

const workflows = [
  {
    icon: Mail,
    name: "Email Intelligence Pipeline",
    description: "Analyse IA temps reel",
    trigger: "Webhook email.received",
  },
  {
    icon: Clock,
    name: "Auto-Tasks Generator",
    description: "Taches automatiques",
    trigger: "Cron 7h quotidien",
  },
  {
    icon: RefreshCw,
    name: "Sequence Engine",
    description: "Sequences prospection",
    trigger: "Cron 8h quotidien",
  },
  {
    icon: BarChart3,
    name: "Scoring Refresh",
    description: "Scoring prospect",
    trigger: "Cron 6h quotidien",
  },
  {
    icon: FileText,
    name: "Rapport Hebdomadaire",
    description: "Rapport par email",
    trigger: "Lundi 8h",
  },
];

export function N8nConfig({ logs, envStatus }: Props) {
  const [testing, setTesting] = useState(false);
  const [healthStatus, setHealthStatus] = useState<
    "idle" | "ok" | "error"
  >("idle");

  async function testConnection() {
    setTesting(true);
    try {
      const res = await fetch("/api/n8n/health");
      setHealthStatus(res.ok ? "ok" : "error");
    } catch {
      setHealthStatus("error");
    }
    setTesting(false);
  }

  const crmBaseUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-yellow-500" />
        <h2 className="text-lg font-semibold">Integration n8n</h2>
      </div>

      {/* Connection status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            Connexion n8n
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={testing}
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Wifi className="h-3.5 w-3.5 mr-1" />
              )}
              Tester la connexion
            </Button>
            {healthStatus === "ok" && (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connecte
              </Badge>
            )}
            {healthStatus === "error" && (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                Erreur
              </Badge>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              URL webhook CRM (a configurer dans n8n) :
            </p>
            <code className="text-xs bg-muted px-2 py-1 rounded block">
              {crmBaseUrl}/api/n8n/
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Workflows */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Workflows n8n</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {workflows.map((wf) => (
              <div
                key={wf.name}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <wf.icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{wf.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {wf.description}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {wf.trigger}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Logs recents</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Aucun log pour le moment
            </p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between text-xs py-1.5 border-b last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      variant="outline"
                      className={`text-[9px] flex-shrink-0 ${
                        log.direction === "crm_to_n8n"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-purple-50 text-purple-600"
                      }`}
                    >
                      {log.direction === "crm_to_n8n" ? "CRM→n8n" : "n8n→CRM"}
                    </Badge>
                    <span className="truncate text-muted-foreground">
                      {log.eventType}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {log.dureeMs !== null && (
                      <span className="text-muted-foreground">
                        {log.dureeMs}ms
                      </span>
                    )}
                    <Badge
                      variant={
                        log.statut === "success" ? "default" : "destructive"
                      }
                      className="text-[9px]"
                    >
                      {log.statut === "success" ? "OK" : "ERR"}
                    </Badge>
                    <span className="text-muted-foreground">
                      {new Date(log.dateCreation).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Environment variables */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Variables d&apos;environnement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(envStatus).map(([key, configured]) => (
              <div key={key} className="flex items-center gap-2">
                {configured ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                )}
                <code className="text-xs">{key}</code>
                <span className="text-xs text-muted-foreground">
                  {configured ? "Configure" : "Manquant"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
