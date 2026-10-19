import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import { Prisma } from '@prisma/client'
import { buildApp } from '../../app.js'
import { prisma } from '../../lib/prisma.js'
import { hashPassword } from '../../lib/password.js'
import { setMercadoPagoGatewayForTests } from './finance.service.js'

type LoginContext = {
  financeCookie: string
  scopedFinanceCookie: string
  noScopeFinanceCookie: string
  adminCookie: string
  viewerCookie: string
  contractAId: string
  contractBId: string
  contractCId: string
  contractDId: string
}

const suffix = `${Date.now()}`
const financeEmail = `finance.integration.${suffix}@gestaosst.local`
const scopedFinanceEmail = `finance.scoped.integration.${suffix}@gestaosst.local`
const noScopeFinanceEmail = `finance.noscope.integration.${suffix}@gestaosst.local`
const adminEmail = `admin.integration.${suffix}@gestaosst.local`
const viewerEmail = `viewer.integration.${suffix}@gestaosst.local`
const password = 'Amos@12.'
let context: LoginContext

type IdOnly = {
  id: string
}

type PrismaFinanceTestClient = {
  annualAdvanceCharge: {
    findMany: <T = IdOnly>(args: Record<string, unknown>) => Promise<T[]>
    findUnique: <T = IdOnly>(args: Record<string, unknown>) => Promise<T | null>
    findFirst: <T = IdOnly>(args: Record<string, unknown>) => Promise<T | null>
    deleteMany: (args: Record<string, unknown>) => Promise<unknown>
  }
  annualAdvanceExternalPayment: {
    findMany: <T = IdOnly>(args: Record<string, unknown>) => Promise<T[]>
    findUnique: <T = IdOnly>(args: Record<string, unknown>) => Promise<T | null>
    deleteMany: (args: Record<string, unknown>) => Promise<unknown>
  }
  paymentProviderWebhookEvent: {
    findMany: <T = IdOnly>(args: Record<string, unknown>) => Promise<T[]>
    deleteMany: (args: Record<string, unknown>) => Promise<unknown>
  }
  annualAdvanceChargeInstallment: {
    deleteMany: (args: Record<string, unknown>) => Promise<unknown>
  }
  contractCommercialCondition: {
    deleteMany: (args: Record<string, unknown>) => Promise<unknown>
  }
}

const financePrisma = prisma as unknown as PrismaFinanceTestClient

function parseSetCookie(header: string | string[] | undefined): string {
  if (!header) {
    throw new Error('Set-Cookie ausente no login de teste.')
  }

  const raw = Array.isArray(header) ? header[0] : header
  const [cookie] = raw.split(';')
  return cookie
}

async function login(email: string) {
  const app = buildApp()
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      email,
      password,
    },
  })

  assert.equal(response.statusCode, 200)
  await app.close()
  return parseSetCookie(response.headers['set-cookie'])
}

async function createIsolatedPixContract(tag: string) {
  const financeUser = await prisma.user.findUniqueOrThrow({
    where: { email: financeEmail },
    select: { id: true },
  })

  const client = await prisma.client.create({
    data: {
      legalName: `Cliente Pix ${tag} ${suffix}`,
      status: 'ACTIVE',
    },
  })

  await prisma.clientMembership.create({
    data: {
      userId: financeUser.id,
      clientId: client.id,
    },
  })

  const contract = await prisma.contract.create({
    data: {
      clientId: client.id,
      contractNumber: `IT-PIX-${tag}-${suffix}`,
      title: `Contrato Pix ${tag}`,
      status: 'ACTIVE',
      startDate: new Date(Date.UTC(2026, 0, 1)),
      endDate: new Date(Date.UTC(2027, 5, 30)),
      durationMonths: 18,
      totalValue: '18000.00',
      monthlyBaseValue: '1000.00',
      dueDay: 10,
      paymentMethod: 'PIX',
      currency: 'BRL',
    },
  })

  return {
    clientId: client.id,
    contractId: contract.id,
  }
}

async function cleanupIsolatedPixContract(contractId: string, clientId: string) {
  const installments = await prisma.installment.findMany({
    where: { contractId },
    select: { id: true },
  })

  const installmentIds = installments.map((item) => item.id)

  const annualCharges = await financePrisma.annualAdvanceCharge.findMany({
    where: { contractId },
    select: { id: true },
  })

  const annualChargeIds = annualCharges.map((item: { id: string }) => item.id)

  const externalPayments = await financePrisma.annualAdvanceExternalPayment.findMany({
    where: {
      annualAdvanceChargeId: {
        in: annualChargeIds,
      },
    },
    select: { id: true },
  })

  const externalPaymentIds = externalPayments.map((item: { id: string }) => item.id)

  await financePrisma.paymentProviderWebhookEvent.deleteMany({
    where: {
      annualAdvanceExternalPaymentId: {
        in: externalPaymentIds,
      },
    },
  })

  await financePrisma.annualAdvanceExternalPayment.deleteMany({
    where: {
      id: {
        in: externalPaymentIds,
      },
    },
  })

  await prisma.payment.deleteMany({
    where: {
      installmentId: {
        in: installmentIds,
      },
    },
  })

  await prisma.charge.deleteMany({
    where: {
      installmentId: {
        in: installmentIds,
      },
    },
  })

  await financePrisma.annualAdvanceChargeInstallment.deleteMany({
    where: {
      annualAdvanceChargeId: {
        in: annualChargeIds,
      },
    },
  })

  await financePrisma.annualAdvanceCharge.deleteMany({
    where: {
      id: {
        in: annualChargeIds,
      },
    },
  })

  await prisma.installment.deleteMany({
    where: {
      id: {
        in: installmentIds,
      },
    },
  })

  await prisma.contractFinancialPlan.deleteMany({
    where: {
      contractId,
    },
  })

  await financePrisma.contractCommercialCondition.deleteMany({
    where: {
      contractId,
    },
  })

  await prisma.contract.delete({
    where: { id: contractId },
  })

  await prisma.clientMembership.deleteMany({
    where: {
      clientId,
    },
  })

  await prisma.client.delete({
    where: { id: clientId },
  })
}

before(async () => {
  const passwordHash = await hashPassword(password)

  const financeUser = await prisma.user.create({
    data: {
      email: financeEmail,
      role: 'FINANCIAL',
      passwordHash,
      isActive: true,
      name: 'Finance Integration',
    },
  })

  const scopedFinanceUser = await prisma.user.create({
    data: {
      email: scopedFinanceEmail,
      role: 'FINANCIAL',
      passwordHash,
      isActive: true,
      name: 'Finance Scoped Integration',
    },
  })

  await prisma.user.create({
    data: {
      email: noScopeFinanceEmail,
      role: 'FINANCIAL',
      passwordHash,
      isActive: true,
      name: 'Finance No Scope Integration',
    },
  })

  await prisma.user.create({
    data: {
      email: adminEmail,
      role: 'ADMIN',
      passwordHash,
      isActive: true,
      name: 'Admin Integration',
    },
  })

  await prisma.user.create({
    data: {
      email: viewerEmail,
      role: 'VIEWER',
      passwordHash,
      isActive: true,
      name: 'Viewer Integration',
    },
  })

  const clientA = await prisma.client.create({
    data: {
      legalName: `Cliente Integracao A ${suffix}`,
      status: 'ACTIVE',
    },
  })

  const clientB = await prisma.client.create({
    data: {
      legalName: `Cliente Integracao B ${suffix}`,
      status: 'ACTIVE',
    },
  })

  await prisma.clientMembership.createMany({
    data: [
      {
        userId: financeUser.id,
        clientId: clientA.id,
      },
      {
        userId: financeUser.id,
        clientId: clientB.id,
      },
      {
        userId: scopedFinanceUser.id,
        clientId: clientA.id,
      },
    ],
    skipDuplicates: true,
  })

  const contractA = await prisma.contract.create({
    data: {
      clientId: clientA.id,
      contractNumber: `IT-A-${suffix}`,
      title: 'Contrato Integracao A',
      status: 'ACTIVE',
      startDate: new Date(Date.UTC(2026, 0, 1)),
      endDate: new Date(Date.UTC(2027, 5, 30)),
      durationMonths: 18,
      totalValue: '18000.00',
      monthlyBaseValue: '1000.00',
      dueDay: 10,
      paymentMethod: 'PIX',
      currency: 'BRL',
    },
  })

  const contractB = await prisma.contract.create({
    data: {
      clientId: clientB.id,
      contractNumber: `IT-B-${suffix}`,
      title: 'Contrato Integracao B',
      status: 'ACTIVE',
      startDate: new Date(Date.UTC(2026, 0, 1)),
      endDate: new Date(Date.UTC(2027, 5, 30)),
      durationMonths: 18,
      totalValue: '18000.00',
      monthlyBaseValue: '1000.00',
      dueDay: 10,
      paymentMethod: 'PIX',
      currency: 'BRL',
    },
  })

  const contractC = await prisma.contract.create({
    data: {
      clientId: clientA.id,
      contractNumber: `IT-C-${suffix}`,
      title: 'Contrato Integracao C',
      status: 'ACTIVE',
      startDate: new Date(Date.UTC(2026, 0, 1)),
      endDate: new Date(Date.UTC(2027, 5, 30)),
      durationMonths: 18,
      totalValue: '18000.00',
      monthlyBaseValue: '1000.00',
      dueDay: 10,
      paymentMethod: 'PIX',
      currency: 'BRL',
    },
  })

  const contractD = await prisma.contract.create({
    data: {
      clientId: clientB.id,
      contractNumber: `IT-D-${suffix}`,
      title: 'Contrato Integracao D',
      status: 'ACTIVE',
      startDate: new Date(Date.UTC(2026, 0, 1)),
      endDate: new Date(Date.UTC(2027, 5, 30)),
      durationMonths: 18,
      totalValue: '18000.00',
      monthlyBaseValue: '1000.00',
      dueDay: 10,
      paymentMethod: 'PIX',
      currency: 'BRL',
    },
  })

  context = {
    financeCookie: await login(financeEmail),
    scopedFinanceCookie: await login(scopedFinanceEmail),
    noScopeFinanceCookie: await login(noScopeFinanceEmail),
    adminCookie: await login(adminEmail),
    viewerCookie: await login(viewerEmail),
    contractAId: contractA.id,
    contractBId: contractB.id,
    contractCId: contractC.id,
    contractDId: contractD.id,
  }
})

after(async () => {
  const contracts = await prisma.contract.findMany({
    where: {
      contractNumber: {
        in: [`IT-A-${suffix}`, `IT-B-${suffix}`, `IT-C-${suffix}`, `IT-D-${suffix}`],
      },
    },
    select: {
      id: true,
    },
  })

  const contractIds = contracts.map((item) => item.id)

  const plans = await prisma.contractFinancialPlan.findMany({
    where: {
      contractId: {
        in: contractIds,
      },
    },
    select: { id: true },
  })

  const planIds = plans.map((item) => item.id)

  const installments = await prisma.installment.findMany({
    where: {
      contractId: {
        in: contractIds,
      },
    },
    select: { id: true },
  })

  const installmentIds = installments.map((item) => item.id)

  await prisma.payment.deleteMany({
    where: {
      installmentId: {
        in: installmentIds,
      },
    },
  })

  await prisma.charge.deleteMany({
    where: {
      installmentId: {
        in: installmentIds,
      },
    },
  })

  const annualAdvanceCharges = await financePrisma.annualAdvanceCharge.findMany({
    where: {
      contractId: {
        in: contractIds,
      },
    },
    select: { id: true },
  })

  const annualAdvanceChargeIds = annualAdvanceCharges.map((item: { id: string }) => item.id)

  const externalPayments = await financePrisma.annualAdvanceExternalPayment.findMany({
    where: {
      annualAdvanceChargeId: {
        in: annualAdvanceChargeIds,
      },
    },
    select: { id: true },
  })

  const externalPaymentIds = externalPayments.map((item: { id: string }) => item.id)

  await financePrisma.paymentProviderWebhookEvent.deleteMany({
    where: {
      annualAdvanceExternalPaymentId: {
        in: externalPaymentIds,
      },
    },
  })

  await financePrisma.annualAdvanceExternalPayment.deleteMany({
    where: {
      id: {
        in: externalPaymentIds,
      },
    },
  })

  await financePrisma.annualAdvanceChargeInstallment.deleteMany({
    where: {
      installmentId: {
        in: installmentIds,
      },
    },
  })

  await financePrisma.annualAdvanceCharge.deleteMany({
    where: {
      contractId: {
        in: contractIds,
      },
    },
  })

  await prisma.installment.deleteMany({
    where: {
      id: {
        in: installmentIds,
      },
    },
  })

  await prisma.contractFinancialPlan.deleteMany({
    where: {
      id: {
        in: planIds,
      },
    },
  })

  await financePrisma.contractCommercialCondition.deleteMany({
    where: {
      contractId: {
        in: contractIds,
      },
    },
  })

  await prisma.contract.deleteMany({
    where: {
      id: {
        in: contractIds,
      },
    },
  })

  await prisma.clientMembership.deleteMany({
    where: {
      user: {
        email: {
          in: [financeEmail, scopedFinanceEmail, noScopeFinanceEmail, adminEmail, viewerEmail],
        },
      },
    },
  })

  await prisma.client.deleteMany({
    where: {
      legalName: {
        in: [`Cliente Integracao A ${suffix}`, `Cliente Integracao B ${suffix}`],
      },
    },
  })

  await prisma.user.deleteMany({
    where: {
      email: {
        in: [financeEmail, scopedFinanceEmail, noScopeFinanceEmail, adminEmail, viewerEmail],
      },
    },
  })
})

test('fluxo de antecipacao anual consolidada com bloqueios e idempotencia', async () => {
  const app = buildApp()

  const createPlanA = await app.inject({
    method: 'POST',
    url: `/api/v1/contracts/${context.contractAId}/financial-plan`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      firstDueDate: '2026-02-10',
      commercialCondition: {
        modality: 'ANNUAL_PIX_ADVANCE',
        discountPercent: '10.00',
        advanceMonths: 12,
        commercialJustification: 'Negociacao anual de teste',
      },
    },
  })

  assert.equal(createPlanA.statusCode, 201)

  const listInstallmentsA = await app.inject({
    method: 'GET',
    url: `/api/v1/contracts/${context.contractAId}/installments?page=1&pageSize=100`,
    headers: {
      cookie: context.financeCookie,
    },
  })

  assert.equal(listInstallmentsA.statusCode, 200)
  const installmentsA = listInstallmentsA.json().data as Array<{ id: string; coveredByAdvance: boolean; number: number }>
  const coveredA = installmentsA.filter((item) => item.coveredByAdvance)
  const uncoveredA = installmentsA.find((item) => !item.coveredByAdvance)

  assert.equal(coveredA.length, 12)
  assert.ok(uncoveredA)

  const idempotencyKeyA = `idem-${suffix}-a`
  const createAnnualA = await app.inject({
    method: 'POST',
    url: `/api/v1/contracts/${context.contractAId}/annual-advance-charge`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      dueDate: '2026-02-20',
      idempotencyKey: idempotencyKeyA,
      notes: 'Cobranca anual de integracao',
    },
  })

  assert.equal(createAnnualA.statusCode, 201)
  assert.equal(createAnnualA.json().idempotencyReplay, false)
  const annualChargeId = createAnnualA.json().charge.id as string

  const blockedMonthly = await app.inject({
    method: 'POST',
    url: `/api/v1/installments/${coveredA[0].id}/charges`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      provider: 'MANUAL',
      method: 'PIX',
      amount: '100.00',
    },
  })

  assert.equal(blockedMonthly.statusCode, 400)
  assert.match(blockedMonthly.body, /Regularize a antecipacao/)

  const confirmAnnual = await app.inject({
    method: 'POST',
    url: `/api/v1/annual-advance-charges/${annualChargeId}/confirm-payment`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      notes: 'Pagamento confirmado em teste',
      externalReference: `pix-ref-${suffix}-a`,
    },
  })

  assert.equal(confirmAnnual.statusCode, 200)
  assert.equal(confirmAnnual.json().charge.paymentStatus, 'CONFIRMED')
  assert.equal(confirmAnnual.json().charge.billingStatus, 'PAID')

  const confirmAnnualReplay = await app.inject({
    method: 'POST',
    url: `/api/v1/annual-advance-charges/${annualChargeId}/confirm-payment`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      notes: 'Replay confirmacao',
    },
  })

  assert.equal(confirmAnnualReplay.statusCode, 200)
  assert.equal(confirmAnnualReplay.json().idempotencyReplay, true)

  const coveredInstallmentDetail = await app.inject({
    method: 'GET',
    url: `/api/v1/installments/${coveredA[0].id}`,
    headers: {
      cookie: context.financeCookie,
    },
  })

  assert.equal(coveredInstallmentDetail.statusCode, 200)
  assert.equal(coveredInstallmentDetail.json().installment.status, 'PAID')

  const idempotentReplay = await app.inject({
    method: 'POST',
    url: `/api/v1/contracts/${context.contractAId}/annual-advance-charge`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      dueDate: '2026-02-20',
      idempotencyKey: idempotencyKeyA,
    },
  })

  assert.equal(idempotentReplay.statusCode, 201)
  assert.equal(idempotentReplay.json().idempotencyReplay, true)
  assert.equal(idempotentReplay.json().charge.id, annualChargeId)

  const createMonthlyUncovered = await app.inject({
    method: 'POST',
    url: `/api/v1/installments/${uncoveredA!.id}/charges`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      provider: 'MANUAL',
      method: 'PIX',
      amount: '100.00',
    },
  })

  assert.equal(createMonthlyUncovered.statusCode, 201)

  const manualUncoveredPayment = await app.inject({
    method: 'POST',
    url: `/api/v1/installments/${uncoveredA!.id}/payments`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      amount: '50.00',
      paidAt: '2026-02-15T10:00:00.000Z',
      method: 'PIX',
      provider: 'MANUAL',
      idempotencyKey: `manual-unrelated-${suffix}`,
      notes: 'Pagamento nao relacionado a antecipacao anual',
    },
  })

  assert.equal(manualUncoveredPayment.statusCode, 201)

  const reverseAnnual = await app.inject({
    method: 'POST',
    url: `/api/v1/annual-advance-charges/${annualChargeId}/reverse-payment`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      reason: 'Estorno de teste',
    },
  })

  assert.equal(reverseAnnual.statusCode, 200)
  assert.equal(reverseAnnual.json().charge.paymentStatus, 'REVERSED')
  assert.equal(reverseAnnual.json().idempotencyReplay, false)

  const reverseReplay = await app.inject({
    method: 'POST',
    url: `/api/v1/annual-advance-charges/${annualChargeId}/reverse-payment`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      reason: 'Replay estorno',
    },
  })

  assert.equal(reverseReplay.statusCode, 200)
  assert.equal(reverseReplay.json().idempotencyReplay, true)

  const unrelatedPaymentsAfterReverse = await app.inject({
    method: 'GET',
    url: `/api/v1/installments/${uncoveredA!.id}/payments`,
    headers: {
      cookie: context.financeCookie,
    },
  })

  assert.equal(unrelatedPaymentsAfterReverse.statusCode, 200)
  const unrelatedPayment = (unrelatedPaymentsAfterReverse.json().data as Array<{ idempotencyKey: string | null; status: string }>).find(
    (payment) => payment.idempotencyKey === `manual-unrelated-${suffix}`,
  )
  assert.ok(unrelatedPayment)
  assert.equal(unrelatedPayment?.status, 'CONFIRMED')

  const commercialHistory = await app.inject({
    method: 'GET',
    url: `/api/v1/contracts/${context.contractAId}/commercial-history`,
    headers: {
      cookie: context.financeCookie,
    },
  })

  assert.equal(commercialHistory.statusCode, 200)
  assert.ok((commercialHistory.json().versions as Array<unknown>).length >= 1)

  await app.close()
})

test('vencida/cancelada sem pagamento permite regularizacao sem conflito', async () => {
  const app = buildApp()

  const createPlanB = await app.inject({
    method: 'POST',
    url: `/api/v1/contracts/${context.contractBId}/financial-plan`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      firstDueDate: '2026-02-10',
      commercialCondition: {
        modality: 'ANNUAL_PIX_ADVANCE',
        discountFixedAmount: '600.00',
        advanceMonths: 12,
        commercialJustification: 'Teste de cancelamento sem pagamento',
      },
    },
  })

  assert.equal(createPlanB.statusCode, 201)

  const listInstallmentsB = await app.inject({
    method: 'GET',
    url: `/api/v1/contracts/${context.contractBId}/installments?page=1&pageSize=100`,
    headers: {
      cookie: context.financeCookie,
    },
  })

  assert.equal(listInstallmentsB.statusCode, 200)
  const coveredB = (listInstallmentsB.json().data as Array<{ id: string; coveredByAdvance: boolean }>).filter((item) => item.coveredByAdvance)
  assert.ok(coveredB.length > 0)

  const createAnnualB = await app.inject({
    method: 'POST',
    url: `/api/v1/contracts/${context.contractBId}/annual-advance-charge`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      dueDate: '2026-01-10',
      idempotencyKey: `idem-${suffix}-b`,
    },
  })

  assert.equal(createAnnualB.statusCode, 201)

  const blockedBeforeCancel = await app.inject({
    method: 'POST',
    url: `/api/v1/installments/${coveredB[0].id}/charges`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      provider: 'MANUAL',
      method: 'PIX',
      amount: '100.00',
    },
  })

  assert.equal(blockedBeforeCancel.statusCode, 400)

  const cancelled = await app.inject({
    method: 'POST',
    url: `/api/v1/annual-advance-charges/${createAnnualB.json().charge.id}/cancel`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      reason: 'Nao houve pagamento da antecipacao',
    },
  })

  assert.equal(cancelled.statusCode, 200)

  const allowedAfterCancel = await app.inject({
    method: 'POST',
    url: `/api/v1/installments/${coveredB[0].id}/charges`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      provider: 'MANUAL',
      method: 'PIX',
      amount: '100.00',
    },
  })

  assert.equal(allowedAfterCancel.statusCode, 201)

  await app.close()
})

test('duas confirmacoes concorrentes nao duplicam pagamentos', async () => {
  const app = buildApp()

  const createPlanC = await app.inject({
    method: 'POST',
    url: `/api/v1/contracts/${context.contractCId}/financial-plan`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      firstDueDate: '2026-02-10',
      commercialCondition: {
        modality: 'ANNUAL_PIX_ADVANCE',
        discountPercent: '8.00',
        advanceMonths: 12,
        commercialJustification: 'Teste de concorrencia na confirmacao',
      },
    },
  })

  assert.equal(createPlanC.statusCode, 201)

  const createAnnualC = await app.inject({
    method: 'POST',
    url: `/api/v1/contracts/${context.contractCId}/annual-advance-charge`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      dueDate: '2026-02-20',
      idempotencyKey: `idem-${suffix}-c`,
    },
  })

  assert.equal(createAnnualC.statusCode, 201)

  const annualChargeId = createAnnualC.json().charge.id as string

  const [confirmOne, confirmTwo] = await Promise.all([
    app.inject({
      method: 'POST',
      url: `/api/v1/annual-advance-charges/${annualChargeId}/confirm-payment`,
      headers: { cookie: context.financeCookie },
      payload: { notes: 'confirmacao concorrente 1' },
    }),
    app.inject({
      method: 'POST',
      url: `/api/v1/annual-advance-charges/${annualChargeId}/confirm-payment`,
      headers: { cookie: context.financeCookie },
      payload: { notes: 'confirmacao concorrente 2' },
    }),
  ])

  assert.equal(confirmOne.statusCode, 200)
  assert.equal(confirmTwo.statusCode, 200)
  assert.ok(confirmOne.json().idempotencyReplay || confirmTwo.json().idempotencyReplay)

    const chargeRecord = await financePrisma.annualAdvanceCharge.findUnique<{
      id: string
      netAmount: Prisma.Decimal
      installmentLinks: Array<{
        installmentId: string
      }>
    }>({
    where: { id: annualChargeId },
    select: {
      id: true,
      netAmount: true,
      installmentLinks: {
        select: {
          installmentId: true,
        },
      },
    },
  })

  assert.ok(chargeRecord)

  const paymentKeys = (chargeRecord?.installmentLinks ?? []).map(
    (link: { installmentId: string }) => `annual-advance:${annualChargeId}:${link.installmentId}`,
  )

  const payments = await prisma.payment.findMany({
    where: {
      idempotencyKey: {
        in: paymentKeys,
      },
    },
    select: {
      id: true,
      amount: true,
      status: true,
      reversedAt: true,
    },
  })

  assert.equal(payments.length, paymentKeys.length)

  const total = payments.reduce((acc, item) => acc.plus(item.amount), new Prisma.Decimal(0))
  assert.equal(total.toDecimalPlaces(2).toString(), chargeRecord?.netAmount.toDecimalPlaces(2).toString())
  assert.ok(payments.every((item) => item.status === 'CONFIRMED' && !item.reversedAt))

  await app.close()
})

test('nao estorna cobranca nao paga e nao confirma cobranca cancelada', async () => {
  const app = buildApp()

  const createPlanD = await app.inject({
    method: 'POST',
    url: `/api/v1/contracts/${context.contractDId}/financial-plan`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      firstDueDate: '2026-02-10',
      commercialCondition: {
        modality: 'ANNUAL_PIX_ADVANCE',
        discountFixedAmount: '700.00',
        advanceMonths: 12,
        commercialJustification: 'Teste estorno nao pago e confirmacao cancelada',
      },
    },
  })

  assert.equal(createPlanD.statusCode, 201)

  const createAnnualD = await app.inject({
    method: 'POST',
    url: `/api/v1/contracts/${context.contractDId}/annual-advance-charge`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      dueDate: '2026-02-20',
      idempotencyKey: `idem-${suffix}-d`,
    },
  })

  assert.equal(createAnnualD.statusCode, 201)
  const annualChargeId = createAnnualD.json().charge.id as string

  const reverseWithoutPayment = await app.inject({
    method: 'POST',
    url: `/api/v1/annual-advance-charges/${annualChargeId}/reverse-payment`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      reason: 'Tentativa invalida de estorno sem pagamento',
    },
  })

  assert.equal(reverseWithoutPayment.statusCode, 400)

  const cancelCharge = await app.inject({
    method: 'POST',
    url: `/api/v1/annual-advance-charges/${annualChargeId}/cancel`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      reason: 'Cancelamento administrativo',
    },
  })

  assert.equal(cancelCharge.statusCode, 200)

  const confirmCancelled = await app.inject({
    method: 'POST',
    url: `/api/v1/annual-advance-charges/${annualChargeId}/confirm-payment`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      notes: 'Nao deveria confirmar',
    },
  })

  assert.equal(confirmCancelled.statusCode, 400)

  await app.close()
})

test('permissoes insuficientes e isolamento entre contratos', async () => {
  const app = buildApp()

  const forbiddenCreate = await app.inject({
    method: 'POST',
    url: `/api/v1/contracts/${context.contractAId}/annual-advance-charge`,
    headers: {
      cookie: context.viewerCookie,
    },
    payload: {
      dueDate: '2026-03-10',
      idempotencyKey: `idem-${suffix}-viewer`,
    },
  })

  assert.equal(forbiddenCreate.statusCode, 403)

  const forbiddenHistory = await app.inject({
    method: 'GET',
    url: `/api/v1/contracts/${context.contractAId}/commercial-history`,
    headers: {
      cookie: context.viewerCookie,
    },
  })

  assert.equal(forbiddenHistory.statusCode, 403)

  const annualA = await financePrisma.annualAdvanceCharge.findFirst({
    where: { contractId: context.contractAId },
    select: { id: true },
  })

  assert.ok(annualA)

  const forbiddenConfirm = await app.inject({
    method: 'POST',
    url: `/api/v1/annual-advance-charges/${annualA?.id}/confirm-payment`,
    headers: {
      cookie: context.viewerCookie,
    },
    payload: {
      notes: 'sem permissao',
    },
  })

  assert.equal(forbiddenConfirm.statusCode, 403)

  const forbiddenCancel = await app.inject({
    method: 'POST',
    url: `/api/v1/annual-advance-charges/${annualA?.id}/cancel`,
    headers: {
      cookie: context.viewerCookie,
    },
    payload: {
      reason: 'sem permissao',
    },
  })

  assert.equal(forbiddenCancel.statusCode, 403)

  const forbiddenFail = await app.inject({
    method: 'POST',
    url: `/api/v1/annual-advance-charges/${annualA?.id}/fail`,
    headers: {
      cookie: context.viewerCookie,
    },
    payload: {
      reason: 'sem permissao',
    },
  })

  assert.equal(forbiddenFail.statusCode, 403)

  const forbiddenReverse = await app.inject({
    method: 'POST',
    url: `/api/v1/annual-advance-charges/${annualA?.id}/reverse-payment`,
    headers: {
      cookie: context.viewerCookie,
    },
    payload: {
      reason: 'sem permissao',
    },
  })

  assert.equal(forbiddenReverse.statusCode, 403)

  const contractBSummary = await app.inject({
    method: 'GET',
    url: `/api/v1/contracts/${context.contractBId}/finance-summary`,
    headers: {
      cookie: context.financeCookie,
    },
  })

  assert.equal(contractBSummary.statusCode, 200)
  assert.equal(contractBSummary.json().hasPlan, true)

  await app.close()
})

test('financeiro escopado acessa apenas cliente vinculado e bloqueia enumeracao por ids', async () => {
  const app = buildApp()

  const createPlanA = await app.inject({
    method: 'POST',
    url: `/api/v1/contracts/${context.contractAId}/financial-plan`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      firstDueDate: '2026-02-10',
      commercialCondition: {
        modality: 'ANNUAL_PIX_ADVANCE',
        discountPercent: '5.00',
        advanceMonths: 12,
        commercialJustification: 'Garantir plano para teste de escopo A',
      },
    },
  })

  assert.ok([201, 409].includes(createPlanA.statusCode))

  const createPlanB = await app.inject({
    method: 'POST',
    url: `/api/v1/contracts/${context.contractBId}/financial-plan`,
    headers: {
      cookie: context.financeCookie,
    },
    payload: {
      firstDueDate: '2026-02-10',
      commercialCondition: {
        modality: 'ANNUAL_PIX_ADVANCE',
        discountPercent: '5.00',
        advanceMonths: 12,
        commercialJustification: 'Garantir plano para teste de escopo B',
      },
    },
  })

  assert.ok([201, 409].includes(createPlanB.statusCode))

  const scopedSummaryA = await app.inject({
    method: 'GET',
    url: `/api/v1/contracts/${context.contractAId}/finance-summary`,
    headers: {
      cookie: context.scopedFinanceCookie,
    },
  })

  assert.equal(scopedSummaryA.statusCode, 200)

  const scopedSummaryB = await app.inject({
    method: 'GET',
    url: `/api/v1/contracts/${context.contractBId}/finance-summary`,
    headers: {
      cookie: context.scopedFinanceCookie,
    },
  })

  assert.equal(scopedSummaryB.statusCode, 404)

  const installmentFromContractB = await prisma.installment.findFirst({
    where: {
      contractId: context.contractBId,
    },
    select: {
      id: true,
    },
  })

  assert.ok(installmentFromContractB)

  const installmentDetailOutOfScope = await app.inject({
    method: 'GET',
    url: `/api/v1/installments/${installmentFromContractB!.id}`,
    headers: {
      cookie: context.scopedFinanceCookie,
    },
  })

  assert.equal(installmentDetailOutOfScope.statusCode, 404)

  const paymentOutOfScope = await app.inject({
    method: 'POST',
    url: `/api/v1/installments/${installmentFromContractB!.id}/payments`,
    headers: {
      cookie: context.scopedFinanceCookie,
    },
    payload: {
      amount: '10.00',
      paidAt: '2026-02-15T10:00:00.000Z',
      method: 'PIX',
      provider: 'MANUAL',
      notes: 'tentativa fora de escopo',
    },
  })

  assert.equal(paymentOutOfScope.statusCode, 404)

  await app.close()
})

test('financeiro sem escopo e negado por padrao; admin permanece global', async () => {
  const app = buildApp()

  const noScopeOverview = await app.inject({
    method: 'GET',
    url: '/api/v1/finance/overview',
    headers: {
      cookie: context.noScopeFinanceCookie,
    },
  })

  assert.equal(noScopeOverview.statusCode, 403)
  assert.match(noScopeOverview.body, /escopo financeiro/)

  const noScopeReceivables = await app.inject({
    method: 'GET',
    url: '/api/v1/finance/receivables?page=1&pageSize=20',
    headers: {
      cookie: context.noScopeFinanceCookie,
    },
  })

  assert.equal(noScopeReceivables.statusCode, 403)

  const adminSummary = await app.inject({
    method: 'GET',
    url: `/api/v1/contracts/${context.contractBId}/finance-summary`,
    headers: {
      cookie: context.adminCookie,
    },
  })

  assert.equal(adminSummary.statusCode, 200)

  await app.close()
})

test('inicia cobranca PIX externa com idempotencia sem chamar API real', async () => {
  const app = buildApp()
  const isolated = await createIsolatedPixContract('IDEMP')

  setMercadoPagoGatewayForTests({
    createPixPayment: async () => ({
      id: '990001',
      status: 'pending',
      statusDetail: 'pending_waiting_transfer',
      externalReference: 'external-idem',
      dateOfExpiration: null,
      qrCode: 'pix-code',
      qrCodeBase64: null,
      ticketUrl: null,
    }),
  })

  try {
    const createPlan = await app.inject({
      method: 'POST',
      url: `/api/v1/contracts/${isolated.contractId}/financial-plan`,
      headers: { cookie: context.financeCookie },
      payload: {
        firstDueDate: '2026-02-10',
        commercialCondition: {
          modality: 'ANNUAL_PIX_ADVANCE',
          discountPercent: '10.00',
          advanceMonths: 12,
          commercialJustification: 'Plano para PIX idempotente',
        },
      },
    })

    assert.equal(createPlan.statusCode, 201)

    const createAnnual = await app.inject({
      method: 'POST',
      url: `/api/v1/contracts/${isolated.contractId}/annual-advance-charge`,
      headers: { cookie: context.financeCookie },
      payload: {
        dueDate: '2026-02-20',
        idempotencyKey: `idem-pix-${suffix}`,
      },
    })

    assert.equal(createAnnual.statusCode, 201)
    const annualChargeId = createAnnual.json().charge.id as string

    const createPix = await app.inject({
      method: 'POST',
      url: `/api/v1/annual-advance-charges/${annualChargeId}/pix`,
      headers: { cookie: context.financeCookie },
      payload: {
        idempotencyKey: `pix-create-${suffix}`,
        payerEmail: 'tester.integration@gestaosst.local',
      },
    })

    assert.equal(createPix.statusCode, 200)
    assert.equal(createPix.json().idempotencyReplay, false)
    assert.equal(createPix.json().pix.id, '990001')

    const replayPix = await app.inject({
      method: 'POST',
      url: `/api/v1/annual-advance-charges/${annualChargeId}/pix`,
      headers: { cookie: context.financeCookie },
      payload: {
        idempotencyKey: `pix-create-${suffix}`,
      },
    })

    assert.equal(replayPix.statusCode, 200)
    assert.equal(replayPix.json().idempotencyReplay, true)

      const external = await financePrisma.annualAdvanceExternalPayment.findUnique<{
        integrationStatus: string
        externalPaymentId: string | null
      }>({
      where: {
        annualAdvanceChargeId: annualChargeId,
      },
      select: {
        integrationStatus: true,
        externalPaymentId: true,
      },
    })

    assert.equal(external?.externalPaymentId, '990001')
    assert.equal(external?.integrationStatus, 'PENDING_PROVIDER')
  } finally {
    setMercadoPagoGatewayForTests(null)
    await cleanupIsolatedPixContract(isolated.contractId, isolated.clientId)
    await app.close()
  }
})

test('webhook Mercado Pago confirma quitacao e ignora duplicidade por dedupe key', async () => {
  const app = buildApp()
  const isolated = await createIsolatedPixContract('WEBHOOK')

  setMercadoPagoGatewayForTests({
    createPixPayment: async () => ({
      id: '990002',
      status: 'pending',
      statusDetail: 'pending_waiting_transfer',
      externalReference: 'external-webhook',
      dateOfExpiration: null,
      qrCode: 'pix-code',
      qrCodeBase64: null,
      ticketUrl: null,
    }),
    validateWebhookSignature: () => {
      return
    },
    getPaymentById: async () => ({
      id: '990002',
      status: 'approved',
      statusDetail: 'accredited',
      externalReference: 'external-webhook',
      dateOfExpiration: null,
      qrCode: 'pix-code',
      qrCodeBase64: null,
      ticketUrl: null,
    }),
  })

  try {
    const createPlan = await app.inject({
      method: 'POST',
      url: `/api/v1/contracts/${isolated.contractId}/financial-plan`,
      headers: { cookie: context.financeCookie },
      payload: {
        firstDueDate: '2026-02-10',
        commercialCondition: {
          modality: 'ANNUAL_PIX_ADVANCE',
          discountPercent: '10.00',
          advanceMonths: 12,
          commercialJustification: 'Plano para webhook',
        },
      },
    })

    assert.equal(createPlan.statusCode, 201)

    const createAnnual = await app.inject({
      method: 'POST',
      url: `/api/v1/contracts/${isolated.contractId}/annual-advance-charge`,
      headers: { cookie: context.financeCookie },
      payload: {
        dueDate: '2026-02-20',
        idempotencyKey: `idem-webhook-${suffix}`,
      },
    })

    assert.equal(createAnnual.statusCode, 201)
    const annualChargeId = createAnnual.json().charge.id as string

    const createPix = await app.inject({
      method: 'POST',
      url: `/api/v1/annual-advance-charges/${annualChargeId}/pix`,
      headers: { cookie: context.financeCookie },
      payload: {
        idempotencyKey: `pix-webhook-${suffix}`,
        payerEmail: 'tester.integration@gestaosst.local',
      },
    })

    assert.equal(createPix.statusCode, 200)

    const webhookOne = await app.inject({
      method: 'POST',
      url: '/api/v1/finance/webhooks/mercado-pago?topic=payment&data.id=990002',
      headers: {
        'x-signature': 'ts=123,v1=abc',
        'x-request-id': 'request-1',
      },
      payload: {
        id: 'event-1',
      },
    })

    assert.equal(webhookOne.statusCode, 200)

    const webhookTwo = await app.inject({
      method: 'POST',
      url: '/api/v1/finance/webhooks/mercado-pago?topic=payment&data.id=990002',
      headers: {
        'x-signature': 'ts=123,v1=abc',
        'x-request-id': 'request-1',
      },
      payload: {
        id: 'event-1',
      },
    })

    assert.equal(webhookTwo.statusCode, 200)

      const refreshed = await financePrisma.annualAdvanceCharge.findUnique<{
        billingStatus: string
        paymentStatus: string
      }>({
      where: { id: annualChargeId },
      select: {
        billingStatus: true,
        paymentStatus: true,
      },
    })

    assert.equal(refreshed?.billingStatus, 'PAID')
    assert.equal(refreshed?.paymentStatus, 'CONFIRMED')

    const events = await financePrisma.paymentProviderWebhookEvent.findMany({
      where: {
        resourceId: '990002',
      },
      select: { id: true },
    })

    assert.equal(events.length, 1)
  } finally {
    setMercadoPagoGatewayForTests(null)
    await cleanupIsolatedPixContract(isolated.contractId, isolated.clientId)
    await app.close()
  }
})
