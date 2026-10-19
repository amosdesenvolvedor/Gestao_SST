import { z } from 'zod'

const idSchema = z.string().trim().min(1)

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined))

const optionalNullableTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : value === null ? null : undefined))

const codeSchema = z.string().trim().min(2).max(40).regex(/^[A-Z0-9_\-.]+$/, 'Codigo invalido.')

export const sectorIdParamsSchema = z.object({
  id: idSchema,
})

export const workEnvironmentIdParamsSchema = z.object({
  id: idSchema,
})

export const roleIdParamsSchema = z.object({
  id: idSchema,
})

export const activityIdParamsSchema = z.object({
  id: idSchema,
})

export const workScheduleIdParamsSchema = z.object({
  id: idSchema,
})

export const listSectorsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  clientId: idSchema,
  establishmentId: idSchema.optional(),
  search: z.string().trim().max(120).optional(),
  isActive: z.enum(['active', 'inactive']).optional(),
})

export const createSectorBodySchema = z.object({
  clientId: idSchema,
  establishmentId: idSchema,
  code: codeSchema,
  name: z.string().trim().min(2).max(160),
  description: optionalTrimmed(1000),
  isActive: z.boolean().default(true),
})

export const updateSectorBodySchema = z.object({
  code: codeSchema.optional(),
  name: z.string().trim().min(2).max(160).optional(),
  description: optionalNullableTrimmed(1000),
})

const indoorOutdoorTypeSchema = z.enum(['INDOOR', 'OUTDOOR', 'MIXED'])

export const listWorkEnvironmentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  clientId: idSchema,
  establishmentId: idSchema.optional(),
  sectorId: idSchema.optional(),
  search: z.string().trim().max(120).optional(),
  isActive: z.enum(['active', 'inactive']).optional(),
})

export const createWorkEnvironmentBodySchema = z.object({
  clientId: idSchema,
  establishmentId: idSchema,
  sectorId: idSchema,
  code: codeSchema,
  name: z.string().trim().min(2).max(160),
  description: optionalTrimmed(1000),
  indoorOutdoorType: indoorOutdoorTypeSchema.default('INDOOR'),
  isActive: z.boolean().default(true),
})

export const updateWorkEnvironmentBodySchema = z.object({
  sectorId: idSchema.optional(),
  code: codeSchema.optional(),
  name: z.string().trim().min(2).max(160).optional(),
  description: optionalNullableTrimmed(1000),
  indoorOutdoorType: indoorOutdoorTypeSchema.optional(),
})

export const listRolesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  clientId: idSchema,
  search: z.string().trim().max(120).optional(),
  isActive: z.enum(['active', 'inactive']).optional(),
})

export const createRoleBodySchema = z.object({
  clientId: idSchema,
  title: z.string().trim().min(2).max(180),
  cboCode: z
    .string()
    .trim()
    .regex(/^\d{4,6}$/, 'CBO invalido.')
    .optional(),
  cboDescription: optionalTrimmed(240),
  description: optionalTrimmed(1000),
  isActive: z.boolean().default(true),
})

export const updateRoleBodySchema = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  cboCode: z
    .string()
    .trim()
    .regex(/^\d{4,6}$/, 'CBO invalido.')
    .optional()
    .nullable(),
  cboDescription: optionalNullableTrimmed(240),
  description: optionalNullableTrimmed(1000),
})

const activityFrequencySchema = z.enum(['ROUTINE', 'NON_ROUTINE', 'EVENTUAL'])

export const listActivitiesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  clientId: idSchema,
  roleId: idSchema.optional(),
  frequency: activityFrequencySchema.optional(),
  isCritical: z.coerce.boolean().optional(),
  search: z.string().trim().max(120).optional(),
  isActive: z.enum(['active', 'inactive']).optional(),
})

export const createActivityBodySchema = z.object({
  clientId: idSchema,
  roleId: idSchema,
  title: z.string().trim().min(2).max(180),
  frequency: activityFrequencySchema.default('ROUTINE'),
  description: optionalTrimmed(1000),
  isCritical: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

export const updateActivityBodySchema = z.object({
  roleId: idSchema.optional(),
  title: z.string().trim().min(2).max(180).optional(),
  frequency: activityFrequencySchema.optional(),
  description: optionalNullableTrimmed(1000),
  isCritical: z.boolean().optional(),
})

const scheduleTypeSchema = z.enum(['FIXED', 'SHIFT', 'FLEX', 'OTHER'])

export const listWorkSchedulesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  clientId: idSchema,
  establishmentId: idSchema.optional(),
  scheduleType: scheduleTypeSchema.optional(),
  search: z.string().trim().max(120).optional(),
  isActive: z.enum(['active', 'inactive']).optional(),
})

export const createWorkScheduleBodySchema = z.object({
  clientId: idSchema,
  establishmentId: idSchema,
  name: z.string().trim().min(2).max(180),
  scheduleType: scheduleTypeSchema.default('FIXED'),
  weeklyHours: z.number().positive().max(168).optional(),
  shiftPattern: optionalTrimmed(120),
  description: optionalTrimmed(1000),
  isActive: z.boolean().default(true),
})

export const updateWorkScheduleBodySchema = z.object({
  name: z.string().trim().min(2).max(180).optional(),
  scheduleType: scheduleTypeSchema.optional(),
  weeklyHours: z.number().positive().max(168).optional().nullable(),
  shiftPattern: optionalNullableTrimmed(120),
  description: optionalNullableTrimmed(1000),
})
