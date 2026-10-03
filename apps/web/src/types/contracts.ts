import type {
  ContractStatus,
  PaymentMethod,
  ServiceCategory,
} from '@gestao-sst/shared'

export type PaginationMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type PaginatedResponse<T> = {
  data: T[]
  pagination: PaginationMeta
}

export type Contract = {
  id: string
  clientId: string
  renewedFromId: string | null
  contractNumber: string
  title: string
  status: ContractStatus
  startDate: string
  endDate: string
  durationMonths: number
  currency: string
  totalValue: string
  monthlyBaseValue: string
  dueDay: number
  paymentMethod: PaymentMethod
  notes: string | null
  createdAt: string
  updatedAt: string
  client: {
    id: string
    legalName: string
    tradeName: string | null
    status: string
  }
}

export type ContractService = {
  id: string
  contractId: string
  serviceCatalogId: string
  serviceCodeSnapshot: string
  serviceNameSnapshot: string
  serviceDescriptionSnapshot: string | null
  serviceCategorySnapshot: ServiceCategory
  descriptionOverride: string | null
  quantity: number
  unitValue: string | null
  totalValue: string | null
  isActive: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
  serviceCatalog: {
    id: string
    code: string
    name: string
    isActive: boolean
    category: ServiceCategory
  }
}

export type ContractEstablishment = {
  contractId: string
  establishmentId: string
  createdAt: string
  establishment: {
    id: string
    clientId: string
    nickname: string | null
    city: string
    state: string
    isHeadquarters: boolean
    status: string
  }
}

export type ServiceCatalog = {
  id: string
  code: string
  name: string
  description: string | null
  category: ServiceCategory
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}
