import type { SafeUser } from '@gestao-sst/shared'
import { verifyPassword } from '../../lib/password.js'
import { findUserByEmail, findUserById, touchUserLastLogin } from './auth.repository.js'

function toSafeUser(user: {
  id: string
  email: string
  name: string | null
  role: SafeUser['role']
  isActive: boolean
  createdAt: Date
  lastLoginAt: Date | null
}): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  }
}

export async function loginWithPassword(email: string, password: string): Promise<SafeUser | null> {
  const user = await findUserByEmail(email)

  if (!user || !user.isActive) {
    return null
  }

  const isValid = await verifyPassword(user.passwordHash, password)

  if (!isValid) {
    return null
  }

  const updatedUser = await touchUserLastLogin(user.id)

  return toSafeUser(updatedUser)
}

export async function getSafeUserById(id: string): Promise<SafeUser | null> {
  const user = await findUserById(id)

  if (!user || !user.isActive) {
    return null
  }

  return toSafeUser(user)
}