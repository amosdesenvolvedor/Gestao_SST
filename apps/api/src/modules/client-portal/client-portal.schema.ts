import { z } from 'zod'

export const clientPortalQuerySchema = z.object({
  clientId: z.string().trim().min(1).optional(),
  establishmentId: z.string().trim().min(1).optional(),
  contractId: z.string().trim().min(1).optional(),
})

export const clientPortalServiceCodeParamsSchema = z.object({
  code: z.string().trim().min(1),
})
