import assert from 'node:assert/strict'
import test from 'node:test'
import { Prisma } from '@prisma/client'
import type { AuthUser } from '../../plugins/auth.js'
import {
  createActivityService,
  createSectorService,
  createWorkEnvironmentService,
  createWorkScheduleService,
  updateWorkScheduleService,
  type SstOrganizationDeps,
} from './sst-organization.service.js'

const actor: AuthUser = {
  id: 'user-1',
  role: 'ADMIN',
  permissions: ['sst.structure.manage'],
}

function makeDeps(overrides: Partial<SstOrganizationDeps> = {}): SstOrganizationDeps {
  const base: SstOrganizationDeps = {
    createAuditLog: async () => undefined,
    listActiveClientMembershipClientIds: async () => [],
    countSectors: async () => 0,
    listSectors: async () => [],
    findSectorById: async () => null,
    findSectorRecordById: async () => null,
    findSectorByCode: async () => null,
    createSector: async () => {
      throw new Error('not implemented')
    },
    updateSector: async () => {
      throw new Error('not implemented')
    },
    countWorkEnvironments: async () => 0,
    listWorkEnvironments: async () => [],
    findWorkEnvironmentById: async () => null,
    findWorkEnvironmentRecordById: async () => null,
    findWorkEnvironmentByCode: async () => null,
    createWorkEnvironment: async () => {
      throw new Error('not implemented')
    },
    updateWorkEnvironment: async () => {
      throw new Error('not implemented')
    },
    countRoles: async () => 0,
    listRoles: async () => [],
    findRoleById: async () => null,
    findRoleRecordById: async () => null,
    createRole: async () => {
      throw new Error('not implemented')
    },
    updateRole: async () => {
      throw new Error('not implemented')
    },
    countActivities: async () => 0,
    listActivities: async () => [],
    findActivityById: async () => null,
    findActivityRecordById: async () => null,
    findActivityByRoleAndTitle: async () => null,
    createActivity: async () => {
      throw new Error('not implemented')
    },
    updateActivity: async () => ({ id: 'x' } as never),
    countWorkSchedules: async () => 0,
    listWorkSchedules: async () => [],
    findWorkScheduleById: async () => null,
    findWorkScheduleRecordById: async () => null,
    findWorkScheduleByName: async () => null,
    createWorkSchedule: async () => {
      throw new Error('not implemented')
    },
    updateWorkSchedule: async () => {
      throw new Error('not implemented')
    },
    findClientById: async () => null,
    findEstablishmentById: async () => null,
  }

  return {
    ...base,
    ...overrides,
  }
}

test('createSectorService rejeita estabelecimento fora do cliente', async () => {
  const deps = makeDeps({
    findClientById: async () => ({ id: 'client-a' } as never),
    findEstablishmentById: async () => ({ id: 'est-1', clientId: 'client-b' } as never),
  })

  await assert.rejects(
    () =>
      createSectorService(
        actor,
        {
          clientId: 'client-a',
          establishmentId: 'est-1',
          code: 'set-01',
          name: 'Setor 01',
          isActive: true,
        },
        deps,
      ),
    /Estabelecimento nao encontrado para o cliente informado/,
  )
})

test('createWorkEnvironmentService rejeita setor inconsistente', async () => {
  const deps = makeDeps({
    findClientById: async () => ({ id: 'client-a' } as never),
    findEstablishmentById: async () => ({ id: 'est-1', clientId: 'client-a' } as never),
    findSectorById: async () => ({ id: 'sector-x', clientId: 'client-a', establishmentId: 'est-2' } as never),
  })

  await assert.rejects(
    () =>
      createWorkEnvironmentService(
        actor,
        {
          clientId: 'client-a',
          establishmentId: 'est-1',
          sectorId: 'sector-x',
          code: 'AMB-01',
          name: 'Ambiente',
          indoorOutdoorType: 'INDOOR',
          isActive: true,
        },
        deps,
      ),
    /Setor inconsistente para cliente\/estabelecimento informado/,
  )
})

test('createActivityService rejeita cargo de outro cliente', async () => {
  const deps = makeDeps({
    findClientById: async () => ({ id: 'client-a' } as never),
    findRoleById: async () => ({ id: 'role-1', clientId: 'client-b' } as never),
  })

  await assert.rejects(
    () =>
      createActivityService(
        actor,
        {
          clientId: 'client-a',
          roleId: 'role-1',
          title: 'Inspecao',
          frequency: 'ROUTINE',
          isCritical: false,
          isActive: true,
        },
        deps,
      ),
    /Cargo nao encontrado para o cliente informado/,
  )
})

test('createWorkScheduleService valida limite de weeklyHours', async () => {
  const deps = makeDeps({
    findClientById: async () => ({ id: 'client-a' } as never),
    findEstablishmentById: async () => ({ id: 'est-1', clientId: 'client-a' } as never),
  })

  await assert.rejects(
    () =>
      createWorkScheduleService(
        actor,
        {
          clientId: 'client-a',
          establishmentId: 'est-1',
          name: '12x36',
          scheduleType: 'SHIFT',
          weeklyHours: 200,
          isActive: true,
        },
        deps,
      ),
    /Carga horaria semanal invalida/,
  )
})

test('createSectorService normaliza codigo e registra auditoria', async () => {
  let createdCode = ''
  let auditCalled = false

  const deps = makeDeps({
    findClientById: async () => ({ id: 'client-a' } as never),
    findEstablishmentById: async () => ({ id: 'est-1', clientId: 'client-a' } as never),
    findSectorByCode: async () => null,
    createSector: async (data) => {
      createdCode = data.code
      return {
        id: 'sector-1',
        clientId: data.clientId,
        establishmentId: data.establishmentId,
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      }
    },
    createAuditLog: async () => {
      auditCalled = true
    },
  })

  const created = await createSectorService(
    actor,
    {
      clientId: 'client-a',
      establishmentId: 'est-1',
      code: ' abc-01 ',
      name: 'Setor A',
      isActive: true,
    },
    deps,
  )

  assert.equal(createdCode, 'ABC-01')
  assert.equal(created.code, 'ABC-01')
  assert.equal(auditCalled, true)
})

test('updateWorkScheduleService converte weeklyHours para Decimal com 2 casas', async () => {
  let receivedWeeklyHours: Prisma.Decimal | null | undefined

  const deps = makeDeps({
    findWorkScheduleById: async () =>
      ({
        id: 'schedule-1',
        clientId: 'client-a',
        establishmentId: 'est-1',
        scheduleType: 'SHIFT',
        weeklyHours: new Prisma.Decimal('44.00'),
      }) as never,
    findWorkScheduleByName: async () => null,
    updateWorkSchedule: async (_id, data) => {
      receivedWeeklyHours = data.weeklyHours as Prisma.Decimal
      return {
        id: 'schedule-1',
        clientId: 'client-a',
        establishmentId: 'est-1',
        name: 'Novo turno',
        scheduleType: 'SHIFT',
        weeklyHours: data.weeklyHours as Prisma.Decimal,
        shiftPattern: null,
        description: null,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      }
    },
  })

  const updated = await updateWorkScheduleService(
    actor,
    'schedule-1',
    {
      name: 'Novo turno',
      weeklyHours: 44.5,
    },
    deps,
  )

  assert.ok(receivedWeeklyHours instanceof Prisma.Decimal)
  assert.equal(receivedWeeklyHours?.toFixed(2), '44.50')
  assert.equal(updated.weeklyHours, 44.5)
})
