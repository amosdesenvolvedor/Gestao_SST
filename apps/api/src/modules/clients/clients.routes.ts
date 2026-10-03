import type { FastifyInstance } from 'fastify'
import { authorizePermissions } from '../../plugins/guards.js'
import {
  activateClientContactService,
  activateClientService,
  activateEstablishmentService,
  createClientContactService,
  createClientService,
  createEstablishmentService,
  deactivateClientContactService,
  deactivateClientService,
  deactivateEstablishmentService,
  getClientByIdService,
  getClientContactByIdService,
  getEstablishmentByIdService,
  listClientContactsService,
  listClientEstablishmentsService,
  listClientsService,
  setClientContactAsPrimaryService,
  setEstablishmentAsHeadquartersService,
  updateClientContactService,
  updateClientService,
  updateEstablishmentService,
} from './clients.service.js'
import {
  clientContactIdParamsSchema,
  clientIdParamsSchema,
  createClientBodySchema,
  createClientContactBodySchema,
  createEstablishmentBodySchema,
  establishmentIdParamsSchema,
  listClientContactsByClientQuerySchema,
  listClientsQuerySchema,
  listEstablishmentsByClientQuerySchema,
  updateClientBodySchema,
  updateClientContactBodySchema,
  updateEstablishmentBodySchema,
} from './clients.schema.js'

function handleClientsError(error: unknown, reply: { code: (status: number) => { send: (body: unknown) => unknown } }) {
  const message = error instanceof Error ? error.message : 'Erro ao processar requisicao de clientes.'

  if (message.includes('nao encontrado')) {
    return reply.code(404).send({ message })
  }

  if (message.includes('ja possui matriz') || message.includes('ja cadastrado')) {
    return reply.code(409).send({ message })
  }

  if (message.includes('invalido')) {
    return reply.code(400).send({ message })
  }

  return reply.code(400).send({ message })
}

export async function clientsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/clients', { preHandler: [authorizePermissions(['clients.read'])] }, async (request, reply) => {
    const parsed = listClientsQuerySchema.safeParse(request.query)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Query invalida.', issues: parsed.error.flatten() })
    }

    const page = parsed.data.page
    const pageSize = parsed.data.pageSize

    const response = await listClientsService({
      page,
      pageSize,
      skip: (page - 1) * pageSize,
      take: pageSize,
      search: parsed.data.search,
      status: parsed.data.status,
    })

    return reply.send(response)
  })

  app.get('/clients/:id', { preHandler: [authorizePermissions(['clients.read'])] }, async (request, reply) => {
    const parsed = clientIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    const client = await getClientByIdService(parsed.data.id)

    if (!client) {
      return reply.code(404).send({ message: 'Cliente nao encontrado.' })
    }

    return reply.send({ client })
  })

  app.post('/clients', { preHandler: [authorizePermissions(['clients.create'])] }, async (request, reply) => {
    const parsed = createClientBodySchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Dados invalidos.', issues: parsed.error.flatten() })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const client = await createClientService(request.authUser, parsed.data)
      return reply.code(201).send({ client })
    } catch (error) {
      return handleClientsError(error, reply)
    }
  })

  app.patch('/clients/:id', { preHandler: [authorizePermissions(['clients.update'])] }, async (request, reply) => {
    const parsedParams = clientIdParamsSchema.safeParse(request.params)
    const parsedBody = updateClientBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const client = await updateClientService(request.authUser, parsedParams.data.id, parsedBody.data)
      return reply.send({ client })
    } catch (error) {
      return handleClientsError(error, reply)
    }
  })

  app.post(
    '/clients/:id/activate',
    { preHandler: [authorizePermissions(['clients.activate'])] },
    async (request, reply) => {
      const parsed = clientIdParamsSchema.safeParse(request.params)

      if (!parsed.success) {
        return reply.code(400).send({ message: 'Identificador invalido.' })
      }

      if (!request.authUser) {
        return reply.code(401).send({ message: 'Nao autenticado.' })
      }

      try {
        const client = await activateClientService(request.authUser, parsed.data.id)
        return reply.send({ client })
      } catch (error) {
        return handleClientsError(error, reply)
      }
    },
  )

  app.post(
    '/clients/:id/deactivate',
    { preHandler: [authorizePermissions(['clients.deactivate'])] },
    async (request, reply) => {
      const parsed = clientIdParamsSchema.safeParse(request.params)

      if (!parsed.success) {
        return reply.code(400).send({ message: 'Identificador invalido.' })
      }

      if (!request.authUser) {
        return reply.code(401).send({ message: 'Nao autenticado.' })
      }

      try {
        const client = await deactivateClientService(request.authUser, parsed.data.id)
        return reply.send({ client })
      } catch (error) {
        return handleClientsError(error, reply)
      }
    },
  )

  app.get(
    '/clients/:id/establishments',
    { preHandler: [authorizePermissions(['establishments.read'])] },
    async (request, reply) => {
      const parsedParams = clientIdParamsSchema.safeParse(request.params)
      const parsedQuery = listEstablishmentsByClientQuerySchema.safeParse(request.query)

      if (!parsedParams.success || !parsedQuery.success) {
        return reply.code(400).send({ message: 'Dados invalidos.' })
      }

      try {
        const page = parsedQuery.data.page
        const pageSize = parsedQuery.data.pageSize

        const result = await listClientEstablishmentsService({
          clientId: parsedParams.data.id,
          page,
          pageSize,
          skip: (page - 1) * pageSize,
          take: pageSize,
          search: parsedQuery.data.search,
          status: parsedQuery.data.status,
          city: parsedQuery.data.city,
          state: parsedQuery.data.state,
          isHeadquarters: parsedQuery.data.isHeadquarters,
        })

        return reply.send(result)
      } catch (error) {
        return handleClientsError(error, reply)
      }
    },
  )

  app.post(
    '/clients/:id/establishments',
    { preHandler: [authorizePermissions(['establishments.create'])] },
    async (request, reply) => {
      const parsedParams = clientIdParamsSchema.safeParse(request.params)
      const parsedBody = createEstablishmentBodySchema.safeParse(request.body)

      if (!parsedParams.success || !parsedBody.success) {
        return reply.code(400).send({ message: 'Dados invalidos.' })
      }

      if (!request.authUser) {
        return reply.code(401).send({ message: 'Nao autenticado.' })
      }

      try {
        const establishment = await createEstablishmentService(
          request.authUser,
          parsedParams.data.id,
          parsedBody.data,
        )
        return reply.code(201).send({ establishment })
      } catch (error) {
        return handleClientsError(error, reply)
      }
    },
  )

  app.get(
    '/establishments/:id',
    { preHandler: [authorizePermissions(['establishments.read'])] },
    async (request, reply) => {
      const parsed = establishmentIdParamsSchema.safeParse(request.params)

      if (!parsed.success) {
        return reply.code(400).send({ message: 'Identificador invalido.' })
      }

      const establishment = await getEstablishmentByIdService(parsed.data.id)
      if (!establishment) {
        return reply.code(404).send({ message: 'Estabelecimento nao encontrado.' })
      }

      return reply.send({ establishment })
    },
  )

  app.patch(
    '/establishments/:id',
    { preHandler: [authorizePermissions(['establishments.update'])] },
    async (request, reply) => {
      const parsedParams = establishmentIdParamsSchema.safeParse(request.params)
      const parsedBody = updateEstablishmentBodySchema.safeParse(request.body)

      if (!parsedParams.success || !parsedBody.success) {
        return reply.code(400).send({ message: 'Dados invalidos.' })
      }

      if (!request.authUser) {
        return reply.code(401).send({ message: 'Nao autenticado.' })
      }

      try {
        const establishment = await updateEstablishmentService(
          request.authUser,
          parsedParams.data.id,
          parsedBody.data,
        )
        return reply.send({ establishment })
      } catch (error) {
        return handleClientsError(error, reply)
      }
    },
  )

  app.post(
    '/establishments/:id/activate',
    { preHandler: [authorizePermissions(['establishments.activate'])] },
    async (request, reply) => {
      const parsed = establishmentIdParamsSchema.safeParse(request.params)

      if (!parsed.success) {
        return reply.code(400).send({ message: 'Identificador invalido.' })
      }

      if (!request.authUser) {
        return reply.code(401).send({ message: 'Nao autenticado.' })
      }

      try {
        const establishment = await activateEstablishmentService(request.authUser, parsed.data.id)
        return reply.send({ establishment })
      } catch (error) {
        return handleClientsError(error, reply)
      }
    },
  )

  app.post(
    '/establishments/:id/deactivate',
    { preHandler: [authorizePermissions(['establishments.deactivate'])] },
    async (request, reply) => {
      const parsed = establishmentIdParamsSchema.safeParse(request.params)

      if (!parsed.success) {
        return reply.code(400).send({ message: 'Identificador invalido.' })
      }

      if (!request.authUser) {
        return reply.code(401).send({ message: 'Nao autenticado.' })
      }

      try {
        const establishment = await deactivateEstablishmentService(request.authUser, parsed.data.id)
        return reply.send({ establishment })
      } catch (error) {
        return handleClientsError(error, reply)
      }
    },
  )

  app.post(
    '/establishments/:id/set-headquarters',
    { preHandler: [authorizePermissions(['establishments.setHeadquarters'])] },
    async (request, reply) => {
      const parsed = establishmentIdParamsSchema.safeParse(request.params)

      if (!parsed.success) {
        return reply.code(400).send({ message: 'Identificador invalido.' })
      }

      if (!request.authUser) {
        return reply.code(401).send({ message: 'Nao autenticado.' })
      }

      try {
        const establishment = await setEstablishmentAsHeadquartersService(request.authUser, parsed.data.id)
        return reply.send({ establishment })
      } catch (error) {
        return handleClientsError(error, reply)
      }
    },
  )

  app.get(
    '/clients/:id/contacts',
    { preHandler: [authorizePermissions(['clientContacts.read'])] },
    async (request, reply) => {
      const parsedParams = clientIdParamsSchema.safeParse(request.params)
      const parsedQuery = listClientContactsByClientQuerySchema.safeParse(request.query)

      if (!parsedParams.success || !parsedQuery.success) {
        return reply.code(400).send({ message: 'Dados invalidos.' })
      }

      try {
        const page = parsedQuery.data.page
        const pageSize = parsedQuery.data.pageSize

        const result = await listClientContactsService({
          clientId: parsedParams.data.id,
          page,
          pageSize,
          skip: (page - 1) * pageSize,
          take: pageSize,
          search: parsedQuery.data.search,
          isActive: parsedQuery.data.isActive,
        })

        return reply.send(result)
      } catch (error) {
        return handleClientsError(error, reply)
      }
    },
  )

  app.post(
    '/clients/:id/contacts',
    { preHandler: [authorizePermissions(['clientContacts.create'])] },
    async (request, reply) => {
      const parsedParams = clientIdParamsSchema.safeParse(request.params)
      const parsedBody = createClientContactBodySchema.safeParse(request.body)

      if (!parsedParams.success || !parsedBody.success) {
        return reply.code(400).send({ message: 'Dados invalidos.' })
      }

      if (!request.authUser) {
        return reply.code(401).send({ message: 'Nao autenticado.' })
      }

      try {
        const contact = await createClientContactService(request.authUser, parsedParams.data.id, parsedBody.data)
        return reply.code(201).send({ contact })
      } catch (error) {
        return handleClientsError(error, reply)
      }
    },
  )

  app.get(
    '/client-contacts/:id',
    { preHandler: [authorizePermissions(['clientContacts.read'])] },
    async (request, reply) => {
      const parsed = clientContactIdParamsSchema.safeParse(request.params)

      if (!parsed.success) {
        return reply.code(400).send({ message: 'Identificador invalido.' })
      }

      const contact = await getClientContactByIdService(parsed.data.id)
      if (!contact) {
        return reply.code(404).send({ message: 'Contato do cliente nao encontrado.' })
      }

      return reply.send({ contact })
    },
  )

  app.patch(
    '/client-contacts/:id',
    { preHandler: [authorizePermissions(['clientContacts.update'])] },
    async (request, reply) => {
      const parsedParams = clientContactIdParamsSchema.safeParse(request.params)
      const parsedBody = updateClientContactBodySchema.safeParse(request.body)

      if (!parsedParams.success || !parsedBody.success) {
        return reply.code(400).send({ message: 'Dados invalidos.' })
      }

      if (!request.authUser) {
        return reply.code(401).send({ message: 'Nao autenticado.' })
      }

      try {
        const contact = await updateClientContactService(request.authUser, parsedParams.data.id, parsedBody.data)
        return reply.send({ contact })
      } catch (error) {
        return handleClientsError(error, reply)
      }
    },
  )

  app.post(
    '/client-contacts/:id/activate',
    { preHandler: [authorizePermissions(['clientContacts.activate'])] },
    async (request, reply) => {
      const parsed = clientContactIdParamsSchema.safeParse(request.params)

      if (!parsed.success) {
        return reply.code(400).send({ message: 'Identificador invalido.' })
      }

      if (!request.authUser) {
        return reply.code(401).send({ message: 'Nao autenticado.' })
      }

      try {
        const contact = await activateClientContactService(request.authUser, parsed.data.id)
        return reply.send({ contact })
      } catch (error) {
        return handleClientsError(error, reply)
      }
    },
  )

  app.post(
    '/client-contacts/:id/deactivate',
    { preHandler: [authorizePermissions(['clientContacts.deactivate'])] },
    async (request, reply) => {
      const parsed = clientContactIdParamsSchema.safeParse(request.params)

      if (!parsed.success) {
        return reply.code(400).send({ message: 'Identificador invalido.' })
      }

      if (!request.authUser) {
        return reply.code(401).send({ message: 'Nao autenticado.' })
      }

      try {
        const contact = await deactivateClientContactService(request.authUser, parsed.data.id)
        return reply.send({ contact })
      } catch (error) {
        return handleClientsError(error, reply)
      }
    },
  )

  app.post(
    '/client-contacts/:id/set-primary',
    { preHandler: [authorizePermissions(['clientContacts.setPrimary'])] },
    async (request, reply) => {
      const parsed = clientContactIdParamsSchema.safeParse(request.params)

      if (!parsed.success) {
        return reply.code(400).send({ message: 'Identificador invalido.' })
      }

      if (!request.authUser) {
        return reply.code(401).send({ message: 'Nao autenticado.' })
      }

      try {
        const contact = await setClientContactAsPrimaryService(request.authUser, parsed.data.id)
        return reply.send({ contact })
      } catch (error) {
        return handleClientsError(error, reply)
      }
    },
  )
}
