import { apiClient } from '@/lib/api-client'
import type {
  SstActivity,
  SstIsActiveFilter,
  SstPaginatedResponse,
  SstRole,
  SstSector,
  SstWorkEnvironment,
  SstWorkSchedule,
} from '@/types/sst-organization'

type ListBaseFilters = {
  page?: number
  pageSize?: number
  search?: string
  isActive?: SstIsActiveFilter
}

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

export function listSstSectors(
  clientId: string,
  filters: ListBaseFilters & {
    establishmentId?: string
  },
) {
  const query = toQueryString({
    clientId,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 50,
    search: filters.search,
    establishmentId: filters.establishmentId,
    isActive: filters.isActive,
  })

  return apiClient<SstPaginatedResponse<SstSector>>(`/api/v1/sst/sectors${query}`)
}

export function getSstSectorById(id: string) {
  return apiClient<{ sector: SstSector }>(`/api/v1/sst/sectors/${id}`)
}

export function createSstSector(input: {
  clientId: string
  establishmentId: string
  code: string
  name: string
  description?: string
  isActive?: boolean
}) {
  return apiClient<{ sector: SstSector }>('/api/v1/sst/sectors', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateSstSector(
  id: string,
  input: {
    code?: string
    name?: string
    description?: string | null
  },
) {
  return apiClient<{ sector: SstSector }>(`/api/v1/sst/sectors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function activateSstSector(id: string) {
  return apiClient<{ sector: SstSector }>(`/api/v1/sst/sectors/${id}/activate`, {
    method: 'POST',
  })
}

export function deactivateSstSector(id: string) {
  return apiClient<{ sector: SstSector }>(`/api/v1/sst/sectors/${id}/deactivate`, {
    method: 'POST',
  })
}

export function listSstWorkEnvironments(
  clientId: string,
  filters: ListBaseFilters & {
    establishmentId?: string
    sectorId?: string
  },
) {
  const query = toQueryString({
    clientId,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 50,
    search: filters.search,
    establishmentId: filters.establishmentId,
    sectorId: filters.sectorId,
    isActive: filters.isActive,
  })

  return apiClient<SstPaginatedResponse<SstWorkEnvironment>>(`/api/v1/sst/work-environments${query}`)
}

export function getSstWorkEnvironmentById(id: string) {
  return apiClient<{ workEnvironment: SstWorkEnvironment }>(`/api/v1/sst/work-environments/${id}`)
}

export function createSstWorkEnvironment(input: {
  clientId: string
  establishmentId: string
  sectorId: string
  code: string
  name: string
  description?: string
  indoorOutdoorType?: 'INDOOR' | 'OUTDOOR' | 'MIXED'
  isActive?: boolean
}) {
  return apiClient<{ workEnvironment: SstWorkEnvironment }>('/api/v1/sst/work-environments', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateSstWorkEnvironment(
  id: string,
  input: {
    sectorId?: string
    code?: string
    name?: string
    description?: string | null
    indoorOutdoorType?: 'INDOOR' | 'OUTDOOR' | 'MIXED'
  },
) {
  return apiClient<{ workEnvironment: SstWorkEnvironment }>(`/api/v1/sst/work-environments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function activateSstWorkEnvironment(id: string) {
  return apiClient<{ workEnvironment: SstWorkEnvironment }>(`/api/v1/sst/work-environments/${id}/activate`, {
    method: 'POST',
  })
}

export function deactivateSstWorkEnvironment(id: string) {
  return apiClient<{ workEnvironment: SstWorkEnvironment }>(`/api/v1/sst/work-environments/${id}/deactivate`, {
    method: 'POST',
  })
}

export function listSstRoles(clientId: string, filters: ListBaseFilters) {
  const query = toQueryString({
    clientId,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 50,
    search: filters.search,
    isActive: filters.isActive,
  })

  return apiClient<SstPaginatedResponse<SstRole>>(`/api/v1/sst/roles${query}`)
}

export function getSstRoleById(id: string) {
  return apiClient<{ role: SstRole }>(`/api/v1/sst/roles/${id}`)
}

export function createSstRole(input: {
  clientId: string
  title: string
  cboCode?: string
  cboDescription?: string
  description?: string
  isActive?: boolean
}) {
  return apiClient<{ role: SstRole }>('/api/v1/sst/roles', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateSstRole(
  id: string,
  input: {
    title?: string
    cboCode?: string | null
    cboDescription?: string | null
    description?: string | null
  },
) {
  return apiClient<{ role: SstRole }>(`/api/v1/sst/roles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function activateSstRole(id: string) {
  return apiClient<{ role: SstRole }>(`/api/v1/sst/roles/${id}/activate`, {
    method: 'POST',
  })
}

export function deactivateSstRole(id: string) {
  return apiClient<{ role: SstRole }>(`/api/v1/sst/roles/${id}/deactivate`, {
    method: 'POST',
  })
}

export function listSstActivities(
  clientId: string,
  filters: ListBaseFilters & {
    roleId?: string
    frequency?: 'ROUTINE' | 'NON_ROUTINE' | 'EVENTUAL'
    isCritical?: boolean
  },
) {
  const query = toQueryString({
    clientId,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 50,
    search: filters.search,
    roleId: filters.roleId,
    frequency: filters.frequency,
    isCritical: filters.isCritical,
    isActive: filters.isActive,
  })

  return apiClient<SstPaginatedResponse<SstActivity>>(`/api/v1/sst/activities${query}`)
}

export function getSstActivityById(id: string) {
  return apiClient<{ activity: SstActivity }>(`/api/v1/sst/activities/${id}`)
}

export function createSstActivity(input: {
  clientId: string
  roleId: string
  title: string
  frequency?: 'ROUTINE' | 'NON_ROUTINE' | 'EVENTUAL'
  description?: string
  isCritical?: boolean
  isActive?: boolean
}) {
  return apiClient<{ activity: SstActivity }>('/api/v1/sst/activities', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateSstActivity(
  id: string,
  input: {
    roleId?: string
    title?: string
    frequency?: 'ROUTINE' | 'NON_ROUTINE' | 'EVENTUAL'
    description?: string | null
    isCritical?: boolean
  },
) {
  return apiClient<{ activity: SstActivity }>(`/api/v1/sst/activities/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function activateSstActivity(id: string) {
  return apiClient<{ activity: SstActivity }>(`/api/v1/sst/activities/${id}/activate`, {
    method: 'POST',
  })
}

export function deactivateSstActivity(id: string) {
  return apiClient<{ activity: SstActivity }>(`/api/v1/sst/activities/${id}/deactivate`, {
    method: 'POST',
  })
}

export function listSstWorkSchedules(
  clientId: string,
  filters: ListBaseFilters & {
    establishmentId?: string
    scheduleType?: 'FIXED' | 'SHIFT' | 'FLEX' | 'OTHER'
  },
) {
  const query = toQueryString({
    clientId,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 50,
    search: filters.search,
    establishmentId: filters.establishmentId,
    scheduleType: filters.scheduleType,
    isActive: filters.isActive,
  })

  return apiClient<SstPaginatedResponse<SstWorkSchedule>>(`/api/v1/sst/work-schedules${query}`)
}

export function getSstWorkScheduleById(id: string) {
  return apiClient<{ workSchedule: SstWorkSchedule }>(`/api/v1/sst/work-schedules/${id}`)
}

export function createSstWorkSchedule(input: {
  clientId: string
  establishmentId: string
  name: string
  scheduleType?: 'FIXED' | 'SHIFT' | 'FLEX' | 'OTHER'
  weeklyHours?: number
  shiftPattern?: string
  description?: string
  isActive?: boolean
}) {
  return apiClient<{ workSchedule: SstWorkSchedule }>('/api/v1/sst/work-schedules', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateSstWorkSchedule(
  id: string,
  input: {
    name?: string
    scheduleType?: 'FIXED' | 'SHIFT' | 'FLEX' | 'OTHER'
    weeklyHours?: number | null
    shiftPattern?: string | null
    description?: string | null
  },
) {
  return apiClient<{ workSchedule: SstWorkSchedule }>(`/api/v1/sst/work-schedules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function activateSstWorkSchedule(id: string) {
  return apiClient<{ workSchedule: SstWorkSchedule }>(`/api/v1/sst/work-schedules/${id}/activate`, {
    method: 'POST',
  })
}

export function deactivateSstWorkSchedule(id: string) {
  return apiClient<{ workSchedule: SstWorkSchedule }>(`/api/v1/sst/work-schedules/${id}/deactivate`, {
    method: 'POST',
  })
}
