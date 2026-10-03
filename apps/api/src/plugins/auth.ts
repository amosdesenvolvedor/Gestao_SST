import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'
import { env } from '../config/env.js'

export type AuthUser = {
  id: string
  role: import('@gestao-sst/shared').Role
  permissions: import('@gestao-sst/shared').Permission[]
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser
  }
}

export const authPlugin = fp(async (app: import('fastify').FastifyInstance) => {
  await app.register(fastifyCookie)
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
    cookie: {
      cookieName: env.AUTH_COOKIE_NAME,
      signed: false,
    },
  })
})