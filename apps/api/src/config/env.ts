import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(3333),
  API_CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter no minimo 32 caracteres.'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  AUTH_COOKIE_NAME: z.string().default('gestao_sst_session'),
})

export type Env = z.infer<typeof envSchema>

export const env = envSchema.parse(process.env)

export const isProduction = env.NODE_ENV === 'production'