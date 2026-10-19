import { Prisma, type SstActivityFrequency, type SstIndoorOutdoorType, type SstScheduleType } from '@prisma/client'
import type { AuthUser } from '../../plugins/auth.js'
import { createAuditLog } from '../../shared/audit.js'
import { makePagination } from '../../shared/pagination.js'
import * as repository from './sst-organization.repository.js'

type ListInputBase = {
  page: number
  pageSize: number
  skip: number
  take: number
  search?: string
  isActive?: 'active' | 'inactive'
}

type ListSectorsInput = ListInputBase & {
  clientId: string
  establishmentId?: string
}

type ListWorkEnvironmentsInput = ListInputBase & {
  clientId: string
  establishmentId?: string
  sectorId?: string
}

type ListRolesInput = ListInputBase & {
  clientId: string
}

type ListActivitiesInput = ListInputBase & {
  clientId: string
  roleId?: string
  frequency?: SstActivityFrequency
  isCritical?: boolean
}

type ListWorkSchedulesInput = ListInputBase & {
  clientId: string
  establishmentId?: string
  scheduleType?: SstScheduleType
}

type CreateSectorInput = {
  clientId: string
  establishmentId: string
  code: string
  name: string
  description?: string
  isActive: boolean
}

type UpdateSectorInput = {
  code?: string
  name?: string
  description?: string | null
}

type CreateWorkEnvironmentInput = {
  clientId: string
  establishmentId: string
  sectorId: string
  code: string
  name: string
  description?: string
  indoorOutdoorType: SstIndoorOutdoorType
  isActive: boolean
}

type UpdateWorkEnvironmentInput = {
  sectorId?: string
  code?: string
  name?: string
  description?: string | null
  indoorOutdoorType?: SstIndoorOutdoorType
}

type CreateRoleInput = {
  clientId: string
  title: string
  cboCode?: string
  cboDescription?: string
  description?: string
  isActive: boolean
}

type UpdateRoleInput = {
  title?: string
  cboCode?: string | null
  cboDescription?: string | null
  description?: string | null
}

type CreateActivityInput = {
  clientId: string
  roleId: string
  title: string
  frequency: SstActivityFrequency
  description?: string
  isCritical: boolean
  isActive: boolean
}

type UpdateActivityInput = {
  roleId?: string
  title?: string
  frequency?: SstActivityFrequency
  description?: string | null
  isCritical?: boolean
}

type CreateWorkScheduleInput = {
  clientId: string
  establishmentId: string
  name: string
  scheduleType: SstScheduleType
  weeklyHours?: number
  shiftPattern?: string
  description?: string
  isActive: boolean
}

type UpdateWorkScheduleInput = {
  name?: string
  scheduleType?: SstScheduleType
  weeklyHours?: number | null
  shiftPattern?: string | null
  description?: string | null
}

export type SstOrganizationDeps = {
  createAuditLog: typeof createAuditLog
  listActiveClientMembershipClientIds: typeof repository.listActiveClientMembershipClientIds
  countSectors: typeof repository.countSectors
  listSectors: typeof repository.listSectors
  findSectorById: typeof repository.findSectorById
  findSectorRecordById: typeof repository.findSectorRecordById
  findSectorByCode: typeof repository.findSectorByCode
  createSector: typeof repository.createSector
  updateSector: typeof repository.updateSector
  countWorkEnvironments: typeof repository.countWorkEnvironments
  listWorkEnvironments: typeof repository.listWorkEnvironments
  findWorkEnvironmentById: typeof repository.findWorkEnvironmentById
  findWorkEnvironmentRecordById: typeof repository.findWorkEnvironmentRecordById
  findWorkEnvironmentByCode: typeof repository.findWorkEnvironmentByCode
  createWorkEnvironment: typeof repository.createWorkEnvironment
  updateWorkEnvironment: typeof repository.updateWorkEnvironment
  countRoles: typeof repository.countRoles
  listRoles: typeof repository.listRoles
  findRoleById: typeof repository.findRoleById
  findRoleRecordById: typeof repository.findRoleRecordById
  createRole: typeof repository.createRole
  updateRole: typeof repository.updateRole
  countActivities: typeof repository.countActivities
  listActivities: typeof repository.listActivities
  findActivityById: typeof repository.findActivityById
  findActivityRecordById: typeof repository.findActivityRecordById
  findActivityByRoleAndTitle: typeof repository.findActivityByRoleAndTitle
  createActivity: typeof repository.createActivity
  updateActivity: typeof repository.updateActivity
  countWorkSchedules: typeof repository.countWorkSchedules
  listWorkSchedules: typeof repository.listWorkSchedules
  findWorkScheduleById: typeof repository.findWorkScheduleById
  findWorkScheduleRecordById: typeof repository.findWorkScheduleRecordById
  findWorkScheduleByName: typeof repository.findWorkScheduleByName
  createWorkSchedule: typeof repository.createWorkSchedule
  updateWorkSchedule: typeof repository.updateWorkSchedule
  findClientById: typeof repository.findClientById
  findEstablishmentById: typeof repository.findEstablishmentById
}

const defaultDeps: SstOrganizationDeps = {
  createAuditLog,
  listActiveClientMembershipClientIds: repository.listActiveClientMembershipClientIds,
  countSectors: repository.countSectors,
  listSectors: repository.listSectors,
  findSectorById: repository.findSectorById,
  findSectorRecordById: repository.findSectorRecordById,
  findSectorByCode: repository.findSectorByCode,
  createSector: repository.createSector,
  updateSector: repository.updateSector,
  countWorkEnvironments: repository.countWorkEnvironments,
  listWorkEnvironments: repository.listWorkEnvironments,
  findWorkEnvironmentById: repository.findWorkEnvironmentById,
  findWorkEnvironmentRecordById: repository.findWorkEnvironmentRecordById,
  findWorkEnvironmentByCode: repository.findWorkEnvironmentByCode,
  createWorkEnvironment: repository.createWorkEnvironment,
  updateWorkEnvironment: repository.updateWorkEnvironment,
  countRoles: repository.countRoles,
  listRoles: repository.listRoles,
  findRoleById: repository.findRoleById,
  findRoleRecordById: repository.findRoleRecordById,
  createRole: repository.createRole,
  updateRole: repository.updateRole,
  countActivities: repository.countActivities,
  listActivities: repository.listActivities,
  findActivityById: repository.findActivityById,
  findActivityRecordById: repository.findActivityRecordById,
  findActivityByRoleAndTitle: repository.findActivityByRoleAndTitle,
  createActivity: repository.createActivity,
  updateActivity: repository.updateActivity,
  countWorkSchedules: repository.countWorkSchedules,
  listWorkSchedules: repository.listWorkSchedules,
  findWorkScheduleById: repository.findWorkScheduleById,
  findWorkScheduleRecordById: repository.findWorkScheduleRecordById,
  findWorkScheduleByName: repository.findWorkScheduleByName,
  createWorkSchedule: repository.createWorkSchedule,
  updateWorkSchedule: repository.updateWorkSchedule,
  findClientById: repository.findClientById,
  findEstablishmentById: repository.findEstablishmentById,
}

const globalSstScopeRoles = new Set(['SUPER_ADMIN', 'ADMIN'])

function normalizeCode(code: string): string {
  return code.trim().toUpperCase()
}

function normalizeTitle(text: string): string {
  return text.trim()
}

function normalizeCboCode(cboCode?: string | null): string | null {
  if (!cboCode) {
    return null
  }

  return cboCode.replace(/\D/g, '')
}

function normalizeOptional(value?: string | null): string | null | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function mapDateFields<T extends { createdAt: Date; updatedAt: Date }>(record: T) {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function mapWorkSchedule(record: repository.SstWorkScheduleRecord) {
  return {
    ...mapDateFields(record),
    weeklyHours: record.weeklyHours ? record.weeklyHours.toNumber() : null,
  }
}

function isActiveFilter(flag?: 'active' | 'inactive'): boolean | undefined {
  if (!flag) {
    return undefined
  }
  return flag === 'active'
}

async function resolveActorSstScopeClientIds(
  actor: AuthUser,
  deps: SstOrganizationDeps,
): Promise<Set<string> | null> {
  if (globalSstScopeRoles.has(actor.role)) {
    return null
  }

  if (actor.role === 'CLIENT') {
    throw new Error('Acesso negado para operacao administrativa SST.')
  }

  const clientIds = await deps.listActiveClientMembershipClientIds(actor.id)

  if (clientIds.length === 0) {
    throw new Error('Acesso negado ao escopo SST do usuario.')
  }

  return new Set<string>(clientIds)
}

function assertClientInSstScope(scopeClientIds: Set<string> | null, clientId: string, notFoundMessage: string) {
  if (!scopeClientIds) {
    return
  }

  if (!scopeClientIds.has(clientId)) {
    throw new Error(notFoundMessage)
  }
}

function assertWeeklyHours(scheduleType: SstScheduleType, weeklyHours?: number | null) {
  if (weeklyHours === undefined || weeklyHours === null) {
    return
  }

  if (weeklyHours <= 0 || weeklyHours > 168) {
    throw new Error('Carga horaria semanal invalida.')
  }

  if (scheduleType === 'FIXED' && weeklyHours < 1) {
    throw new Error('Carga horaria semanal invalida para jornada fixa.')
  }
}

async function assertClientExists(clientId: string, deps: SstOrganizationDeps) {
  const client = await deps.findClientById(clientId)
  if (!client) {
    throw new Error('Cliente nao encontrado.')
  }
}

async function assertEstablishmentInClient(clientId: string, establishmentId: string, deps: SstOrganizationDeps) {
  const establishment = await deps.findEstablishmentById(establishmentId)
  if (!establishment || establishment.clientId !== clientId) {
    throw new Error('Estabelecimento nao encontrado para o cliente informado.')
  }
}

async function assertSectorBelongs(
  clientId: string,
  establishmentId: string,
  sectorId: string,
  deps: SstOrganizationDeps,
) {
  const sector = await deps.findSectorById(sectorId)
  if (!sector) {
    throw new Error('Setor nao encontrado.')
  }

  if (sector.clientId !== clientId || sector.establishmentId !== establishmentId) {
    throw new Error('Setor inconsistente para cliente/estabelecimento informado.')
  }
}

async function assertRoleBelongs(clientId: string, roleId: string, deps: SstOrganizationDeps) {
  const role = await deps.findRoleById(roleId)
  if (!role || role.clientId !== clientId) {
    throw new Error('Cargo nao encontrado para o cliente informado.')
  }
}

async function assertUniqueSectorCode(
  establishmentId: string,
  code: string,
  deps: SstOrganizationDeps,
  excludeId?: string,
) {
  const existing = await deps.findSectorByCode(establishmentId, code, excludeId)
  if (existing) {
    throw new Error('Ja existe setor com este codigo no estabelecimento.')
  }
}

async function assertUniqueWorkEnvironmentCode(
  sectorId: string,
  code: string,
  deps: SstOrganizationDeps,
  excludeId?: string,
) {
  const existing = await deps.findWorkEnvironmentByCode(sectorId, code, excludeId)
  if (existing) {
    throw new Error('Ja existe ambiente com este codigo no setor.')
  }
}

async function assertUniqueActivityTitle(
  roleId: string,
  title: string,
  deps: SstOrganizationDeps,
  excludeId?: string,
) {
  const existing = await deps.findActivityByRoleAndTitle(roleId, title, excludeId)
  if (existing) {
    throw new Error('Ja existe atividade com este titulo no cargo.')
  }
}

async function assertUniqueWorkScheduleName(
  establishmentId: string,
  name: string,
  deps: SstOrganizationDeps,
  excludeId?: string,
) {
  const existing = await deps.findWorkScheduleByName(establishmentId, name, excludeId)
  if (existing) {
    throw new Error('Ja existe jornada com este nome no estabelecimento.')
  }
}

export async function listSectorsService(actor: AuthUser, input: ListSectorsInput, deps: SstOrganizationDeps = defaultDeps) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)
  assertClientInSstScope(scopeClientIds, input.clientId, 'Cliente nao encontrado.')

  const where: Prisma.SstSectorWhereInput = {
    AND: [
      {
        clientId: input.clientId,
      },
      input.establishmentId
        ? {
            establishmentId: input.establishmentId,
          }
        : {},
      input.search
        ? {
            OR: [
              {
                code: {
                  contains: input.search,
                  mode: 'insensitive',
                },
              },
              {
                name: {
                  contains: input.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {},
      input.isActive ? { isActive: isActiveFilter(input.isActive) } : {},
    ],
  }

  const [data, total] = await Promise.all([
    deps.listSectors({ where, skip: input.skip, take: input.take }),
    deps.countSectors(where),
  ])

  return {
    data: data.map(mapDateFields),
    pagination: makePagination(input.page, input.pageSize, total),
  }
}

export async function getSectorByIdService(actor: AuthUser, id: string, deps: SstOrganizationDeps = defaultDeps) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)

  const sector = await deps.findSectorRecordById(id)
  if (!sector) {
    return null
  }

  assertClientInSstScope(scopeClientIds, sector.clientId, 'Setor nao encontrado.')
  return mapDateFields(sector)
}

export async function createSectorService(
  actor: AuthUser,
  input: CreateSectorInput,
  deps: SstOrganizationDeps = defaultDeps,
) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)
  assertClientInSstScope(scopeClientIds, input.clientId, 'Cliente nao encontrado.')

  await assertClientExists(input.clientId, deps)
  await assertEstablishmentInClient(input.clientId, input.establishmentId, deps)

  const code = normalizeCode(input.code)
  await assertUniqueSectorCode(input.establishmentId, code, deps)

  const created = await deps.createSector({
    clientId: input.clientId,
    establishmentId: input.establishmentId,
    code,
    name: normalizeTitle(input.name),
    description: normalizeOptional(input.description) ?? null,
    isActive: input.isActive,
  })

  await deps.createAuditLog({
    actorUserId: actor.id,
    action: 'SST_SECTOR_CREATED',
    entity: 'SstSector',
    entityId: created.id,
    metadata: {
      clientId: created.clientId,
      establishmentId: created.establishmentId,
    },
  })

  return mapDateFields(created)
}

export async function updateSectorService(
  actor: AuthUser,
  id: string,
  input: UpdateSectorInput,
  deps: SstOrganizationDeps = defaultDeps,
) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)

  const target = await deps.findSectorById(id)

  if (!target) {
    throw new Error('Setor nao encontrado.')
  }

  assertClientInSstScope(scopeClientIds, target.clientId, 'Setor nao encontrado.')

  const normalizedCode = input.code ? normalizeCode(input.code) : undefined
  if (normalizedCode) {
    await assertUniqueSectorCode(target.establishmentId, normalizedCode, deps, target.id)
  }

  const updated = await deps.updateSector(target.id, {
    code: normalizedCode,
    name: input.name ? normalizeTitle(input.name) : undefined,
    description: normalizeOptional(input.description),
  })

  await deps.createAuditLog({
    actorUserId: actor.id,
    action: 'SST_SECTOR_UPDATED',
    entity: 'SstSector',
    entityId: updated.id,
  })

  return mapDateFields(updated)
}

export async function activateSectorService(actor: AuthUser, id: string, deps: SstOrganizationDeps = defaultDeps) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)

  const target = await deps.findSectorById(id)
  if (!target) {
    throw new Error('Setor nao encontrado.')
  }

  assertClientInSstScope(scopeClientIds, target.clientId, 'Setor nao encontrado.')

  const updated = await deps.updateSector(target.id, { isActive: true })

  await deps.createAuditLog({
    actorUserId: actor.id,
    action: 'SST_SECTOR_ACTIVATED',
    entity: 'SstSector',
    entityId: updated.id,
  })

  return mapDateFields(updated)
}

export async function deactivateSectorService(actor: AuthUser, id: string, deps: SstOrganizationDeps = defaultDeps) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)

  const target = await deps.findSectorById(id)
  if (!target) {
    throw new Error('Setor nao encontrado.')
  }

  assertClientInSstScope(scopeClientIds, target.clientId, 'Setor nao encontrado.')

  const updated = await deps.updateSector(target.id, { isActive: false })

  await deps.createAuditLog({
    actorUserId: actor.id,
    action: 'SST_SECTOR_DEACTIVATED',
    entity: 'SstSector',
    entityId: updated.id,
  })

  return mapDateFields(updated)
}

export async function listWorkEnvironmentsService(
  actor: AuthUser,
  input: ListWorkEnvironmentsInput,
  deps: SstOrganizationDeps = defaultDeps,
) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)
  assertClientInSstScope(scopeClientIds, input.clientId, 'Cliente nao encontrado.')

  const where: Prisma.SstWorkEnvironmentWhereInput = {
    AND: [
      {
        clientId: input.clientId,
      },
      input.establishmentId
        ? {
            establishmentId: input.establishmentId,
          }
        : {},
      input.sectorId
        ? {
            sectorId: input.sectorId,
          }
        : {},
      input.search
        ? {
            OR: [
              {
                code: {
                  contains: input.search,
                  mode: 'insensitive',
                },
              },
              {
                name: {
                  contains: input.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {},
      input.isActive ? { isActive: isActiveFilter(input.isActive) } : {},
    ],
  }

  const [data, total] = await Promise.all([
    deps.listWorkEnvironments({ where, skip: input.skip, take: input.take }),
    deps.countWorkEnvironments(where),
  ])

  return {
    data: data.map(mapDateFields),
    pagination: makePagination(input.page, input.pageSize, total),
  }
}

export async function getWorkEnvironmentByIdService(actor: AuthUser, id: string, deps: SstOrganizationDeps = defaultDeps) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)

  const env = await deps.findWorkEnvironmentRecordById(id)
  if (!env) {
    return null
  }

  assertClientInSstScope(scopeClientIds, env.clientId, 'Ambiente de trabalho nao encontrado.')
  return mapDateFields(env)
}

export async function createWorkEnvironmentService(
  actor: AuthUser,
  input: CreateWorkEnvironmentInput,
  deps: SstOrganizationDeps = defaultDeps,
) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)
  assertClientInSstScope(scopeClientIds, input.clientId, 'Cliente nao encontrado.')

  await assertClientExists(input.clientId, deps)
  await assertEstablishmentInClient(input.clientId, input.establishmentId, deps)
  await assertSectorBelongs(input.clientId, input.establishmentId, input.sectorId, deps)

  const code = normalizeCode(input.code)
  await assertUniqueWorkEnvironmentCode(input.sectorId, code, deps)

  const created = await deps.createWorkEnvironment({
    clientId: input.clientId,
    establishmentId: input.establishmentId,
    sectorId: input.sectorId,
    code,
    name: normalizeTitle(input.name),
    description: normalizeOptional(input.description) ?? null,
    indoorOutdoorType: input.indoorOutdoorType,
    isActive: input.isActive,
  })

  await deps.createAuditLog({
    actorUserId: actor.id,
    action: 'SST_WORK_ENVIRONMENT_CREATED',
    entity: 'SstWorkEnvironment',
    entityId: created.id,
  })

  return mapDateFields(created)
}

export async function updateWorkEnvironmentService(
  actor: AuthUser,
  id: string,
  input: UpdateWorkEnvironmentInput,
  deps: SstOrganizationDeps = defaultDeps,
) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)

  const target = await deps.findWorkEnvironmentById(id)

  if (!target) {
    throw new Error('Ambiente de trabalho nao encontrado.')
  }

  assertClientInSstScope(scopeClientIds, target.clientId, 'Ambiente de trabalho nao encontrado.')

  const nextSectorId = input.sectorId ?? target.sectorId
  await assertSectorBelongs(target.clientId, target.establishmentId, nextSectorId, deps)

  const normalizedCode = input.code ? normalizeCode(input.code) : undefined
  if (normalizedCode) {
    await assertUniqueWorkEnvironmentCode(nextSectorId, normalizedCode, deps, target.id)
  }

  const updated = await deps.updateWorkEnvironment(target.id, {
    sector: input.sectorId
      ? {
          connect: {
            clientId_establishmentId_id: {
              clientId: target.clientId,
              establishmentId: target.establishmentId,
              id: input.sectorId,
            },
          },
        }
      : undefined,
    code: normalizedCode,
    name: input.name ? normalizeTitle(input.name) : undefined,
    description: normalizeOptional(input.description),
    indoorOutdoorType: input.indoorOutdoorType,
  })

  await deps.createAuditLog({
    actorUserId: actor.id,
    action: 'SST_WORK_ENVIRONMENT_UPDATED',
    entity: 'SstWorkEnvironment',
    entityId: updated.id,
  })

  return mapDateFields(updated)
}

export async function activateWorkEnvironmentService(
  actor: AuthUser,
  id: string,
  deps: SstOrganizationDeps = defaultDeps,
) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)

  const target = await deps.findWorkEnvironmentById(id)
  if (!target) {
    throw new Error('Ambiente de trabalho nao encontrado.')
  }

  assertClientInSstScope(scopeClientIds, target.clientId, 'Ambiente de trabalho nao encontrado.')

  const updated = await deps.updateWorkEnvironment(target.id, { isActive: true })

  await deps.createAuditLog({
    actorUserId: actor.id,
    action: 'SST_WORK_ENVIRONMENT_ACTIVATED',
    entity: 'SstWorkEnvironment',
    entityId: updated.id,
  })

  return mapDateFields(updated)
}

export async function deactivateWorkEnvironmentService(
  actor: AuthUser,
  id: string,
  deps: SstOrganizationDeps = defaultDeps,
) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)

  const target = await deps.findWorkEnvironmentById(id)
  if (!target) {
    throw new Error('Ambiente de trabalho nao encontrado.')
  }

  assertClientInSstScope(scopeClientIds, target.clientId, 'Ambiente de trabalho nao encontrado.')

  const updated = await deps.updateWorkEnvironment(target.id, { isActive: false })

  await deps.createAuditLog({
    actorUserId: actor.id,
    action: 'SST_WORK_ENVIRONMENT_DEACTIVATED',
    entity: 'SstWorkEnvironment',
    entityId: updated.id,
  })

  return mapDateFields(updated)
}

export async function listRolesService(actor: AuthUser, input: ListRolesInput, deps: SstOrganizationDeps = defaultDeps) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)
  assertClientInSstScope(scopeClientIds, input.clientId, 'Cliente nao encontrado.')

  const where: Prisma.SstRoleWhereInput = {
    AND: [
      {
        clientId: input.clientId,
      },
      input.search
        ? {
            OR: [
              {
                title: {
                  contains: input.search,
                  mode: 'insensitive',
                },
              },
              {
                cboCode: {
                  contains: input.search,
                },
              },
            ],
          }
        : {},
      input.isActive ? { isActive: isActiveFilter(input.isActive) } : {},
    ],
  }

  const [data, total] = await Promise.all([
    deps.listRoles({ where, skip: input.skip, take: input.take }),
    deps.countRoles(where),
  ])

  return {
    data: data.map(mapDateFields),
    pagination: makePagination(input.page, input.pageSize, total),
  }
}

export async function getRoleByIdService(actor: AuthUser, id: string, deps: SstOrganizationDeps = defaultDeps) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)

  const role = await deps.findRoleRecordById(id)
  if (!role) {
    return null
  }

  assertClientInSstScope(scopeClientIds, role.clientId, 'Cargo nao encontrado.')
  return mapDateFields(role)
}

export async function createRoleService(actor: AuthUser, input: CreateRoleInput, deps: SstOrganizationDeps = defaultDeps) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)
  assertClientInSstScope(scopeClientIds, input.clientId, 'Cliente nao encontrado.')

  await assertClientExists(input.clientId, deps)

  const created = await deps.createRole({
    clientId: input.clientId,
    title: normalizeTitle(input.title),
    cboCode: normalizeCboCode(input.cboCode),
    cboDescription: normalizeOptional(input.cboDescription) ?? null,
    description: normalizeOptional(input.description) ?? null,
    isActive: input.isActive,
  })

  await deps.createAuditLog({
    actorUserId: actor.id,
    action: 'SST_ROLE_CREATED',
    entity: 'SstRole',
    entityId: created.id,
  })

  return mapDateFields(created)
}

export async function updateRoleService(
  actor: AuthUser,
  id: string,
  input: UpdateRoleInput,
  deps: SstOrganizationDeps = defaultDeps,
) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)

  const target = await deps.findRoleById(id)

  if (!target) {
    throw new Error('Cargo nao encontrado.')
  }

  assertClientInSstScope(scopeClientIds, target.clientId, 'Cargo nao encontrado.')

  const updated = await deps.updateRole(target.id, {
    title: input.title ? normalizeTitle(input.title) : undefined,
    cboCode: normalizeCboCode(input.cboCode),
    cboDescription: normalizeOptional(input.cboDescription),
    description: normalizeOptional(input.description),
  })

  await deps.createAuditLog({
    actorUserId: actor.id,
    action: 'SST_ROLE_UPDATED',
    entity: 'SstRole',
    entityId: updated.id,
  })

  return mapDateFields(updated)
}

export async function activateRoleService(actor: AuthUser, id: string, deps: SstOrganizationDeps = defaultDeps) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)

  const target = await deps.findRoleById(id)
  if (!target) {
    throw new Error('Cargo nao encontrado.')
  }

  assertClientInSstScope(scopeClientIds, target.clientId, 'Cargo nao encontrado.')

  const updated = await deps.updateRole(target.id, { isActive: true })

  await deps.createAuditLog({
    actorUserId: actor.id,
    action: 'SST_ROLE_ACTIVATED',
    entity: 'SstRole',
    entityId: updated.id,
  })

  return mapDateFields(updated)
}

export async function deactivateRoleService(actor: AuthUser, id: string, deps: SstOrganizationDeps = defaultDeps) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)

  const target = await deps.findRoleById(id)
  if (!target) {
    throw new Error('Cargo nao encontrado.')
  }

  assertClientInSstScope(scopeClientIds, target.clientId, 'Cargo nao encontrado.')

  const updated = await deps.updateRole(target.id, { isActive: false })

  await deps.createAuditLog({
    actorUserId: actor.id,
    action: 'SST_ROLE_DEACTIVATED',
    entity: 'SstRole',
    entityId: updated.id,
  })

  return mapDateFields(updated)
}

export async function listActivitiesService(actor: AuthUser, input: ListActivitiesInput, deps: SstOrganizationDeps = defaultDeps) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)
  assertClientInSstScope(scopeClientIds, input.clientId, 'Cliente nao encontrado.')

  const where: Prisma.SstActivityWhereInput = {
    AND: [
      {
        clientId: input.clientId,
      },
      input.roleId ? { roleId: input.roleId } : {},
      input.frequency ? { frequency: input.frequency } : {},
      input.isCritical === undefined ? {} : { isCritical: input.isCritical },
      input.search
        ? {
            title: {
              contains: input.search,
              mode: 'insensitive',
            },
          }
        : {},
      input.isActive ? { isActive: isActiveFilter(input.isActive) } : {},
    ],
  }

  const [data, total] = await Promise.all([
    deps.listActivities({ where, skip: input.skip, take: input.take }),
    deps.countActivities(where),
  ])

  return {
    data: data.map(mapDateFields),
    pagination: makePagination(input.page, input.pageSize, total),
  }
}

export async function getActivityByIdService(actor: AuthUser, id: string, deps: SstOrganizationDeps = defaultDeps) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)

  const activity = await deps.findActivityRecordById(id)
  if (!activity) {
    return null
  }

  assertClientInSstScope(scopeClientIds, activity.clientId, 'Atividade nao encontrada.')
  return mapDateFields(activity)
}

export async function createActivityService(
  actor: AuthUser,
  input: CreateActivityInput,
  deps: SstOrganizationDeps = defaultDeps,
) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)
  assertClientInSstScope(scopeClientIds, input.clientId, 'Cliente nao encontrado.')

  await assertClientExists(input.clientId, deps)
  await assertRoleBelongs(input.clientId, input.roleId, deps)

  const normalizedTitle = normalizeTitle(input.title)
  await assertUniqueActivityTitle(input.roleId, normalizedTitle, deps)

  const created = await deps.createActivity({
    clientId: input.clientId,
    roleId: input.roleId,
    title: normalizedTitle,
    frequency: input.frequency,
    description: normalizeOptional(input.description) ?? null,
    isCritical: input.isCritical,
    isActive: input.isActive,
  })

  await deps.createAuditLog({
    actorUserId: actor.id,
    action: 'SST_ACTIVITY_CREATED',
    entity: 'SstActivity',
    entityId: created.id,
  })

  return mapDateFields(created)
}

export async function updateActivityService(
  actor: AuthUser,
  id: string,
  input: UpdateActivityInput,
  deps: SstOrganizationDeps = defaultDeps,
) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)

  const target = await deps.findActivityById(id)

  if (!target) {
    throw new Error('Atividade nao encontrada.')
  }

  assertClientInSstScope(scopeClientIds, target.clientId, 'Atividade nao encontrada.')

  const nextRoleId = input.roleId ?? target.roleId

  await assertRoleBelongs(target.clientId, nextRoleId, deps)

  const normalizedTitle = input.title ? normalizeTitle(input.title) : undefined

  if (normalizedTitle) {
    await assertUniqueActivityTitle(nextRoleId, normalizedTitle, deps, target.id)
  }

  const updated = await deps.updateActivity(target.id, {
    role: input.roleId
      ? {
          connect: {
            clientId_id: {
              clientId: target.clientId,
              id: input.roleId,
            },
          },
        }
      : undefined,
    title: normalizedTitle,
    frequency: input.frequency,
    description: normalizeOptional(input.description),
    isCritical: input.isCritical,
  })

  await deps.createAuditLog({
    actorUserId: actor.id,
    action: 'SST_ACTIVITY_UPDATED',
    entity: 'SstActivity',
    entityId: updated.id,
  })

  return mapDateFields(updated)
}

export async function activateActivityService(actor: AuthUser, id: string, deps: SstOrganizationDeps = defaultDeps) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)

  const target = await deps.findActivityById(id)
  if (!target) {
    throw new Error('Atividade nao encontrada.')
  }

  assertClientInSstScope(scopeClientIds, target.clientId, 'Atividade nao encontrada.')

  const updated = await deps.updateActivity(target.id, { isActive: true })

  await deps.createAuditLog({
    actorUserId: actor.id,
    action: 'SST_ACTIVITY_ACTIVATED',
    entity: 'SstActivity',
    entityId: updated.id,
  })

  return mapDateFields(updated)
}

export async function deactivateActivityService(
  actor: AuthUser,
  id: string,
  deps: SstOrganizationDeps = defaultDeps,
) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)

  const target = await deps.findActivityById(id)
  if (!target) {
    throw new Error('Atividade nao encontrada.')
  }

  assertClientInSstScope(scopeClientIds, target.clientId, 'Atividade nao encontrada.')

  const updated = await deps.updateActivity(target.id, { isActive: false })

  await deps.createAuditLog({
    actorUserId: actor.id,
    action: 'SST_ACTIVITY_DEACTIVATED',
    entity: 'SstActivity',
    entityId: updated.id,
  })

  return mapDateFields(updated)
}

export async function listWorkSchedulesService(actor: AuthUser, input: ListWorkSchedulesInput, deps: SstOrganizationDeps = defaultDeps) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)
  assertClientInSstScope(scopeClientIds, input.clientId, 'Cliente nao encontrado.')

  const where: Prisma.SstWorkScheduleWhereInput = {
    AND: [
      {
        clientId: input.clientId,
      },
      input.establishmentId
        ? {
            establishmentId: input.establishmentId,
          }
        : {},
      input.scheduleType
        ? {
            scheduleType: input.scheduleType,
          }
        : {},
      input.search
        ? {
            name: {
              contains: input.search,
              mode: 'insensitive',
            },
          }
        : {},
      input.isActive ? { isActive: isActiveFilter(input.isActive) } : {},
    ],
  }

  const [data, total] = await Promise.all([
    deps.listWorkSchedules({ where, skip: input.skip, take: input.take }),
    deps.countWorkSchedules(where),
  ])

  return {
    data: data.map(mapWorkSchedule),
    pagination: makePagination(input.page, input.pageSize, total),
  }
}

export async function getWorkScheduleByIdService(actor: AuthUser, id: string, deps: SstOrganizationDeps = defaultDeps) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)

  const schedule = await deps.findWorkScheduleRecordById(id)
  if (!schedule) {
    return null
  }

  assertClientInSstScope(scopeClientIds, schedule.clientId, 'Jornada nao encontrada.')
  return mapWorkSchedule(schedule)
}

export async function createWorkScheduleService(
  actor: AuthUser,
  input: CreateWorkScheduleInput,
  deps: SstOrganizationDeps = defaultDeps,
) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)
  assertClientInSstScope(scopeClientIds, input.clientId, 'Cliente nao encontrado.')

  await assertClientExists(input.clientId, deps)
  await assertEstablishmentInClient(input.clientId, input.establishmentId, deps)
  assertWeeklyHours(input.scheduleType, input.weeklyHours)

  const normalizedName = normalizeTitle(input.name)
  await assertUniqueWorkScheduleName(input.establishmentId, normalizedName, deps)

  const created = await deps.createWorkSchedule({
    clientId: input.clientId,
    establishmentId: input.establishmentId,
    name: normalizedName,
    scheduleType: input.scheduleType,
    weeklyHours: input.weeklyHours === undefined ? null : new Prisma.Decimal(input.weeklyHours.toFixed(2)),
    shiftPattern: normalizeOptional(input.shiftPattern) ?? null,
    description: normalizeOptional(input.description) ?? null,
    isActive: input.isActive,
  })

  await deps.createAuditLog({
    actorUserId: actor.id,
    action: 'SST_WORK_SCHEDULE_CREATED',
    entity: 'SstWorkSchedule',
    entityId: created.id,
  })

  return mapWorkSchedule(created)
}

export async function updateWorkScheduleService(
  actor: AuthUser,
  id: string,
  input: UpdateWorkScheduleInput,
  deps: SstOrganizationDeps = defaultDeps,
) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)

  const target = await deps.findWorkScheduleById(id)

  if (!target) {
    throw new Error('Jornada nao encontrada.')
  }

  assertClientInSstScope(scopeClientIds, target.clientId, 'Jornada nao encontrada.')

  const nextScheduleType = input.scheduleType ?? target.scheduleType
  const nextWeeklyHours =
    input.weeklyHours === undefined
      ? target.weeklyHours
        ? Number(target.weeklyHours.toString())
        : null
      : input.weeklyHours

  assertWeeklyHours(nextScheduleType, nextWeeklyHours)

  const normalizedName = input.name ? normalizeTitle(input.name) : undefined
  if (normalizedName) {
    await assertUniqueWorkScheduleName(target.establishmentId, normalizedName, deps, target.id)
  }

  const updated = await deps.updateWorkSchedule(target.id, {
    name: normalizedName,
    scheduleType: input.scheduleType,
    weeklyHours:
      input.weeklyHours === undefined
        ? undefined
        : input.weeklyHours === null
          ? null
          : new Prisma.Decimal(input.weeklyHours.toFixed(2)),
    shiftPattern: normalizeOptional(input.shiftPattern),
    description: normalizeOptional(input.description),
  })

  await deps.createAuditLog({
    actorUserId: actor.id,
    action: 'SST_WORK_SCHEDULE_UPDATED',
    entity: 'SstWorkSchedule',
    entityId: updated.id,
  })

  return mapWorkSchedule(updated)
}

export async function activateWorkScheduleService(
  actor: AuthUser,
  id: string,
  deps: SstOrganizationDeps = defaultDeps,
) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)

  const target = await deps.findWorkScheduleById(id)
  if (!target) {
    throw new Error('Jornada nao encontrada.')
  }

  assertClientInSstScope(scopeClientIds, target.clientId, 'Jornada nao encontrada.')

  const updated = await deps.updateWorkSchedule(target.id, { isActive: true })

  await deps.createAuditLog({
    actorUserId: actor.id,
    action: 'SST_WORK_SCHEDULE_ACTIVATED',
    entity: 'SstWorkSchedule',
    entityId: updated.id,
  })

  return mapWorkSchedule(updated)
}

export async function deactivateWorkScheduleService(
  actor: AuthUser,
  id: string,
  deps: SstOrganizationDeps = defaultDeps,
) {
  const scopeClientIds = await resolveActorSstScopeClientIds(actor, deps)

  const target = await deps.findWorkScheduleById(id)
  if (!target) {
    throw new Error('Jornada nao encontrada.')
  }

  assertClientInSstScope(scopeClientIds, target.clientId, 'Jornada nao encontrada.')

  const updated = await deps.updateWorkSchedule(target.id, { isActive: false })

  await deps.createAuditLog({
    actorUserId: actor.id,
    action: 'SST_WORK_SCHEDULE_DEACTIVATED',
    entity: 'SstWorkSchedule',
    entityId: updated.id,
  })

  return mapWorkSchedule(updated)
}
