import { prisma } from "@/lib/prisma";

// ── Types ──

export type N8nEventType =
  | "email.received"
  | "email.outgoing"
  | "deal.stage_changed"
  | "client.created"
  | "client.updated"
  | "sequence.step_due"
  | "scoring.refresh_requested"
  | "rapport.weekly_requested";

export interface N8nEvent {
  type: N8nEventType;
  timestamp: string;
  payload: Record<string, unknown>;
}

// ── Emit event to n8n (fire-and-forget) ──

export async function emitN8nEvent(event: N8nEvent): Promise<void> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) return;

  const url = `${webhookUrl.replace(/\/$/, "")}/webhook/${event.type}`;
  const start = Date.now();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-n8n-secret": process.env.N8N_WEBHOOK_SECRET ?? "",
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(10000),
    });

    await logN8nCall({
      direction: "crm_to_n8n",
      eventType: event.type,
      payload: { type: event.type, payloadKeys: Object.keys(event.payload) },
      statut: res.ok ? "success" : "error",
      erreur: res.ok ? null : `HTTP ${res.status}`,
      dureeMs: Date.now() - start,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[n8n] Failed to emit ${event.type}:`, message);
    await logN8nCall({
      direction: "crm_to_n8n",
      eventType: event.type,
      payload: { type: event.type },
      statut: "error",
      erreur: message,
      dureeMs: Date.now() - start,
    }).catch(() => {});
  }
}

// ── Trigger a specific n8n workflow by ID ──

export async function triggerN8nWorkflow(
  workflowId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  const apiKey = process.env.N8N_API_KEY;
  if (!webhookUrl || !apiKey) return;

  const url = `${webhookUrl.replace(/\/$/, "")}/api/v1/workflows/${workflowId}/activate`;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": apiKey,
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error(`[n8n] Failed to trigger workflow ${workflowId}:`, err);
  }
}

// ── Validate incoming n8n request ──

export function validateN8nRequest(request: Request): boolean {
  const secret = request.headers.get("x-n8n-secret");
  const expected = process.env.N8N_WEBHOOK_SECRET;
  if (!expected) return false;
  return secret === expected;
}

// ── Logging helper ──

async function logN8nCall(data: {
  direction: string;
  eventType: string;
  payload: Record<string, unknown>;
  statut: string;
  erreur: string | null;
  dureeMs: number;
}): Promise<void> {
  try {
    await prisma.n8nLog.create({
      data: {
        direction: data.direction,
        eventType: data.eventType,
        payload: data.payload,
        statut: data.statut,
        erreur: data.erreur,
        dureeMs: data.dureeMs,
      },
    });
  } catch {
    // Silently fail — logging should never crash the app
  }
}

export { logN8nCall };

// ── Synchronous webhook call (for WF09 generate-reply) ──

export async function callN8nWebhook(
  url: string,
  body: Record<string, unknown>,
  timeoutMs = 15000,
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-n8n-secret": process.env.N8N_WEBHOOK_SECRET ?? "",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`n8n webhook responded ${res.status}: ${await res.text().catch(() => "")}`);
  }

  return res.json();
}
