import { PrismaClient } from "@prisma/client";

// ── Workspace-aware models (Phase 1) ──
const WORKSPACE_MODELS = new Set([
  "Client",
  "Dirigeant",
  "Contrat",
  "Commission",
  "Deal",
  "Tache",
  "Prescripteur",
  "Compagnie",
  "Document",
  "OpportuniteCommerciale",
  "Preconisation",
  "CompteRenduRDV",
]);

// Operations that need workspace filtering in WHERE clause
const READ_OPS = new Set([
  "findMany",
  "findFirst",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);

// Operations that need workspace ID injected in data
const WRITE_OPS = new Set(["create"]);

// ── Workspace ID cache ──
let _defaultWsId: string | null = null;

/**
 * Returns the default (real) workspace ID — cached after first DB call.
 * Returns null if no workspace exists yet (pre-bootstrap).
 */
async function getDefaultWorkspaceId(
  base: PrismaClient
): Promise<string | null> {
  if (_defaultWsId) return _defaultWsId;

  try {
    const ws = await base.workspace.findFirst({
      where: { isDefault: true },
      select: { id: true },
    });
    if (ws) {
      _defaultWsId = ws.id;
    }
    return _defaultWsId;
  } catch {
    // Table might not exist yet (pre-migration)
    return null;
  }
}

// ── Create extended Prisma client with workspace auto-scoping ──

function createPrismaClient() {
  const base = new PrismaClient();

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Skip non-workspace models
          if (!model || !WORKSPACE_MODELS.has(model)) {
            return query(args);
          }

          const wsId = await getDefaultWorkspaceId(base);
          if (!wsId) {
            // No workspace bootstrapped yet — pass through unfiltered
            return query(args);
          }

          // Inject workspace filter on READ operations
          if (READ_OPS.has(operation)) {
            const a = args as { where?: Record<string, unknown> };
            a.where = { ...(a.where || {}), workspaceId: wsId };
          }

          // Inject workspace ID on CREATE operations (if not already set)
          if (WRITE_OPS.has(operation)) {
            const a = args as { data?: Record<string, unknown> };
            if (a.data && !a.data.workspaceId) {
              a.data.workspaceId = wsId;
            }
          }

          // createMany: inject into each item
          if (operation === "createMany") {
            const a = args as {
              data?: Record<string, unknown>[];
            };
            if (Array.isArray(a.data)) {
              a.data = a.data.map((item) => ({
                ...item,
                workspaceId: item.workspaceId || wsId,
              }));
            }
          }

          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;
}

// ── Singleton pattern (same as before, but extended) ──

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// ── Export a function to reset workspace cache (for bootstrap script) ──
export function resetWorkspaceCache() {
  _defaultWsId = null;
}
