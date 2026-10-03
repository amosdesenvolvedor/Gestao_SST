import { z } from 'zod'

export const roles = [
  'SUPER_ADMIN',
  'ADMIN',
  'SST_MANAGER',
  'SAFETY_ENGINEER',
  'SAFETY_TECHNICIAN',
  'OCCUPATIONAL_PHYSICIAN',
  'RH',
  'FINANCIAL',
  'CLIENT',
  'VIEWER',
] as const

export const roleSchema = z.enum(roles)

export type Role = (typeof roles)[number]

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

export type LoginInput = z.infer<typeof loginInputSchema>

export const safeUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: roleSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
})

export type SafeUser = z.infer<typeof safeUserSchema>