import type { FastifyInstance } from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import { env } from '../config/env.js'

export async function securityPlugin(app: FastifyInstance): Promise<void> {
  await app.register(fastifyHelmet)

  await app.register(fastifyCors, {
    origin: env.API_CORS_ORIGIN,
    credentials: true,
  })
}