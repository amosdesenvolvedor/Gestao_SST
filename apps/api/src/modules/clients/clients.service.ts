import {
  isValidCnpj,
  isValidCpf,
  normalizeDocumentNumber,
  normalizePhone,
  normalizePostalCode,
} from '@gestao-sst/shared'
import type {
  ClientContact,
  ClientStatus,
  DocumentType,
  EstablishmentStatus,
  Prisma,
} from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import type { AuthUser } from '../../plugins/auth.js'
import { createAuditLog } from '../../shared/audit.js'
import { makePagination } from '../../shared/pagination.js'
import {
  countClientContactsByClient,
  countClients,
  countEstablishmentsByClient,
  createClient,
  createClientContact,
  createEstablishment,
  findClientById,
  findClientByTaxIdNumber,
  findClientContactById,
  findClientContactRecordById,
  findClientRecordById,
  findEstablishmentById,
  findEstablishmentByTaxIdNumber,
  findEstablishmentRecordById,
  findHeadquartersByClientId,
  listClientContactsByClient,
  listClients,
  listEstablishmentsByClient,
  unsetHeadquarters,
  unsetPrimaryContact,
  updateClient,
  updateClientContact,
  updateEstablishment,
  type ClientContactRecord,
  type ClientRecord,
  type EstablishmentRecord,
} from './clients.repository.js'

type ListClientsInput = {
  page: number
  pageSize: number
  skip: number
  take: number
  search?: string
  status?: ClientStatus
}

type CreateClientInput = {
  legalName: string
  tradeName?: string
  taxIdType?: DocumentType
  taxIdNumber?: string
  stateRegistration?: string
  municipalRegistration?: string
  cnaeMain?: string
  cnaeSecondary: string[]
  sizeCategory?: string
  status: ClientStatus
  notes?: string
}

type UpdateClientInput = {
  legalName?: string
  tradeName?: string | null
  taxIdType?: DocumentType | null
  taxIdNumber?: string | null
  stateRegistration?: string | null
  municipalRegistration?: string | null
  cnaeMain?: string | null
  cnaeSecondary?: string[]
  sizeCategory?: string | null
  status?: ClientStatus
  notes?: string | null
}

type ListEstablishmentsInput = {
  clientId: string
  page: number
  pageSize: number
  skip: number
  take: number
  search?: string
  status?: EstablishmentStatus
  city?: string
  state?: string
  isHeadquarters?: boolean
}

type CreateEstablishmentInput = {
  nickname?: string
  taxIdType?: DocumentType
  taxIdNumber?: string
  stateRegistration?: string
  isHeadquarters: boolean
  status: EstablishmentStatus
  cnaeMain?: string
  cnaeSecondary: string[]
  employeeCount?: number
  contactEmail?: string
  contactPhone?: string
  postalCode: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
}

type UpdateEstablishmentInput = {
  nickname?: string | null
  taxIdType?: DocumentType | null
  taxIdNumber?: string | null
  stateRegistration?: string | null
  isHeadquarters?: boolean
  status?: EstablishmentStatus
  cnaeMain?: string | null
  cnaeSecondary?: string[]
  employeeCount?: number | null
  contactEmail?: string | null
  contactPhone?: string | null
  postalCode?: string
  street?: string
  number?: string
  complement?: string | null
  neighborhood?: string
  city?: string
  state?: string
}

type ListClientContactsInput = {
  clientId: string
  page: number
  pageSize: number
  skip: number
  take: number
  search?: string
  isActive?: 'active' | 'inactive'
}

type CreateClientContactInput = {
  name: string
  role?: string
  department?: string
  email?: string
  phone: string
  preferredChannel?: 'EMAIL' | 'PHONE' | 'WHATSAPP'
  isPrimary: boolean
  receivesBilling: boolean
  receivesReports: boolean
  receivesAlerts: boolean
  isActive: boolean
}

type UpdateClientContactInput = {
  name?: string
  role?: string | null
  department?: string | null
  email?: string | null
  phone?: string
  preferredChannel?: 'EMAIL' | 'PHONE' | 'WHATSAPP' | null
  isPrimary?: boolean
  receivesBilling?: boolean
  receivesReports?: boolean
  receivesAlerts?: boolean
  isActive?: boolean
}

function normalizeEmail(email?: string | null): string | null {
  if (!email) {
    return null
  }
  return email.trim().toLowerCase()
}

function normalizeDocForType(type?: DocumentType | null, value?: string | null): string | null {
  if (!type || !value) {
    return null
  }

  const normalized = normalizeDocumentNumber(value)
  if (!normalized) {
    return null
  }

  if (type === 'CNPJ' && !isValidCnpj(normalized)) {
    throw new Error('CNPJ invalido.')
  }

  if (type === 'CPF' && !isValidCpf(normalized)) {
    throw new Error('CPF invalido.')
  }

  return normalized
}

function assertValidPhone(phone?: string | null): string | null {
  if (!phone) {
    return null
  }

  const normalized = normalizePhone(phone)

  if (normalized.length < 10 || normalized.length > 11) {
    throw new Error('Telefone invalido.')
  }

  return normalized
}

function assertValidPostalCode(postalCode: string): string {
  const normalized = normalizePostalCode(postalCode)

  if (normalized.length !== 8) {
    throw new Error('CEP invalido.')
  }

  return normalized
}

async function assertTaxIdNotUsed(
  normalizedTaxId: string | null,
  params?: {
    excludeClientId?: string
    excludeEstablishmentId?: string
  },
): Promise<void> {
  if (!normalizedTaxId) {
    return
  }

  const [clientConflict, establishmentConflict] = await Promise.all([
    findClientByTaxIdNumber(normalizedTaxId, params?.excludeClientId),
    findEstablishmentByTaxIdNumber(normalizedTaxId, params?.excludeEstablishmentId),
  ])

  if (clientConflict || establishmentConflict) {
    throw new Error('Documento ja cadastrado em outro registro.')
  }
}

function mapClient(item: ClientRecord) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

function mapEstablishment(item: EstablishmentRecord) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

function mapClientContact(item: ClientContactRecord) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

export async function listClientsService(input: ListClientsInput) {
  const where: Prisma.ClientWhereInput = {
    AND: [
      input.search
        ? {
            OR: [
              {
                legalName: {
                  contains: input.search,
                  mode: 'insensitive',
                },
              },
              {
                tradeName: {
                  contains: input.search,
                  mode: 'insensitive',
                },
              },
              {
                taxIdNumberNormalized: {
                  contains: normalizeDocumentNumber(input.search),
                },
              },
            ],
          }
        : {},
      input.status ? { status: input.status } : {},
    ],
  }

  const [data, total] = await Promise.all([
    listClients({ where, skip: input.skip, take: input.take }),
    countClients(where),
  ])

  return {
    data: data.map(mapClient),
    pagination: makePagination(input.page, input.pageSize, total),
  }
}

export async function getClientByIdService(id: string) {
  const client = await findClientRecordById(id)
  if (!client) {
    return null
  }
  return mapClient(client)
}

export async function createClientService(actor: AuthUser, input: CreateClientInput) {
  const normalizedTaxId = normalizeDocForType(input.taxIdType, input.taxIdNumber)
  await assertTaxIdNotUsed(normalizedTaxId)

  const created = await createClient({
    legalName: input.legalName,
    tradeName: input.tradeName,
    taxIdType: input.taxIdType,
    taxIdNumberNormalized: normalizedTaxId,
    stateRegistration: input.stateRegistration,
    municipalRegistration: input.municipalRegistration,
    cnaeMain: input.cnaeMain,
    cnaeSecondary: input.cnaeSecondary,
    sizeCategory: input.sizeCategory,
    status: input.status,
    notes: input.notes,
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'CLIENT_CREATED',
    entity: 'Client',
    entityId: created.id,
    metadata: {
      status: created.status,
    },
  })

  return mapClient(created)
}

export async function updateClientService(actor: AuthUser, clientId: string, input: UpdateClientInput) {
  const target = await findClientById(clientId)

  if (!target) {
    throw new Error('Cliente nao encontrado.')
  }

  const normalizedTaxId =
    typeof input.taxIdNumber === 'undefined' && typeof input.taxIdType === 'undefined'
      ? undefined
      : normalizeDocForType(
          input.taxIdType === undefined ? target.taxIdType : input.taxIdType,
          input.taxIdNumber === undefined ? target.taxIdNumberNormalized : input.taxIdNumber,
        )

  if (typeof normalizedTaxId !== 'undefined') {
    await assertTaxIdNotUsed(normalizedTaxId, { excludeClientId: clientId })
  }

  const updated = await updateClient(clientId, {
    legalName: input.legalName,
    tradeName: input.tradeName === undefined ? undefined : input.tradeName,
    taxIdType: input.taxIdType === undefined ? undefined : input.taxIdType,
    taxIdNumberNormalized:
      normalizedTaxId === undefined ? undefined : normalizedTaxId,
    stateRegistration: input.stateRegistration === undefined ? undefined : input.stateRegistration,
    municipalRegistration:
      input.municipalRegistration === undefined ? undefined : input.municipalRegistration,
    cnaeMain: input.cnaeMain === undefined ? undefined : input.cnaeMain,
    cnaeSecondary: input.cnaeSecondary,
    sizeCategory: input.sizeCategory === undefined ? undefined : input.sizeCategory,
    status: input.status,
    notes: input.notes === undefined ? undefined : input.notes,
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'CLIENT_UPDATED',
    entity: 'Client',
    entityId: updated.id,
  })

  return mapClient(updated)
}

export async function activateClientService(actor: AuthUser, clientId: string) {
  const target = await findClientById(clientId)

  if (!target) {
    throw new Error('Cliente nao encontrado.')
  }

  const updated = await updateClient(clientId, { status: 'ACTIVE' })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'CLIENT_ACTIVATED',
    entity: 'Client',
    entityId: updated.id,
  })

  return mapClient(updated)
}

export async function deactivateClientService(actor: AuthUser, clientId: string) {
  const target = await findClientById(clientId)

  if (!target) {
    throw new Error('Cliente nao encontrado.')
  }

  const updated = await updateClient(clientId, { status: 'INACTIVE' })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'CLIENT_DEACTIVATED',
    entity: 'Client',
    entityId: updated.id,
  })

  return mapClient(updated)
}

export async function listClientEstablishmentsService(input: ListEstablishmentsInput) {
  const client = await findClientById(input.clientId)

  if (!client) {
    throw new Error('Cliente nao encontrado.')
  }

  const where: Prisma.EstablishmentWhereInput = {
    AND: [
      input.search
        ? {
            OR: [
              {
                nickname: {
                  contains: input.search,
                  mode: 'insensitive',
                },
              },
              {
                city: {
                  contains: input.search,
                  mode: 'insensitive',
                },
              },
              {
                street: {
                  contains: input.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {},
      input.status ? { status: input.status } : {},
      input.city
        ? {
            city: {
              equals: input.city,
              mode: 'insensitive',
            },
          }
        : {},
      input.state ? { state: input.state } : {},
      typeof input.isHeadquarters === 'boolean' ? { isHeadquarters: input.isHeadquarters } : {},
    ],
  }

  const [data, total] = await Promise.all([
    listEstablishmentsByClient({ clientId: input.clientId, where, skip: input.skip, take: input.take }),
    countEstablishmentsByClient(input.clientId, where),
  ])

  return {
    data: data.map(mapEstablishment),
    pagination: makePagination(input.page, input.pageSize, total),
  }
}

export async function getEstablishmentByIdService(id: string) {
  const establishment = await findEstablishmentRecordById(id)
  if (!establishment) {
    return null
  }
  return mapEstablishment(establishment)
}

export async function createEstablishmentService(
  actor: AuthUser,
  clientId: string,
  input: CreateEstablishmentInput,
) {
  const client = await findClientById(clientId)

  if (!client) {
    throw new Error('Cliente nao encontrado.')
  }

  const normalizedTaxId = normalizeDocForType(input.taxIdType, input.taxIdNumber)
  await assertTaxIdNotUsed(normalizedTaxId)

  const normalizedPostalCode = assertValidPostalCode(input.postalCode)
  const normalizedPhone = assertValidPhone(input.contactPhone)
  const contactEmail = normalizeEmail(input.contactEmail)

  if (input.isHeadquarters) {
    const currentHeadquarters = await findHeadquartersByClientId(clientId)
    if (currentHeadquarters) {
      throw new Error('Cliente ja possui matriz cadastrada. Use o endpoint de definicao de matriz.')
    }
  }

  const created = await createEstablishment({
    clientId,
    nickname: input.nickname,
    taxIdType: input.taxIdType,
    taxIdNumberNormalized: normalizedTaxId,
    stateRegistration: input.stateRegistration,
    isHeadquarters: input.isHeadquarters,
    status: input.status,
    cnaeMain: input.cnaeMain,
    cnaeSecondary: input.cnaeSecondary,
    employeeCount: input.employeeCount,
    contactEmail,
    contactPhone: normalizedPhone,
    postalCode: normalizedPostalCode,
    street: input.street,
    number: input.number,
    complement: input.complement,
    neighborhood: input.neighborhood,
    city: input.city,
    state: input.state,
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'ESTABLISHMENT_CREATED',
    entity: 'Establishment',
    entityId: created.id,
    metadata: {
      clientId,
      isHeadquarters: created.isHeadquarters,
    },
  })

  return mapEstablishment(created)
}

export async function updateEstablishmentService(
  actor: AuthUser,
  establishmentId: string,
  input: UpdateEstablishmentInput,
) {
  const target = await findEstablishmentById(establishmentId)

  if (!target) {
    throw new Error('Estabelecimento nao encontrado.')
  }

  const effectiveDocType = input.taxIdType === undefined ? target.taxIdType : input.taxIdType
  const effectiveDocNumber =
    input.taxIdNumber === undefined ? target.taxIdNumberNormalized : input.taxIdNumber

  const normalizedTaxId =
    input.taxIdType === undefined && input.taxIdNumber === undefined
      ? undefined
      : normalizeDocForType(effectiveDocType, effectiveDocNumber)

  if (typeof normalizedTaxId !== 'undefined') {
    await assertTaxIdNotUsed(normalizedTaxId, { excludeEstablishmentId: establishmentId })
  }

  if (input.isHeadquarters === true) {
    const currentHeadquarters = await findHeadquartersByClientId(target.clientId, target.id)
    if (currentHeadquarters) {
      throw new Error('Cliente ja possui matriz cadastrada. Use o endpoint de definicao de matriz.')
    }
  }

  const normalizedPostalCode =
    input.postalCode === undefined ? undefined : assertValidPostalCode(input.postalCode)
  const normalizedPhone =
    input.contactPhone === undefined ? undefined : assertValidPhone(input.contactPhone)

  const updated = await updateEstablishment(target.id, {
    nickname: input.nickname === undefined ? undefined : input.nickname,
    taxIdType: input.taxIdType === undefined ? undefined : input.taxIdType,
    taxIdNumberNormalized:
      normalizedTaxId === undefined ? undefined : normalizedTaxId,
    stateRegistration: input.stateRegistration === undefined ? undefined : input.stateRegistration,
    isHeadquarters: input.isHeadquarters,
    status: input.status,
    cnaeMain: input.cnaeMain === undefined ? undefined : input.cnaeMain,
    cnaeSecondary: input.cnaeSecondary,
    employeeCount: input.employeeCount === undefined ? undefined : input.employeeCount,
    contactEmail:
      input.contactEmail === undefined ? undefined : normalizeEmail(input.contactEmail),
    contactPhone: normalizedPhone === undefined ? undefined : normalizedPhone,
    postalCode: normalizedPostalCode,
    street: input.street,
    number: input.number,
    complement: input.complement === undefined ? undefined : input.complement,
    neighborhood: input.neighborhood,
    city: input.city,
    state: input.state,
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'ESTABLISHMENT_UPDATED',
    entity: 'Establishment',
    entityId: updated.id,
  })

  return mapEstablishment(updated)
}

export async function activateEstablishmentService(actor: AuthUser, establishmentId: string) {
  const target = await findEstablishmentById(establishmentId)

  if (!target) {
    throw new Error('Estabelecimento nao encontrado.')
  }

  const updated = await updateEstablishment(establishmentId, {
    status: 'ACTIVE',
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'ESTABLISHMENT_ACTIVATED',
    entity: 'Establishment',
    entityId: updated.id,
  })

  return mapEstablishment(updated)
}

export async function deactivateEstablishmentService(actor: AuthUser, establishmentId: string) {
  const target = await findEstablishmentById(establishmentId)

  if (!target) {
    throw new Error('Estabelecimento nao encontrado.')
  }

  const updated = await updateEstablishment(establishmentId, {
    status: 'INACTIVE',
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'ESTABLISHMENT_DEACTIVATED',
    entity: 'Establishment',
    entityId: updated.id,
  })

  return mapEstablishment(updated)
}

export async function setEstablishmentAsHeadquartersService(actor: AuthUser, establishmentId: string) {
  const target = await findEstablishmentById(establishmentId)

  if (!target) {
    throw new Error('Estabelecimento nao encontrado.')
  }

  const updated = await prisma.$transaction(async (tx) => {
    await unsetHeadquarters(target.clientId, tx)

    return updateEstablishment(
      target.id,
      {
        isHeadquarters: true,
      },
      tx,
    )
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'ESTABLISHMENT_HEADQUARTERS_SET',
    entity: 'Establishment',
    entityId: updated.id,
    metadata: {
      clientId: target.clientId,
    },
  })

  return mapEstablishment(updated)
}

export async function listClientContactsService(input: ListClientContactsInput) {
  const client = await findClientById(input.clientId)

  if (!client) {
    throw new Error('Cliente nao encontrado.')
  }

  const where: Prisma.ClientContactWhereInput = {
    AND: [
      input.search
        ? {
            OR: [
              {
                name: {
                  contains: input.search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: input.search,
                  mode: 'insensitive',
                },
              },
              {
                department: {
                  contains: input.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {},
      input.isActive ? { isActive: input.isActive === 'active' } : {},
    ],
  }

  const [data, total] = await Promise.all([
    listClientContactsByClient({ clientId: input.clientId, where, skip: input.skip, take: input.take }),
    countClientContactsByClient(input.clientId, where),
  ])

  return {
    data: data.map(mapClientContact),
    pagination: makePagination(input.page, input.pageSize, total),
  }
}

export async function getClientContactByIdService(id: string) {
  const contact = await findClientContactRecordById(id)
  if (!contact) {
    return null
  }
  return mapClientContact(contact)
}

export async function createClientContactService(
  actor: AuthUser,
  clientId: string,
  input: CreateClientContactInput,
) {
  const client = await findClientById(clientId)

  if (!client) {
    throw new Error('Cliente nao encontrado.')
  }

  const normalizedPhone = assertValidPhone(input.phone)
  const email = normalizeEmail(input.email)

  const created = await prisma.$transaction(async (tx) => {
    let contact = await createClientContact(
      {
        clientId,
        name: input.name,
        role: input.role,
        department: input.department,
        email,
        phone: normalizedPhone ?? input.phone,
        preferredChannel: input.preferredChannel,
        isPrimary: input.isPrimary,
        receivesBilling: input.receivesBilling,
        receivesReports: input.receivesReports,
        receivesAlerts: input.receivesAlerts,
        isActive: input.isActive,
      },
      tx,
    )

    if (input.isPrimary) {
      await unsetPrimaryContact(clientId, tx)
      contact = await updateClientContact(
        contact.id,
        {
          isPrimary: true,
        },
        tx,
      )
    }

    return contact
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'CLIENT_CONTACT_CREATED',
    entity: 'ClientContact',
    entityId: created.id,
    metadata: {
      clientId,
      isPrimary: created.isPrimary,
    },
  })

  return mapClientContact(created)
}

export async function updateClientContactService(
  actor: AuthUser,
  contactId: string,
  input: UpdateClientContactInput,
) {
  const target = await findClientContactById(contactId)

  if (!target) {
    throw new Error('Contato do cliente nao encontrado.')
  }

  const phone = input.phone === undefined ? undefined : assertValidPhone(input.phone) ?? undefined
  const shouldSetPrimary = input.isPrimary === true

  const updated = await prisma.$transaction(async (tx) => {
      let updatedContact = await updateClientContact(
      contactId,
      {
        name: input.name,
        role: input.role === undefined ? undefined : input.role,
        department: input.department === undefined ? undefined : input.department,
        email: input.email === undefined ? undefined : normalizeEmail(input.email),
        phone: phone === undefined ? undefined : phone,
        preferredChannel:
          input.preferredChannel === undefined ? undefined : input.preferredChannel,
        receivesBilling: input.receivesBilling,
        receivesReports: input.receivesReports,
        receivesAlerts: input.receivesAlerts,
        isActive: input.isActive,
        isPrimary: input.isPrimary,
      },
      tx,
    )

    if (shouldSetPrimary) {
        await unsetPrimaryContact(target.clientId, tx)
        updatedContact = await updateClientContact(
          target.id,
          {
            isPrimary: true,
          },
          tx,
        )
    }

    return updatedContact
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'CLIENT_CONTACT_UPDATED',
    entity: 'ClientContact',
    entityId: target.id,
  })

  return mapClientContact(updated)
}

export async function activateClientContactService(actor: AuthUser, contactId: string) {
  const target = await findClientContactById(contactId)

  if (!target) {
    throw new Error('Contato do cliente nao encontrado.')
  }

  const updated = await updateClientContact(contactId, {
    isActive: true,
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'CLIENT_CONTACT_ACTIVATED',
    entity: 'ClientContact',
    entityId: updated.id,
  })

  return mapClientContact(updated)
}

export async function deactivateClientContactService(actor: AuthUser, contactId: string) {
  const target: ClientContact | null = await findClientContactById(contactId)

  if (!target) {
    throw new Error('Contato do cliente nao encontrado.')
  }

  const updated = await updateClientContact(contactId, {
    isActive: false,
    isPrimary: false,
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'CLIENT_CONTACT_DEACTIVATED',
    entity: 'ClientContact',
    entityId: updated.id,
  })

  return mapClientContact(updated)
}

export async function setClientContactAsPrimaryService(actor: AuthUser, contactId: string) {
  const target = await findClientContactById(contactId)

  if (!target) {
    throw new Error('Contato do cliente nao encontrado.')
  }

  const updated = await prisma.$transaction(async (tx) => {
    await unsetPrimaryContact(target.clientId, tx)

    return updateClientContact(
      target.id,
      {
        isPrimary: true,
      },
      tx,
    )
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'CLIENT_CONTACT_PRIMARY_SET',
    entity: 'ClientContact',
    entityId: updated.id,
    metadata: {
      clientId: target.clientId,
    },
  })

  return mapClientContact(updated)
}
