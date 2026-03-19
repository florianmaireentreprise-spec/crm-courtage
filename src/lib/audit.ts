import { prisma } from "@/lib/prisma";

type AuditAction =
  | "create"
  | "update"
  | "archive"
  | "unarchive"
  | "delete"
  | "delete_blocked"
  | "force_delete";

type AuditEntry = {
  entityType: string; // "Client" | "Document" | "OpportuniteCommerciale"
  entityId: string;
  action: AuditAction;
  actorUserId: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Write a single audit log entry. Fire-and-forget by default.
 * Uses the base prisma client — AuditLog is NOT workspace-scoped.
 */
export function logAudit(entry: AuditEntry): void {
  prisma.auditLog
    .create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        actorUserId: entry.actorUserId,
        metadata: entry.metadata ? (entry.metadata as object) : undefined,
      },
    })
    .catch((err: unknown) => {
      console.error("[audit] Failed to write audit log:", err);
    });
}

/**
 * Synchronous version — await the write. Use for critical paths
 * where you need the audit entry before responding.
 */
export async function logAuditSync(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      actorUserId: entry.actorUserId,
      metadata: entry.metadata ? (entry.metadata as object) : undefined,
    },
  });
}

/**
 * Helper to get the current user ID from a NextAuth session.
 * Returns null if no session or no user ID.
 */
export function getActorId(session: { user?: { id?: string } } | null): string | null {
  return session?.user?.id ?? null;
}
