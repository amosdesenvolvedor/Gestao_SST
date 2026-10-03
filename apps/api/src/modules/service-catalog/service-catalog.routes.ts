import type { FastifyInstance } from 'fastify'
import { authorizePermissions } from '../../plugins/guards.js'
import {
  activateServiceCatalogService,
  createServiceCatalogService,
  deactivateServiceCatalogService,
  getServiceCatalogByIdService,
  listServiceCatalogService,
  updateServiceCatalogService,
} from './service-catalog.service.js'
import {
  createServiceCatalogBodySchema,
  listServiceCatalogQuerySchema,
  serviceCatalogIdParamsSchema,
  updateServiceCatalogBodySchema,
} from './service-catalog.schema.js'

function handleServiceCatalogError(
  error: unknown,
  reply: { code: (status: number) => { send: (body: unknown) => unknown } },
) {
  const message = error instanceof Error ? error.message : 'Erro ao processar catalogo de servicos.'

  if (message.includes('nao encontrado')) {
    return reply.code(404).send({ message })
  }

  if (message.includes('Ja existe')) {
    return reply.code(409).send({ message })
  }

  if (message.includes('invalido')) {
    return reply.code(400).send({ message })
  }

  return reply.code(400).send({ message })
}

export async function serviceCatalogRoutes(app: FastifyInstance): Promise<void> {
  app.get('/services', { preHandler: [authorizePermissions(['serviceCatalog.read'])] }, async (request, reply) => {
    const parsed = listServiceCatalogQuerySchema.safeParse(request.query)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Query invalida.', issues: parsed.error.flatten() })
    }

    const page = parsed.data.page
    const pageSize = parsed.data.pageSize

    const result = await listServiceCatalogService({
      page,
      pageSize,
      skip: (page - 1) * pageSize,
      take: pageSize,
      search: parsed.data.search,
      category: parsed.data.category,
      isActive: parsed.data.isActive,
    })

    return reply.send(result)
  })

  app.get('/services/:id', { preHandler: [authorizePermissions(['serviceCatalog.read'])] }, async (request, reply) => {
    const parsed = serviceCatalogIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    const service = await getServiceCatalogByIdService(parsed.data.id)

    if (!service) {
      return reply.code(404).send({ message: 'Servico de catalogo nao encontrado.' })
    }

    return reply.send({ service })
  })

  app.post('/services', { preHandler: [authorizePermissions(['serviceCatalog.create'])] }, async (request, reply) => {
    const parsed = createServiceCatalogBodySchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Dados invalidos.', issues: parsed.error.flatten() })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const service = await createServiceCatalogService(request.authUser, parsed.data)
      return reply.code(201).send({ service })
    } catch (error) {
      return handleServiceCatalogError(error, reply)
    }
  })

  app.patch('/services/:id', { preHandler: [authorizePermissions(['serviceCatalog.update'])] }, async (request, reply) => {
    const parsedParams = serviceCatalogIdParamsSchema.safeParse(request.params)
    const parsedBody = updateServiceCatalogBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const service = await updateServiceCatalogService(request.authUser, parsedParams.data.id, parsedBody.data)
      return reply.send({ service })
    } catch (error) {
      return handleServiceCatalogError(error, reply)
    }
  })

  app.post('/services/:id/activate', { preHandler: [authorizePermissions(['serviceCatalog.activate'])] }, async (request, reply) => {
    const parsed = serviceCatalogIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const service = await activateServiceCatalogService(request.authUser, parsed.data.id)
      return reply.send({ service })
    } catch (error) {
      return handleServiceCatalogError(error, reply)
    }
  })

  app.post('/services/:id/deactivate', { preHandler: [authorizePermissions(['serviceCatalog.deactivate'])] }, async (request, reply) => {
    const parsed = serviceCatalogIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const service = await deactivateServiceCatalogService(request.authUser, parsed.data.id)
      return reply.send({ service })
    } catch (error) {
      return handleServiceCatalogError(error, reply)
    }
  })
}
