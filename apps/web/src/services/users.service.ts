import type { Role } from '@gestao-sst/shared'
import { apiClient } from '@/lib/api-client'

export type UserListItem = {
  id: string
  name: string | null
  email: string
  role: Role
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
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

export type UsersFilters = {
  page: number
  pageSize: number
  search?: string
  role?: Role
  status?: 'active' | 'inactive'
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

export function listUsers(filters: UsersFilters) {
  const query = toQueryString(filters)
  return apiClient<PaginatedResponse<UserListItem>>(`/api/v1/users${query}`)
}

export function createUser(input: {
  name: string
  email: string
  role: Role
  password: string
  confirmPassword: string
  isActive: boolean
}) {
  return apiClient<{ user: UserListItem }>('/api/v1/users', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateUser(
  id: string,
  input: {
    name?: string
    email?: string
    role?: Role
  },
) {
  return apiClient<{ user: UserListItem }>(`/api/v1/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function activateUser(id: string) {
  return apiClient<{ user: UserListItem }>(`/api/v1/users/${id}/activate`, {
    method: 'POST',
  })
}

export function deactivateUser(id: string) {
  return apiClient<{ user: UserListItem }>(`/api/v1/users/${id}/deactivate`, {
    method: 'POST',
  })
}

export function resetUserPassword(id: string, input: { newPassword: string; confirmPassword: string }) {
  return apiClient<{ user: UserListItem }>(`/api/v1/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
