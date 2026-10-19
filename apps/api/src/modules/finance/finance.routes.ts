import type { FastifyInstance } from 'fastify'
import { authorizePermissions } from '../../plugins/guards.js'
import {
  annualAdvanceChargeIdParamsSchema,
  cancelAnnualAdvanceChargeBodySchema,
  cancelChargeBodySchema,
  cancelInstallmentBodySchema,
  chargeIdParamsSchema,
  confirmAnnualAdvancePaymentBodySchema,
  contractIdParamsSchema,
  createAnnualAdvanceChargeBodySchema,
  createAnnualAdvancePixChargeBodySchema,
  createChargeBodySchema,
  createChargePaymentLinkBodySchema,
  createFinancialPlanBodySchema,
  createPaymentBodySchema,
  failAnnualAdvanceChargeBodySchema,
  financeOverviewQuerySchema,
  installmentIdParamsSchema,
  listContractInstallmentsQuerySchema,
  mercadoPagoWebhookQuerySchema,
  paymentIdParamsSchema,
  receivablesQuerySchema,
  reverseAnnualAdvancePaymentBodySchema,
  reversePaymentBodySchema,
  updateInstallmentBodySchema,
} from './finance.schema.js'
import {
  cancelAnnualAdvanceChargeService,
  cancelChargeService,
  cancelInstallmentService,
  confirmAnnualAdvanceChargePaymentService,
  createAnnualAdvancePixChargeService,
  createAnnualAdvanceChargeService,
  createChargeCardPaymentLinkService,
  createFinancialPlanService,
  createInstallmentChargeService,
  failAnnualAdvanceChargeService,
  getContractFinancialPlanService,
  getContractFinancialSummaryService,
  getFinanceOverviewService,
  getInstallmentByIdService,
  listContractCommercialHistoryService,
  listContractInstallmentsService,
  listInstallmentChargesService,
  listInstallmentPaymentsService,
  listReceivablesService,
  processMercadoPagoWebhookService,
  previewFinancialPlanService,
  recordInstallmentPaymentService,
  reverseAnnualAdvancePaymentService,
  reversePaymentService,
  updateInstallmentService,
} from './finance.service.js'

function handleFinanceError(
  error: unknown,
  reply: { code: (status: number) => { send: (body: unknown) => unknown } },
) {
  const message = error instanceof Error ? error.message : 'Erro ao processar financeiro.'

  if (message.includes('Acesso negado')) {
    return reply.code(403).send({ message })
  }

  if (message.includes('nao encontrada') || message.includes('nao encontrado')) {
    return reply.code(404).send({ message })
  }

  if (message.includes('ja existe') || message.includes('ja estornado') || message.includes('ja cancelada') || message.includes('Conflito')) {
    return reply.code(409).send({ message })
  }

  if (
    message.includes('invalido') ||
    message.includes('excede') ||
    message.includes('nao e permitido') ||
    message.includes('somente')
  ) {
    return reply.code(400).send({ message })
  }

  return reply.code(400).send({ message })
}

export async function financeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/finance/overview', { preHandler: [authorizePermissions(['finance.read'])] }, async (request, reply) => {
    const parsed = financeOverviewQuerySchema.safeParse(request.query)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Query invalida.', issues: parsed.error.flatten() })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const result = await getFinanceOverviewService(request.authUser, parsed.data.month)
      return reply.send(result)
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.get('/finance/receivables', { preHandler: [authorizePermissions(['finance.read'])] }, async (request, reply) => {
    const parsed = receivablesQuerySchema.safeParse(request.query)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Query invalida.', issues: parsed.error.flatten() })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const page = parsed.data.page
      const pageSize = parsed.data.pageSize

      const result = await listReceivablesService(request.authUser, {
        page,
        pageSize,
        skip: (page - 1) * pageSize,
        take: pageSize,
        search: parsed.data.search,
        clientId: parsed.data.clientId,
        status: parsed.data.status,
        dueDateFrom: parsed.data.dueDateFrom,
        dueDateTo: parsed.data.dueDateTo,
      })

      return reply.send(result)
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.get('/contracts/:contractId/financial-plan', { preHandler: [authorizePermissions(['finance.read'])] }, async (request, reply) => {
    const parsedParams = contractIdParamsSchema.safeParse(request.params)

    if (!parsedParams.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const plan = await getContractFinancialPlanService(request.authUser, parsedParams.data.contractId)
      if (!plan) {
        return reply.code(404).send({ message: 'Plano financeiro nao encontrado para o contrato.' })
      }

      return reply.send({ plan })
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.post('/contracts/:contractId/financial-plan/preview', { preHandler: [authorizePermissions(['finance.plan.create', 'finance.commercial.manage'])] }, async (request, reply) => {
    const parsedParams = contractIdParamsSchema.safeParse(request.params)
    const parsedBody = createFinancialPlanBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const preview = await previewFinancialPlanService(request.authUser, parsedParams.data.contractId, parsedBody.data)
      return reply.send({ preview })
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.post('/contracts/:contractId/financial-plan', { preHandler: [authorizePermissions(['finance.plan.create', 'finance.commercial.manage'])] }, async (request, reply) => {
    const parsedParams = contractIdParamsSchema.safeParse(request.params)
    const parsedBody = createFinancialPlanBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const result = await createFinancialPlanService(request.authUser, parsedParams.data.contractId, parsedBody.data)
      return reply.code(201).send(result)
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.get('/contracts/:contractId/commercial-history', { preHandler: [authorizePermissions(['finance.read'])] }, async (request, reply) => {
    const parsedParams = contractIdParamsSchema.safeParse(request.params)

    if (!parsedParams.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const result = await listContractCommercialHistoryService(request.authUser, parsedParams.data.contractId)
      return reply.send(result)
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.post('/contracts/:contractId/annual-advance-charge', { preHandler: [authorizePermissions(['finance.commercial.manage'])] }, async (request, reply) => {
    const parsedParams = contractIdParamsSchema.safeParse(request.params)
    const parsedBody = createAnnualAdvanceChargeBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const result = await createAnnualAdvanceChargeService(request.authUser, parsedParams.data.contractId, parsedBody.data)
      return reply.code(201).send(result)
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.post('/annual-advance-charges/:id/confirm-payment', { preHandler: [authorizePermissions(['finance.commercial.manage', 'finance.payments.create'])] }, async (request, reply) => {
    const parsedParams = annualAdvanceChargeIdParamsSchema.safeParse(request.params)
    const parsedBody = confirmAnnualAdvancePaymentBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const result = await confirmAnnualAdvanceChargePaymentService(request.authUser, parsedParams.data.id, parsedBody.data)
      return reply.send(result)
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.post('/annual-advance-charges/:id/cancel', { preHandler: [authorizePermissions(['finance.commercial.manage'])] }, async (request, reply) => {
    const parsedParams = annualAdvanceChargeIdParamsSchema.safeParse(request.params)
    const parsedBody = cancelAnnualAdvanceChargeBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const charge = await cancelAnnualAdvanceChargeService(request.authUser, parsedParams.data.id, parsedBody.data)
      return reply.send({ charge })
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.post('/annual-advance-charges/:id/fail', { preHandler: [authorizePermissions(['finance.commercial.manage'])] }, async (request, reply) => {
    const parsedParams = annualAdvanceChargeIdParamsSchema.safeParse(request.params)
    const parsedBody = failAnnualAdvanceChargeBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const charge = await failAnnualAdvanceChargeService(request.authUser, parsedParams.data.id, parsedBody.data)
      return reply.send({ charge })
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.post('/annual-advance-charges/:id/reverse-payment', { preHandler: [authorizePermissions(['finance.commercial.manage', 'finance.payments.reverse'])] }, async (request, reply) => {
    const parsedParams = annualAdvanceChargeIdParamsSchema.safeParse(request.params)
    const parsedBody = reverseAnnualAdvancePaymentBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const result = await reverseAnnualAdvancePaymentService(request.authUser, parsedParams.data.id, parsedBody.data)
      return reply.send(result)
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.post('/annual-advance-charges/:id/pix', { preHandler: [authorizePermissions(['finance.commercial.manage'])] }, async (request, reply) => {
    const parsedParams = annualAdvanceChargeIdParamsSchema.safeParse(request.params)
    const parsedBody = createAnnualAdvancePixChargeBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const result = await createAnnualAdvancePixChargeService(request.authUser, parsedParams.data.id, parsedBody.data)
      return reply.send(result)
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.post('/finance/webhooks/mercado-pago', async (request, reply) => {
    const parsedQuery = mercadoPagoWebhookQuerySchema.safeParse(request.query)

    if (!parsedQuery.success) {
      return reply.code(400).send({ message: 'Query invalida.' })
    }

    try {
      await processMercadoPagoWebhookService({
        topic: parsedQuery.data.topic,
        type: parsedQuery.data.type,
        action: parsedQuery.data.action,
        dataId: parsedQuery.data['data.id'],
        xSignature: request.headers['x-signature'],
        xRequestId: request.headers['x-request-id'],
        payload: typeof request.body === 'object' && request.body !== null
          ? (request.body as Record<string, unknown>)
          : undefined,
      })

      return reply.code(200).send({ acknowledged: true })
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.get('/contracts/:contractId/installments', { preHandler: [authorizePermissions(['finance.installments.read'])] }, async (request, reply) => {
    const parsedParams = contractIdParamsSchema.safeParse(request.params)
    const parsedQuery = listContractInstallmentsQuerySchema.safeParse(request.query)

    if (!parsedParams.success || !parsedQuery.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const page = parsedQuery.data.page
      const pageSize = parsedQuery.data.pageSize

      const result = await listContractInstallmentsService(request.authUser, {
        contractId: parsedParams.data.contractId,
        page,
        pageSize,
        skip: (page - 1) * pageSize,
        take: pageSize,
        status: parsedQuery.data.status,
      })

      return reply.send(result)
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.get('/contracts/:contractId/finance-summary', { preHandler: [authorizePermissions(['finance.read'])] }, async (request, reply) => {
    const parsedParams = contractIdParamsSchema.safeParse(request.params)

    if (!parsedParams.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const summary = await getContractFinancialSummaryService(request.authUser, parsedParams.data.contractId)
      return reply.send(summary)
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.get('/installments/:id', { preHandler: [authorizePermissions(['finance.installments.read'])] }, async (request, reply) => {
    const parsed = installmentIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const installment = await getInstallmentByIdService(request.authUser, parsed.data.id)
      if (!installment) {
        return reply.code(404).send({ message: 'Parcela nao encontrada.' })
      }

      return reply.send({ installment })
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.patch('/installments/:id', { preHandler: [authorizePermissions(['finance.installments.update'])] }, async (request, reply) => {
    const parsedParams = installmentIdParamsSchema.safeParse(request.params)
    const parsedBody = updateInstallmentBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const installment = await updateInstallmentService(request.authUser, parsedParams.data.id, parsedBody.data)
      return reply.send({ installment })
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.post('/installments/:id/cancel', { preHandler: [authorizePermissions(['finance.installments.cancel'])] }, async (request, reply) => {
    const parsedParams = installmentIdParamsSchema.safeParse(request.params)
    const parsedBody = cancelInstallmentBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const installment = await cancelInstallmentService(request.authUser, parsedParams.data.id, parsedBody.data)
      return reply.send({ installment })
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.get('/installments/:id/payments', { preHandler: [authorizePermissions(['finance.payments.read'])] }, async (request, reply) => {
    const parsed = installmentIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const result = await listInstallmentPaymentsService(request.authUser, parsed.data.id)
      return reply.send(result)
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.post('/installments/:id/payments', { preHandler: [authorizePermissions(['finance.payments.create'])] }, async (request, reply) => {
    const parsedParams = installmentIdParamsSchema.safeParse(request.params)
    const parsedBody = createPaymentBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const result = await recordInstallmentPaymentService(request.authUser, parsedParams.data.id, parsedBody.data)
      return reply.code(201).send(result)
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.post('/payments/:id/reverse', { preHandler: [authorizePermissions(['finance.payments.reverse'])] }, async (request, reply) => {
    const parsedParams = paymentIdParamsSchema.safeParse(request.params)
    const parsedBody = reversePaymentBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const result = await reversePaymentService(request.authUser, parsedParams.data.id, parsedBody.data)
      return reply.send(result)
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.get('/installments/:id/charges', { preHandler: [authorizePermissions(['finance.charges.read'])] }, async (request, reply) => {
    const parsed = installmentIdParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Identificador invalido.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const result = await listInstallmentChargesService(request.authUser, parsed.data.id)
      return reply.send(result)
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.post('/installments/:id/charges', { preHandler: [authorizePermissions(['finance.charges.create'])] }, async (request, reply) => {
    const parsedParams = installmentIdParamsSchema.safeParse(request.params)
    const parsedBody = createChargeBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const result = await createInstallmentChargeService(request.authUser, parsedParams.data.id, parsedBody.data)
      return reply.code(201).send(result)
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.post('/charges/:id/cancel', { preHandler: [authorizePermissions(['finance.charges.cancel'])] }, async (request, reply) => {
    const parsedParams = chargeIdParamsSchema.safeParse(request.params)
    const parsedBody = cancelChargeBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const charge = await cancelChargeService(request.authUser, parsedParams.data.id, parsedBody.data)
      return reply.send({ charge })
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })

  app.post('/charges/:id/payment-link', { preHandler: [authorizePermissions(['finance.charges.create'])] }, async (request, reply) => {
    const parsedParams = chargeIdParamsSchema.safeParse(request.params)
    const parsedBody = createChargePaymentLinkBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({ message: 'Dados invalidos.' })
    }

    if (!request.authUser) {
      return reply.code(401).send({ message: 'Nao autenticado.' })
    }

    try {
      const result = await createChargeCardPaymentLinkService(request.authUser, parsedParams.data.id, parsedBody.data)
      return reply.send(result)
    } catch (error) {
      return handleFinanceError(error, reply)
    }
  })
}
