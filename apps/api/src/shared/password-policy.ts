import { z } from 'zod'

export const passwordPolicyDescription =
  'A senha deve ter entre 8 e 64 caracteres, com ao menos 1 letra maiuscula, 1 letra minuscula, 1 numero e 1 simbolo.'

export const passwordPolicySchema = z
  .string()
  .min(8, 'A senha deve ter no minimo 8 caracteres.')
  .max(64, 'A senha deve ter no maximo 64 caracteres.')
  .regex(/[A-Z]/, 'A senha deve conter ao menos 1 letra maiuscula.')
  .regex(/[a-z]/, 'A senha deve conter ao menos 1 letra minuscula.')
  .regex(/[0-9]/, 'A senha deve conter ao menos 1 numero.')
  .regex(/[^A-Za-z0-9]/, 'A senha deve conter ao menos 1 simbolo.')

export function validatePasswordPolicy(password: string): void {
  passwordPolicySchema.parse(password)
}