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
  const expiredAt = new Date(0)

  const rootCookie = serialize(env.AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: expiredAt,
  })

  const apiCookie = serialize(env.AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api',
    maxAge: 0,
    expires: expiredAt,
  })

  reply.header('Set-Cookie', [rootCookie, apiCookie])
}