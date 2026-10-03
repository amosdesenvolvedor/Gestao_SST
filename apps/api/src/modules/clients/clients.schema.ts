import {
  brStateSchema,
  clientStatusSchema,
  documentTypeSchema,
  establishmentStatusSchema,
} from '@gestao-sst/shared'
import { z } from 'zod'

const activeFilterSchema = z.enum(['active', 'inactive'])

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

const cnaeSchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(/^[0-9./-]+$/, 'CNAE invalido.')

export const clientIdParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export const listClientsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().max(120).optional(),
  status: clientStatusSchema.optional(),
})

export const createClientBodySchema = z.object({
  legalName: z.string().trim().min(2).max(180),
  tradeName: optionalTrimmed(180),
  taxIdType: documentTypeSchema.optional(),
  taxIdNumber: optionalTrimmed(30),
  stateRegistration: optionalTrimmed(30),
  municipalRegistration: optionalTrimmed(30),
  cnaeMain: cnaeSchema.optional(),
  cnaeSecondary: z.array(cnaeSchema).max(20).default([]),
  sizeCategory: optionalTrimmed(40),
  status: clientStatusSchema.default('PROSPECT'),
  notes: optionalTrimmed(1000),
})

export const updateClientBodySchema = z.object({
  legalName: z.string().trim().min(2).max(180).optional(),
  tradeName: optionalNullableTrimmed(180),
  taxIdType: documentTypeSchema.optional().nullable(),
  taxIdNumber: optionalNullableTrimmed(30),
  stateRegistration: optionalNullableTrimmed(30),
  municipalRegistration: optionalNullableTrimmed(30),
  cnaeMain: cnaeSchema.optional().nullable(),
  cnaeSecondary: z.array(cnaeSchema).max(20).optional(),
  sizeCategory: optionalNullableTrimmed(40),
  status: clientStatusSchema.optional(),
  notes: optionalNullableTrimmed(1000),
})

export const listEstablishmentsByClientQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().max(120).optional(),
  status: establishmentStatusSchema.optional(),
  city: z.string().trim().max(120).optional(),
  state: brStateSchema.optional(),
  isHeadquarters: z.coerce.boolean().optional(),
})

export const establishmentIdParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export const createEstablishmentBodySchema = z.object({
  nickname: optionalTrimmed(120),
  taxIdType: documentTypeSchema.optional(),
  taxIdNumber: optionalTrimmed(30),
  stateRegistration: optionalTrimmed(30),
  isHeadquarters: z.boolean().default(false),
  status: establishmentStatusSchema.default('ACTIVE'),
  cnaeMain: cnaeSchema.optional(),
  cnaeSecondary: z.array(cnaeSchema).max(20).default([]),
  employeeCount: z.number().int().nonnegative().optional(),
  contactEmail: z.string().trim().email().optional(),
  contactPhone: optionalTrimmed(30),
  postalCode: z.string().trim().min(8).max(9),
  street: z.string().trim().min(2).max(180),
  number: z.string().trim().min(1).max(20),
  complement: optionalTrimmed(120),
  neighborhood: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  state: brStateSchema,
})

export const updateEstablishmentBodySchema = z.object({
  nickname: optionalNullableTrimmed(120),
  taxIdType: documentTypeSchema.optional().nullable(),
  taxIdNumber: optionalNullableTrimmed(30),
  stateRegistration: optionalNullableTrimmed(30),
  isHeadquarters: z.boolean().optional(),
  status: establishmentStatusSchema.optional(),
  cnaeMain: cnaeSchema.optional().nullable(),
  cnaeSecondary: z.array(cnaeSchema).max(20).optional(),
  employeeCount: z.number().int().nonnegative().optional().nullable(),
  contactEmail: z.string().trim().email().optional().nullable(),
  contactPhone: optionalNullableTrimmed(30),
  postalCode: z.string().trim().min(8).max(9).optional(),
  street: z.string().trim().min(2).max(180).optional(),
  number: z.string().trim().min(1).max(20).optional(),
  complement: optionalNullableTrimmed(120),
  neighborhood: z.string().trim().min(2).max(120).optional(),
  city: z.string().trim().min(2).max(120).optional(),
  state: brStateSchema.optional(),
})

export const listClientContactsByClientQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().max(120).optional(),
  isActive: activeFilterSchema.optional(),
})

export const clientContactIdParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export const createClientContactBodySchema = z.object({
  name: z.string().trim().min(2).max(140),
  role: optionalTrimmed(80),
  department: optionalTrimmed(80),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(10).max(20),
  preferredChannel: z.enum(['EMAIL', 'PHONE', 'WHATSAPP']).optional(),
  isPrimary: z.boolean().default(false),
  receivesBilling: z.boolean().default(false),
  receivesReports: z.boolean().default(false),
  receivesAlerts: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

export const updateClientContactBodySchema = z.object({
  name: z.string().trim().min(2).max(140).optional(),
  role: optionalNullableTrimmed(80),
  department: optionalNullableTrimmed(80),
  email: z.string().trim().email().optional().nullable(),
  phone: z.string().trim().min(10).max(20).optional(),
  preferredChannel: z.enum(['EMAIL', 'PHONE', 'WHATSAPP']).optional().nullable(),
  isPrimary: z.boolean().optional(),
  receivesBilling: z.boolean().optional(),
  receivesReports: z.boolean().optional(),
  receivesAlerts: z.boolean().optional(),
  isActive: z.boolean().optional(),
})
