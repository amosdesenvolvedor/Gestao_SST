import Fastify from 'fastify'
import { env } from './config/env.js'
import { authPlugin } from './plugins/auth.js'
import { securityPlugin } from './plugins/security.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { usersRoutes } from './modules/users/users.routes.js'
import { professionalsRoutes } from './modules/professionals/professionals.routes.js'
import { clientsRoutes } from './modules/clients/clients.routes.js'
import { serviceCatalogRoutes } from './modules/service-catalog/service-catalog.routes.js'
import { contractsRoutes } from './modules/contracts/contracts.routes.js'
import { clientPortalRoutes } from './modules/client-portal/client-portal.routes.js'
import { financeRoutes } from './modules/finance/finance.routes.js'
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
  app.register(usersRoutes, { prefix: '/api/v1' })
  app.register(professionalsRoutes, { prefix: '/api/v1' })
  app.register(clientsRoutes, { prefix: '/api/v1' })
  app.register(serviceCatalogRoutes, { prefix: '/api/v1' })
  app.register(contractsRoutes, { prefix: '/api/v1' })
  app.register(clientPortalRoutes, { prefix: '/api/v1' })
  app.register(financeRoutes, { prefix: '/api/v1' })

  registerErrorHandler(app)

  return app
}