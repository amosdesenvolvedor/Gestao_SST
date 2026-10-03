import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

const professionalSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  cpf: true,
  professionalType: true,
  councilType: true,
  councilNumber: true,
  councilState: true,
  specialty: true,
  isActive: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
} as const

export type ProfessionalRecord = Prisma.ProfessionalGetPayload<{ select: typeof professionalSelect }>

export async function listProfessionals(params: {
  where: Prisma.ProfessionalWhereInput
  skip: number
  take: number
}): Promise<ProfessionalRecord[]> {
  return prisma.professional.findMany({
    where: params.where,
    skip: params.skip,
    take: params.take,
    orderBy: {
      createdAt: 'desc',
    },
    select: professionalSelect,
  })
}

export async function countProfessionals(where: Prisma.ProfessionalWhereInput): Promise<number> {
  return prisma.professional.count({ where })
}

export async function findProfessionalById(id: string) {
  return prisma.professional.findUnique({
    where: { id },
  })
}

export async function findProfessionalRecordById(id: string): Promise<ProfessionalRecord | null> {
  return prisma.professional.findUnique({
    where: { id },
    select: professionalSelect,
  })
}

export async function findProfessionalByUserId(userId: string) {
  return prisma.professional.findUnique({
    where: { userId },
  })
}

export async function createProfessional(data: Prisma.ProfessionalCreateInput): Promise<ProfessionalRecord> {
  return prisma.professional.create({
    data,
    select: professionalSelect,
  })
}

export async function updateProfessional(
  id: string,
  data: Prisma.ProfessionalUpdateInput,
): Promise<ProfessionalRecord> {
  return prisma.professional.update({
    where: { id },
    data,
    select: professionalSelect,
  })
}
