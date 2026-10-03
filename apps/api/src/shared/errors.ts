import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        message: 'Dados invalidos.',
        issues: error.flatten(),
      })
    }

    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send({ message: error.message })
    }

    app.log.error(error)

    const message = process.env.NODE_ENV === 'production' ? 'Erro interno do servidor.' : error.message

    return reply.code(500).send({ message })
  })
}