import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

const clientSelect = {
  id: true,
  legalName: true,
  tradeName: true,
  taxIdType: true,
  taxIdNumberNormalized: true,
  stateRegistration: true,
  municipalRegistration: true,
  cnaeMain: true,
  cnaeSecondary: true,
  sizeCategory: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const

const establishmentSelect = {
  id: true,
  clientId: true,
  nickname: true,
  taxIdType: true,
  taxIdNumberNormalized: true,
  stateRegistration: true,
  isHeadquarters: true,
  status: true,
  cnaeMain: true,
  cnaeSecondary: true,
  employeeCount: true,
  contactEmail: true,
  contactPhone: true,
  postalCode: true,
  street: true,
  number: true,
  complement: true,
  neighborhood: true,
  city: true,
  state: true,
  createdAt: true,
  updatedAt: true,
} as const

const contactSelect = {
  id: true,
  clientId: true,
  name: true,
  role: true,
  department: true,
  email: true,
  phone: true,
  preferredChannel: true,
  isPrimary: true,
  receivesBilling: true,
  receivesReports: true,
  receivesAlerts: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

const clientMembershipSelect = {
  id: true,
  userId: true,
  clientId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  },
} as const

export type ClientRecord = Prisma.ClientGetPayload<{ select: typeof clientSelect }>
export type EstablishmentRecord = Prisma.EstablishmentGetPayload<{ select: typeof establishmentSelect }>
export type ClientContactRecord = Prisma.ClientContactGetPayload<{ select: typeof contactSelect }>
export type ClientMembershipRecord = Prisma.ClientMembershipGetPayload<{ select: typeof clientMembershipSelect }>

type DbClient = Prisma.TransactionClient | typeof prisma

function db(tx?: Prisma.TransactionClient): DbClient {
  return tx ?? prisma
}

export async function listClients(params: {
  where: Prisma.ClientWhereInput
  skip: number
  take: number
}): Promise<ClientRecord[]> {
  return prisma.client.findMany({
    where: params.where,
    skip: params.skip,
    take: params.take,
    orderBy: { createdAt: 'desc' },
    select: clientSelect,
  })
}

export async function countClients(where: Prisma.ClientWhereInput): Promise<number> {
  return prisma.client.count({ where })
}

export async function findClientById(id: string, tx?: Prisma.TransactionClient) {
  return db(tx).client.findUnique({ where: { id } })
}

export async function findClientRecordById(id: string): Promise<ClientRecord | null> {
  return prisma.client.findUnique({ where: { id }, select: clientSelect })
}

export async function findClientByTaxIdNumber(taxIdNumberNormalized: string, excludeId?: string) {
  return prisma.client.findFirst({
    where: {
      taxIdNumberNormalized,
      ...(excludeId
        ? {
            id: { not: excludeId },
          }
        : {}),
    },
  })
}

export async function createClient(data: Prisma.ClientCreateInput): Promise<ClientRecord> {
  return prisma.client.create({ data, select: clientSelect })
}

export async function updateClient(
  id: string,
  data: Prisma.ClientUpdateInput,
  tx?: Prisma.TransactionClient,
): Promise<ClientRecord> {
  return db(tx).client.update({ where: { id }, data, select: clientSelect })
}

export async function listEstablishmentsByClient(params: {
  clientId: string
  where: Prisma.EstablishmentWhereInput
  skip: number
  take: number
}): Promise<EstablishmentRecord[]> {
  return prisma.establishment.findMany({
    where: {
      clientId: params.clientId,
      ...params.where,
    },
    skip: params.skip,
    take: params.take,
    orderBy: [
      { isHeadquarters: 'desc' },
      { createdAt: 'desc' },
    ],
    select: establishmentSelect,
  })
}

export async function countEstablishmentsByClient(clientId: string, where: Prisma.EstablishmentWhereInput) {
  return prisma.establishment.count({ where: { clientId, ...where } })
}

export async function findEstablishmentById(id: string, tx?: Prisma.TransactionClient) {
  return db(tx).establishment.findUnique({ where: { id } })
}

export async function findEstablishmentRecordById(id: string): Promise<EstablishmentRecord | null> {
  return prisma.establishment.findUnique({ where: { id }, select: establishmentSelect })
}

export async function findEstablishmentByTaxIdNumber(taxIdNumberNormalized: string, excludeId?: string) {
  return prisma.establishment.findFirst({
    where: {
      taxIdNumberNormalized,
      ...(excludeId
        ? {
            id: { not: excludeId },
          }
        : {}),
    },
  })
}

export async function findHeadquartersByClientId(clientId: string, excludeEstablishmentId?: string, tx?: Prisma.TransactionClient) {
  return db(tx).establishment.findFirst({
    where: {
      clientId,
      isHeadquarters: true,
      ...(excludeEstablishmentId
        ? {
            id: { not: excludeEstablishmentId },
          }
        : {}),
    },
  })
}

export async function createEstablishment(
  data: Prisma.EstablishmentUncheckedCreateInput,
  tx?: Prisma.TransactionClient,
): Promise<EstablishmentRecord> {
  return db(tx).establishment.create({ data, select: establishmentSelect })
}

export async function updateEstablishment(
  id: string,
  data: Prisma.EstablishmentUpdateInput,
  tx?: Prisma.TransactionClient,
): Promise<EstablishmentRecord> {
  return db(tx).establishment.update({ where: { id }, data, select: establishmentSelect })
}

export async function unsetHeadquarters(clientId: string, tx?: Prisma.TransactionClient) {
  return db(tx).establishment.updateMany({
    where: {
      clientId,
      isHeadquarters: true,
    },
    data: {
      isHeadquarters: false,
    },
  })
}

export async function listClientContactsByClient(params: {
  clientId: string
  where: Prisma.ClientContactWhereInput
  skip: number
  take: number
}): Promise<ClientContactRecord[]> {
  return prisma.clientContact.findMany({
    where: {
      clientId: params.clientId,
      ...params.where,
    },
    skip: params.skip,
    take: params.take,
    orderBy: [
      { isPrimary: 'desc' },
      { createdAt: 'desc' },
    ],
    select: contactSelect,
  })
}

export async function countClientContactsByClient(clientId: string, where: Prisma.ClientContactWhereInput) {
  return prisma.clientContact.count({ where: { clientId, ...where } })
}

export async function findClientContactById(id: string, tx?: Prisma.TransactionClient) {
  return db(tx).clientContact.findUnique({ where: { id } })
}

export async function findClientContactRecordById(id: string): Promise<ClientContactRecord | null> {
  return prisma.clientContact.findUnique({ where: { id }, select: contactSelect })
}

export async function findPrimaryClientContact(clientId: string, excludeContactId?: string, tx?: Prisma.TransactionClient) {
  return db(tx).clientContact.findFirst({
    where: {
      clientId,
      isPrimary: true,
      ...(excludeContactId
        ? {
            id: {
              not: excludeContactId,
            },
          }
        : {}),
    },
  })
}

export async function unsetPrimaryContact(clientId: string, tx?: Prisma.TransactionClient) {
  return db(tx).clientContact.updateMany({
    where: {
      clientId,
      isPrimary: true,
    },
    data: {
      isPrimary: false,
    },
  })
}

export async function createClientContact(
  data: Prisma.ClientContactUncheckedCreateInput,
  tx?: Prisma.TransactionClient,
): Promise<ClientContactRecord> {
  return db(tx).clientContact.create({ data, select: contactSelect })
}

export async function updateClientContact(
  id: string,
  data: Prisma.ClientContactUpdateInput,
  tx?: Prisma.TransactionClient,
): Promise<ClientContactRecord> {
  return db(tx).clientContact.update({ where: { id }, data, select: contactSelect })
}

export async function listClientMembershipsByClient(clientId: string): Promise<ClientMembershipRecord[]> {
  return prisma.clientMembership.findMany({
    where: { clientId },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    select: clientMembershipSelect,
  })
}

export async function findClientMembershipById(id: string, tx?: Prisma.TransactionClient) {
  return db(tx).clientMembership.findUnique({ where: { id } })
}

export async function findClientMembershipByUserAndClient(userId: string, clientId: string, tx?: Prisma.TransactionClient) {
  return db(tx).clientMembership.findUnique({
    where: {
      userId_clientId: {
        userId,
        clientId,
      },
    },
  })
}

export async function createClientMembership(
  data: Prisma.ClientMembershipUncheckedCreateInput,
  tx?: Prisma.TransactionClient,
): Promise<ClientMembershipRecord> {
  return db(tx).clientMembership.create({ data, select: clientMembershipSelect })
}

export async function updateClientMembership(
  id: string,
  data: Prisma.ClientMembershipUpdateInput,
  tx?: Prisma.TransactionClient,
): Promise<ClientMembershipRecord> {
  return db(tx).clientMembership.update({ where: { id }, data, select: clientMembershipSelect })
}

export async function removeClientMembership(id: string, tx?: Prisma.TransactionClient): Promise<void> {
  await db(tx).clientMembership.delete({ where: { id } })
}

export async function findUserByEmailForClientPortal(email: string, tx?: Prisma.TransactionClient) {
  return db(tx).user.findUnique({ where: { email: email.toLowerCase() } })
}

export async function findUserByIdForClientPortal(userId: string, tx?: Prisma.TransactionClient) {
  return db(tx).user.findUnique({ where: { id: userId } })
}

export async function createClientPortalUser(
  data: Prisma.UserCreateInput,
  tx?: Prisma.TransactionClient,
) {
  return db(tx).user.create({
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
    },
  })
}
