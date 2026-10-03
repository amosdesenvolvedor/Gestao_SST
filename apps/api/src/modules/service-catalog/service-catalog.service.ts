import type { Prisma, ServiceCategory } from '@prisma/client'
import type { AuthUser } from '../../plugins/auth.js'
import { createAuditLog } from '../../shared/audit.js'
import { makePagination } from '../../shared/pagination.js'
import {
  countServiceCatalog,
  createServiceCatalog,
  findServiceCatalogByCode,
  findServiceCatalogById,
  findServiceCatalogRecordById,
  listServiceCatalog,
  type ServiceCatalogRecord,
  updateServiceCatalog,
} from './service-catalog.repository.js'

type ListServiceCatalogInput = {
  page: number
  pageSize: number
  skip: number
  take: number
  search?: string
  category?: ServiceCategory
  isActive?: 'active' | 'inactive'
}

type CreateServiceCatalogInput = {
  code: string
  name: string
  description?: string
  category: ServiceCategory
  sortOrder: number
  isActive: boolean
}

type UpdateServiceCatalogInput = {
  code?: string
  name?: string
  description?: string | null
  category?: ServiceCategory
  sortOrder?: number
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase()
}

function mapServiceCatalog(record: ServiceCatalogRecord) {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

async function assertUniqueCode(code: string, excludeId?: string): Promise<void> {
  const existing = await findServiceCatalogByCode(code, excludeId)
  if (existing) {
    throw new Error('Ja existe servico com este codigo.')
  }
}

export async function listServiceCatalogService(input: ListServiceCatalogInput) {
  const where: Prisma.ServiceCatalogWhereInput = {
    AND: [
      input.search
        ? {
            OR: [
              {
                code: {
                  contains: input.search,
                  mode: 'insensitive',
                },
              },
              {
                name: {
                  contains: input.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {},
      input.category ? { category: input.category } : {},
      input.isActive ? { isActive: input.isActive === 'active' } : {},
    ],
  }

  const [data, total] = await Promise.all([
    listServiceCatalog({ where, skip: input.skip, take: input.take }),
    countServiceCatalog(where),
  ])

  return {
    data: data.map(mapServiceCatalog),
    pagination: makePagination(input.page, input.pageSize, total),
  }
}

export async function getServiceCatalogByIdService(id: string) {
  const record = await findServiceCatalogRecordById(id)
  if (!record) {
    return null
  }
  return mapServiceCatalog(record)
}

export async function createServiceCatalogService(actor: AuthUser, input: CreateServiceCatalogInput) {
  const code = normalizeCode(input.code)
  await assertUniqueCode(code)

  const created = await createServiceCatalog({
    code,
    name: input.name,
    description: input.description,
    category: input.category,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'SERVICE_CATALOG_CREATED',
    entity: 'ServiceCatalog',
    entityId: created.id,
    metadata: {
      code: created.code,
      category: created.category,
    },
  })

  return mapServiceCatalog(created)
}

export async function updateServiceCatalogService(
  actor: AuthUser,
  id: string,
  input: UpdateServiceCatalogInput,
) {
  const target = await findServiceCatalogById(id)
  if (!target) {
    throw new Error('Servico de catalogo nao encontrado.')
  }

  const normalizedCode = input.code ? normalizeCode(input.code) : undefined

  if (normalizedCode) {
    await assertUniqueCode(normalizedCode, target.id)
  }

  const updated = await updateServiceCatalog(target.id, {
    code: normalizedCode,
    name: input.name,
    description: input.description === undefined ? undefined : input.description,
    category: input.category,
    sortOrder: input.sortOrder,
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'SERVICE_CATALOG_UPDATED',
    entity: 'ServiceCatalog',
    entityId: updated.id,
  })

  return mapServiceCatalog(updated)
}

export async function activateServiceCatalogService(actor: AuthUser, id: string) {
  const target = await findServiceCatalogById(id)
  if (!target) {
    throw new Error('Servico de catalogo nao encontrado.')
  }

  const updated = await updateServiceCatalog(target.id, { isActive: true })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'SERVICE_CATALOG_ACTIVATED',
    entity: 'ServiceCatalog',
    entityId: updated.id,
  })

  return mapServiceCatalog(updated)
}

export async function deactivateServiceCatalogService(actor: AuthUser, id: string) {
  const target = await findServiceCatalogById(id)
  if (!target) {
    throw new Error('Servico de catalogo nao encontrado.')
  }

  const updated = await updateServiceCatalog(target.id, { isActive: false })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'SERVICE_CATALOG_DEACTIVATED',
    entity: 'ServiceCatalog',
    entityId: updated.id,
  })

  return mapServiceCatalog(updated)
}
