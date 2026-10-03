import type { FastifyReply } from 'fastify'
import type { Role } from '@gestao-sst/shared'
import { serialize } from 'cookie'
import { env, isProduction } from '../config/env.js'

export type AuthTokenPayload = {
  sub: string
  role: Role
}

export function setAuthCookie(reply: FastifyReply, token: string): void {
  const cookieValue = serialize(env.AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  })

  reply.header('Set-Cookie', cookieValue)
}

export function clearAuthCookie(reply: FastifyReply): void {
  const cookieValue = serialize(env.AUTH_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
  })

  reply.header('Set-Cookie', cookieValue)
}