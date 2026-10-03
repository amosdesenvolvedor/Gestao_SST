import type {
  ClientStatus,
  DocumentType,
  EstablishmentStatus,
} from '@gestao-sst/shared'
import { apiClient } from '@/lib/api-client'
import type {
  Client,
  ClientContact,
  ClientMembership,
  Establishment,
  PaginatedResponse,
} from '@/types/clients'

type ListFilters = {
  page: number
  pageSize: number
  search?: string
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

export function listClients(filters: ListFilters & { status?: ClientStatus }) {
  const query = toQueryString(filters)
  return apiClient<PaginatedResponse<Client>>(`/api/v1/clients${query}`)
}

export function getClientById(id: string) {
  return apiClient<{ client: Client }>(`/api/v1/clients/${id}`)
}

export function createClient(input: {
  legalName: string
  tradeName?: string
  taxIdType?: DocumentType
  taxIdNumber?: string
  stateRegistration?: string
  municipalRegistration?: string
  cnaeMain?: string
  cnaeSecondary?: string[]
  sizeCategory?: string
  status?: ClientStatus
  notes?: string
}) {
  return apiClient<{ client: Client }>('/api/v1/clients', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateClient(
  id: string,
  input: {
    legalName?: string
    tradeName?: string | null
    taxIdType?: DocumentType | null
    taxIdNumber?: string | null
    stateRegistration?: string | null
    municipalRegistration?: string | null
    cnaeMain?: string | null
    cnaeSecondary?: string[]
    sizeCategory?: string | null
    status?: ClientStatus
    notes?: string | null
  },
) {
  return apiClient<{ client: Client }>(`/api/v1/clients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function activateClient(id: string) {
  return apiClient<{ client: Client }>(`/api/v1/clients/${id}/activate`, {
    method: 'POST',
  })
}

export function deactivateClient(id: string) {
  return apiClient<{ client: Client }>(`/api/v1/clients/${id}/deactivate`, {
    method: 'POST',
  })
}

export function listClientEstablishments(
  clientId: string,
  filters: ListFilters & {
    status?: EstablishmentStatus
    city?: string
    state?: string
    isHeadquarters?: boolean
  },
) {
  const query = toQueryString(filters)
  return apiClient<PaginatedResponse<Establishment>>(`/api/v1/clients/${clientId}/establishments${query}`)
}

export function createEstablishment(
  clientId: string,
  input: {
    nickname?: string
    taxIdType?: DocumentType
    taxIdNumber?: string
    stateRegistration?: string
    isHeadquarters?: boolean
    status?: EstablishmentStatus
    cnaeMain?: string
    cnaeSecondary?: string[]
    employeeCount?: number
    contactEmail?: string
    contactPhone?: string
    postalCode: string
    street: string
    number: string
    complement?: string
    neighborhood: string
    city: string
    state: string
  },
) {
  return apiClient<{ establishment: Establishment }>(`/api/v1/clients/${clientId}/establishments`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateEstablishment(
  id: string,
  input: {
    nickname?: string | null
    taxIdType?: DocumentType | null
    taxIdNumber?: string | null
    stateRegistration?: string | null
    isHeadquarters?: boolean
    status?: EstablishmentStatus
    cnaeMain?: string | null
    cnaeSecondary?: string[]
    employeeCount?: number | null
    contactEmail?: string | null
    contactPhone?: string | null
    postalCode?: string
    street?: string
    number?: string
    complement?: string | null
    neighborhood?: string
    city?: string
    state?: string
  },
) {
  return apiClient<{ establishment: Establishment }>(`/api/v1/establishments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function setHeadquarters(id: string) {
  return apiClient<{ establishment: Establishment }>(`/api/v1/establishments/${id}/set-headquarters`, {
    method: 'POST',
  })
}

export function activateEstablishment(id: string) {
  return apiClient<{ establishment: Establishment }>(`/api/v1/establishments/${id}/activate`, {
    method: 'POST',
  })
}

export function deactivateEstablishment(id: string) {
  return apiClient<{ establishment: Establishment }>(`/api/v1/establishments/${id}/deactivate`, {
    method: 'POST',
  })
}

export function listClientContacts(
  clientId: string,
  filters: ListFilters & {
    isActive?: 'active' | 'inactive'
  },
) {
  const query = toQueryString(filters)
  return apiClient<PaginatedResponse<ClientContact>>(`/api/v1/clients/${clientId}/contacts${query}`)
}

export function createClientContact(
  clientId: string,
  input: {
    name: string
    role?: string
    department?: string
    email?: string
    phone: string
    preferredChannel?: 'EMAIL' | 'PHONE' | 'WHATSAPP'
    isPrimary?: boolean
    receivesBilling?: boolean
    receivesReports?: boolean
    receivesAlerts?: boolean
    isActive?: boolean
  },
) {
  return apiClient<{ contact: ClientContact }>(`/api/v1/clients/${clientId}/contacts`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateClientContact(
  id: string,
  input: {
    name?: string
    role?: string | null
    department?: string | null
    email?: string | null
    phone?: string
    preferredChannel?: 'EMAIL' | 'PHONE' | 'WHATSAPP' | null
    isPrimary?: boolean
    receivesBilling?: boolean
    receivesReports?: boolean
    receivesAlerts?: boolean
    isActive?: boolean
  },
) {
  return apiClient<{ contact: ClientContact }>(`/api/v1/client-contacts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function setPrimaryContact(id: string) {
  return apiClient<{ contact: ClientContact }>(`/api/v1/client-contacts/${id}/set-primary`, {
    method: 'POST',
  })
}

export function activateClientContact(id: string) {
  return apiClient<{ contact: ClientContact }>(`/api/v1/client-contacts/${id}/activate`, {
    method: 'POST',
  })
}

export function deactivateClientContact(id: string) {
  return apiClient<{ contact: ClientContact }>(`/api/v1/client-contacts/${id}/deactivate`, {
    method: 'POST',
  })
}

export function listClientPortalUsers(clientId: string) {
  return apiClient<{ data: ClientMembership[] }>(`/api/v1/clients/${clientId}/portal-users`)
}

export function createClientPortalAccess(
  clientId: string,
  input: {
    name: string
    email: string
    password: string
    confirmPassword: string
  },
) {
  return apiClient<{
    user: {
      id: string
      name: string | null
      email: string
      role: string
      isActive: boolean
      createdAt: string
      updatedAt: string
      lastLoginAt: string | null
    }
    membership: ClientMembership
  }>(`/api/v1/clients/${clientId}/portal-users/create-access`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function linkExistingClientPortalUser(clientId: string, userId: string) {
  return apiClient<{ membership: ClientMembership }>(`/api/v1/clients/${clientId}/portal-users/link-existing`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}

export function activateClientMembership(id: string) {
  return apiClient<{ membership: ClientMembership }>(`/api/v1/client-memberships/${id}/activate`, {
    method: 'POST',
  })
}

export function deactivateClientMembership(id: string) {
  return apiClient<{ membership: ClientMembership }>(`/api/v1/client-memberships/${id}/deactivate`, {
    method: 'POST',
  })
}

export function removeClientMembership(id: string) {
  return apiClient<void>(`/api/v1/client-memberships/${id}/remove`, {
    method: 'POST',
  })
}
