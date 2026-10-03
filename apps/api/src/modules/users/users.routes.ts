import type { FastifyInstance } from 'fastify'
import { authenticate, authorizePermissions } from '../../plugins/guards.js'
import {
  createUserBodySchema,
  listUsersQuerySchema,
  resetPasswordBodySchema,
  updateUserBodySchema,
  userIdParamsSchema,
} from './users.schema.js'
import {
  activateUserService,
  createUserService,
  deactivateUserService,
  getUserByIdService,
  listUsersService,
  resetUserPasswordService,
  updateUserService,
} from './users.service.js'

function handleUsersError(error: unknown, reply: { code: (status: number) => { send: (body: unknown) => unknown } }) {
  const message = error instanceof Error ? error.message : 'Erro ao processar usuario.'

  if (message.includes('nao encontrado')) {
    return reply.code(404).send({ message })
  }

  if (message.includes('Ja existe usuario')) {
    return reply.code(409).send({ message })
  }

  if (message.includes('Apenas') || message.includes('Nao e permitido')) {
    return reply.code(403).send({ message })
  }

  return reply.code(400).send({ message })
}

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  app.get('/users', { preHandler: [authorizePermissions(['users.read'])] }, async (request, reply) => {
    const parsed = listUsersQuerySchema.safeParse(request.query)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Query invalida.', issues: parsed.error.flatten() })
    }

    const page = parsed.data.page
    const pageSize = parsed.data.pageSize
    const skip = (page - 1) * pageSize

    const result = await listUsersService({
      page,
      pageSize,
      skip,
      take: pageSize,
      role: parsed.data.role,
      search: parsed.data.search,
      status: parsed.data.status,
    })

    return reply.send(result)
  })

  app.get('/users/:id', { preHandler: [authorizePermissions(['users.read'])] }, async (request, reply) => {
    const parsed = userIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    const user = await getUserByIdService(parsed.data.id)

    if (!user) {
      return reply.code(404).send({ message: 'Usuario nao encontrado.' })
    }

    return reply.send({ user })
  })

  app.post('/users', { preHandler: [authorizePermissions(['users.create'])] }, async (request, reply) => {
    const parsed = createUserBodySchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Dados invalidos.', issues: parsed.error.flatten() })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const user = await createUserService(request.authUser, {
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
        password: parsed.data.password,
        isActive: parsed.data.isActive,
      })

      return reply.code(201).send({ user })
    } catch (error) {
      return handleUsersError(error, reply)
    }
  })

  app.patch('/users/:id', { preHandler: [authorizePermissions(['users.update'])] }, async (request, reply) => {
    const parsedParams = userIdParamsSchema.safeParse(request.params)
    const parsedBody = updateUserBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const user = await updateUserService(request.authUser, parsedParams.data.id, parsedBody.data)
      return reply.send({ user })
    } catch (error) {
      return handleUsersError(error, reply)
    }
  })

  app.post(
    '/users/:id/activate',
    { preHandler: [authorizePermissions(['users.activate'])] },
    async (request, reply) => {
      const parsedParams = userIdParamsSchema.safeParse(request.params)

      if (!parsedParams.success) {
        return reply.code(400).send({ message: 'Identificador invalido.' })
      }

      if (!request.authUser) {
        return reply.code(401).send({ message: 'Nao autenticado.' })
      }

      try {
        const user = await activateUserService(request.authUser, parsedParams.data.id)
        return reply.send({ user })
      } catch (error) {
        return handleUsersError(error, reply)
      }
    },
  )

  app.post(
    '/users/:id/deactivate',
    { preHandler: [authorizePermissions(['users.deactivate'])] },
    async (request, reply) => {
      const parsedParams = userIdParamsSchema.safeParse(request.params)

      if (!parsedParams.success) {
        return reply.code(400).send({ message: 'Identificador invalido.' })
      }

      if (!request.authUser) {
        return reply.code(401).send({ message: 'Nao autenticado.' })
      }

      try {
        const user = await deactivateUserService(request.authUser, parsedParams.data.id)
        return reply.send({ user })
      } catch (error) {
        return handleUsersError(error, reply)
      }
    },
  )

  app.post(
    '/users/:id/reset-password',
    { preHandler: [authorizePermissions(['users.resetPassword'])] },
    async (request, reply) => {
      const parsedParams = userIdParamsSchema.safeParse(request.params)
      const parsedBody = resetPasswordBodySchema.safeParse(request.body)

      if (!parsedParams.success || !parsedBody.success) {
        return reply.code(400).send({ message: 'Dados invalidos.' })
      }

      if (!request.authUser) {
        return reply.code(401).send({ message: 'Nao autenticado.' })
      }

      try {
        const user = await resetUserPasswordService(
          request.authUser,
          parsedParams.data.id,
          parsedBody.data.newPassword,
        )

        return reply.send({ user })
      } catch (error) {
        return handleUsersError(error, reply)
      }
    },
  )

  app.get('/users/me/permissions', { preHandler: [authenticate] }, async (request, reply) => {
    return reply.send({
      permissions: request.authUser?.permissions ?? [],
    })
  })
}
