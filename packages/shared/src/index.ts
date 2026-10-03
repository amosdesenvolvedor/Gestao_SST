import { z } from 'zod'

export const roles = [
  'SUPER_ADMIN',
  'ADMIN',
  'SST_MANAGER',
  'SAFETY_ENGINEER',
  'SAFETY_TECHNICIAN',
  'OCCUPATIONAL_PHYSICIAN',
  'RH',
  'FINANCIAL',
  'CLIENT',
  'VIEWER',
] as const

export const roleSchema = z.enum(roles)

export type Role = (typeof roles)[number]

export const permissions = [
  'dashboard.read',
  'users.read',
  'users.create',
  'users.update',
  'users.activate',
  'users.deactivate',
  'users.resetPassword',
  'professionals.read',
  'professionals.create',
  'professionals.update',
  'professionals.activate',
  'professionals.deactivate',
  'audit.read',
  'settings.read',
  'settings.update',
  'clients.read',
  'clients.create',
  'clients.update',
  'clients.activate',
  'clients.deactivate',
  'establishments.read',
  'establishments.create',
  'establishments.update',
  'establishments.activate',
  'establishments.deactivate',
  'establishments.setHeadquarters',
  'clientContacts.read',
  'clientContacts.create',
  'clientContacts.update',
  'clientContacts.activate',
  'clientContacts.deactivate',
  'clientContacts.setPrimary',
] as const

export const permissionSchema = z.enum(permissions)

export type Permission = (typeof permissions)[number]

const fullPermissions = new Set<Permission>(permissions)

export const rolePermissionsMatrix: Record<Role, Permission[]> = {
  SUPER_ADMIN: [...permissions],
  ADMIN: [
    'dashboard.read',
    'users.read',
    'users.create',
    'users.update',
    'users.activate',
    'users.deactivate',
    'users.resetPassword',
    'professionals.read',
    'professionals.create',
    'professionals.update',
    'professionals.activate',
    'professionals.deactivate',
    'settings.read',
    'settings.update',
    'clients.read',
    'clients.create',
    'clients.update',
    'clients.activate',
    'clients.deactivate',
    'establishments.read',
    'establishments.create',
    'establishments.update',
    'establishments.activate',
    'establishments.deactivate',
    'establishments.setHeadquarters',
    'clientContacts.read',
    'clientContacts.create',
    'clientContacts.update',
    'clientContacts.activate',
    'clientContacts.deactivate',
    'clientContacts.setPrimary',
  ],
  SST_MANAGER: [
    'dashboard.read',
    'professionals.read',
    'clients.read',
    'clients.create',
    'clients.update',
    'establishments.read',
    'establishments.create',
    'establishments.update',
    'clientContacts.read',
    'clientContacts.create',
    'clientContacts.update',
  ],
  SAFETY_ENGINEER: ['dashboard.read', 'professionals.read', 'clients.read', 'establishments.read', 'clientContacts.read'],
  SAFETY_TECHNICIAN: ['dashboard.read', 'professionals.read', 'clients.read', 'establishments.read', 'clientContacts.read'],
  OCCUPATIONAL_PHYSICIAN: ['dashboard.read', 'professionals.read', 'clients.read', 'establishments.read', 'clientContacts.read'],
  RH: [
    'dashboard.read',
    'users.read',
    'professionals.read',
    'professionals.create',
    'professionals.update',
    'clients.read',
    'clientContacts.read',
    'clientContacts.create',
    'clientContacts.update',
  ],
  FINANCIAL: ['dashboard.read', 'clients.read', 'clientContacts.read'],
  CLIENT: ['dashboard.read'],
  VIEWER: ['dashboard.read', 'professionals.read', 'clients.read', 'establishments.read', 'clientContacts.read'],
}

export function getPermissionsForRole(role: Role): Permission[] {
  return rolePermissionsMatrix[role] ?? []
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission)
}

export function isPermissionKnown(permission: string): permission is Permission {
  return fullPermissions.has(permission as Permission)
}

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

export type LoginInput = z.infer<typeof loginInputSchema>

export const safeUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: roleSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  lastLoginAt: z.string().nullable(),
})

export type SafeUser = z.infer<typeof safeUserSchema>

export const professionalTypes = [
  'OCCUPATIONAL_PHYSICIAN',
  'SAFETY_ENGINEER',
  'SAFETY_TECHNICIAN',
  'OTHER',
] as const

export const professionalTypeSchema = z.enum(professionalTypes)

export type ProfessionalType = (typeof professionalTypes)[number]

export const documentTypes = ['CNPJ', 'CPF', 'OTHER'] as const

export const documentTypeSchema = z.enum(documentTypes)

export type DocumentType = (typeof documentTypes)[number]

export const clientStatuses = ['PROSPECT', 'ACTIVE', 'INACTIVE', 'SUSPENDED'] as const

export const clientStatusSchema = z.enum(clientStatuses)

export type ClientStatus = (typeof clientStatuses)[number]

export const establishmentStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const

export const establishmentStatusSchema = z.enum(establishmentStatuses)

export type EstablishmentStatus = (typeof establishmentStatuses)[number]

export const brStates = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const

export const brStateSchema = z.enum(brStates)

export type BrState = (typeof brStates)[number]

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function normalizePostalCode(value: string): string {
  return onlyDigits(value)
}

export function formatPostalCode(value: string): string {
  const digits = onlyDigits(value)
  if (digits.length !== 8) {
    return value
  }
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function normalizePhone(value: string): string {
  return onlyDigits(value)
}

export function formatPhone(value: string): string {
  const digits = onlyDigits(value)

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }

  return value
}

export function normalizeDocumentNumber(value: string): string {
  return onlyDigits(value)
}

function calcDigit(base: string, factors: number[]): number {
  const total = base
    .split('')
    .reduce((sum, char, index) => sum + Number(char) * factors[index], 0)
  const remainder = total % 11
  return remainder < 2 ? 0 : 11 - remainder
}

export function isValidCnpj(value: string): boolean {
  const cnpj = normalizeDocumentNumber(value)

  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false
  }

  const first = calcDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = calcDigit(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])

  return cnpj === `${cnpj.slice(0, 12)}${first}${second}`
}

export function formatCnpj(value: string): string {
  const cnpj = normalizeDocumentNumber(value)

  if (cnpj.length !== 14) {
    return value
  }

  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
}

export function isValidCpf(value: string): boolean {
  const cpf = normalizeDocumentNumber(value)

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false
  }

  const first = calcDigit(cpf.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = calcDigit(cpf.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])

  return cpf === `${cpf.slice(0, 9)}${first}${second}`
}

export function formatCpf(value: string): string {
  const cpf = normalizeDocumentNumber(value)

  if (cpf.length !== 11) {
    return value
  }

  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
}

export const paginatedQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().max(120).optional(),
})

export type PaginatedQuery = z.infer<typeof paginatedQuerySchema>