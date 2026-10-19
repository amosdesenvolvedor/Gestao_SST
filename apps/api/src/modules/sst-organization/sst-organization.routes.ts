import type { FastifyInstance } from 'fastify'
import { authorizePermissions } from '../../plugins/guards.js'
import {
  activateActivityService,
  activateRoleService,
  activateSectorService,
  activateWorkEnvironmentService,
  activateWorkScheduleService,
  createActivityService,
  createRoleService,
  createSectorService,
  createWorkEnvironmentService,
  createWorkScheduleService,
  deactivateActivityService,
  deactivateRoleService,
  deactivateSectorService,
  deactivateWorkEnvironmentService,
  deactivateWorkScheduleService,
  getActivityByIdService,
  getRoleByIdService,
  getSectorByIdService,
  getWorkEnvironmentByIdService,
  getWorkScheduleByIdService,
  listActivitiesService,
  listRolesService,
  listSectorsService,
  listWorkEnvironmentsService,
  listWorkSchedulesService,
  updateActivityService,
  updateRoleService,
  updateSectorService,
  updateWorkEnvironmentService,
  updateWorkScheduleService,
} from './sst-organization.service.js'
import {
  activityIdParamsSchema,
  createActivityBodySchema,
  createRoleBodySchema,
  createSectorBodySchema,
  createWorkEnvironmentBodySchema,
  createWorkScheduleBodySchema,
  listActivitiesQuerySchema,
  listRolesQuerySchema,
  listSectorsQuerySchema,
  listWorkEnvironmentsQuerySchema,
  listWorkSchedulesQuerySchema,
  roleIdParamsSchema,
  sectorIdParamsSchema,
  updateActivityBodySchema,
  updateRoleBodySchema,
  updateSectorBodySchema,
  updateWorkEnvironmentBodySchema,
  updateWorkScheduleBodySchema,
  workEnvironmentIdParamsSchema,
  workScheduleIdParamsSchema,
} from './sst-organization.schema.js'

function handleSstOrganizationError(
  error: unknown,
  reply: { code: (status: number) => { send: (body: unknown) => unknown } },
) {
  const message = error instanceof Error ? error.message : 'Erro ao processar requisicao de estrutura SST.'

  if (message.includes('nao encontrado')) {
    return reply.code(404).send({ message })
  }

  if (message.includes('Acesso negado')) {
    return reply.code(403).send({ message })
  }

  if (message.includes('Ja existe')) {
    return reply.code(409).send({ message })
  }

  if (message.includes('invalido') || message.includes('inconsistente')) {
    return reply.code(400).send({ message })
  }

  return reply.code(400).send({ message })
}

export async function sstOrganizationRoutes(app: FastifyInstance): Promise<void> {
  app.get('/sst/sectors', { preHandler: [authorizePermissions(['sst.structure.read'])] }, async (request, reply) => {
    const parsed = listSectorsQuerySchema.safeParse(request.query)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Query invalida.', issues: parsed.error.flatten() })
    }

    const page = parsed.data.page
    const pageSize = parsed.data.pageSize

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const result = await listSectorsService(request.authUser, {
        page,
        pageSize,
        skip: (page - 1) * pageSize,
        take: pageSize,
        clientId: parsed.data.clientId,
        establishmentId: parsed.data.establishmentId,
        search: parsed.data.search,
        isActive: parsed.data.isActive,
      })

      return reply.send(result)
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.get('/sst/sectors/:id', { preHandler: [authorizePermissions(['sst.structure.read'])] }, async (request, reply) => {
    const parsed = sectorIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const sector = await getSectorByIdService(request.authUser, parsed.data.id)

      if (!sector) {
        return reply.code(404).send({ message: 'Setor nao encontrado.' })
      }

      return reply.send({ sector })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.post('/sst/sectors', { preHandler: [authorizePermissions(['sst.structure.manage'])] }, async (request, reply) => {
    const parsed = createSectorBodySchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Dados invalidos.', issues: parsed.error.flatten() })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const sector = await createSectorService(request.authUser, parsed.data)
      return reply.code(201).send({ sector })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.patch('/sst/sectors/:id', { preHandler: [authorizePermissions(['sst.structure.manage'])] }, async (request, reply) => {
    const parsedParams = sectorIdParamsSchema.safeParse(request.params)
    const parsedBody = updateSectorBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const sector = await updateSectorService(request.authUser, parsedParams.data.id, parsedBody.data)
      return reply.send({ sector })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.post('/sst/sectors/:id/activate', { preHandler: [authorizePermissions(['sst.structure.manage'])] }, async (request, reply) => {
    const parsed = sectorIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const sector = await activateSectorService(request.authUser, parsed.data.id)
      return reply.send({ sector })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.post('/sst/sectors/:id/deactivate', { preHandler: [authorizePermissions(['sst.structure.manage'])] }, async (request, reply) => {
    const parsed = sectorIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const sector = await deactivateSectorService(request.authUser, parsed.data.id)
      return reply.send({ sector })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.get('/sst/work-environments', { preHandler: [authorizePermissions(['sst.structure.read'])] }, async (request, reply) => {
    const parsed = listWorkEnvironmentsQuerySchema.safeParse(request.query)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Query invalida.', issues: parsed.error.flatten() })
    }

    const page = parsed.data.page
    const pageSize = parsed.data.pageSize

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const result = await listWorkEnvironmentsService(request.authUser, {
        page,
        pageSize,
        skip: (page - 1) * pageSize,
        take: pageSize,
        clientId: parsed.data.clientId,
        establishmentId: parsed.data.establishmentId,
        sectorId: parsed.data.sectorId,
        search: parsed.data.search,
        isActive: parsed.data.isActive,
      })

      return reply.send(result)
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.get('/sst/work-environments/:id', { preHandler: [authorizePermissions(['sst.structure.read'])] }, async (request, reply) => {
    const parsed = workEnvironmentIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const workEnvironment = await getWorkEnvironmentByIdService(request.authUser, parsed.data.id)

      if (!workEnvironment) {
        return reply.code(404).send({ message: 'Ambiente de trabalho nao encontrado.' })
      }

      return reply.send({ workEnvironment })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.post('/sst/work-environments', { preHandler: [authorizePermissions(['sst.structure.manage'])] }, async (request, reply) => {
    const parsed = createWorkEnvironmentBodySchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Dados invalidos.', issues: parsed.error.flatten() })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const workEnvironment = await createWorkEnvironmentService(request.authUser, parsed.data)
      return reply.code(201).send({ workEnvironment })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.patch('/sst/work-environments/:id', { preHandler: [authorizePermissions(['sst.structure.manage'])] }, async (request, reply) => {
    const parsedParams = workEnvironmentIdParamsSchema.safeParse(request.params)
    const parsedBody = updateWorkEnvironmentBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const workEnvironment = await updateWorkEnvironmentService(request.authUser, parsedParams.data.id, parsedBody.data)
      return reply.send({ workEnvironment })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.post('/sst/work-environments/:id/activate', { preHandler: [authorizePermissions(['sst.structure.manage'])] }, async (request, reply) => {
    const parsed = workEnvironmentIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const workEnvironment = await activateWorkEnvironmentService(request.authUser, parsed.data.id)
      return reply.send({ workEnvironment })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.post('/sst/work-environments/:id/deactivate', { preHandler: [authorizePermissions(['sst.structure.manage'])] }, async (request, reply) => {
    const parsed = workEnvironmentIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const workEnvironment = await deactivateWorkEnvironmentService(request.authUser, parsed.data.id)
      return reply.send({ workEnvironment })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.get('/sst/roles', { preHandler: [authorizePermissions(['sst.structure.read'])] }, async (request, reply) => {
    const parsed = listRolesQuerySchema.safeParse(request.query)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Query invalida.', issues: parsed.error.flatten() })
    }

    const page = parsed.data.page
    const pageSize = parsed.data.pageSize

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const result = await listRolesService(request.authUser, {
        page,
        pageSize,
        skip: (page - 1) * pageSize,
        take: pageSize,
        clientId: parsed.data.clientId,
        search: parsed.data.search,
        isActive: parsed.data.isActive,
      })

      return reply.send(result)
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.get('/sst/roles/:id', { preHandler: [authorizePermissions(['sst.structure.read'])] }, async (request, reply) => {
    const parsed = roleIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const role = await getRoleByIdService(request.authUser, parsed.data.id)

      if (!role) {
        return reply.code(404).send({ message: 'Cargo nao encontrado.' })
      }

      return reply.send({ role })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.post('/sst/roles', { preHandler: [authorizePermissions(['sst.structure.manage'])] }, async (request, reply) => {
    const parsed = createRoleBodySchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Dados invalidos.', issues: parsed.error.flatten() })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const role = await createRoleService(request.authUser, parsed.data)
      return reply.code(201).send({ role })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.patch('/sst/roles/:id', { preHandler: [authorizePermissions(['sst.structure.manage'])] }, async (request, reply) => {
    const parsedParams = roleIdParamsSchema.safeParse(request.params)
    const parsedBody = updateRoleBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const role = await updateRoleService(request.authUser, parsedParams.data.id, parsedBody.data)
      return reply.send({ role })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.post('/sst/roles/:id/activate', { preHandler: [authorizePermissions(['sst.structure.manage'])] }, async (request, reply) => {
    const parsed = roleIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const role = await activateRoleService(request.authUser, parsed.data.id)
      return reply.send({ role })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.post('/sst/roles/:id/deactivate', { preHandler: [authorizePermissions(['sst.structure.manage'])] }, async (request, reply) => {
    const parsed = roleIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const role = await deactivateRoleService(request.authUser, parsed.data.id)
      return reply.send({ role })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.get('/sst/activities', { preHandler: [authorizePermissions(['sst.structure.read'])] }, async (request, reply) => {
    const parsed = listActivitiesQuerySchema.safeParse(request.query)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Query invalida.', issues: parsed.error.flatten() })
    }

    const page = parsed.data.page
    const pageSize = parsed.data.pageSize

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const result = await listActivitiesService(request.authUser, {
        page,
        pageSize,
        skip: (page - 1) * pageSize,
        take: pageSize,
        clientId: parsed.data.clientId,
        roleId: parsed.data.roleId,
        frequency: parsed.data.frequency,
        isCritical: parsed.data.isCritical,
        search: parsed.data.search,
        isActive: parsed.data.isActive,
      })

      return reply.send(result)
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.get('/sst/activities/:id', { preHandler: [authorizePermissions(['sst.structure.read'])] }, async (request, reply) => {
    const parsed = activityIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const activity = await getActivityByIdService(request.authUser, parsed.data.id)

      if (!activity) {
        return reply.code(404).send({ message: 'Atividade nao encontrada.' })
      }

      return reply.send({ activity })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.post('/sst/activities', { preHandler: [authorizePermissions(['sst.structure.manage'])] }, async (request, reply) => {
    const parsed = createActivityBodySchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Dados invalidos.', issues: parsed.error.flatten() })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const activity = await createActivityService(request.authUser, parsed.data)
      return reply.code(201).send({ activity })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.patch('/sst/activities/:id', { preHandler: [authorizePermissions(['sst.structure.manage'])] }, async (request, reply) => {
    const parsedParams = activityIdParamsSchema.safeParse(request.params)
    const parsedBody = updateActivityBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const activity = await updateActivityService(request.authUser, parsedParams.data.id, parsedBody.data)
      return reply.send({ activity })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.post('/sst/activities/:id/activate', { preHandler: [authorizePermissions(['sst.structure.manage'])] }, async (request, reply) => {
    const parsed = activityIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const activity = await activateActivityService(request.authUser, parsed.data.id)
      return reply.send({ activity })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.post('/sst/activities/:id/deactivate', { preHandler: [authorizePermissions(['sst.structure.manage'])] }, async (request, reply) => {
    const parsed = activityIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const activity = await deactivateActivityService(request.authUser, parsed.data.id)
      return reply.send({ activity })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.get('/sst/work-schedules', { preHandler: [authorizePermissions(['sst.structure.read'])] }, async (request, reply) => {
    const parsed = listWorkSchedulesQuerySchema.safeParse(request.query)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Query invalida.', issues: parsed.error.flatten() })
    }

    const page = parsed.data.page
    const pageSize = parsed.data.pageSize

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const result = await listWorkSchedulesService(request.authUser, {
        page,
        pageSize,
        skip: (page - 1) * pageSize,
        take: pageSize,
        clientId: parsed.data.clientId,
        establishmentId: parsed.data.establishmentId,
        scheduleType: parsed.data.scheduleType,
        search: parsed.data.search,
        isActive: parsed.data.isActive,
      })

      return reply.send(result)
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.get('/sst/work-schedules/:id', { preHandler: [authorizePermissions(['sst.structure.read'])] }, async (request, reply) => {
    const parsed = workScheduleIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const workSchedule = await getWorkScheduleByIdService(request.authUser, parsed.data.id)

      if (!workSchedule) {
        return reply.code(404).send({ message: 'Jornada nao encontrada.' })
      }

      return reply.send({ workSchedule })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.post('/sst/work-schedules', { preHandler: [authorizePermissions(['sst.structure.manage'])] }, async (request, reply) => {
    const parsed = createWorkScheduleBodySchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Dados invalidos.', issues: parsed.error.flatten() })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const workSchedule = await createWorkScheduleService(request.authUser, parsed.data)
      return reply.code(201).send({ workSchedule })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.patch('/sst/work-schedules/:id', { preHandler: [authorizePermissions(['sst.structure.manage'])] }, async (request, reply) => {
    const parsedParams = workScheduleIdParamsSchema.safeParse(request.params)
    const parsedBody = updateWorkScheduleBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const workSchedule = await updateWorkScheduleService(request.authUser, parsedParams.data.id, parsedBody.data)
      return reply.send({ workSchedule })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.post('/sst/work-schedules/:id/activate', { preHandler: [authorizePermissions(['sst.structure.manage'])] }, async (request, reply) => {
    const parsed = workScheduleIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const workSchedule = await activateWorkScheduleService(request.authUser, parsed.data.id)
      return reply.send({ workSchedule })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })

  app.post('/sst/work-schedules/:id/deactivate', { preHandler: [authorizePermissions(['sst.structure.manage'])] }, async (request, reply) => {
    const parsed = workScheduleIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const workSchedule = await deactivateWorkScheduleService(request.authUser, parsed.data.id)
      return reply.send({ workSchedule })
    } catch (error) {
      return handleSstOrganizationError(error, reply)
    }
  })
}
