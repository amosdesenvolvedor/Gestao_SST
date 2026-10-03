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
  ],
  SST_MANAGER: ['dashboard.read', 'professionals.read'],
  SAFETY_ENGINEER: ['dashboard.read', 'professionals.read'],
  SAFETY_TECHNICIAN: ['dashboard.read', 'professionals.read'],
  OCCUPATIONAL_PHYSICIAN: ['dashboard.read', 'professionals.read'],
  RH: ['dashboard.read', 'users.read', 'professionals.read', 'professionals.create', 'professionals.update'],
  FINANCIAL: ['dashboard.read'],
  CLIENT: ['dashboard.read'],
  VIEWER: ['dashboard.read', 'professionals.read'],
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

export const paginatedQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().max(120).optional(),
})

export type PaginatedQuery = z.infer<typeof paginatedQuerySchema>