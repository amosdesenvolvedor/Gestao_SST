import '@fastify/jwt'
import { getPermissionsForRole, type Permission, type Role } from '@gestao-sst/shared'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { clearAuthCookie } from '../lib/jwt.js'
import { prisma } from '../lib/prisma.js'

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const payload = await request.jwtVerify<{ sub: string; role: Role }>({
      onlyCookie: true,
    })

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        isActive: true,
      },
    })

    if (!user || !user.isActive) {
      clearAuthCookie(reply)
      reply.code(401).send({ message: 'Sessao invalida ou expirada.' })
      return
    }

    request.authUser = {
      id: user.id,
      role: user.role,
      permissions: getPermissionsForRole(user.role),
    }
  } catch {
    clearAuthCookie(reply)
    reply.code(401).send({ message: 'Sessao invalida ou expirada.' })
  }
}

export function authorizePermissions(requiredPermissions: Permission[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await authenticate(request, reply)

    if (reply.sent || !request.authUser) {
      return
    }

    const hasAllPermissions = requiredPermissions.every((permission) =>
      request.authUser?.permissions.includes(permission),
    )

    if (!hasAllPermissions) {
      reply.code(403).send({ message: 'Acesso negado.' })
    }
  }
}