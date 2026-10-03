import { buildApp } from './app.js'
import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'

async function start() {
  const app = buildApp()

  try {
    await app.listen({
      host: env.API_HOST,
      port: env.API_PORT,
    })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }

  const shutdown = async () => {
    await app.close()
    await prisma.$disconnect()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

void start()