import type { Prisma, Role } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

const userSafeSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
} as const

export type SafeUserRecord = Prisma.UserGetPayload<{ select: typeof userSafeSelect }>

export async function listUsers(params: {
  where: Prisma.UserWhereInput
  skip: number
  take: number
}): Promise<SafeUserRecord[]> {
  return prisma.user.findMany({
    where: params.where,
    skip: params.skip,
    take: params.take,
    orderBy: {
      createdAt: 'desc',
    },
    select: userSafeSelect,
  })
}

export async function countUsers(where: Prisma.UserWhereInput): Promise<number> {
  return prisma.user.count({ where })
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
  })
}

export async function findSafeUserById(id: string): Promise<SafeUserRecord | null> {
  return prisma.user.findUnique({
    where: { id },
    select: userSafeSelect,
  })
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  })
}

export async function createUser(data: {
  name: string
  email: string
  role: Role
  passwordHash: string
  isActive: boolean
}): Promise<SafeUserRecord> {
  return prisma.user.create({
    data,
    select: userSafeSelect,
  })
}

export async function updateUser(
  id: string,
  data: Prisma.UserUpdateInput,
): Promise<SafeUserRecord> {
  return prisma.user.update({
    where: { id },
    data,
    select: userSafeSelect,
  })
}

export async function countActiveSuperAdmins(): Promise<number> {
  return prisma.user.count({
    where: {
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  })
}
