import type { ContractStatus, PaymentMethod } from '@gestao-sst/shared'
import { apiClient } from '@/lib/api-client'
import type {
  Contract,
  ContractEstablishment,
  ContractService,
  PaginatedResponse,
} from '@/types/contracts'

function toQueryString(filters: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (typeof value !== 'undefined' && value !== '') {
      params.set(key, String(value))
    }
  })

  const query = params.toString()
  return query ? `?${query}` : ''
}

export function listContracts(filters: {
  page: number
  pageSize: number
  search?: string
  status?: ContractStatus
  clientId?: string
  startDate?: string
  endDate?: string
}) {
  const query = toQueryString(filters)
  return apiClient<PaginatedResponse<Contract>>(`/api/v1/contracts${query}`)
}

export function listContractsByClient(clientId: string) {
  return apiClient<PaginatedResponse<Contract>>(`/api/v1/clients/${clientId}/contracts`)
}

export function getContractById(id: string) {
  return apiClient<{ contract: Contract }>(`/api/v1/contracts/${id}`)
}

export function createContract(input: {
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
}) {
  return apiClient<{ contract: Contract }>('/api/v1/contracts', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateContract(
  id: string,
  input: {
    title?: string
    startDate?: string
    endDate?: string
    durationMonths?: number
    totalValue?: string
    dueDay?: number
    paymentMethod?: PaymentMethod
    notes?: string | null
  },
) {
  return apiClient<{ contract: Contract }>(`/api/v1/contracts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function changeContractStatus(id: string, status: ContractStatus) {
  return apiClient<{ contract: Contract }>(`/api/v1/contracts/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  })
}

export function listContractServices(
  contractId: string,
  filters: {
    page: number
    pageSize: number
    search?: string
    isActive?: 'active' | 'inactive'
  },
) {
  const query = toQueryString(filters)
  return apiClient<PaginatedResponse<ContractService>>(`/api/v1/contracts/${contractId}/services${query}`)
}

export function addContractService(
  contractId: string,
  input: {
    serviceCatalogId: string
    descriptionOverride?: string
    quantity: number
    unitValue?: string
    totalValue?: string
    notes?: string
  },
) {
  return apiClient<{ contractService: ContractService }>(`/api/v1/contracts/${contractId}/services`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateContractService(
  id: string,
  input: {
    descriptionOverride?: string | null
    quantity?: number
    unitValue?: string | null
    totalValue?: string | null
    notes?: string | null
    isActive?: boolean
  },
) {
  return apiClient<{ contractService: ContractService }>(`/api/v1/contract-services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function removeContractService(id: string, reason?: string) {
  return apiClient<{ contractService: ContractService }>(`/api/v1/contract-services/${id}/remove`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export function listContractEstablishments(
  contractId: string,
  filters: {
    page: number
    pageSize: number
    search?: string
  },
) {
  const query = toQueryString(filters)
  return apiClient<PaginatedResponse<ContractEstablishment>>(
    `/api/v1/contracts/${contractId}/establishments${query}`,
  )
}

export function addContractEstablishment(contractId: string, establishmentId: string) {
  return apiClient<{ contractEstablishment: ContractEstablishment }>(`/api/v1/contracts/${contractId}/establishments`, {
    method: 'POST',
    body: JSON.stringify({ establishmentId }),
  })
}

export function removeContractEstablishment(contractId: string, establishmentId: string) {
  return apiClient<void>(`/api/v1/contracts/${contractId}/establishments/${establishmentId}/remove`, {
    method: 'POST',
  })
}
