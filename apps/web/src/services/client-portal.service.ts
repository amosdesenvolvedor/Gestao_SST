import { apiClient } from '@/lib/api-client'
import type {
  ClientPortalContext,
  ClientPortalContractsResponse,
  ClientPortalFinanceResponse,
  ClientPortalServiceDetailResponse,
  ClientPortalServicesResponse,
} from '@/types/client-portal'

function toQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value)
    }
  })

  const query = search.toString()
  return query ? `?${query}` : ''
}

export function getClientPortalContext(clientId?: string) {
  const query = toQuery({ clientId })
  return apiClient<ClientPortalContext>(`/api/v1/client-portal/context${query}`)
}

export function listClientPortalServices(clientId?: string, establishmentId?: string) {
  const query = toQuery({ clientId, establishmentId })
  return apiClient<ClientPortalServicesResponse>(`/api/v1/client-portal/services${query}`)
}

export function getClientPortalServiceByCode(code: string, clientId?: string, establishmentId?: string) {
  const query = toQuery({ clientId, establishmentId })
  return apiClient<ClientPortalServiceDetailResponse>(`/api/v1/client-portal/services/${encodeURIComponent(code)}${query}`)
}

export function listClientPortalContracts(clientId?: string, establishmentId?: string) {
  const query = toQuery({ clientId, establishmentId })
  return apiClient<ClientPortalContractsResponse>(`/api/v1/client-portal/contracts${query}`)
}

export function listClientPortalFinanceInstallments(clientId?: string, contractId?: string) {
  const query = toQuery({ clientId, contractId })
  return apiClient<ClientPortalFinanceResponse>(`/api/v1/client-portal/finance/installments${query}`)
}
