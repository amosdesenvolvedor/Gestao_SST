import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

const serviceCatalogSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  category: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} as const

export type ServiceCatalogRecord = Prisma.ServiceCatalogGetPayload<{ select: typeof serviceCatalogSelect }>

export async function listServiceCatalog(params: {
  where: Prisma.ServiceCatalogWhereInput
  skip: number
  take: number
}): Promise<ServiceCatalogRecord[]> {
  return prisma.serviceCatalog.findMany({
    where: params.where,
    skip: params.skip,
    take: params.take,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: serviceCatalogSelect,
  })
}

export async function countServiceCatalog(where: Prisma.ServiceCatalogWhereInput) {
  return prisma.serviceCatalog.count({ where })
}

export async function findServiceCatalogById(id: string) {
  return prisma.serviceCatalog.findUnique({ where: { id } })
}

export async function findServiceCatalogRecordById(id: string): Promise<ServiceCatalogRecord | null> {
  return prisma.serviceCatalog.findUnique({ where: { id }, select: serviceCatalogSelect })
}

export async function findServiceCatalogByCode(code: string, excludeId?: string) {
  return prisma.serviceCatalog.findFirst({
    where: {
      code,
      ...(excludeId
        ? {
            id: { not: excludeId },
          }
        : {}),
    },
  })
}

export async function createServiceCatalog(data: Prisma.ServiceCatalogCreateInput): Promise<ServiceCatalogRecord> {
  return prisma.serviceCatalog.create({ data, select: serviceCatalogSelect })
}

export async function updateServiceCatalog(id: string, data: Prisma.ServiceCatalogUpdateInput): Promise<ServiceCatalogRecord> {
  return prisma.serviceCatalog.update({ where: { id }, data, select: serviceCatalogSelect })
}
