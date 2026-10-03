import type { FastifyInstance } from 'fastify'
import { clearAuthCookie, setAuthCookie } from '../../lib/jwt.js'
import { authenticate } from '../../plugins/guards.js'
import { loginBodySchema } from './auth.schema.js'
import { getSafeUserById, loginWithPassword } from './auth.service.js'

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    return {
      service: 'gestao-sst-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  })

  app.post('/auth/login', async (request, reply) => {
    const parsed = loginBodySchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Dados de login invalidos.',
        issues: parsed.error.flatten(),
      })
    }

    const user = await loginWithPassword(parsed.data.email, parsed.data.password)

    if (!user) {
      return reply.code(401).send({ message: 'Email ou senha invalidos.' })
    }

    const token = await reply.jwtSign(
      {
        sub: user.id,
        role: user.role,
      },
    )

    setAuthCookie(reply, token)

    return reply.send({ user })
  })

  app.post('/auth/logout', async (_request, reply) => {
    clearAuthCookie(reply)

    return reply.code(204).send()
  })

  app.get('/auth/me', { preHandler: [authenticate] }, async (request, reply) => {
    if (!request.authUser?.id) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    const user = await getSafeUserById(request.authUser.id)

    if (!user) {
      clearAuthCookie(reply)
      return reply.code(401).send({ message: 'Sessao invalida.' })
    }

    return reply.send({ user })
  })
}