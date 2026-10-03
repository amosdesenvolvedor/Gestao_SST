import { roleSchema } from '@gestao-sst/shared'
import { z } from 'zod'
import { passwordPolicySchema } from '../../shared/password-policy.js'

const statusSchema = z.enum(['active', 'inactive'])

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().max(120).optional(),
  role: roleSchema.optional(),
  status: statusSchema.optional(),
})

export const userIdParamsSchema = z.object({
  id: z.string().min(1),
})

export const createUserBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    role: roleSchema,
    password: passwordPolicySchema,
    confirmPassword: z.string(),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'As senhas nao conferem.',
      })
    }
  })

export const updateUserBodySchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().optional(),
  role: roleSchema.optional(),
})

export const resetPasswordBodySchema = z
  .object({
    newPassword: passwordPolicySchema,
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'As senhas nao conferem.',
      })
    }
  })
