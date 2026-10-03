import { contractStatusSchema, paymentMethodSchema } from '@gestao-sst/shared'
import { z } from 'zod'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

const moneyStringSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Valor monetario invalido.')

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

export const contractIdParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export const contractServiceIdParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export const listContractsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().max(120).optional(),
  status: contractStatusSchema.optional(),
  clientId: z.string().trim().min(1).optional(),
  startDate: z.string().regex(dateRegex, 'Data inicial invalida.').optional(),
  endDate: z.string().regex(dateRegex, 'Data final invalida.').optional(),
})

export const createContractBodySchema = z.object({
  clientId: z.string().trim().min(1),
  renewedFromId: z.string().trim().min(1).optional(),
  contractNumber: z.string().trim().min(3).max(60),
  title: z.string().trim().min(2).max(180),
  startDate: z.string().regex(dateRegex, 'Data inicial invalida.'),
  endDate: z.string().regex(dateRegex, 'Data final invalida.').optional(),
  durationMonths: z.number().int().positive().max(360).optional(),
  totalValue: moneyStringSchema,
  dueDay: z.number().int().min(1).max(31),
  paymentMethod: paymentMethodSchema,
  notes: optionalTrimmed(2000),
})

export const updateContractBodySchema = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  startDate: z.string().regex(dateRegex, 'Data inicial invalida.').optional(),
  endDate: z.string().regex(dateRegex, 'Data final invalida.').optional(),
  durationMonths: z.number().int().positive().max(360).optional(),
  totalValue: moneyStringSchema.optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  paymentMethod: paymentMethodSchema.optional(),
  notes: optionalNullableTrimmed(2000),
})

export const changeContractStatusBodySchema = z.object({
  status: contractStatusSchema,
})

export const listContractServicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().max(120).optional(),
  isActive: z.enum(['active', 'inactive']).optional(),
})

export const createContractServiceBodySchema = z.object({
  serviceCatalogId: z.string().trim().min(1),
  descriptionOverride: optionalTrimmed(1000),
  quantity: z.number().int().positive().max(10000).default(1),
  unitValue: moneyStringSchema.optional(),
  totalValue: moneyStringSchema.optional(),
  notes: optionalTrimmed(1000),
})

export const updateContractServiceBodySchema = z.object({
  descriptionOverride: optionalNullableTrimmed(1000),
  quantity: z.number().int().positive().max(10000).optional(),
  unitValue: moneyStringSchema.optional().nullable(),
  totalValue: moneyStringSchema.optional().nullable(),
  notes: optionalNullableTrimmed(1000),
  isActive: z.boolean().optional(),
})

export const removeContractServiceBodySchema = z.object({
  reason: optionalTrimmed(300),
})

export const listContractEstablishmentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().max(120).optional(),
})

export const addContractEstablishmentBodySchema = z.object({
  establishmentId: z.string().trim().min(1),
})

export const removeContractEstablishmentParamsSchema = z.object({
  id: z.string().trim().min(1),
  establishmentId: z.string().trim().min(1),
})
