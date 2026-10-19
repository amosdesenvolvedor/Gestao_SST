import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

const sectorSelect = {
  id: true,
  clientId: true,
  establishmentId: true,
  code: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

const workEnvironmentSelect = {
  id: true,
  clientId: true,
  establishmentId: true,
  sectorId: true,
  code: true,
  name: true,
  description: true,
  indoorOutdoorType: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

const roleSelect = {
  id: true,
  clientId: true,
  title: true,
  cboCode: true,
  cboDescription: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

const activitySelect = {
  id: true,
  clientId: true,
  roleId: true,
  title: true,
  frequency: true,
  description: true,
  isCritical: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

const workScheduleSelect = {
  id: true,
  clientId: true,
  establishmentId: true,
  name: true,
  scheduleType: true,
  weeklyHours: true,
  shiftPattern: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

export type SstSectorRecord = Prisma.SstSectorGetPayload<{ select: typeof sectorSelect }>
export type SstWorkEnvironmentRecord = Prisma.SstWorkEnvironmentGetPayload<{ select: typeof workEnvironmentSelect }>
export type SstRoleRecord = Prisma.SstRoleGetPayload<{ select: typeof roleSelect }>
export type SstActivityRecord = Prisma.SstActivityGetPayload<{ select: typeof activitySelect }>
export type SstWorkScheduleRecord = Prisma.SstWorkScheduleGetPayload<{ select: typeof workScheduleSelect }>

export async function listSectors(params: {
  where: Prisma.SstSectorWhereInput
  skip: number
  take: number
}): Promise<SstSectorRecord[]> {
  return prisma.sstSector.findMany({
    where: params.where,
    skip: params.skip,
    take: params.take,
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
    select: sectorSelect,
  })
}

export async function countSectors(where: Prisma.SstSectorWhereInput) {
  return prisma.sstSector.count({ where })
}

export async function findSectorById(id: string) {
  return prisma.sstSector.findUnique({ where: { id } })
}

export async function findSectorRecordById(id: string): Promise<SstSectorRecord | null> {
  return prisma.sstSector.findUnique({ where: { id }, select: sectorSelect })
}

export async function findSectorByCode(establishmentId: string, code: string, excludeId?: string) {
  return prisma.sstSector.findFirst({
    where: {
      establishmentId,
      code,
      ...(excludeId
        ? {
            id: { not: excludeId },
          }
        : {}),
    },
  })
}

export async function createSector(data: Prisma.SstSectorUncheckedCreateInput): Promise<SstSectorRecord> {
  return prisma.sstSector.create({ data, select: sectorSelect })
}

export async function updateSector(id: string, data: Prisma.SstSectorUpdateInput): Promise<SstSectorRecord> {
  return prisma.sstSector.update({ where: { id }, data, select: sectorSelect })
}

export async function listWorkEnvironments(params: {
  where: Prisma.SstWorkEnvironmentWhereInput
  skip: number
  take: number
}): Promise<SstWorkEnvironmentRecord[]> {
  return prisma.sstWorkEnvironment.findMany({
    where: params.where,
    skip: params.skip,
    take: params.take,
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
    select: workEnvironmentSelect,
  })
}

export async function countWorkEnvironments(where: Prisma.SstWorkEnvironmentWhereInput) {
  return prisma.sstWorkEnvironment.count({ where })
}

export async function findWorkEnvironmentById(id: string) {
  return prisma.sstWorkEnvironment.findUnique({ where: { id } })
}

export async function findWorkEnvironmentRecordById(id: string): Promise<SstWorkEnvironmentRecord | null> {
  return prisma.sstWorkEnvironment.findUnique({ where: { id }, select: workEnvironmentSelect })
}

export async function findWorkEnvironmentByCode(sectorId: string, code: string, excludeId?: string) {
  return prisma.sstWorkEnvironment.findFirst({
    where: {
      sectorId,
      code,
      ...(excludeId
        ? {
            id: { not: excludeId },
          }
        : {}),
    },
  })
}

export async function createWorkEnvironment(
  data: Prisma.SstWorkEnvironmentUncheckedCreateInput,
): Promise<SstWorkEnvironmentRecord> {
  return prisma.sstWorkEnvironment.create({ data, select: workEnvironmentSelect })
}

export async function updateWorkEnvironment(
  id: string,
  data: Prisma.SstWorkEnvironmentUpdateInput,
): Promise<SstWorkEnvironmentRecord> {
  return prisma.sstWorkEnvironment.update({ where: { id }, data, select: workEnvironmentSelect })
}

export async function listRoles(params: {
  where: Prisma.SstRoleWhereInput
  skip: number
  take: number
}): Promise<SstRoleRecord[]> {
  return prisma.sstRole.findMany({
    where: params.where,
    skip: params.skip,
    take: params.take,
    orderBy: [{ title: 'asc' }, { createdAt: 'asc' }],
    select: roleSelect,
  })
}

export async function countRoles(where: Prisma.SstRoleWhereInput) {
  return prisma.sstRole.count({ where })
}

export async function findRoleById(id: string) {
  return prisma.sstRole.findUnique({ where: { id } })
}

export async function findRoleRecordById(id: string): Promise<SstRoleRecord | null> {
  return prisma.sstRole.findUnique({ where: { id }, select: roleSelect })
}

export async function createRole(data: Prisma.SstRoleUncheckedCreateInput): Promise<SstRoleRecord> {
  return prisma.sstRole.create({ data, select: roleSelect })
}

export async function updateRole(id: string, data: Prisma.SstRoleUpdateInput): Promise<SstRoleRecord> {
  return prisma.sstRole.update({ where: { id }, data, select: roleSelect })
}

export async function listActivities(params: {
  where: Prisma.SstActivityWhereInput
  skip: number
  take: number
}): Promise<SstActivityRecord[]> {
  return prisma.sstActivity.findMany({
    where: params.where,
    skip: params.skip,
    take: params.take,
    orderBy: [{ title: 'asc' }, { createdAt: 'asc' }],
    select: activitySelect,
  })
}

export async function countActivities(where: Prisma.SstActivityWhereInput) {
  return prisma.sstActivity.count({ where })
}

export async function findActivityById(id: string) {
  return prisma.sstActivity.findUnique({ where: { id } })
}

export async function findActivityRecordById(id: string): Promise<SstActivityRecord | null> {
  return prisma.sstActivity.findUnique({ where: { id }, select: activitySelect })
}

export async function findActivityByRoleAndTitle(roleId: string, title: string, excludeId?: string) {
  return prisma.sstActivity.findFirst({
    where: {
      roleId,
      title,
      ...(excludeId
        ? {
            id: { not: excludeId },
          }
        : {}),
    },
  })
}

export async function createActivity(data: Prisma.SstActivityUncheckedCreateInput): Promise<SstActivityRecord> {
  return prisma.sstActivity.create({ data, select: activitySelect })
}

export async function updateActivity(id: string, data: Prisma.SstActivityUpdateInput): Promise<SstActivityRecord> {
  return prisma.sstActivity.update({ where: { id }, data, select: activitySelect })
}

export async function listWorkSchedules(params: {
  where: Prisma.SstWorkScheduleWhereInput
  skip: number
  take: number
}): Promise<SstWorkScheduleRecord[]> {
  return prisma.sstWorkSchedule.findMany({
    where: params.where,
    skip: params.skip,
    take: params.take,
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
    select: workScheduleSelect,
  })
}

export async function countWorkSchedules(where: Prisma.SstWorkScheduleWhereInput) {
  return prisma.sstWorkSchedule.count({ where })
}

export async function findWorkScheduleById(id: string) {
  return prisma.sstWorkSchedule.findUnique({ where: { id } })
}

export async function findWorkScheduleRecordById(id: string): Promise<SstWorkScheduleRecord | null> {
  return prisma.sstWorkSchedule.findUnique({ where: { id }, select: workScheduleSelect })
}

export async function findWorkScheduleByName(establishmentId: string, name: string, excludeId?: string) {
  return prisma.sstWorkSchedule.findFirst({
    where: {
      establishmentId,
      name,
      ...(excludeId
        ? {
            id: { not: excludeId },
          }
        : {}),
    },
  })
}

export async function createWorkSchedule(
  data: Prisma.SstWorkScheduleUncheckedCreateInput,
): Promise<SstWorkScheduleRecord> {
  return prisma.sstWorkSchedule.create({ data, select: workScheduleSelect })
}

export async function updateWorkSchedule(
  id: string,
  data: Prisma.SstWorkScheduleUpdateInput,
): Promise<SstWorkScheduleRecord> {
  return prisma.sstWorkSchedule.update({ where: { id }, data, select: workScheduleSelect })
}

export async function findClientById(clientId: string) {
  return prisma.client.findUnique({ where: { id: clientId } })
}

export async function findEstablishmentById(establishmentId: string) {
  return prisma.establishment.findUnique({ where: { id: establishmentId } })
}

export async function listActiveClientMembershipClientIds(userId: string) {
  const records = await prisma.clientMembership.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      clientId: true,
    },
  })

  return records.map((item) => item.clientId)
}
