import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

const contractSelect = {
  id: true,
  clientId: true,
  renewedFromId: true,
  contractNumber: true,
  title: true,
  status: true,
  startDate: true,
  endDate: true,
  durationMonths: true,
  currency: true,
  totalValue: true,
  monthlyBaseValue: true,
  dueDay: true,
  paymentMethod: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  client: {
    select: {
      id: true,
      legalName: true,
      tradeName: true,
      status: true,
    },
  },
} as const

const contractServiceSelect = {
  id: true,
  contractId: true,
  serviceCatalogId: true,
  serviceCodeSnapshot: true,
  serviceNameSnapshot: true,
  serviceDescriptionSnapshot: true,
  serviceCategorySnapshot: true,
  descriptionOverride: true,
  quantity: true,
  unitValue: true,
  totalValue: true,
  isActive: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  serviceCatalog: {
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
      category: true,
    },
  },
} as const

const contractEstablishmentSelect = {
  contractId: true,
  establishmentId: true,
  createdAt: true,
  establishment: {
    select: {
      id: true,
      clientId: true,
      nickname: true,
      city: true,
      state: true,
      isHeadquarters: true,
      status: true,
    },
  },
} as const

export type ContractRecord = Prisma.ContractGetPayload<{ select: typeof contractSelect }>
export type ContractServiceRecord = Prisma.ContractServiceGetPayload<{ select: typeof contractServiceSelect }>
export type ContractEstablishmentRecord = Prisma.ContractEstablishmentGetPayload<{ select: typeof contractEstablishmentSelect }>

type DbClient = Prisma.TransactionClient | typeof prisma

function db(tx?: Prisma.TransactionClient): DbClient {
  return tx ?? prisma
}

export async function listContracts(params: {
  where: Prisma.ContractWhereInput
  skip: number
  take: number
}): Promise<ContractRecord[]> {
  return prisma.contract.findMany({
    where: params.where,
    skip: params.skip,
    take: params.take,
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    select: contractSelect,
  })
}

export async function countContracts(where: Prisma.ContractWhereInput) {
  return prisma.contract.count({ where })
}

export async function findContractById(id: string, tx?: Prisma.TransactionClient) {
  return db(tx).contract.findUnique({ where: { id } })
}

export async function findContractRecordById(id: string): Promise<ContractRecord | null> {
  return prisma.contract.findUnique({ where: { id }, select: contractSelect })
}

export async function findContractByNumber(contractNumber: string, excludeId?: string) {
  return prisma.contract.findFirst({
    where: {
      contractNumber,
      ...(excludeId
        ? {
            id: { not: excludeId },
          }
        : {}),
    },
  })
}

export async function createContract(data: Prisma.ContractUncheckedCreateInput): Promise<ContractRecord> {
  return prisma.contract.create({ data, select: contractSelect })
}

export async function updateContract(
  id: string,
  data: Prisma.ContractUpdateInput,
  tx?: Prisma.TransactionClient,
): Promise<ContractRecord> {
  return db(tx).contract.update({ where: { id }, data, select: contractSelect })
}

export async function listContractServices(params: {
  contractId: string
  where: Prisma.ContractServiceWhereInput
  skip: number
  take: number
}): Promise<ContractServiceRecord[]> {
  return prisma.contractService.findMany({
    where: {
      contractId: params.contractId,
      ...params.where,
    },
    skip: params.skip,
    take: params.take,
    orderBy: [{ createdAt: 'desc' }],
    select: contractServiceSelect,
  })
}

export async function countContractServices(contractId: string, where: Prisma.ContractServiceWhereInput) {
  return prisma.contractService.count({
    where: {
      contractId,
      ...where,
    },
  })
}

export async function findContractServiceById(id: string, tx?: Prisma.TransactionClient) {
  return db(tx).contractService.findUnique({ where: { id } })
}

export async function findContractServiceRecordById(id: string): Promise<ContractServiceRecord | null> {
  return prisma.contractService.findUnique({ where: { id }, select: contractServiceSelect })
}

export async function findContractServiceByContractAndCatalog(contractId: string, serviceCatalogId: string) {
  return prisma.contractService.findUnique({
    where: {
      contractId_serviceCatalogId: {
        contractId,
        serviceCatalogId,
      },
    },
  })
}

export async function createContractService(
  data: Prisma.ContractServiceUncheckedCreateInput,
  tx?: Prisma.TransactionClient,
): Promise<ContractServiceRecord> {
  return db(tx).contractService.create({ data, select: contractServiceSelect })
}

export async function updateContractService(
  id: string,
  data: Prisma.ContractServiceUpdateInput,
  tx?: Prisma.TransactionClient,
): Promise<ContractServiceRecord> {
  return db(tx).contractService.update({ where: { id }, data, select: contractServiceSelect })
}

export async function listContractEstablishments(params: {
  contractId: string
  where: Prisma.ContractEstablishmentWhereInput
  skip: number
  take: number
}): Promise<ContractEstablishmentRecord[]> {
  return prisma.contractEstablishment.findMany({
    where: {
      contractId: params.contractId,
      ...params.where,
    },
    skip: params.skip,
    take: params.take,
    orderBy: [{ createdAt: 'desc' }],
    select: contractEstablishmentSelect,
  })
}

export async function countContractEstablishments(contractId: string, where: Prisma.ContractEstablishmentWhereInput) {
  return prisma.contractEstablishment.count({
    where: {
      contractId,
      ...where,
    },
  })
}

export async function findContractEstablishment(contractId: string, establishmentId: string, tx?: Prisma.TransactionClient) {
  return db(tx).contractEstablishment.findUnique({
    where: {
      contractId_establishmentId: {
        contractId,
        establishmentId,
      },
    },
  })
}

export async function createContractEstablishment(
  contractId: string,
  establishmentId: string,
  tx?: Prisma.TransactionClient,
): Promise<ContractEstablishmentRecord> {
  return db(tx).contractEstablishment.create({
    data: {
      contractId,
      establishmentId,
    },
    select: contractEstablishmentSelect,
  })
}

export async function removeContractEstablishment(
  contractId: string,
  establishmentId: string,
  tx?: Prisma.TransactionClient,
) {
  return db(tx).contractEstablishment.delete({
    where: {
      contractId_establishmentId: {
        contractId,
        establishmentId,
      },
    },
  })
}

export async function findEstablishmentById(id: string) {
  return prisma.establishment.findUnique({
    where: { id },
  })
}

export async function findServiceCatalogById(id: string) {
  return prisma.serviceCatalog.findUnique({ where: { id } })
}

export async function listActiveServicesByClient(clientId: string) {
  return prisma.contractService.findMany({
    where: {
      isActive: true,
      contract: {
        clientId,
        status: {
          in: ['SIGNED', 'ACTIVE', 'EXPIRING'],
        },
      },
    },
    orderBy: {
      serviceNameSnapshot: 'asc',
    },
    select: {
      id: true,
      contractId: true,
      serviceCatalogId: true,
      serviceCodeSnapshot: true,
      serviceNameSnapshot: true,
      serviceCategorySnapshot: true,
      quantity: true,
      unitValue: true,
      totalValue: true,
      contract: {
        select: {
          id: true,
          contractNumber: true,
          status: true,
        },
      },
    },
  })
}

export async function findClientById(clientId: string) {
  return prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true },
  })
}
