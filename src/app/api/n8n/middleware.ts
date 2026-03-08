import { validateN8nRequest, logN8nCall } from "@/lib/n8n";
import { NextResponse } from "next/server";

export function withN8nAuth(
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    if (!validateN8nRequest(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const start = Date.now();
    const url = new URL(req.url);
    const route = `${req.method} ${url.pathname}`;

    try {
      const response = await handler(req);
      const dureeMs = Date.now() - start;

      void logN8nCall({
        direction: "n8n_to_crm",
        eventType: route,
        payload: { method: req.method, path: url.pathname },
        statut: response.ok ? "success" : "error",
        erreur: response.ok ? null : `HTTP ${response.status}`,
        dureeMs,
      });

      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      const dureeMs = Date.now() - start;

      void logN8nCall({
        direction: "n8n_to_crm",
        eventType: route,
        payload: { method: req.method, path: url.pathname },
        statut: "error",
        erreur: message,
        dureeMs,
      });

      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
