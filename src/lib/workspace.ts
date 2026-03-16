import { prisma } from "./prisma";

/**
 * Workspace utility — Phase 1 (Demo/Real separation)
 *
 * Provides the active workspace ID for read filtering and write defaults.
 * Phase 1: always returns the "real" workspace (no UI switcher).
 * Phase 2+: will read from session/cookie/header.
 */

let _realWorkspaceId: string | null = null;

/**
 * Returns the "real" workspace ID (cached after first DB call).
 * All CRM reads and writes should scope to this workspace.
 */
export async function getActiveWorkspaceId(): Promise<string> {
  if (_realWorkspaceId) return _realWorkspaceId;

  const ws = await prisma.workspace.findFirst({
    where: { isDefault: true },
    select: { id: true },
  });

  if (!ws) {
    throw new Error(
      "No default workspace found. Run: npx tsx scripts/bootstrap-workspaces.ts"
    );
  }

  _realWorkspaceId = ws.id;
  return _realWorkspaceId;
}

/**
 * Workspace filter clause for Prisma `where` conditions.
 * Usage: prisma.client.findMany({ where: { ...await wsFilter(), ... } })
 */
export async function wsFilter(): Promise<{ workspaceId: string }> {
  return { workspaceId: await getActiveWorkspaceId() };
}

/**
 * Workspace data clause for Prisma `create` operations.
 * Usage: prisma.client.create({ data: { ...await wsData(), ... } })
 */
export async function wsData(): Promise<{ workspaceId: string }> {
  return { workspaceId: await getActiveWorkspaceId() };
}
