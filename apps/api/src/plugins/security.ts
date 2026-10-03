import type { FastifyInstance } from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fp from 'fastify-plugin'
import { env } from '../config/env.js'

export const securityPlugin = fp(async (app: FastifyInstance) => {
  await app.register(fastifyHelmet)

  await app.register(fastifyCors, {
    origin: env.API_CORS_ORIGIN,
    credentials: true,
  })
})