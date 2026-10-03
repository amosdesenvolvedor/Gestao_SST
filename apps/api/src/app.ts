import Fastify from 'fastify'
import { env } from './config/env.js'
import { authPlugin } from './plugins/auth.js'
import { securityPlugin } from './plugins/security.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { registerErrorHandler } from './shared/errors.js'

export function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  })

  app.register(securityPlugin)
  app.register(authPlugin)
  app.register(authRoutes, { prefix: '/api/v1' })

  registerErrorHandler(app)

  return app
}