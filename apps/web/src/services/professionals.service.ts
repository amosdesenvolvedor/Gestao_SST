import type { ProfessionalType } from '@gestao-sst/shared'
import { apiClient } from '@/lib/api-client'

export type ProfessionalListItem = {
  id: string
  name: string
  email: string | null
  phone: string | null
  cpf: string | null
  professionalType: ProfessionalType
  councilType: string | null
  councilNumber: string | null
  councilState: string | null
  specialty: string | null
  isActive: boolean
  userId: string | null
  createdAt: string
  updatedAt: string
}

export type ProfessionalsFilters = {
  page: number
  pageSize: number
  search?: string
  professionalType?: ProfessionalType
  status?: 'active' | 'inactive'
}

export type PaginatedResponse<T> = {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

function toQueryString(filters: Record<string, string | number | undefined>) {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (typeof value !== 'undefined' && value !== '') {
      params.set(key, String(value))
    }
  })

  const query = params.toString()
  return query ? `?${query}` : ''
}

export function listProfessionals(filters: ProfessionalsFilters) {
  const query = toQueryString(filters)
  return apiClient<PaginatedResponse<ProfessionalListItem>>(`/api/v1/professionals${query}`)
}

export function createProfessional(input: {
  name: string
  email?: string
  phone?: string
  cpf?: string
  professionalType: ProfessionalType
  councilType?: string
  councilNumber?: string
  councilState?: string
  specialty?: string
  userId?: string
  isActive: boolean
}) {
  return apiClient<{ professional: ProfessionalListItem }>('/api/v1/professionals', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateProfessional(
  id: string,
  input: {
    name?: string
    email?: string | null
    phone?: string | null
    cpf?: string | null
    professionalType?: ProfessionalType
    councilType?: string | null
    councilNumber?: string | null
    councilState?: string | null
    specialty?: string | null
    userId?: string | null
  },
) {
  return apiClient<{ professional: ProfessionalListItem }>(`/api/v1/professionals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function activateProfessional(id: string) {
  return apiClient<{ professional: ProfessionalListItem }>(`/api/v1/professionals/${id}/activate`, {
    method: 'POST',
  })
}

export function deactivateProfessional(id: string) {
  return apiClient<{ professional: ProfessionalListItem }>(`/api/v1/professionals/${id}/deactivate`, {
    method: 'POST',
  })
}
