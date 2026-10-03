import { Prisma } from '@prisma/client'
import type { ContractStatus, PaymentMethod, ServiceCategory } from '@prisma/client'
import type { AuthUser } from '../../plugins/auth.js'
import { createAuditLog } from '../../shared/audit.js'
import { makePagination } from '../../shared/pagination.js'
import {
  countContractEstablishments,
  countContracts,
  countContractServices,
  createContract,
  createContractEstablishment,
  createContractService as createContractServiceRecord,
  findClientById,
  findContractById,
  findContractByNumber,
  findContractEstablishment,
  findContractRecordById,
  findContractServiceByContractAndCatalog,
  findContractServiceById,
  findContractServiceRecordById,
  findEstablishmentById,
  findServiceCatalogById,
  listActiveServicesByClient,
  listContractEstablishments,
  listContracts,
  listContractServices,
  removeContractEstablishment,
  type ContractEstablishmentRecord,
  type ContractRecord,
  type ContractServiceRecord,
  updateContract,
  updateContractService as updateContractServiceRecord,
} from './contracts.repository.js'

type DateWindow = {
  startDate: Date
  endDate: Date
  durationMonths: number
}

type ListContractsInput = {
  page: number
  pageSize: number
  skip: number
  take: number
  search?: string
  status?: ContractStatus
  clientId?: string
  startDate?: string
  endDate?: string
}

type CreateContractInput = {
  clientId: string
  renewedFromId?: string
  contractNumber: string
  title: string
  startDate: string
  endDate?: string
  durationMonths?: number
  totalValue: string
  dueDay: number
  paymentMethod: PaymentMethod
  notes?: string
}

type UpdateContractInput = {
  title?: string
  startDate?: string
  endDate?: string
  durationMonths?: number
  totalValue?: string
  dueDay?: number
  paymentMethod?: PaymentMethod
  notes?: string | null
}

type ListContractServicesInput = {
  contractId: string
  page: number
  pageSize: number
  skip: number
  take: number
  search?: string
  isActive?: 'active' | 'inactive'
}

type CreateContractServiceInput = {
  serviceCatalogId: string
  descriptionOverride?: string
  quantity: number
  unitValue?: string
  totalValue?: string
  notes?: string
}

type UpdateContractServiceInput = {
  descriptionOverride?: string | null
  quantity?: number
  unitValue?: string | null
  totalValue?: string | null
  notes?: string | null
  isActive?: boolean
}

type ListContractEstablishmentsInput = {
  contractId: string
  page: number
  pageSize: number
  skip: number
  take: number
  search?: string
}

const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/
const signedOrActiveStatuses: ContractStatus[] = ['SIGNED', 'ACTIVE']
const lockedStructureStatuses: ContractStatus[] = ['SIGNED', 'ACTIVE', 'EXPIRING', 'ENDED', 'TERMINATED']

const allowedTransitions: Record<ContractStatus, ContractStatus[]> = {
  DRAFT: ['IN_REVIEW', 'CANCELLED'],
  IN_REVIEW: ['DRAFT', 'READY_FOR_SIGNATURE', 'CANCELLED'],
  READY_FOR_SIGNATURE: ['IN_REVIEW', 'AWAITING_SIGNATURE', 'CANCELLED'],
  AWAITING_SIGNATURE: ['IN_REVIEW', 'SIGNED', 'CANCELLED'],
  SIGNED: ['ACTIVE', 'TERMINATED'],
  ACTIVE: ['EXPIRING', 'ENDED', 'TERMINATED'],
  EXPIRING: ['ENDED', 'TERMINATED'],
  ENDED: [],
  TERMINATED: [],
  CANCELLED: [],
}

function normalizeContractNumber(value: string): string {
  return value.trim().toUpperCase()
}

function parseCivilDate(value: string, label: 'inicial' | 'final'): Date {
  if (!dateOnlyRegex.test(value)) {
    throw new Error(`Data ${label} invalida.`)
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Data ${label} invalida.`)
  }

  return date
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()

  const candidate = new Date(Date.UTC(year, month + months, day, 0, 0, 0, 0))
  while (candidate.getUTCDate() !== day) {
    candidate.setUTCDate(candidate.getUTCDate() - 1)
  }

  return candidate
}

function subtractDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setUTCDate(copy.getUTCDate() - days)
  return copy
}

function monthSpanInclusive(startDate: Date, endDate: Date): number {
  if (endDate < startDate) {
    return 0
  }

  let months =
    (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
    (endDate.getUTCMonth() - startDate.getUTCMonth())

  if (endDate.getUTCDate() >= startDate.getUTCDate()) {
    months += 1
  }

  return months
}

function normalizeMoney(value: string): Prisma.Decimal {
  return new Prisma.Decimal(value)
}

function assertPositiveMoney(value: Prisma.Decimal, fieldName: string) {
  if (value.lte(0)) {
    throw new Error(`${fieldName} invalido.`)
  }
}

function buildDateWindow(input: {
  startDate: string
  endDate?: string
  durationMonths?: number
}): DateWindow {
  const startDate = parseCivilDate(input.startDate, 'inicial')

  if (!input.endDate && !input.durationMonths) {
    throw new Error('Informe endDate ou durationMonths para o contrato.')
  }

  let endDate = input.endDate ? parseCivilDate(input.endDate, 'final') : undefined
  let durationMonths = input.durationMonths

  if (!durationMonths && endDate) {
    durationMonths = monthSpanInclusive(startDate, endDate)
  }

  if (!endDate && durationMonths) {
    endDate = subtractDays(addMonths(startDate, durationMonths), 1)
  }

  if (!durationMonths || !endDate) {
    throw new Error('Periodo contratual invalido.')
  }

  if (endDate < startDate) {
    throw new Error('Data final nao pode ser anterior a data inicial.')
  }

  const computedDuration = monthSpanInclusive(startDate, endDate)

  if (computedDuration !== durationMonths) {
    throw new Error('Datas e duracao do contrato sao inconsistentes.')
  }

  if (durationMonths <= 0) {
    throw new Error('Duracao do contrato invalida.')
  }

  return {
    startDate,
    endDate,
    durationMonths,
  }
}

function computeMonthlyBase(totalValue: Prisma.Decimal, durationMonths: number): Prisma.Decimal {
  return totalValue.div(durationMonths).toDecimalPlaces(2)
}

function mapContract(record: ContractRecord) {
  return {
    ...record,
    startDate: toDateOnly(record.startDate),
    endDate: toDateOnly(record.endDate),
    totalValue: record.totalValue.toString(),
    monthlyBaseValue: record.monthlyBaseValue.toString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function mapContractService(record: ContractServiceRecord) {
  return {
    ...record,
    unitValue: record.unitValue?.toString() ?? null,
    totalValue: record.totalValue?.toString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function mapContractEstablishment(record: ContractEstablishmentRecord) {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
  }
}

function assertEditableContract(record: { status: ContractStatus }) {
  if (signedOrActiveStatuses.includes(record.status)) {
    throw new Error('Contrato assinado/ativo nao permite alteracao livre. Utilize aditivo em fase futura.')
  }
}

function assertMutableContractStructure(record: { status: ContractStatus }) {
  if (lockedStructureStatuses.includes(record.status)) {
    throw new Error('Alteracao estrutural bloqueada para contrato assinado/ativo/encerrado.')
  }
}

async function assertContractNumberUnique(contractNumber: string, excludeId?: string) {
  const existing = await findContractByNumber(contractNumber, excludeId)
  if (existing) {
    throw new Error('Numero de contrato ja cadastrado.')
  }
}

export async function listContractsService(input: ListContractsInput) {
  const where: Prisma.ContractWhereInput = {
    AND: [
      input.search
        ? {
            OR: [
              {
                contractNumber: {
                  contains: input.search,
                  mode: 'insensitive',
                },
              },
              {
                title: {
                  contains: input.search,
                  mode: 'insensitive',
                },
              },
              {
                client: {
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
                  ],
                },
              },
            ],
          }
        : {},
      input.status ? { status: input.status } : {},
      input.clientId ? { clientId: input.clientId } : {},
      input.startDate
        ? {
            startDate: {
              gte: parseCivilDate(input.startDate, 'inicial'),
            },
          }
        : {},
      input.endDate
        ? {
            endDate: {
              lte: parseCivilDate(input.endDate, 'final'),
            },
          }
        : {},
    ],
  }

  const [data, total] = await Promise.all([
    listContracts({ where, skip: input.skip, take: input.take }),
    countContracts(where),
  ])

  return {
    data: data.map(mapContract),
    pagination: makePagination(input.page, input.pageSize, total),
  }
}

export async function listContractsByClientService(clientId: string) {
  return listContractsService({
    clientId,
    page: 1,
    pageSize: 100,
    skip: 0,
    take: 100,
  })
}

export async function getContractByIdService(id: string) {
  const record = await findContractRecordById(id)
  if (!record) {
    return null
  }

  return mapContract(record)
}

export async function createContractService(actor: AuthUser, input: CreateContractInput) {
  const contractNumber = normalizeContractNumber(input.contractNumber)
  await assertContractNumberUnique(contractNumber)

  const dateWindow = buildDateWindow({
    startDate: input.startDate,
    endDate: input.endDate,
    durationMonths: input.durationMonths,
  })

  const totalValue = normalizeMoney(input.totalValue)
  assertPositiveMoney(totalValue, 'Valor total')

  const monthlyBaseValue = computeMonthlyBase(totalValue, dateWindow.durationMonths)

  const created = await createContract({
    clientId: input.clientId,
    renewedFromId: input.renewedFromId,
    contractNumber,
    title: input.title,
    status: 'DRAFT',
    startDate: dateWindow.startDate,
    endDate: dateWindow.endDate,
    durationMonths: dateWindow.durationMonths,
    totalValue,
    monthlyBaseValue,
    dueDay: input.dueDay,
    paymentMethod: input.paymentMethod,
    notes: input.notes,
    currency: 'BRL',
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'CONTRACT_CREATED',
    entity: 'Contract',
    entityId: created.id,
    metadata: {
      clientId: created.clientId,
      contractNumber: created.contractNumber,
      status: created.status,
    },
  })

  return mapContract(created)
}

export async function updateContractService(actor: AuthUser, contractId: string, input: UpdateContractInput) {
  const target = await findContractById(contractId)
  if (!target) {
    throw new Error('Contrato nao encontrado.')
  }

  assertEditableContract(target)

  const dateWindow = buildDateWindow({
    startDate: input.startDate ?? toDateOnly(target.startDate),
    endDate: input.endDate ?? toDateOnly(target.endDate),
    durationMonths: input.durationMonths ?? target.durationMonths,
  })

  const totalValue = normalizeMoney(input.totalValue ?? target.totalValue.toString())
  assertPositiveMoney(totalValue, 'Valor total')
  const monthlyBaseValue = computeMonthlyBase(totalValue, dateWindow.durationMonths)

  const updated = await updateContract(target.id, {
    title: input.title,
    startDate: input.startDate ? dateWindow.startDate : undefined,
    endDate: input.endDate || input.durationMonths ? dateWindow.endDate : undefined,
    durationMonths: input.durationMonths || input.startDate || input.endDate ? dateWindow.durationMonths : undefined,
    totalValue: input.totalValue ? totalValue : undefined,
    monthlyBaseValue: input.totalValue || input.durationMonths || input.startDate || input.endDate ? monthlyBaseValue : undefined,
    dueDay: input.dueDay,
    paymentMethod: input.paymentMethod,
    notes: input.notes === undefined ? undefined : input.notes,
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'CONTRACT_UPDATED',
    entity: 'Contract',
    entityId: updated.id,
    metadata: {
      status: updated.status,
    },
  })

  return mapContract(updated)
}

export async function changeContractStatusService(actor: AuthUser, contractId: string, nextStatus: ContractStatus) {
  const target = await findContractById(contractId)
  if (!target) {
    throw new Error('Contrato nao encontrado.')
  }

  if (target.status === nextStatus) {
    throw new Error('Contrato ja esta no status informado.')
  }

  const allowed = allowedTransitions[target.status] ?? []

  if (!allowed.includes(nextStatus)) {
    throw new Error(`Transicao de status invalida: ${target.status} -> ${nextStatus}.`)
  }

  const updated = await updateContract(target.id, {
    status: nextStatus,
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'CONTRACT_STATUS_CHANGED',
    entity: 'Contract',
    entityId: updated.id,
    metadata: {
      from: target.status,
      to: nextStatus,
    },
  })

  return mapContract(updated)
}

export async function listContractServicesService(input: ListContractServicesInput) {
  const contract = await findContractById(input.contractId)
  if (!contract) {
    throw new Error('Contrato nao encontrado.')
  }

  const where: Prisma.ContractServiceWhereInput = {
    AND: [
      input.search
        ? {
            OR: [
              {
                serviceCodeSnapshot: {
                  contains: input.search,
                  mode: 'insensitive',
                },
              },
              {
                serviceNameSnapshot: {
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
    listContractServices({ contractId: input.contractId, where, skip: input.skip, take: input.take }),
    countContractServices(input.contractId, where),
  ])

  return {
    data: data.map(mapContractService),
    pagination: makePagination(input.page, input.pageSize, total),
  }
}

export async function addContractServiceService(
  actor: AuthUser,
  contractId: string,
  input: CreateContractServiceInput,
) {
  const contract = await findContractById(contractId)
  if (!contract) {
    throw new Error('Contrato nao encontrado.')
  }

  assertMutableContractStructure(contract)

  const catalog = await findServiceCatalogById(input.serviceCatalogId)
  if (!catalog) {
    throw new Error('Servico de catalogo nao encontrado.')
  }

  if (!catalog.isActive) {
    throw new Error('Servico inativo nao pode ser contratado.')
  }

  const duplicated = await findContractServiceByContractAndCatalog(contractId, input.serviceCatalogId)
  if (duplicated) {
    throw new Error('Servico ja adicionado neste contrato.')
  }

  const unitValue = input.unitValue ? normalizeMoney(input.unitValue) : null
  const totalValue = input.totalValue ? normalizeMoney(input.totalValue) : null

  if (unitValue && unitValue.lt(0)) {
    throw new Error('Valor unitario invalido.')
  }

  if (totalValue && totalValue.lt(0)) {
    throw new Error('Valor total do item invalido.')
  }

  const created = await createContractServiceRecord({
    contractId,
    serviceCatalogId: catalog.id,
    serviceCodeSnapshot: catalog.code,
    serviceNameSnapshot: catalog.name,
    serviceDescriptionSnapshot: catalog.description,
    serviceCategorySnapshot: catalog.category as ServiceCategory,
    descriptionOverride: input.descriptionOverride,
    quantity: input.quantity,
    unitValue,
    totalValue,
    notes: input.notes,
    isActive: true,
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'CONTRACT_SERVICE_ADDED',
    entity: 'ContractService',
    entityId: created.id,
    metadata: {
      contractId,
      serviceCatalogId: catalog.id,
      serviceCode: catalog.code,
    },
  })

  return mapContractService(created)
}

export async function updateContractServiceItemService(
  actor: AuthUser,
  contractServiceId: string,
  input: UpdateContractServiceInput,
) {
  const target = await findContractServiceById(contractServiceId)
  if (!target) {
    throw new Error('Item de servico contratado nao encontrado.')
  }

  const contract = await findContractById(target.contractId)
  if (!contract) {
    throw new Error('Contrato nao encontrado.')
  }

  assertMutableContractStructure(contract)

  const unitValue =
    input.unitValue === undefined
      ? undefined
      : input.unitValue === null
        ? null
        : normalizeMoney(input.unitValue)

  const totalValue =
    input.totalValue === undefined
      ? undefined
      : input.totalValue === null
        ? null
        : normalizeMoney(input.totalValue)

  if (unitValue instanceof Prisma.Decimal && unitValue.lt(0)) {
    throw new Error('Valor unitario invalido.')
  }

  if (totalValue instanceof Prisma.Decimal && totalValue.lt(0)) {
    throw new Error('Valor total do item invalido.')
  }

  const updated = await updateContractServiceRecord(target.id, {
    descriptionOverride:
      input.descriptionOverride === undefined ? undefined : input.descriptionOverride,
    quantity: input.quantity,
    unitValue: unitValue === undefined ? undefined : unitValue,
    totalValue: totalValue === undefined ? undefined : totalValue,
    notes: input.notes === undefined ? undefined : input.notes,
    isActive: input.isActive,
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'CONTRACT_SERVICE_UPDATED',
    entity: 'ContractService',
    entityId: updated.id,
    metadata: {
      contractId: updated.contractId,
    },
  })

  return mapContractService(updated)
}

export async function removeContractServiceItemService(
  actor: AuthUser,
  contractServiceId: string,
  reason?: string,
) {
  const target = await findContractServiceById(contractServiceId)
  if (!target) {
    throw new Error('Item de servico contratado nao encontrado.')
  }

  const contract = await findContractById(target.contractId)
  if (!contract) {
    throw new Error('Contrato nao encontrado.')
  }

  assertMutableContractStructure(contract)

  const updated = await updateContractServiceRecord(target.id, {
    isActive: false,
    notes: reason ? `${target.notes ?? ''}${target.notes ? ' | ' : ''}REMOVIDO: ${reason}` : target.notes,
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'CONTRACT_SERVICE_REMOVED',
    entity: 'ContractService',
    entityId: updated.id,
    metadata: {
      contractId: updated.contractId,
      reason: reason ?? null,
    },
  })

  return mapContractService(updated)
}

export async function listContractEstablishmentsService(input: ListContractEstablishmentsInput) {
  const contract = await findContractById(input.contractId)
  if (!contract) {
    throw new Error('Contrato nao encontrado.')
  }

  const where: Prisma.ContractEstablishmentWhereInput = {
    AND: [
      input.search
        ? {
            establishment: {
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
              ],
            },
          }
        : {},
    ],
  }

  const [data, total] = await Promise.all([
    listContractEstablishments({ contractId: input.contractId, where, skip: input.skip, take: input.take }),
    countContractEstablishments(input.contractId, where),
  ])

  return {
    data: data.map(mapContractEstablishment),
    pagination: makePagination(input.page, input.pageSize, total),
  }
}

export async function addContractEstablishmentService(actor: AuthUser, contractId: string, establishmentId: string) {
  const contract = await findContractById(contractId)
  if (!contract) {
    throw new Error('Contrato nao encontrado.')
  }

  assertMutableContractStructure(contract)

  const establishment = await findEstablishmentById(establishmentId)
  if (!establishment) {
    throw new Error('Estabelecimento nao encontrado.')
  }

  if (establishment.clientId !== contract.clientId) {
    throw new Error('Estabelecimento pertence a outro cliente.')
  }

  const duplicated = await findContractEstablishment(contractId, establishmentId)
  if (duplicated) {
    throw new Error('Estabelecimento ja vinculado ao contrato.')
  }

  const created = await createContractEstablishment(contractId, establishmentId)

  await createAuditLog({
    actorUserId: actor.id,
    action: 'CONTRACT_ESTABLISHMENT_ADDED',
    entity: 'ContractEstablishment',
    entityId: `${created.contractId}:${created.establishmentId}`,
    metadata: {
      contractId,
      establishmentId,
    },
  })

  return mapContractEstablishment(created)
}

export async function removeContractEstablishmentService(
  actor: AuthUser,
  contractId: string,
  establishmentId: string,
) {
  const contract = await findContractById(contractId)
  if (!contract) {
    throw new Error('Contrato nao encontrado.')
  }

  assertMutableContractStructure(contract)

  const link = await findContractEstablishment(contractId, establishmentId)
  if (!link) {
    throw new Error('Estabelecimento nao esta vinculado ao contrato.')
  }

  await removeContractEstablishment(contractId, establishmentId)

  await createAuditLog({
    actorUserId: actor.id,
    action: 'CONTRACT_ESTABLISHMENT_REMOVED',
    entity: 'ContractEstablishment',
    entityId: `${contractId}:${establishmentId}`,
    metadata: {
      contractId,
      establishmentId,
    },
  })
}

export async function listActiveContractServicesByClientService(clientId: string) {
  const client = await findClientById(clientId)
  if (!client) {
    throw new Error('Cliente nao encontrado.')
  }

  const items = await listActiveServicesByClient(clientId)

  return {
    data: items.map((item) => ({
      ...item,
      unitValue: item.unitValue?.toString() ?? null,
      totalValue: item.totalValue?.toString() ?? null,
    })),
  }
}

export async function getContractServiceByIdService(id: string) {
  const item = await findContractServiceRecordById(id)
  if (!item) {
    return null
  }

  return mapContractService(item)
}
