import type { ContractStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import type { AuthUser } from '../../plugins/auth.js'
import { listPortalFinanceService } from '../finance/finance.service.js'

type PortalContextInput = {
  actor: AuthUser
  selectedClientId?: string
}

type PortalFilterInput = PortalContextInput & {
  establishmentId?: string
}

const visibleContractStatuses: ContractStatus[] = ['SIGNED', 'ACTIVE', 'EXPIRING']

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

async function getMemberships(userId: string) {
  return prisma.clientMembership.findMany({
    where: {
      userId,
      isActive: true,
      client: {
        status: {
          in: ['ACTIVE', 'SUSPENDED', 'INACTIVE'],
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
      clientId: true,
      isActive: true,
      createdAt: true,
      client: {
        select: {
          id: true,
          legalName: true,
          tradeName: true,
          taxIdType: true,
          taxIdNumberNormalized: true,
          status: true,
        },
      },
    },
  })
}

function resolveCurrentClientId(memberships: Array<{ clientId: string }>, selectedClientId?: string) {
  if (memberships.length === 0) {
    throw new Error('Usuario sem acesso a portal de cliente.')
  }

  if (!selectedClientId) {
    return memberships[0]?.clientId
  }

  const isAuthorized = memberships.some((membership) => membership.clientId === selectedClientId)
  if (!isAuthorized) {
    throw new Error('Acesso negado ao cliente informado.')
  }

  return selectedClientId
}

function resolveClientAccessState(clientStatus: 'PROSPECT' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') {
  if (clientStatus === 'SUSPENDED') {
    return {
      accessState: 'LIMITED',
      message: 'Cliente suspenso: acesso somente informativo no portal.',
      canUseOperationalModules: false,
    }
  }

  if (clientStatus === 'INACTIVE' || clientStatus === 'PROSPECT') {
    return {
      accessState: 'LIMITED',
      message: 'Cliente inativo: servicos operacionais indisponiveis.',
      canUseOperationalModules: false,
    }
  }

  return {
    accessState: 'FULL',
    message: null,
    canUseOperationalModules: true,
  }
}

async function resolvePortalScope(input: PortalContextInput) {
  if (input.actor.role !== 'CLIENT') {
    throw new Error('Acesso negado ao portal do cliente.')
  }

  const memberships = await getMemberships(input.actor.id)
  const currentClientId = resolveCurrentClientId(memberships, input.selectedClientId)

  const currentMembership = memberships.find((membership) => membership.clientId === currentClientId)
  if (!currentMembership) {
    throw new Error('Acesso negado ao cliente informado.')
  }

  const clientAccess = resolveClientAccessState(currentMembership.client.status)

  const establishments = await prisma.establishment.findMany({
    where: {
      clientId: currentClientId,
      status: {
        in: ['ACTIVE', 'INACTIVE'],
      },
    },
    orderBy: [{ isHeadquarters: 'desc' }, { city: 'asc' }],
    select: {
      id: true,
      nickname: true,
      city: true,
      state: true,
      isHeadquarters: true,
      status: true,
    },
  })

  return {
    currentClientId,
    currentMembership,
    memberships,
    establishments,
    clientAccess,
  }
}

export async function getClientPortalContextService(input: PortalContextInput) {
  const scope = await resolvePortalScope(input)

  return {
    user: {
      id: input.actor.id,
      role: input.actor.role,
    },
    memberships: scope.memberships.map((membership) => ({
      id: membership.id,
      clientId: membership.clientId,
      isActive: membership.isActive,
      createdAt: membership.createdAt.toISOString(),
      client: membership.client,
    })),
    currentClient: {
      ...scope.currentMembership.client,
      access: scope.clientAccess,
    },
    establishments: scope.establishments,
  }
}

export async function listClientPortalServicesService(input: PortalFilterInput) {
  const scope = await resolvePortalScope({
    actor: input.actor,
    selectedClientId: input.selectedClientId,
  })

  if (!scope.clientAccess.canUseOperationalModules) {
    return {
      access: scope.clientAccess,
      data: [],
    }
  }

  const establishmentsFilter = input.establishmentId
    ? {
        some: {
          establishmentId: input.establishmentId,
        },
      }
    : undefined

  if (input.establishmentId) {
    const establishmentExists = scope.establishments.some((item) => item.id === input.establishmentId)
    if (!establishmentExists) {
      throw new Error('Estabelecimento nao autorizado para o cliente atual.')
    }
  }

  const items = await prisma.contractService.findMany({
    where: {
      isActive: true,
      contract: {
        clientId: scope.currentClientId,
        status: {
          in: visibleContractStatuses,
        },
        establishments: establishmentsFilter,
      },
    },
    orderBy: [{ serviceNameSnapshot: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      serviceCodeSnapshot: true,
      serviceNameSnapshot: true,
      serviceDescriptionSnapshot: true,
      serviceCategorySnapshot: true,
      contract: {
        select: {
          id: true,
          contractNumber: true,
          title: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  })

  const grouped = new Map<string, {
    serviceCode: string
    serviceName: string
    description: string | null
    category: string
    contractCount: number
    contracts: Array<{
      id: string
      contractNumber: string
      title: string
      status: ContractStatus
      startDate: string
      endDate: string
    }>
  }>()

  for (const item of items) {
    const key = item.serviceCodeSnapshot.trim().toUpperCase()
    const existing = grouped.get(key)

    if (!existing) {
      grouped.set(key, {
        serviceCode: key,
        serviceName: item.serviceNameSnapshot,
        description: item.serviceDescriptionSnapshot,
        category: item.serviceCategorySnapshot,
        contractCount: 1,
        contracts: [
          {
            id: item.contract.id,
            contractNumber: item.contract.contractNumber,
            title: item.contract.title,
            status: item.contract.status,
            startDate: toDateOnly(item.contract.startDate),
            endDate: toDateOnly(item.contract.endDate),
          },
        ],
      })
      continue
    }

    const alreadyAdded = existing.contracts.some((contract) => contract.id === item.contract.id)
    if (!alreadyAdded) {
      existing.contractCount += 1
      existing.contracts.push({
        id: item.contract.id,
        contractNumber: item.contract.contractNumber,
        title: item.contract.title,
        status: item.contract.status,
        startDate: toDateOnly(item.contract.startDate),
        endDate: toDateOnly(item.contract.endDate),
      })
    }
  }

  return {
    access: scope.clientAccess,
    data: Array.from(grouped.values()),
  }
}

export async function getClientPortalServiceByCodeService(input: PortalFilterInput & { code: string }) {
  const scope = await resolvePortalScope({
    actor: input.actor,
    selectedClientId: input.selectedClientId,
  })

  const services = await listClientPortalServicesService({
    actor: input.actor,
    selectedClientId: scope.currentClientId,
    establishmentId: input.establishmentId,
  })
  const code = input.code.trim().toUpperCase()
  const service = services.data.find((item) => item.serviceCode === code)

  if (!service) {
    return null
  }

  const contracts = await prisma.contract.findMany({
    where: {
      id: {
        in: service.contracts.map((contract) => contract.id),
      },
      clientId: scope.currentClientId,
    },
    select: {
      id: true,
      contractNumber: true,
      title: true,
      status: true,
      startDate: true,
      endDate: true,
      establishments: {
        select: {
          establishment: {
            select: {
              id: true,
              nickname: true,
              city: true,
              state: true,
              isHeadquarters: true,
            },
          },
        },
      },
    },
  })

  return {
    access: services.access,
    service: {
      ...service,
      contracts: contracts.map((contract) => ({
        id: contract.id,
        contractNumber: contract.contractNumber,
        title: contract.title,
        status: contract.status,
        startDate: toDateOnly(contract.startDate),
        endDate: toDateOnly(contract.endDate),
        establishments: contract.establishments.map((item) => item.establishment),
      })),
    },
  }
}

export async function listClientPortalContractsService(input: PortalFilterInput) {
  const scope = await resolvePortalScope({
    actor: input.actor,
    selectedClientId: input.selectedClientId,
  })

  if (!scope.clientAccess.canUseOperationalModules) {
    return {
      access: scope.clientAccess,
      data: [],
    }
  }

  if (input.establishmentId) {
    const establishmentExists = scope.establishments.some((item) => item.id === input.establishmentId)
    if (!establishmentExists) {
      throw new Error('Estabelecimento nao autorizado para o cliente atual.')
    }
  }

  const data = await prisma.contract.findMany({
    where: {
      clientId: scope.currentClientId,
      status: {
        in: visibleContractStatuses,
      },
      establishments: input.establishmentId
        ? {
            some: {
              establishmentId: input.establishmentId,
            },
          }
        : undefined,
    },
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      contractNumber: true,
      title: true,
      status: true,
      startDate: true,
      endDate: true,
      services: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
          serviceCodeSnapshot: true,
          serviceNameSnapshot: true,
          serviceCategorySnapshot: true,
        },
      },
      establishments: {
        select: {
          establishment: {
            select: {
              id: true,
              nickname: true,
              city: true,
              state: true,
              isHeadquarters: true,
            },
          },
        },
      },
    },
  })

  return {
    access: scope.clientAccess,
    data: data.map((contract) => ({
      id: contract.id,
      contractNumber: contract.contractNumber,
      title: contract.title,
      status: contract.status,
      startDate: toDateOnly(contract.startDate),
      endDate: toDateOnly(contract.endDate),
      services: contract.services,
      establishments: contract.establishments.map((item) => item.establishment),
    })),
  }
}

export async function listClientPortalFinanceService(input: PortalContextInput & { contractId?: string }) {
  const scope = await resolvePortalScope({
    actor: input.actor,
    selectedClientId: input.selectedClientId,
  })

  if (input.contractId) {
    const authorizedContract = await prisma.contract.findFirst({
      where: {
        id: input.contractId,
        clientId: scope.currentClientId,
      },
      select: {
        id: true,
      },
    })

    if (!authorizedContract) {
      throw new Error('Contrato nao autorizado para o cliente atual.')
    }
  }

  const finance = await listPortalFinanceService({
    clientId: scope.currentClientId,
    contractId: input.contractId,
  })

  return {
    access: scope.clientAccess,
    ...finance,
  }
}
