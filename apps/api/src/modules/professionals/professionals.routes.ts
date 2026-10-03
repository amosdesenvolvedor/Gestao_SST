import type { FastifyInstance } from 'fastify'
import { authorizePermissions } from '../../plugins/guards.js'
import {
  createProfessionalBodySchema,
  listProfessionalsQuerySchema,
  professionalIdParamsSchema,
  updateProfessionalBodySchema,
} from './professionals.schema.js'
import {
  activateProfessionalService,
  createProfessionalService,
  deactivateProfessionalService,
  getProfessionalByIdService,
  listProfessionalsService,
  updateProfessionalService,
} from './professionals.service.js'

function handleProfessionalsError(error: unknown, reply: { code: (status: number) => { send: (body: unknown) => unknown } }) {
  const message = error instanceof Error ? error.message : 'Erro ao processar profissional.'

  if (message.includes('nao encontrado')) {
    return reply.code(404).send({ message })
  }

  if (message.includes('ja esta vinculado')) {
    return reply.code(409).send({ message })
  }

  if (message.includes('invalido')) {
    return reply.code(400).send({ message })
  }

  return reply.code(400).send({ message })
}

export async function professionalsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/professionals',
    { preHandler: [authorizePermissions(['professionals.read'])] },
    async (request, reply) => {
      const parsed = listProfessionalsQuerySchema.safeParse(request.query)

      if (!parsed.success) {
        return reply.code(400).send({ message: 'Query invalida.', issues: parsed.error.flatten() })
      }

      const page = parsed.data.page
      const pageSize = parsed.data.pageSize
      const skip = (page - 1) * pageSize

      const result = await listProfessionalsService({
        page,
        pageSize,
        skip,
        take: pageSize,
        search: parsed.data.search,
        professionalType: parsed.data.professionalType,
        status: parsed.data.status,
      })

      return reply.send(result)
    },
  )

  app.get(
    '/professionals/:id',
    { preHandler: [authorizePermissions(['professionals.read'])] },
    async (request, reply) => {
      const parsed = professionalIdParamsSchema.safeParse(request.params)

      if (!parsed.success) {
        return reply.code(400).send({ message: 'Identificador invalido.' })
      }

      const professional = await getProfessionalByIdService(parsed.data.id)

      if (!professional) {
        return reply.code(404).send({ message: 'Profissional nao encontrado.' })
      }

      return reply.send({ professional })
    },
  )

  app.post(
    '/professionals',
    { preHandler: [authorizePermissions(['professionals.create'])] },
    async (request, reply) => {
      const parsed = createProfessionalBodySchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.code(400).send({ message: 'Dados invalidos.', issues: parsed.error.flatten() })
      }

      if (!request.authUser) {
        return reply.code(401).send({ message: 'Nao autenticado.' })
      }

      try {
        const professional = await createProfessionalService(request.authUser, parsed.data)
        return reply.code(201).send({ professional })
      } catch (error) {
        return handleProfessionalsError(error, reply)
      }
    },
  )

  app.patch(
    '/professionals/:id',
    { preHandler: [authorizePermissions(['professionals.update'])] },
    async (request, reply) => {
      const parsedParams = professionalIdParamsSchema.safeParse(request.params)
      const parsedBody = updateProfessionalBodySchema.safeParse(request.body)

      if (!parsedParams.success || !parsedBody.success) {
        return reply.code(400).send({ message: 'Dados invalidos.' })
      }

      if (!request.authUser) {
        return reply.code(401).send({ message: 'Nao autenticado.' })
      }

      try {
        const professional = await updateProfessionalService(
          request.authUser,
          parsedParams.data.id,
          parsedBody.data,
        )

        return reply.send({ professional })
      } catch (error) {
        return handleProfessionalsError(error, reply)
      }
    },
  )

  app.post(
    '/professionals/:id/activate',
    { preHandler: [authorizePermissions(['professionals.activate'])] },
    async (request, reply) => {
      const parsed = professionalIdParamsSchema.safeParse(request.params)

      if (!parsed.success) {
        return reply.code(400).send({ message: 'Identificador invalido.' })
      }

      if (!request.authUser) {
        return reply.code(401).send({ message: 'Nao autenticado.' })
      }

      try {
        const professional = await activateProfessionalService(request.authUser, parsed.data.id)
        return reply.send({ professional })
      } catch (error) {
        return handleProfessionalsError(error, reply)
      }
    },
  )

  app.post(
    '/professionals/:id/deactivate',
    { preHandler: [authorizePermissions(['professionals.deactivate'])] },
    async (request, reply) => {
      const parsed = professionalIdParamsSchema.safeParse(request.params)

      if (!parsed.success) {
        return reply.code(400).send({ message: 'Identificador invalido.' })
      }

      if (!request.authUser) {
        return reply.code(401).send({ message: 'Nao autenticado.' })
      }

      try {
        const professional = await deactivateProfessionalService(request.authUser, parsed.data.id)
        return reply.send({ professional })
      } catch (error) {
        return handleProfessionalsError(error, reply)
      }
    },
  )
}
