import { prisma } from '../lib/prisma.js'
import type { Prisma } from '@prisma/client'

export type AuditInput = {
  actorUserId?: string | null
  action: string
  entity: string
  entityId?: string | null
  metadata?: Prisma.InputJsonValue
}

export async function createAuditLog(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.actorUserId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      metadata: input.metadata,
    },
  })
}
