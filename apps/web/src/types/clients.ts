import type {
  ClientStatus,
  DocumentType,
  EstablishmentStatus,
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

export type Client = {
  id: string
  legalName: string
  tradeName: string | null
  taxIdType: DocumentType | null
  taxIdNumberNormalized: string | null
  stateRegistration: string | null
  municipalRegistration: string | null
  cnaeMain: string | null
  cnaeSecondary: string[]
  sizeCategory: string | null
  status: ClientStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type Establishment = {
  id: string
  clientId: string
  nickname: string | null
  taxIdType: DocumentType | null
  taxIdNumberNormalized: string | null
  stateRegistration: string | null
  isHeadquarters: boolean
  status: EstablishmentStatus
  cnaeMain: string | null
  cnaeSecondary: string[]
  employeeCount: number | null
  contactEmail: string | null
  contactPhone: string | null
  postalCode: string
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  createdAt: string
  updatedAt: string
}

export type ClientContact = {
  id: string
  clientId: string
  name: string
  role: string | null
  department: string | null
  email: string | null
  phone: string
  preferredChannel: 'EMAIL' | 'PHONE' | 'WHATSAPP' | null
  isPrimary: boolean
  receivesBilling: boolean
  receivesReports: boolean
  receivesAlerts: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}
