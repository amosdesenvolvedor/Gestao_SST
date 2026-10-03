import type { ServiceCategory } from '@gestao-sst/shared'
import { apiClient } from '@/lib/api-client'
import type { PaginatedResponse, ServiceCatalog } from '@/types/contracts'

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

export function listServiceCatalog(filters: {
  page: number
  pageSize: number
  search?: string
  category?: ServiceCategory
  isActive?: 'active' | 'inactive'
}) {
  const query = toQueryString(filters)
  return apiClient<PaginatedResponse<ServiceCatalog>>(`/api/v1/services${query}`)
}

export function createServiceCatalog(input: {
  code: string
  name: string
  description?: string
  category: ServiceCategory
  sortOrder: number
  isActive: boolean
}) {
  return apiClient<{ service: ServiceCatalog }>('/api/v1/services', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateServiceCatalog(
  id: string,
  input: {
    code?: string
    name?: string
    description?: string | null
    category?: ServiceCategory
    sortOrder?: number
  },
) {
  return apiClient<{ service: ServiceCatalog }>(`/api/v1/services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function activateServiceCatalog(id: string) {
  return apiClient<{ service: ServiceCatalog }>(`/api/v1/services/${id}/activate`, {
    method: 'POST',
  })
}

export function deactivateServiceCatalog(id: string) {
  return apiClient<{ service: ServiceCatalog }>(`/api/v1/services/${id}/deactivate`, {
    method: 'POST',
  })
}
