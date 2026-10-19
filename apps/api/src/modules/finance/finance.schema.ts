import { chargeProviders, paymentMethods } from '@gestao-sst/shared'
import { z } from 'zod'

export const contractIdParamsSchema = z.object({
  contractId: z.string().cuid(),
})

export const installmentIdParamsSchema = z.object({
  id: z.string().cuid(),
})

export const paymentIdParamsSchema = z.object({
  id: z.string().cuid(),
})

export const chargeIdParamsSchema = z.object({
  id: z.string().cuid(),
})

export const annualAdvanceChargeIdParamsSchema = z.object({
  id: z.string().cuid(),
})

export const createFinancialPlanBodySchema = z.object({
  installmentCount: z.number().int().positive().max(360).optional(),
  totalAmount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/).optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  firstDueDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().trim().max(500).optional(),
  commercialCondition: z
    .object({
      modality: z.enum(['MONTHLY_RECURRING', 'ANNUAL_PIX_ADVANCE']),
      discountPercent: z.string().trim().regex(/^\d+(\.\d{1,2})?$/).optional(),
      discountFixedAmount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/).optional(),
      advanceMonths: z.number().int().positive().max(60).optional(),
      coverageStartDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      commercialJustification: z.string().trim().min(3).max(2000),
    })
    .optional(),
})

export const createAnnualAdvanceChargeBodySchema = z.object({
  dueDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  idempotencyKey: z.string().trim().min(8).max(120),
  internalReference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
})

export const confirmAnnualAdvancePaymentBodySchema = z.object({
  paidAt: z.string().trim().min(10).optional(),
  externalReference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
})

export const cancelAnnualAdvanceChargeBodySchema = z.object({
  reason: z.string().trim().min(3).max(500),
})

export const failAnnualAdvanceChargeBodySchema = z.object({
  reason: z.string().trim().min(3).max(500),
})

export const reverseAnnualAdvancePaymentBodySchema = z.object({
  reason: z.string().trim().min(3).max(500),
})

export const createAnnualAdvancePixChargeBodySchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(120),
  payerEmail: z.string().email().optional(),
  expiresAt: z.string().datetime().optional(),
})

export const mercadoPagoWebhookQuerySchema = z.object({
  topic: z.string().trim().optional(),
  type: z.string().trim().optional(),
  action: z.string().trim().optional(),
  'data.id': z.string().trim().optional(),
})

export const listContractInstallmentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
})

export const updateInstallmentBodySchema = z
  .object({
    dueDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    adjustedAmount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/).optional(),
    description: z.string().trim().max(500).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Informe ao menos um campo para atualizar.',
  })

export const cancelInstallmentBodySchema = z.object({
  reason: z.string().trim().min(3).max(500),
})

export const createPaymentBodySchema = z.object({
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/),
  paidAt: z.string().trim().min(10),
  method: z.enum(paymentMethods),
  provider: z.enum(chargeProviders),
  chargeId: z.string().cuid().optional(),
  externalReference: z.string().trim().max(120).optional(),
  idempotencyKey: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
})

export const reversePaymentBodySchema = z.object({
  reason: z.string().trim().min(3).max(500),
})

export const createChargeBodySchema = z.object({
  provider: z.enum(chargeProviders),
  method: z.enum(paymentMethods),
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/),
  externalId: z.string().trim().max(120).optional(),
  idempotencyKey: z.string().trim().max(120).optional(),
})

export const createChargePaymentLinkBodySchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(120),
  title: z.string().trim().min(3).max(120).optional(),
  payerEmail: z.string().email().optional(),
  successUrl: z.string().url().optional(),
  failureUrl: z.string().url().optional(),
  pendingUrl: z.string().url().optional(),
})

export const cancelChargeBodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
})

export const financeOverviewQuerySchema = z.object({
  month: z.string().trim().regex(/^\d{4}-\d{2}$/).optional(),
})

export const receivablesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  clientId: z.string().cuid().optional(),
  status: z.enum(['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  dueDateFrom: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDateTo: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})
