import type { Role } from '@prisma/client'
import type { AuthUser } from '../../plugins/auth.js'
import { hashPassword } from '../../lib/password.js'
import { createAuditLog } from '../../shared/audit.js'
import {
  countActiveSuperAdmins,
  countUsers,
  createUser,
  findSafeUserById,
  findUserByEmail,
  findUserById,
  listUsers,
  type SafeUserRecord,
  updateUser,
} from './users.repository.js'

type ListUsersInput = {
  page: number
  pageSize: number
  skip: number
  take: number
  search?: string
  role?: Role
  status?: 'active' | 'inactive'
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function assertPrivilegedTargetPolicy(actor: AuthUser, target: { id: string; role: Role }): void {
  if (actor.role !== 'SUPER_ADMIN' && target.role === 'SUPER_ADMIN') {
    throw new Error('Apenas SUPER_ADMIN pode administrar contas SUPER_ADMIN.')
  }
}

async function assertCanDeactivate(actor: AuthUser, target: { id: string; role: Role }): Promise<void> {
  assertPrivilegedTargetPolicy(actor, target)

  if (actor.id === target.id) {
    throw new Error('Nao e permitido desativar a propria conta.')
  }

  if (target.role === 'SUPER_ADMIN') {
    const activeSuperAdmins = await countActiveSuperAdmins()
    if (activeSuperAdmins <= 1) {
      throw new Error('Nao e permitido desativar o ultimo SUPER_ADMIN ativo.')
    }
  }
}

function assertRoleChangePolicy(actor: AuthUser, target: { id: string; role: Role }, newRole: Role): void {
  if (actor.id === target.id && target.role !== newRole) {
    throw new Error('Nao e permitido alterar o proprio papel de acesso.')
  }

  if (actor.role !== 'SUPER_ADMIN' && (target.role === 'SUPER_ADMIN' || newRole === 'SUPER_ADMIN')) {
    throw new Error('Apenas SUPER_ADMIN pode atribuir ou alterar SUPER_ADMIN.')
  }
}

function mapUser(user: SafeUserRecord) {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  }
}

export async function listUsersService(input: ListUsersInput) {
  const where = {
    AND: [
      input.search
        ? {
            OR: [
              {
                name: {
                  contains: input.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                email: {
                  contains: input.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {},
      input.role ? { role: input.role } : {},
      input.status ? { isActive: input.status === 'active' } : {},
    ],
  }

  const [items, total] = await Promise.all([
    listUsers({ where, skip: input.skip, take: input.take }),
    countUsers(where),
  ])

  return {
    data: items.map(mapUser),
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    },
  }
}

export async function getUserByIdService(id: string) {
  const user = await findSafeUserById(id)

  if (!user) {
    return null
  }

  return mapUser(user)
}

export async function createUserService(
  actor: AuthUser,
  input: {
    name: string
    email: string
    role: Role
    password: string
    isActive: boolean
  },
) {
  if (actor.role !== 'SUPER_ADMIN' && input.role === 'SUPER_ADMIN') {
    throw new Error('Apenas SUPER_ADMIN pode criar conta SUPER_ADMIN.')
  }

  const normalizedEmail = normalizeEmail(input.email)
  const existing = await findUserByEmail(normalizedEmail)

  if (existing) {
    throw new Error('Ja existe usuario com este e-mail.')
  }

  const passwordHash = await hashPassword(input.password)
  const created = await createUser({
    name: input.name,
    email: normalizedEmail,
    role: input.role,
    passwordHash,
    isActive: input.isActive,
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'USER_CREATED',
    entity: 'User',
    entityId: created.id,
    metadata: {
      role: created.role,
      isActive: created.isActive,
    },
  })

  return mapUser(created)
}

export async function updateUserService(
  actor: AuthUser,
  targetUserId: string,
  input: {
    name?: string
    email?: string
    role?: Role
  },
) {
  const target = await findUserById(targetUserId)

  if (!target) {
    throw new Error('Usuario nao encontrado.')
  }

  assertPrivilegedTargetPolicy(actor, target)

  const data: {
    name?: string
    email?: string
    role?: Role
  } = {}

  if (typeof input.name !== 'undefined') {
    data.name = input.name
  }

  if (typeof input.email !== 'undefined') {
    const normalizedEmail = normalizeEmail(input.email)
    const duplicated = await findUserByEmail(normalizedEmail)
    if (duplicated && duplicated.id !== target.id) {
      throw new Error('Ja existe usuario com este e-mail.')
    }
    data.email = normalizedEmail
  }

  if (typeof input.role !== 'undefined') {
    assertRoleChangePolicy(actor, target, input.role)
    data.role = input.role
  }

  const updated = await updateUser(target.id, data)

  await createAuditLog({
    actorUserId: actor.id,
    action: input.role && input.role !== target.role ? 'USER_ROLE_CHANGED' : 'USER_UPDATED',
    entity: 'User',
    entityId: updated.id,
    metadata: {
      role: updated.role,
    },
  })

  return mapUser(updated)
}

export async function activateUserService(actor: AuthUser, targetUserId: string) {
  const target = await findUserById(targetUserId)

  if (!target) {
    throw new Error('Usuario nao encontrado.')
  }

  assertPrivilegedTargetPolicy(actor, target)

  const updated = await updateUser(target.id, { isActive: true })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'USER_ACTIVATED',
    entity: 'User',
    entityId: updated.id,
  })

  return mapUser(updated)
}

export async function deactivateUserService(actor: AuthUser, targetUserId: string) {
  const target = await findUserById(targetUserId)

  if (!target) {
    throw new Error('Usuario nao encontrado.')
  }

  await assertCanDeactivate(actor, target)

  const updated = await updateUser(target.id, { isActive: false })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'USER_DEACTIVATED',
    entity: 'User',
    entityId: updated.id,
  })

  return mapUser(updated)
}

export async function resetUserPasswordService(actor: AuthUser, targetUserId: string, newPassword: string) {
  const target = await findUserById(targetUserId)

  if (!target) {
    throw new Error('Usuario nao encontrado.')
  }

  assertPrivilegedTargetPolicy(actor, target)

  const passwordHash = await hashPassword(newPassword)
  const updated = await updateUser(target.id, {
    passwordHash,
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'USER_PASSWORD_RESET',
    entity: 'User',
    entityId: updated.id,
  })

  return mapUser(updated)
}
