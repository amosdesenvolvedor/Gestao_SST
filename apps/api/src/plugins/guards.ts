import '@fastify/jwt'
import type { Role } from '@gestao-sst/shared'
import type { FastifyReply, FastifyRequest } from 'fastify'

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const payload = await request.jwtVerify<{ sub: string; role: Role }>({
      onlyCookie: true,
    })

    request.authUser = {
      id: payload.sub,
      role: payload.role,
    }
  } catch {
    reply.code(401).send({ message: 'Sessao invalida ou expirada.' })
  }
}

export function authorize(allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await authenticate(request, reply)

    if (reply.sent || !request.authUser) {
      return
    }

    if (!allowedRoles.includes(request.authUser.role)) {
      reply.code(403).send({ message: 'Acesso negado.' })
    }
  }
}