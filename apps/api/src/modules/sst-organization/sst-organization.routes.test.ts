/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import Fastify from 'fastify'
import { env } from '../../config/env.js'
import { prisma } from '../../lib/prisma.js'
import { authPlugin } from '../../plugins/auth.js'
import { securityPlugin } from '../../plugins/security.js'
import { sstOrganizationRoutes } from './sst-organization.routes.js'

type MockUser = {
  id: string
  role:
    | 'SUPER_ADMIN'
    | 'ADMIN'
    | 'SST_MANAGER'
    | 'SAFETY_ENGINEER'
    | 'SAFETY_TECHNICIAN'
    | 'OCCUPATIONAL_PHYSICIAN'
    | 'RH'
    | 'FINANCIAL'
    | 'CLIENT'
    | 'VIEWER'
  isActive: boolean
}

type MockClient = { id: string }
type MockEstablishment = { id: string; clientId: string }

type MockSector = {
  id: string
  clientId: string
  establishmentId: string
  code: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

type MockWorkEnvironment = {
  id: string
  clientId: string
  establishmentId: string
  sectorId: string
  code: string
  name: string
  description: string | null
  indoorOutdoorType: 'INDOOR' | 'OUTDOOR' | 'MIXED'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

type MockRole = {
  id: string
  clientId: string
  title: string
  cboCode: string | null
  cboDescription: string | null
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

type MockActivity = {
  id: string
  clientId: string
  roleId: string
  title: string
  frequency: 'ROUTINE' | 'NON_ROUTINE' | 'EVENTUAL'
  description: string | null
  isCritical: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

type MockWorkSchedule = {
  id: string
  clientId: string
  establishmentId: string
  name: string
  scheduleType: 'FIXED' | 'SHIFT' | 'FLEX' | 'OTHER'
  weeklyHours: { toNumber: () => number; toString: () => string } | null
  shiftPattern: string | null
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

type MockState = {
  users: MockUser[]
  memberships: Array<{ userId: string; clientId: string; isActive: boolean }>
  clients: MockClient[]
  establishments: MockEstablishment[]
  sectors: MockSector[]
  workEnvironments: MockWorkEnvironment[]
  roles: MockRole[]
  activities: MockActivity[]
  workSchedules: MockWorkSchedule[]
  auditLogs: Array<{ action: string; entity: string; entityId?: string | null }>
  counters: Record<string, number>
}

const originals: Record<string, unknown> = {}
let state: MockState
let app: Awaited<ReturnType<typeof buildTestApp>>

function newDate() {
  return new Date('2026-10-16T12:00:00.000Z')
}

function nextId(prefix: string) {
  state.counters[prefix] = (state.counters[prefix] ?? 0) + 1
  return `${prefix}-${state.counters[prefix]}`
}

function pickBySelect<T extends Record<string, unknown>>(record: T, select: Record<string, boolean> | undefined) {
  if (!select) {
    return { ...record }
  }

  const out: Record<string, unknown> = {}
  for (const key of Object.keys(select)) {
    out[key] = record[key]
  }
  return out
}

function includesInsensitive(value: unknown, contains: string) {
  const text = String(value ?? '')
  return text.toLowerCase().includes(contains.toLowerCase())
}

function matchesWhere(record: Record<string, unknown>, where: Record<string, unknown> | undefined): boolean {
  if (!where) {
    return true
  }

  const and = where.AND
  if (Array.isArray(and)) {
    if (!and.every((item) => matchesWhere(record, item as Record<string, unknown>))) {
      return false
    }
  }

  const or = where.OR
  if (Array.isArray(or) && or.length > 0) {
    if (!or.some((item) => matchesWhere(record, item as Record<string, unknown>))) {
      return false
    }
  }

  for (const [key, value] of Object.entries(where)) {
    if (key === 'AND' || key === 'OR') {
      continue
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const operator = value as Record<string, unknown>
      if (Object.keys(operator).length === 0) {
        continue
      }

      if (Object.prototype.hasOwnProperty.call(operator, 'contains')) {
        if (!includesInsensitive(record[key], String(operator.contains))) {
          return false
        }
        continue
      }

      if (Object.prototype.hasOwnProperty.call(operator, 'not')) {
        if (record[key] === operator.not) {
          return false
        }
        continue
      }
    }

    if (record[key] !== value) {
      return false
    }
  }

  return true
}

function installPrismaMocks() {
  const p = prisma as any

  originals.userFindUnique = p.user.findUnique
  originals.clientMembershipFindMany = p.clientMembership.findMany
  originals.clientFindUnique = p.client.findUnique
  originals.establishmentFindUnique = p.establishment.findUnique
  originals.auditLogCreate = p.auditLog.create

  originals.sstSector = {
    findMany: p.sstSector.findMany,
    count: p.sstSector.count,
    findUnique: p.sstSector.findUnique,
    findFirst: p.sstSector.findFirst,
    create: p.sstSector.create,
    update: p.sstSector.update,
  }

  originals.sstWorkEnvironment = {
    findMany: p.sstWorkEnvironment.findMany,
    count: p.sstWorkEnvironment.count,
    findUnique: p.sstWorkEnvironment.findUnique,
    findFirst: p.sstWorkEnvironment.findFirst,
    create: p.sstWorkEnvironment.create,
    update: p.sstWorkEnvironment.update,
  }

  originals.sstRole = {
    findMany: p.sstRole.findMany,
    count: p.sstRole.count,
    findUnique: p.sstRole.findUnique,
    create: p.sstRole.create,
    update: p.sstRole.update,
  }

  originals.sstActivity = {
    findMany: p.sstActivity.findMany,
    count: p.sstActivity.count,
    findUnique: p.sstActivity.findUnique,
    findFirst: p.sstActivity.findFirst,
    create: p.sstActivity.create,
    update: p.sstActivity.update,
  }

  originals.sstWorkSchedule = {
    findMany: p.sstWorkSchedule.findMany,
    count: p.sstWorkSchedule.count,
    findUnique: p.sstWorkSchedule.findUnique,
    findFirst: p.sstWorkSchedule.findFirst,
    create: p.sstWorkSchedule.create,
    update: p.sstWorkSchedule.update,
  }

  p.user.findUnique = async ({ where }: any) => state.users.find((item) => item.id === where.id) ?? null

  p.clientMembership.findMany = async ({ where, select }: any) => {
    const rows = state.memberships.filter((item) => item.userId === where.userId && item.isActive === where.isActive)
    return rows.map((row) => pickBySelect({ ...row }, select))
  }

  p.client.findUnique = async ({ where }: any) => state.clients.find((item) => item.id === where.id) ?? null
  p.establishment.findUnique = async ({ where }: any) => state.establishments.find((item) => item.id === where.id) ?? null

  p.auditLog.create = async ({ data }: any) => {
    state.auditLogs.push({ action: data.action, entity: data.entity, entityId: data.entityId })
    return { id: nextId('audit'), ...data }
  }

  p.sstSector.findMany = async ({ where, skip, take, select }: any) =>
    state.sectors
      .filter((item) => matchesWhere(item as Record<string, unknown>, where))
      .slice(skip, skip + take)
      .map((row) => pickBySelect(row as unknown as Record<string, unknown>, select))

  p.sstSector.count = async ({ where }: any) => state.sectors.filter((item) => matchesWhere(item as any, where)).length
  p.sstSector.findUnique = async ({ where, select }: any) => {
    const row = state.sectors.find((item) => item.id === where.id)
    return row ? pickBySelect(row as any, select) : null
  }
  p.sstSector.findFirst = async ({ where }: any) =>
    state.sectors.find((item) => matchesWhere(item as any, where)) ?? null
  p.sstSector.create = async ({ data, select }: any) => {
    const row: MockSector = {
      id: nextId('sector'),
      clientId: data.clientId,
      establishmentId: data.establishmentId,
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      isActive: data.isActive,
      createdAt: newDate(),
      updatedAt: newDate(),
    }
    state.sectors.push(row)
    return pickBySelect(row as any, select)
  }
  p.sstSector.update = async ({ where, data, select }: any) => {
    const idx = state.sectors.findIndex((item) => item.id === where.id)
    if (idx < 0) {
      throw new Error('Setor nao encontrado.')
    }
    const row = state.sectors[idx]
    state.sectors[idx] = {
      ...row,
      code: data.code ?? row.code,
      name: data.name ?? row.name,
      description: data.description === undefined ? row.description : data.description,
      isActive: data.isActive ?? row.isActive,
      updatedAt: newDate(),
    }
    return pickBySelect(state.sectors[idx] as any, select)
  }

  p.sstWorkEnvironment.findMany = async ({ where, skip, take, select }: any) =>
    state.workEnvironments
      .filter((item) => matchesWhere(item as any, where))
      .slice(skip, skip + take)
      .map((row) => pickBySelect(row as any, select))
  p.sstWorkEnvironment.count = async ({ where }: any) => state.workEnvironments.filter((item) => matchesWhere(item as any, where)).length
  p.sstWorkEnvironment.findUnique = async ({ where, select }: any) => {
    const row = state.workEnvironments.find((item) => item.id === where.id)
    return row ? pickBySelect(row as any, select) : null
  }
  p.sstWorkEnvironment.findFirst = async ({ where }: any) =>
    state.workEnvironments.find((item) => matchesWhere(item as any, where)) ?? null
  p.sstWorkEnvironment.create = async ({ data, select }: any) => {
    const row: MockWorkEnvironment = {
      id: nextId('env'),
      clientId: data.clientId,
      establishmentId: data.establishmentId,
      sectorId: data.sectorId,
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      indoorOutdoorType: data.indoorOutdoorType,
      isActive: data.isActive,
      createdAt: newDate(),
      updatedAt: newDate(),
    }
    state.workEnvironments.push(row)
    return pickBySelect(row as any, select)
  }
  p.sstWorkEnvironment.update = async ({ where, data, select }: any) => {
    const idx = state.workEnvironments.findIndex((item) => item.id === where.id)
    if (idx < 0) {
      throw new Error('Ambiente nao encontrado.')
    }
    const row = state.workEnvironments[idx]
    const nextSectorId = data.sector?.connect?.clientId_establishmentId_id?.id
    state.workEnvironments[idx] = {
      ...row,
      sectorId: nextSectorId ?? row.sectorId,
      code: data.code ?? row.code,
      name: data.name ?? row.name,
      description: data.description === undefined ? row.description : data.description,
      indoorOutdoorType: data.indoorOutdoorType ?? row.indoorOutdoorType,
      isActive: data.isActive ?? row.isActive,
      updatedAt: newDate(),
    }
    return pickBySelect(state.workEnvironments[idx] as any, select)
  }

  p.sstRole.findMany = async ({ where, skip, take, select }: any) =>
    state.roles
      .filter((item) => matchesWhere(item as any, where))
      .slice(skip, skip + take)
      .map((row) => pickBySelect(row as any, select))
  p.sstRole.count = async ({ where }: any) => state.roles.filter((item) => matchesWhere(item as any, where)).length
  p.sstRole.findUnique = async ({ where, select }: any) => {
    const row = state.roles.find((item) => item.id === where.id)
    return row ? pickBySelect(row as any, select) : null
  }
  p.sstRole.create = async ({ data, select }: any) => {
    const row: MockRole = {
      id: nextId('role'),
      clientId: data.clientId,
      title: data.title,
      cboCode: data.cboCode ?? null,
      cboDescription: data.cboDescription ?? null,
      description: data.description ?? null,
      isActive: data.isActive,
      createdAt: newDate(),
      updatedAt: newDate(),
    }
    state.roles.push(row)
    return pickBySelect(row as any, select)
  }
  p.sstRole.update = async ({ where, data, select }: any) => {
    const idx = state.roles.findIndex((item) => item.id === where.id)
    if (idx < 0) {
      throw new Error('Cargo nao encontrado.')
    }
    const row = state.roles[idx]
    state.roles[idx] = {
      ...row,
      title: data.title ?? row.title,
      cboCode: data.cboCode === undefined ? row.cboCode : data.cboCode,
      cboDescription: data.cboDescription === undefined ? row.cboDescription : data.cboDescription,
      description: data.description === undefined ? row.description : data.description,
      isActive: data.isActive ?? row.isActive,
      updatedAt: newDate(),
    }
    return pickBySelect(state.roles[idx] as any, select)
  }

  p.sstActivity.findMany = async ({ where, skip, take, select }: any) =>
    state.activities
      .filter((item) => matchesWhere(item as any, where))
      .slice(skip, skip + take)
      .map((row) => pickBySelect(row as any, select))
  p.sstActivity.count = async ({ where }: any) => state.activities.filter((item) => matchesWhere(item as any, where)).length
  p.sstActivity.findUnique = async ({ where, select }: any) => {
    const row = state.activities.find((item) => item.id === where.id)
    return row ? pickBySelect(row as any, select) : null
  }
  p.sstActivity.findFirst = async ({ where }: any) => state.activities.find((item) => matchesWhere(item as any, where)) ?? null
  p.sstActivity.create = async ({ data, select }: any) => {
    const row: MockActivity = {
      id: nextId('activity'),
      clientId: data.clientId,
      roleId: data.roleId,
      title: data.title,
      frequency: data.frequency,
      description: data.description ?? null,
      isCritical: data.isCritical,
      isActive: data.isActive,
      createdAt: newDate(),
      updatedAt: newDate(),
    }
    state.activities.push(row)
    return pickBySelect(row as any, select)
  }
  p.sstActivity.update = async ({ where, data, select }: any) => {
    const idx = state.activities.findIndex((item) => item.id === where.id)
    if (idx < 0) {
      throw new Error('Atividade nao encontrada.')
    }
    const row = state.activities[idx]
    const nextRoleId = data.role?.connect?.clientId_id?.id
    state.activities[idx] = {
      ...row,
      roleId: nextRoleId ?? row.roleId,
      title: data.title ?? row.title,
      frequency: data.frequency ?? row.frequency,
      description: data.description === undefined ? row.description : data.description,
      isCritical: data.isCritical ?? row.isCritical,
      isActive: data.isActive ?? row.isActive,
      updatedAt: newDate(),
    }
    return pickBySelect(state.activities[idx] as any, select)
  }

  p.sstWorkSchedule.findMany = async ({ where, skip, take, select }: any) =>
    state.workSchedules
      .filter((item) => matchesWhere(item as any, where))
      .slice(skip, skip + take)
      .map((row) => pickBySelect(row as any, select))
  p.sstWorkSchedule.count = async ({ where }: any) => state.workSchedules.filter((item) => matchesWhere(item as any, where)).length
  p.sstWorkSchedule.findUnique = async ({ where, select }: any) => {
    const row = state.workSchedules.find((item) => item.id === where.id)
    return row ? pickBySelect(row as any, select) : null
  }
  p.sstWorkSchedule.findFirst = async ({ where }: any) =>
    state.workSchedules.find((item) => matchesWhere(item as any, where)) ?? null
  p.sstWorkSchedule.create = async ({ data, select }: any) => {
    const value = data.weeklyHours
      ? {
          toNumber: () => Number(data.weeklyHours.toString()),
          toString: () => data.weeklyHours.toString(),
        }
      : null

    const row: MockWorkSchedule = {
      id: nextId('schedule'),
      clientId: data.clientId,
      establishmentId: data.establishmentId,
      name: data.name,
      scheduleType: data.scheduleType,
      weeklyHours: value,
      shiftPattern: data.shiftPattern ?? null,
      description: data.description ?? null,
      isActive: data.isActive,
      createdAt: newDate(),
      updatedAt: newDate(),
    }
    state.workSchedules.push(row)
    return pickBySelect(row as any, select)
  }
  p.sstWorkSchedule.update = async ({ where, data, select }: any) => {
    const idx = state.workSchedules.findIndex((item) => item.id === where.id)
    if (idx < 0) {
      throw new Error('Jornada nao encontrada.')
    }

    const row = state.workSchedules[idx]
    const value =
      data.weeklyHours === undefined
        ? row.weeklyHours
        : data.weeklyHours === null
          ? null
          : {
              toNumber: () => Number(data.weeklyHours.toString()),
              toString: () => data.weeklyHours.toString(),
            }

    state.workSchedules[idx] = {
      ...row,
      name: data.name ?? row.name,
      scheduleType: data.scheduleType ?? row.scheduleType,
      weeklyHours: value,
      shiftPattern: data.shiftPattern === undefined ? row.shiftPattern : data.shiftPattern,
      description: data.description === undefined ? row.description : data.description,
      isActive: data.isActive ?? row.isActive,
      updatedAt: newDate(),
    }

    return pickBySelect(state.workSchedules[idx] as any, select)
  }
}

function restorePrismaMocks() {
  const p = prisma as any

  p.user.findUnique = originals.userFindUnique
  p.clientMembership.findMany = originals.clientMembershipFindMany
  p.client.findUnique = originals.clientFindUnique
  p.establishment.findUnique = originals.establishmentFindUnique
  p.auditLog.create = originals.auditLogCreate

  p.sstSector.findMany = (originals.sstSector as any).findMany
  p.sstSector.count = (originals.sstSector as any).count
  p.sstSector.findUnique = (originals.sstSector as any).findUnique
  p.sstSector.findFirst = (originals.sstSector as any).findFirst
  p.sstSector.create = (originals.sstSector as any).create
  p.sstSector.update = (originals.sstSector as any).update

  p.sstWorkEnvironment.findMany = (originals.sstWorkEnvironment as any).findMany
  p.sstWorkEnvironment.count = (originals.sstWorkEnvironment as any).count
  p.sstWorkEnvironment.findUnique = (originals.sstWorkEnvironment as any).findUnique
  p.sstWorkEnvironment.findFirst = (originals.sstWorkEnvironment as any).findFirst
  p.sstWorkEnvironment.create = (originals.sstWorkEnvironment as any).create
  p.sstWorkEnvironment.update = (originals.sstWorkEnvironment as any).update

  p.sstRole.findMany = (originals.sstRole as any).findMany
  p.sstRole.count = (originals.sstRole as any).count
  p.sstRole.findUnique = (originals.sstRole as any).findUnique
  p.sstRole.create = (originals.sstRole as any).create
  p.sstRole.update = (originals.sstRole as any).update

  p.sstActivity.findMany = (originals.sstActivity as any).findMany
  p.sstActivity.count = (originals.sstActivity as any).count
  p.sstActivity.findUnique = (originals.sstActivity as any).findUnique
  p.sstActivity.findFirst = (originals.sstActivity as any).findFirst
  p.sstActivity.create = (originals.sstActivity as any).create
  p.sstActivity.update = (originals.sstActivity as any).update

  p.sstWorkSchedule.findMany = (originals.sstWorkSchedule as any).findMany
  p.sstWorkSchedule.count = (originals.sstWorkSchedule as any).count
  p.sstWorkSchedule.findUnique = (originals.sstWorkSchedule as any).findUnique
  p.sstWorkSchedule.findFirst = (originals.sstWorkSchedule as any).findFirst
  p.sstWorkSchedule.create = (originals.sstWorkSchedule as any).create
  p.sstWorkSchedule.update = (originals.sstWorkSchedule as any).update
}

function resetState() {
  state = {
    users: [
      { id: 'u-admin', role: 'ADMIN', isActive: true },
      { id: 'u-manager-a', role: 'SST_MANAGER', isActive: true },
      { id: 'u-client', role: 'CLIENT', isActive: true },
    ],
    memberships: [{ userId: 'u-manager-a', clientId: 'client-a', isActive: true }],
    clients: [{ id: 'client-a' }, { id: 'client-b' }],
    establishments: [
      { id: 'est-a1', clientId: 'client-a' },
      { id: 'est-a2', clientId: 'client-a' },
      { id: 'est-b1', clientId: 'client-b' },
    ],
    sectors: [
      {
        id: 'sector-a1',
        clientId: 'client-a',
        establishmentId: 'est-a1',
        code: 'ADM',
        name: 'Administrativo',
        description: null,
        isActive: true,
        createdAt: newDate(),
        updatedAt: newDate(),
      },
      {
        id: 'sector-a2',
        clientId: 'client-a',
        establishmentId: 'est-a2',
        code: 'PROD',
        name: 'Producao',
        description: null,
        isActive: true,
        createdAt: newDate(),
        updatedAt: newDate(),
      },
      {
        id: 'sector-b1',
        clientId: 'client-b',
        establishmentId: 'est-b1',
        code: 'LOG',
        name: 'Logistica',
        description: null,
        isActive: true,
        createdAt: newDate(),
        updatedAt: newDate(),
      },
    ],
    workEnvironments: [],
    roles: [
      {
        id: 'role-a',
        clientId: 'client-a',
        title: 'Operador A',
        cboCode: '1234',
        cboDescription: null,
        description: null,
        isActive: true,
        createdAt: newDate(),
        updatedAt: newDate(),
      },
      {
        id: 'role-b',
        clientId: 'client-b',
        title: 'Operador B',
        cboCode: '5678',
        cboDescription: null,
        description: null,
        isActive: true,
        createdAt: newDate(),
        updatedAt: newDate(),
      },
    ],
    activities: [],
    workSchedules: [],
    auditLogs: [],
    counters: {},
  }
}

async function buildTestApp() {
  const instance = Fastify({ logger: false })
  await instance.register(securityPlugin)
  await instance.register(authPlugin)
  await instance.register(sstOrganizationRoutes, { prefix: '/api/v1' })
  await instance.ready()
  return instance
}

async function authCookie(userId: string, role: MockUser['role']) {
  const token = app.jwt.sign({ sub: userId, role })
  return `${env.AUTH_COOKIE_NAME}=${token}`
}

before(async () => {
  installPrismaMocks()
  app = await buildTestApp()
})

beforeEach(() => {
  resetState()
})

after(async () => {
  await app.close()
  restorePrismaMocks()
})

test('retorna 401 sem autenticacao', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/sst/sectors?clientId=client-a',
  })

  assert.equal(response.statusCode, 401)
})

test('retorna 403 para usuario sem permissao SST', async () => {
  const cookie = await authCookie('u-client', 'CLIENT')
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/sst/sectors?clientId=client-a',
    headers: { cookie },
  })

  assert.equal(response.statusCode, 403)
})

test('permite leitura com RBAC e escopo valido', async () => {
  const cookie = await authCookie('u-manager-a', 'SST_MANAGER')
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/sst/sectors?clientId=client-a&page=1&pageSize=10',
    headers: { cookie },
  })

  assert.equal(response.statusCode, 200)
  const payload = response.json()
  assert.equal(Array.isArray(payload.data), true)
  assert.equal(payload.pagination.total > 0, true)
})

test('bloqueia leitura entre clientes (isolamento)', async () => {
  const cookie = await authCookie('u-manager-a', 'SST_MANAGER')
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/sst/sectors?clientId=client-b',
    headers: { cookie },
  })

  assert.equal(response.statusCode, 404)
})

test('retorna 409 em conflito de unicidade de setor por codigo no estabelecimento', async () => {
  const cookie = await authCookie('u-admin', 'ADMIN')
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/sst/sectors',
    headers: { cookie },
    payload: {
      clientId: 'client-a',
      establishmentId: 'est-a1',
      code: 'ADM',
      name: 'Administrativo duplicado',
      isActive: true,
    },
  })

  assert.equal(response.statusCode, 409)
})

test('bloqueia ambiente vinculado a setor de outro estabelecimento', async () => {
  const cookie = await authCookie('u-admin', 'ADMIN')
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/sst/work-environments',
    headers: { cookie },
    payload: {
      clientId: 'client-a',
      establishmentId: 'est-a1',
      sectorId: 'sector-a2',
      code: 'ENV-01',
      name: 'Ambiente invalido',
      indoorOutdoorType: 'INDOOR',
      isActive: true,
    },
  })

  assert.equal(response.statusCode, 400)
})

test('bloqueia atividade vinculada a cargo de outro cliente', async () => {
  const cookie = await authCookie('u-admin', 'ADMIN')
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/sst/activities',
    headers: { cookie },
    payload: {
      clientId: 'client-a',
      roleId: 'role-b',
      title: 'Atividade invalida',
      frequency: 'ROUTINE',
      isCritical: false,
      isActive: true,
    },
  })

  assert.equal(response.statusCode, 404)
})

test('retorna 400 para dados invalidos no body (zod)', async () => {
  const cookie = await authCookie('u-admin', 'ADMIN')
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/sst/roles',
    headers: { cookie },
    payload: {
      clientId: 'client-a',
      title: 'x',
      cboCode: '12A',
      isActive: true,
    },
  })

  assert.equal(response.statusCode, 400)
})

test('retorna 404 para id inexistente', async () => {
  const cookie = await authCookie('u-admin', 'ADMIN')
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/sst/roles/role-inexistente',
    headers: { cookie },
  })

  assert.equal(response.statusCode, 404)
})

test('ativa e desativa setor com sucesso e registra auditoria', async () => {
  const cookie = await authCookie('u-admin', 'ADMIN')

  const deactivate = await app.inject({
    method: 'POST',
    url: '/api/v1/sst/sectors/sector-a1/deactivate',
    headers: { cookie },
  })

  assert.equal(deactivate.statusCode, 200)
  assert.equal(deactivate.json().sector.isActive, false)

  const activate = await app.inject({
    method: 'POST',
    url: '/api/v1/sst/sectors/sector-a1/activate',
    headers: { cookie },
  })

  assert.equal(activate.statusCode, 200)
  assert.equal(activate.json().sector.isActive, true)
  assert.equal(state.auditLogs.length >= 2, true)
})

test('nao expoe campos sensiveis em resposta de leitura', async () => {
  const cookie = await authCookie('u-admin', 'ADMIN')
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/sst/sectors/sector-a1',
    headers: { cookie },
  })

  assert.equal(response.statusCode, 200)
  const sector = response.json().sector as Record<string, unknown>
  assert.equal(Object.prototype.hasOwnProperty.call(sector, 'passwordHash'), false)
  assert.equal(Object.prototype.hasOwnProperty.call(sector, 'permissions'), false)
})

test('retorna 404 ao atualizar recurso de outro cliente fora do escopo do usuario', async () => {
  const cookie = await authCookie('u-manager-a', 'SST_MANAGER')

  const response = await app.inject({
    method: 'PATCH',
    url: '/api/v1/sst/sectors/sector-b1',
    headers: { cookie },
    payload: {
      name: 'Tentativa fora do escopo',
    },
  })

  assert.equal(response.statusCode, 404)
})
