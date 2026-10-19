export type SstIsActiveFilter = 'active' | 'inactive'

export type SstPagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type SstPaginatedResponse<T> = {
  data: T[]
  pagination: SstPagination
}

export type SstSector = {
  id: string
  clientId: string
  establishmentId: string
  code: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type SstWorkEnvironment = {
  id: string
  clientId: string
  establishmentId: string
  sectorId: string
  code: string
  name: string
  description: string | null
  indoorOutdoorType: 'INDOOR' | 'OUTDOOR' | 'MIXED'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type SstRole = {
  id: string
  clientId: string
  title: string
  cboCode: string | null
  cboDescription: string | null
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type SstActivity = {
  id: string
  clientId: string
  roleId: string
  title: string
  frequency: 'ROUTINE' | 'NON_ROUTINE' | 'EVENTUAL'
  description: string | null
  isCritical: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type SstWorkSchedule = {
  id: string
  clientId: string
  establishmentId: string
  name: string
  scheduleType: 'FIXED' | 'SHIFT' | 'FLEX' | 'OTHER'
  weeklyHours: number | null
  shiftPattern: string | null
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}
