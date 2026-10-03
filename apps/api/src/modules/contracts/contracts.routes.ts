import type { FastifyInstance } from 'fastify'
import { authorizePermissions } from '../../plugins/guards.js'
import {
  addContractEstablishmentService,
  addContractServiceService,
  changeContractStatusService,
  createContractService,
  getContractByIdService,
  getContractServiceByIdService,
  listActiveContractServicesByClientService,
  listContractEstablishmentsService,
  listContractsByClientService,
  listContractsService,
  listContractServicesService,
  removeContractEstablishmentService,
  removeContractServiceItemService,
  updateContractService,
  updateContractServiceItemService,
} from './contracts.service.js'
import {
  addContractEstablishmentBodySchema,
  changeContractStatusBodySchema,
  contractIdParamsSchema,
  contractServiceIdParamsSchema,
  createContractBodySchema,
  createContractServiceBodySchema,
  listContractEstablishmentsQuerySchema,
  listContractsQuerySchema,
  listContractServicesQuerySchema,
  removeContractEstablishmentParamsSchema,
  removeContractServiceBodySchema,
  updateContractBodySchema,
  updateContractServiceBodySchema,
} from './contracts.schema.js'

function handleContractsError(
  error: unknown,
  reply: { code: (status: number) => { send: (body: unknown) => unknown } },
) {
  const message = error instanceof Error ? error.message : 'Erro ao processar contrato.'

  if (message.includes('nao encontrado')) {
    return reply.code(404).send({ message })
  }

  if (
    message.includes('ja cadastrado') ||
    message.includes('ja vinculado') ||
    message.includes('ja adicionado')
  ) {
    return reply.code(409).send({ message })
  }

  if (
    message.includes('invalido') ||
    message.includes('inconsistente') ||
    message.includes('bloqueada') ||
    message.includes('Transicao') ||
    message.includes('nao permite') ||
    message.includes('outro cliente')
  ) {
    return reply.code(400).send({ message })
  }

  return reply.code(400).send({ message })
}

export async function contractsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/contracts', { preHandler: [authorizePermissions(['contracts.read'])] }, async (request, reply) => {
    const parsed = listContractsQuerySchema.safeParse(request.query)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Query invalida.', issues: parsed.error.flatten() })
    }

    const page = parsed.data.page
    const pageSize = parsed.data.pageSize

    const result = await listContractsService({
      page,
      pageSize,
      skip: (page - 1) * pageSize,
      take: pageSize,
      search: parsed.data.search,
      status: parsed.data.status,
      clientId: parsed.data.clientId,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    })

    return reply.send(result)
  })

  app.get('/clients/:id/contracts', { preHandler: [authorizePermissions(['contracts.read'])] }, async (request, reply) => {
    const parsed = contractIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    try {
      const result = await listContractsByClientService(parsed.data.id)
      return reply.send(result)
    } catch (error) {
      return handleContractsError(error, reply)
    }
  })

  app.get('/contracts/:id', { preHandler: [authorizePermissions(['contracts.read'])] }, async (request, reply) => {
    const parsed = contractIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    const contract = await getContractByIdService(parsed.data.id)

    if (!contract) {
      return reply.code(404).send({ message: 'Contrato nao encontrado.' })
    }

    return reply.send({ contract })
  })

  app.post('/contracts', { preHandler: [authorizePermissions(['contracts.create'])] }, async (request, reply) => {
    const parsed = createContractBodySchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Dados invalidos.', issues: parsed.error.flatten() })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const contract = await createContractService(request.authUser, parsed.data)
      return reply.code(201).send({ contract })
    } catch (error) {
      return handleContractsError(error, reply)
    }
  })

  app.patch('/contracts/:id', { preHandler: [authorizePermissions(['contracts.update'])] }, async (request, reply) => {
    const parsedParams = contractIdParamsSchema.safeParse(request.params)
    const parsedBody = updateContractBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const contract = await updateContractService(request.authUser, parsedParams.data.id, parsedBody.data)
      return reply.send({ contract })
    } catch (error) {
      return handleContractsError(error, reply)
    }
  })

  app.post('/contracts/:id/status', { preHandler: [authorizePermissions(['contracts.changeStatus'])] }, async (request, reply) => {
    const parsedParams = contractIdParamsSchema.safeParse(request.params)
    const parsedBody = changeContractStatusBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const contract = await changeContractStatusService(
        request.authUser,
        parsedParams.data.id,
        parsedBody.data.status,
      )
      return reply.send({ contract })
    } catch (error) {
      return handleContractsError(error, reply)
    }
  })

  app.get('/contracts/:id/services', { preHandler: [authorizePermissions(['contractServices.read'])] }, async (request, reply) => {
    const parsedParams = contractIdParamsSchema.safeParse(request.params)
    const parsedQuery = listContractServicesQuerySchema.safeParse(request.query)

    if (!parsedParams.success || !parsedQuery.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    try {
      const page = parsedQuery.data.page
      const pageSize = parsedQuery.data.pageSize

      const result = await listContractServicesService({
        contractId: parsedParams.data.id,
        page,
        pageSize,
        skip: (page - 1) * pageSize,
        take: pageSize,
        search: parsedQuery.data.search,
        isActive: parsedQuery.data.isActive,
      })

      return reply.send(result)
    } catch (error) {
      return handleContractsError(error, reply)
    }
  })

  app.post('/contracts/:id/services', { preHandler: [authorizePermissions(['contractServices.manage'])] }, async (request, reply) => {
    const parsedParams = contractIdParamsSchema.safeParse(request.params)
    const parsedBody = createContractServiceBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const contractService = await addContractServiceService(
        request.authUser,
        parsedParams.data.id,
        parsedBody.data,
      )
      return reply.code(201).send({ contractService })
    } catch (error) {
      return handleContractsError(error, reply)
    }
  })

  app.get('/contract-services/:id', { preHandler: [authorizePermissions(['contractServices.read'])] }, async (request, reply) => {
    const parsed = contractServiceIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    const contractService = await getContractServiceByIdService(parsed.data.id)
    if (!contractService) {
      return reply.code(404).send({ message: 'Item de servico contratado nao encontrado.' })
    }

    return reply.send({ contractService })
  })

  app.patch('/contract-services/:id', { preHandler: [authorizePermissions(['contractServices.manage'])] }, async (request, reply) => {
    const parsedParams = contractServiceIdParamsSchema.safeParse(request.params)
    const parsedBody = updateContractServiceBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const contractService = await updateContractServiceItemService(
        request.authUser,
        parsedParams.data.id,
        parsedBody.data,
      )
      return reply.send({ contractService })
    } catch (error) {
      return handleContractsError(error, reply)
    }
  })

  app.post('/contract-services/:id/remove', { preHandler: [authorizePermissions(['contractServices.manage'])] }, async (request, reply) => {
    const parsedParams = contractServiceIdParamsSchema.safeParse(request.params)
    const parsedBody = removeContractServiceBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const contractService = await removeContractServiceItemService(
        request.authUser,
        parsedParams.data.id,
        parsedBody.data.reason,
      )
      return reply.send({ contractService })
    } catch (error) {
      return handleContractsError(error, reply)
    }
  })

  app.get('/contracts/:id/establishments', { preHandler: [authorizePermissions(['contractEstablishments.read'])] }, async (request, reply) => {
    const parsedParams = contractIdParamsSchema.safeParse(request.params)
    const parsedQuery = listContractEstablishmentsQuerySchema.safeParse(request.query)

    if (!parsedParams.success || !parsedQuery.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    try {
      const page = parsedQuery.data.page
      const pageSize = parsedQuery.data.pageSize

      const result = await listContractEstablishmentsService({
        contractId: parsedParams.data.id,
        page,
        pageSize,
        skip: (page - 1) * pageSize,
        take: pageSize,
        search: parsedQuery.data.search,
      })

      return reply.send(result)
    } catch (error) {
      return handleContractsError(error, reply)
    }
  })

  app.post('/contracts/:id/establishments', { preHandler: [authorizePermissions(['contractEstablishments.manage'])] }, async (request, reply) => {
    const parsedParams = contractIdParamsSchema.safeParse(request.params)
    const parsedBody = addContractEstablishmentBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const contractEstablishment = await addContractEstablishmentService(
        request.authUser,
        parsedParams.data.id,
        parsedBody.data.establishmentId,
      )
      return reply.code(201).send({ contractEstablishment })
    } catch (error) {
      return handleContractsError(error, reply)
    }
  })

  app.post('/contracts/:id/establishments/:establishmentId/remove', { preHandler: [authorizePermissions(['contractEstablishments.manage'])] }, async (request, reply) => {
    const parsed = removeContractEstablishmentParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificadores invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      await removeContractEstablishmentService(
        request.authUser,
        parsed.data.id,
        parsed.data.establishmentId,
      )
      return reply.code(204).send()
    } catch (error) {
      return handleContractsError(error, reply)
    }
  })

  app.get('/clients/:id/active-contract-services', { preHandler: [authorizePermissions(['contractServices.read'])] }, async (request, reply) => {
    const parsed = contractIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    try {
      const result = await listActiveContractServicesByClientService(parsed.data.id)
      return reply.send(result)
    } catch (error) {
      return handleContractsError(error, reply)
    }
  })
}
