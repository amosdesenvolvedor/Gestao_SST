import type { ContractStatus } from '@gestao-sst/shared'

export type ClientPortalAccess = {
  accessState: 'FULL' | 'LIMITED'
  message: string | null
  canUseOperationalModules: boolean
}

export type ClientPortalContext = {
  user: {
    id: string
    role: string
  }
  memberships: Array<{
    id: string
    clientId: string
    isActive: boolean
    createdAt: string
    client: {
      id: string
      legalName: string
      tradeName: string | null
      taxIdType: string | null
      taxIdNumberNormalized: string | null
      status: 'PROSPECT' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
    }
  }>
  currentClient: {
    id: string
    legalName: string
    tradeName: string | null
    taxIdType: string | null
    taxIdNumberNormalized: string | null
    status: 'PROSPECT' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
    access: ClientPortalAccess
  }
  establishments: Array<{
    id: string
    nickname: string | null
    city: string
    state: string
    isHeadquarters: boolean
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  }>
}

export type ClientPortalServiceCard = {
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
}

export type ClientPortalServicesResponse = {
  access: ClientPortalAccess
  data: ClientPortalServiceCard[]
}

export type ClientPortalServiceDetailResponse = {
  access: ClientPortalAccess
  service: {
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
      establishments: Array<{
        id: string
        nickname: string | null
        city: string
        state: string
        isHeadquarters: boolean
      }>
    }>
  }
}

export type ClientPortalContractsResponse = {
  access: ClientPortalAccess
  data: Array<{
    id: string
    contractNumber: string
    title: string
    status: ContractStatus
    startDate: string
    endDate: string
    services: Array<{
      id: string
      serviceCodeSnapshot: string
      serviceNameSnapshot: string
      serviceCategorySnapshot: string
    }>
    establishments: Array<{
      id: string
      nickname: string | null
      city: string
      state: string
      isHeadquarters: boolean
    }>
  }>
}

export type ClientPortalFinanceResponse = {
  access: ClientPortalAccess
  summary: {
    totalPlanned: string
    totalPaid: string
    totalBalance: string
    totalOverdue: string
    nextDueDate: string | null
    nextDueAmount: string | null
    hasDelinquency: boolean
  }
  contracts: Array<{
    id: string
    contractNumber: string
  }>
  data: Array<{
    id: string
    contractId: string
    number: number
    dueDate: string
    adjustedAmount: string
    paidAmount: string
    balance: string
    status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED'
    contract: {
      id: string
      contractNumber: string
      title: string
      client: {
        legalName: string
        tradeName: string | null
      }
    }
  }>
}
