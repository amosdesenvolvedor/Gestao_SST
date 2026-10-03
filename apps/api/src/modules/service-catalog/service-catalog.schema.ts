import { serviceCategorySchema } from '@gestao-sst/shared'
import { z } from 'zod'

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

export const serviceCatalogIdParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export const listServiceCatalogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().max(120).optional(),
  category: serviceCategorySchema.optional(),
  isActive: z.enum(['active', 'inactive']).optional(),
})

export const createServiceCatalogBodySchema = z.object({
  code: z.string().trim().min(2).max(60).regex(/^[A-Z0-9_]+$/, 'Codigo invalido.'),
  name: z.string().trim().min(2).max(140),
  description: optionalTrimmed(1000),
  category: serviceCategorySchema,
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
})

export const updateServiceCatalogBodySchema = z.object({
  code: z.string().trim().min(2).max(60).regex(/^[A-Z0-9_]+$/, 'Codigo invalido.').optional(),
  name: z.string().trim().min(2).max(140).optional(),
  description: optionalNullableTrimmed(1000),
  category: serviceCategorySchema.optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
})
