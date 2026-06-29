/**
 * Append-only audit logging. logAudit() MUST run inside the same Prisma
 * transaction as the mutation it records, so the log can never diverge from
 * the change. AuditLog rows are never updated or deleted.
 *
 * Usage inside a transaction:
 *   await prisma.$transaction(async (tx) => {
 *     // ... mutation ...
 *     await logAudit(tx, { actorId, actorRole, kantinSlug, action: "grn.posted",
 *                          entityType: "Grn", entityId: grn.id, summary, metadata })
 *   })
 */
import type { Prisma, PrismaClient } from "@prisma/client"

type Tx = PrismaClient | Prisma.TransactionClient

export interface AuditInput {
  actorId?: string | null
  actorRole?: string | null
  kantinSlug?: string | null
  action: string
  entityType?: string | null
  entityId?: string | null
  summary?: string | null
  metadata?: Prisma.InputJsonValue
  ip?: string | null
}

export async function logAudit(tx: Tx, input: AuditInput): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      actorRole: input.actorRole ?? null,
      kantinSlug: input.kantinSlug ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      summary: input.summary ?? null,
      metadata: input.metadata ?? undefined,
      ip: input.ip ?? null,
    },
  })
}
