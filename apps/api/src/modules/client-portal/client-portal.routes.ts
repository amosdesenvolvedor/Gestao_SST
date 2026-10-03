import type { FastifyInstance } from 'fastify'
import { authorizePermissions } from '../../plugins/guards.js'
import {
  getClientPortalContextService,
  getClientPortalServiceByCodeService,
  listClientPortalContractsService,
  listClientPortalServicesService,
} from './client-portal.service.js'
import { clientPortalQuerySchema, clientPortalServiceCodeParamsSchema } from './client-portal.schema.js'

function handlePortalError(error: unknown, reply: { code: (status: number) => { send: (body: unknown) => unknown } }) {
  const message = error instanceof Error ? error.message : 'Erro ao processar portal do cliente.'

  if (message.includes('sem acesso') || message.includes('negado') || message.includes('autorizado')) {
    return reply.code(403).send({ message })
  }

  if (message.includes('nao encontrado')) {
    return reply.code(404).send({ message })
  }

  return reply.code(400).send({ message })
}

export async function clientPortalRoutes(app: FastifyInstance): Promise<void> {
  app.get('/client-portal/context', { preHandler: [authorizePermissions(['clientPortal.access'])] }, async (request, reply) => {
    const parsedQuery = clientPortalQuerySchema.safeParse(request.query)

    if (!parsedQuery.success) {
      return reply.code(400).send({ message: 'Query invalida.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const result = await getClientPortalContextService({
        actor: request.authUser,
        selectedClientId: parsedQuery.data.clientId,
      })
      return reply.send(result)
    } catch (error) {
      return handlePortalError(error, reply)
    }
  })

  app.get('/client-portal/services', { preHandler: [authorizePermissions(['clientPortal.services.read'])] }, async (request, reply) => {
    const parsedQuery = clientPortalQuerySchema.safeParse(request.query)

    if (!parsedQuery.success) {
      return reply.code(400).send({ message: 'Query invalida.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const result = await listClientPortalServicesService({
        actor: request.authUser,
        selectedClientId: parsedQuery.data.clientId,
        establishmentId: parsedQuery.data.establishmentId,
      })
      return reply.send(result)
    } catch (error) {
      return handlePortalError(error, reply)
    }
  })

  app.get('/client-portal/services/:code', { preHandler: [authorizePermissions(['clientPortal.services.read'])] }, async (request, reply) => {
    const parsedParams = clientPortalServiceCodeParamsSchema.safeParse(request.params)
    const parsedQuery = clientPortalQuerySchema.safeParse(request.query)

    if (!parsedParams.success || !parsedQuery.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const result = await getClientPortalServiceByCodeService({
        actor: request.authUser,
        selectedClientId: parsedQuery.data.clientId,
        establishmentId: parsedQuery.data.establishmentId,
        code: parsedParams.data.code,
      })

      if (!result) {
        return reply.code(404).send({ message: 'Servico nao encontrado para o cliente atual.' })
      }

      return reply.send(result)
    } catch (error) {
      return handlePortalError(error, reply)
    }
  })

  app.get('/client-portal/contracts', { preHandler: [authorizePermissions(['clientPortal.contracts.read'])] }, async (request, reply) => {
    const parsedQuery = clientPortalQuerySchema.safeParse(request.query)

    if (!parsedQuery.success) {
      return reply.code(400).send({ message: 'Query invalida.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const result = await listClientPortalContractsService({
        actor: request.authUser,
        selectedClientId: parsedQuery.data.clientId,
        establishmentId: parsedQuery.data.establishmentId,
      })
      return reply.send(result)
    } catch (error) {
      return handlePortalError(error, reply)
    }
  })
}
