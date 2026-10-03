import type { Prisma, ProfessionalType } from '@prisma/client'
import type { AuthUser } from '../../plugins/auth.js'
import { createAuditLog } from '../../shared/audit.js'
import {
  countProfessionals,
  createProfessional,
  findProfessionalById,
  findProfessionalByUserId,
  findProfessionalRecordById,
  listProfessionals,
  type ProfessionalRecord,
  updateProfessional,
} from './professionals.repository.js'

type ListProfessionalsInput = {
  page: number
  pageSize: number
  skip: number
  take: number
  search?: string
  professionalType?: ProfessionalType
  status?: 'active' | 'inactive'
}

type CreateProfessionalInput = {
  name: string
  email?: string
  phone?: string
  cpf?: string
  professionalType: ProfessionalType
  councilType?: string
  councilNumber?: string
  councilState?: string
  specialty?: string
  userId?: string
  isActive: boolean
}

type UpdateProfessionalInput = {
  name?: string
  email?: string | null
  phone?: string | null
  cpf?: string | null
  professionalType?: ProfessionalType
  councilType?: string | null
  councilNumber?: string | null
  councilState?: string | null
  specialty?: string | null
  userId?: string | null
}

function normalizeEmail(email?: string | null) {
  if (!email) {
    return null
  }

  return email.trim().toLowerCase()
}

function normalizeCpf(cpf?: string | null): string | null {
  if (!cpf) {
    return null
  }

  const digits = cpf.replace(/\D/g, '')
  return digits || null
}

function isValidCpf(cpfDigits: string): boolean {
  if (!cpfDigits || cpfDigits.length !== 11) {
    return false
  }

  if (/^(\d)\1{10}$/.test(cpfDigits)) {
    return false
  }

  const calc = (base: string, factor: number) => {
    let total = 0
    for (const char of base) {
      total += Number(char) * factor
      factor -= 1
    }
    const rest = total % 11
    return rest < 2 ? 0 : 11 - rest
  }

  const first = calc(cpfDigits.slice(0, 9), 10)
  const second = calc(cpfDigits.slice(0, 10), 11)

  return cpfDigits === `${cpfDigits.slice(0, 9)}${first}${second}`
}

function assertCpf(cpf?: string | null): void {
  if (!cpf) {
    return
  }

  if (!isValidCpf(cpf)) {
    throw new Error('CPF invalido.')
  }
}

function mapProfessional(professional: ProfessionalRecord) {
  return {
    ...professional,
    createdAt: professional.createdAt.toISOString(),
    updatedAt: professional.updatedAt.toISOString(),
  }
}

async function validateUserLink(userId?: string | null, professionalId?: string): Promise<void> {
  if (!userId) {
    return
  }

  const existing = await findProfessionalByUserId(userId)
  if (existing && existing.id !== professionalId) {
    throw new Error('Este usuario ja esta vinculado a outro profissional.')
  }
}

export async function listProfessionalsService(input: ListProfessionalsInput) {
  const where = {
    AND: [
      input.search
        ? {
            OR: [
              {
                name: {
                  contains: input.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                email: {
                  contains: input.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                councilNumber: {
                  contains: input.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {},
      input.professionalType ? { professionalType: input.professionalType } : {},
      input.status ? { isActive: input.status === 'active' } : {},
    ],
  }

  const [items, total] = await Promise.all([
    listProfessionals({ where, skip: input.skip, take: input.take }),
    countProfessionals(where),
  ])

  return {
    data: items.map((item) => mapProfessional(item)),
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    },
  }
}

export async function getProfessionalByIdService(id: string) {
  const professional = await findProfessionalRecordById(id)
  if (!professional) {
    return null
  }
  return mapProfessional(professional)
}

export async function createProfessionalService(actor: AuthUser, input: CreateProfessionalInput) {
  const normalizedEmail = normalizeEmail(input.email)
  const normalizedCpf = normalizeCpf(input.cpf)

  assertCpf(normalizedCpf)
  await validateUserLink(input.userId)

  const created = await createProfessional({
    name: input.name,
    email: normalizedEmail ?? undefined,
    phone: input.phone,
    cpf: normalizedCpf ?? undefined,
    professionalType: input.professionalType,
    councilType: input.councilType,
    councilNumber: input.councilNumber,
    councilState: input.councilState,
    specialty: input.specialty,
    isActive: input.isActive,
    user: input.userId
      ? {
          connect: {
            id: input.userId,
          },
        }
      : undefined,
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'PROFESSIONAL_CREATED',
    entity: 'Professional',
    entityId: created.id,
    metadata: {
      professionalType: created.professionalType,
      isActive: created.isActive,
    },
  })

  return mapProfessional(created)
}

export async function updateProfessionalService(
  actor: AuthUser,
  professionalId: string,
  input: UpdateProfessionalInput,
) {
  const target = await findProfessionalById(professionalId)

  if (!target) {
    throw new Error('Profissional nao encontrado.')
  }

  const normalizedEmail = normalizeEmail(input.email)
  const normalizedCpf = normalizeCpf(input.cpf)

  assertCpf(normalizedCpf)

  if (typeof input.userId !== 'undefined') {
    await validateUserLink(input.userId, target.id)
  }

  const data: Prisma.ProfessionalUpdateInput = {
    name: input.name,
    email: typeof input.email === 'undefined' ? undefined : normalizedEmail,
    phone: typeof input.phone === 'undefined' ? undefined : input.phone,
    cpf: typeof input.cpf === 'undefined' ? undefined : normalizedCpf,
    professionalType: input.professionalType,
    councilType: typeof input.councilType === 'undefined' ? undefined : input.councilType,
    councilNumber: typeof input.councilNumber === 'undefined' ? undefined : input.councilNumber,
    councilState: typeof input.councilState === 'undefined' ? undefined : input.councilState,
    specialty: typeof input.specialty === 'undefined' ? undefined : input.specialty,
  }

  if (typeof input.userId !== 'undefined') {
    data.user = input.userId
      ? {
          connect: { id: input.userId },
        }
      : {
          disconnect: true,
        }
  }

  const updated = await updateProfessional(target.id, data)

  await createAuditLog({
    actorUserId: actor.id,
    action: 'PROFESSIONAL_UPDATED',
    entity: 'Professional',
    entityId: updated.id,
  })

  return mapProfessional(updated)
}

export async function activateProfessionalService(actor: AuthUser, professionalId: string) {
  const target = await findProfessionalById(professionalId)

  if (!target) {
    throw new Error('Profissional nao encontrado.')
  }

  const updated = await updateProfessional(target.id, {
    isActive: true,
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'PROFESSIONAL_ACTIVATED',
    entity: 'Professional',
    entityId: updated.id,
  })

  return mapProfessional(updated)
}

export async function deactivateProfessionalService(actor: AuthUser, professionalId: string) {
  const target = await findProfessionalById(professionalId)

  if (!target) {
    throw new Error('Profissional nao encontrado.')
  }

  const updated = await updateProfessional(target.id, {
    isActive: false,
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'PROFESSIONAL_DEACTIVATED',
    entity: 'Professional',
    entityId: updated.id,
  })

  return mapProfessional(updated)
}
