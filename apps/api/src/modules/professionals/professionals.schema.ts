import { professionalTypeSchema } from '@gestao-sst/shared'
import { z } from 'zod'

const statusSchema = z.enum(['active', 'inactive'])

const councilStateSchema = z
  .string()
  .trim()
  .length(2)
  .regex(/^[A-Za-z]{2}$/)
  .transform((value) => value.toUpperCase())

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined))

export const listProfessionalsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().max(120).optional(),
  professionalType: professionalTypeSchema.optional(),
  status: statusSchema.optional(),
})

export const professionalIdParamsSchema = z.object({
  id: z.string().min(1),
})

export const createProfessionalBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().optional(),
  phone: optionalTrimmed(30),
  cpf: optionalTrimmed(20),
  professionalType: professionalTypeSchema,
  councilType: optionalTrimmed(30),
  councilNumber: optionalTrimmed(50),
  councilState: councilStateSchema.optional(),
  specialty: optionalTrimmed(100),
  userId: z.string().trim().min(1).optional(),
  isActive: z.boolean().default(true),
})

export const updateProfessionalBodySchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().optional().nullable(),
  phone: optionalTrimmed(30).nullable(),
  cpf: optionalTrimmed(20).nullable(),
  professionalType: professionalTypeSchema.optional(),
  councilType: optionalTrimmed(30).nullable(),
  councilNumber: optionalTrimmed(50).nullable(),
  councilState: councilStateSchema.optional().nullable(),
  specialty: optionalTrimmed(100).nullable(),
  userId: z.string().trim().min(1).optional().nullable(),
})
