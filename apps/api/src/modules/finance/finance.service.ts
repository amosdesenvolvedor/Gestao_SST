/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from '@prisma/client'
import type { ChargeProvider, PaymentMethod } from '@gestao-sst/shared'
import type { AuthUser } from '../../plugins/auth.js'
import { prisma } from '../../lib/prisma.js'
import { createAuditLog } from '../../shared/audit.js'
import { makePagination } from '../../shared/pagination.js'
import {
  countInstallmentsByContract,
  countReceivables,
  createCharge,
  createFinancialPlan,
  createInstallment,
  createPayment,
  findChargeById,
  findChargeByIdForCancel,
  findContractForFinancialPlan,
  findFinancialPlanByContract,
  findInstallmentById,
  findInstallmentForUpdate,
  findPaymentForReversal,
  listChargesByInstallment,
  listContractInstallmentsForOverview,
  listInstallmentsByContract,
  listPaymentsByInstallment,
  listPortalInstallmentsByClient,
  listReceivables,
  updateCharge,
  updateInstallment,
  updatePayment,
  type ChargeRecord,
  type InstallmentRecord,
  type PaymentRecord,
} from './finance.repository.js'

const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/
const monthRegex = /^\d{4}-\d{2}$/
const allowedContractStatuses = new Set(['SIGNED', 'ACTIVE', 'EXPIRING'])

type FinancialPlanInput = {
  installmentCount?: number
  totalAmount?: string
  dueDay?: number
  firstDueDate: string
  notes?: string
}

type ListContractInstallmentsInput = {
  contractId: string
  page: number
  pageSize: number
  skip: number
  take: number
  status?: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED'
}

type ReceivablesFilters = {
  page: number
  pageSize: number
  skip: number
  take: number
  search?: string
  clientId?: string
  status?: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  dueDateFrom?: string
  dueDateTo?: string
}

type RecordPaymentInput = {
  amount: string
  paidAt: string
  method: PaymentMethod
  provider: ChargeProvider
  chargeId?: string
  externalReference?: string
  idempotencyKey?: string
  notes?: string
}

type UpdateInstallmentInput = {
  dueDate?: string
  adjustedAmount?: string
  description?: string | null
}

type CancelInstallmentInput = {
  reason: string
}

type CreateChargeInput = {
  provider: ChargeProvider
  method: PaymentMethod
  amount: string
  externalId?: string
  idempotencyKey?: string
}

type CancelChargeInput = {
  reason?: string
}

type ReversePaymentInput = {
  reason: string
}

type PortalFinanceInput = {
  clientId: string
  contractId?: string
}

type DerivedInstallment = {
  paidAmount: Prisma.Decimal
  balance: Prisma.Decimal
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED'
}

function parseCivilDate(value: string, label: string): Date {
  if (!dateOnlyRegex.test(value)) {
    throw new Error(`Data ${label} invalida.`)
  }

  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Data ${label} invalida.`)
  }

  return parsed
}

function parsePaidAt(value: string): Date {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Data/hora de pagamento invalida.')
  }

  return parsed
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null
}

function parseMoney(value: string, fieldName: string): Prisma.Decimal {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) {
    throw new Error(`${fieldName} invalido.`)
  }

  const decimal = new Prisma.Decimal(value)
  if (decimal.lte(0)) {
    throw new Error(`${fieldName} invalido.`)
  }

  return decimal.toDecimalPlaces(2)
}

function decimalToCents(value: Prisma.Decimal): number {
  const normalized = value.toDecimalPlaces(2).mul(100)
  return Number(normalized.toFixed(0))
}

function centsToDecimal(cents: number): Prisma.Decimal {
  return new Prisma.Decimal(cents).div(100).toDecimalPlaces(2)
}

function clampDayOfMonth(year: number, monthIndex: number, day: number): Date {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0, 0, 0, 0, 0)).getUTCDate()
  const targetDay = Math.min(day, lastDay)
  return new Date(Date.UTC(year, monthIndex, targetDay, 0, 0, 0, 0))
}

function addMonthsWithDay(date: Date, months: number, day: number): Date {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + months
  return clampDayOfMonth(year, month, day)
}

function buildInstallmentAmounts(totalAmount: Prisma.Decimal, installmentCount: number): Prisma.Decimal[] {
  const totalCents = decimalToCents(totalAmount)
  const baseCents = Math.floor(totalCents / installmentCount)
  const remainder = totalCents % installmentCount

  const amounts: Prisma.Decimal[] = []

  for (let index = 0; index < installmentCount; index += 1) {
    const cents = baseCents + (index < remainder ? 1 : 0)
    amounts.push(centsToDecimal(cents))
  }

  return amounts
}

function buildInstallmentSchedule(input: {
  installmentCount: number
  totalAmount: Prisma.Decimal
  firstDueDate: Date
  dueDay: number
}) {
  const amounts = buildInstallmentAmounts(input.totalAmount, input.installmentCount)

  return amounts.map((amount, index) => {
    const dueDate = index === 0 ? input.firstDueDate : addMonthsWithDay(input.firstDueDate, index, input.dueDay)

    return {
      number: index + 1,
      dueDate,
      originalAmount: amount,
      adjustedAmount: amount,
    }
  })
}

function getValidPaidAmount(payments: Array<{ amount: Prisma.Decimal; status: string; reversedAt: Date | null }>) {
  return payments.reduce((acc, payment) => {
    if (payment.status !== 'CONFIRMED' || payment.reversedAt) {
      return acc
    }
    return acc.plus(payment.amount)
  }, new Prisma.Decimal(0))
}

function todayUtcCivil(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
}

function deriveInstallmentState(item: {
  adjustedAmount: Prisma.Decimal
  status: string
  cancelledAt: Date | null
  dueDate: Date
  payments: Array<{ amount: Prisma.Decimal; status: string; reversedAt: Date | null }>
}): DerivedInstallment {
  const paidAmount = getValidPaidAmount(item.payments)
  const balance = item.adjustedAmount.minus(paidAmount).toDecimalPlaces(2)

  if (item.status === 'CANCELLED' || item.cancelledAt) {
    return {
      paidAmount,
      balance,
      status: 'CANCELLED',
    }
  }

  if (balance.lte(0)) {
    return {
      paidAmount,
      balance: new Prisma.Decimal(0),
      status: 'PAID',
    }
  }

  if (paidAmount.gt(0)) {
    if (item.dueDate < todayUtcCivil()) {
      return {
        paidAmount,
        balance,
        status: 'OVERDUE',
      }
    }

    return {
      paidAmount,
      balance,
      status: 'PARTIALLY_PAID',
    }
  }

  if (item.dueDate < todayUtcCivil()) {
    return {
      paidAmount,
      balance,
      status: 'OVERDUE',
    }
  }

  return {
    paidAmount,
    balance,
    status: 'PENDING',
  }
}

function persistedInstallmentStatusFromDerived(status: DerivedInstallment['status']): 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' {
  if (status === 'OVERDUE') {
    return 'PENDING'
  }

  return status as 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED'
}

function mapPayment(record: PaymentRecord) {
  return {
    ...record,
    amount: record.amount.toString(),
    paidAt: record.paidAt.toISOString(),
    reversedAt: toIso(record.reversedAt),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function mapCharge(record: ChargeRecord) {
  return {
    ...record,
    amount: record.amount.toString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function mapInstallment(record: InstallmentRecord) {
  const derived = deriveInstallmentState({
    adjustedAmount: record.adjustedAmount,
    status: record.status,
    cancelledAt: record.cancelledAt,
    dueDate: record.dueDate,
    payments: record.payments,
  })

  return {
    id: record.id,
    contractId: record.contractId,
    financialPlanId: record.financialPlanId,
    number: record.number,
    dueDate: toDateOnly(record.dueDate),
    originalAmount: record.originalAmount.toString(),
    adjustedAmount: record.adjustedAmount.toString(),
    paidAmount: derived.paidAmount.toString(),
    balance: derived.balance.toString(),
    status: derived.status,
    persistedStatus: record.status,
    description: record.description,
    cancellationReason: record.cancellationReason,
    cancelledAt: toIso(record.cancelledAt),
    cancelledByUserId: record.cancelledByUserId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    contract: {
      id: record.contract.id,
      clientId: record.contract.clientId,
      contractNumber: record.contract.contractNumber,
      title: record.contract.title,
      status: record.contract.status,
      client: record.contract.client,
    },
  }
}

function mapInstallmentWithHistory(record: InstallmentRecord) {
  return {
    ...mapInstallment(record),
    payments: record.payments.map((payment: any) => ({
      id: payment.id,
      amount: payment.amount.toString(),
      status: payment.status,
      paidAt: payment.paidAt.toISOString(),
      method: payment.method,
      provider: payment.provider,
      reversedAt: toIso(payment.reversedAt),
      reversalReason: payment.reversalReason,
      externalReference: payment.externalReference,
      createdAt: payment.createdAt.toISOString(),
    })),
  }
}

function assertCanReadFinance(actor: AuthUser) {
  if (!actor.permissions.includes('finance.read')) {
    throw new Error('Acesso negado para leitura financeira.')
  }
}

function assertCanCreatePlan(actor: AuthUser) {
  if (!actor.permissions.includes('finance.plan.create')) {
    throw new Error('Acesso negado para gerar plano financeiro.')
  }
}

function assertCanUpdateInstallments(actor: AuthUser) {
  if (!actor.permissions.includes('finance.installments.update')) {
    throw new Error('Acesso negado para atualizar parcela.')
  }
}

function assertCanCancelInstallments(actor: AuthUser) {
  if (!actor.permissions.includes('finance.installments.cancel')) {
    throw new Error('Acesso negado para cancelar parcela.')
  }
}

function assertCanReadPayments(actor: AuthUser) {
  if (!actor.permissions.includes('finance.payments.read')) {
    throw new Error('Acesso negado para leitura de pagamentos.')
  }
}

function assertCanCreatePayments(actor: AuthUser) {
  if (!actor.permissions.includes('finance.payments.create')) {
    throw new Error('Acesso negado para registrar pagamento.')
  }
}

function assertCanReversePayments(actor: AuthUser) {
  if (!actor.permissions.includes('finance.payments.reverse')) {
    throw new Error('Acesso negado para estornar pagamento.')
  }
}

function assertCanReadCharges(actor: AuthUser) {
  if (!actor.permissions.includes('finance.charges.read')) {
    throw new Error('Acesso negado para leitura de cobrancas.')
  }
}

function assertCanCreateCharges(actor: AuthUser) {
  if (!actor.permissions.includes('finance.charges.create')) {
    throw new Error('Acesso negado para criar cobranca.')
  }
}

function assertCanCancelCharges(actor: AuthUser) {
  if (!actor.permissions.includes('finance.charges.cancel')) {
    throw new Error('Acesso negado para cancelar cobranca.')
  }
}

function assertValidDueDay(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 31) {
    throw new Error('Dia de vencimento invalido.')
  }

  return value
}

async function recomputeInstallmentState(installmentId: string, tx: Prisma.TransactionClient) {
  const record = await findInstallmentForUpdate(installmentId, tx)
  if (!record) {
    throw new Error('Parcela nao encontrada.')
  }

  const derived = deriveInstallmentState({
    adjustedAmount: record.adjustedAmount,
    status: record.status,
    cancelledAt: record.cancelledAt,
    dueDate: record.dueDate,
    payments: record.payments,
  })

  const nextStatus = persistedInstallmentStatusFromDerived(derived.status)

  if (record.status !== nextStatus) {
    await updateInstallment(
      record.id,
      {
        status: nextStatus,
      },
      tx,
    )
  }
}

async function buildContractSummaryFromInstallments(contractId: string) {
  const installments = await listInstallmentsByContract({
    contractId,
    skip: 0,
    take: 1000,
  })

  const summary = buildSummaryFromInstallments(installments)
  return summary
}

function buildSummaryFromInstallments(installments: InstallmentRecord[]) {
  const today = todayUtcCivil()

  let totalPlanned = new Prisma.Decimal(0)
  let totalPaid = new Prisma.Decimal(0)
  let totalBalance = new Prisma.Decimal(0)
  let totalOverdue = new Prisma.Decimal(0)
  let nextDueDate: Date | null = null
  let nextDueAmount: Prisma.Decimal | null = null

  for (const installment of installments) {
    const derived = deriveInstallmentState({
      adjustedAmount: installment.adjustedAmount,
      status: installment.status,
      cancelledAt: installment.cancelledAt,
      dueDate: installment.dueDate,
      payments: installment.payments,
    })

    if (installment.status !== 'CANCELLED') {
      totalPlanned = totalPlanned.plus(installment.adjustedAmount)
    }

    totalPaid = totalPaid.plus(derived.paidAmount)
    totalBalance = totalBalance.plus(derived.balance)

    if (derived.status === 'OVERDUE') {
      totalOverdue = totalOverdue.plus(derived.balance)
    }

    if (derived.balance.gt(0) && installment.dueDate >= today) {
      if (!nextDueDate || installment.dueDate < nextDueDate) {
        nextDueDate = installment.dueDate
        nextDueAmount = derived.balance
      }
    }
  }

  return {
    totalPlanned: totalPlanned.toDecimalPlaces(2).toString(),
    totalPaid: totalPaid.toDecimalPlaces(2).toString(),
    totalBalance: totalBalance.toDecimalPlaces(2).toString(),
    totalOverdue: totalOverdue.toDecimalPlaces(2).toString(),
    nextDueDate: nextDueDate ? toDateOnly(nextDueDate) : null,
    nextDueAmount: nextDueAmount ? nextDueAmount.toDecimalPlaces(2).toString() : null,
    hasDelinquency: totalOverdue.gt(0),
  }
}

function buildPreview(input: {
  installmentCount: number
  totalAmount: Prisma.Decimal
  firstDueDate: Date
  dueDay: number
}) {
  const schedule = buildInstallmentSchedule(input)

  return schedule.map((item) => ({
    number: item.number,
    dueDate: toDateOnly(item.dueDate),
    amount: item.adjustedAmount.toString(),
  }))
}

export async function previewFinancialPlanService(contractId: string, input: FinancialPlanInput) {
  const contract: any = await findContractForFinancialPlan(contractId)
  if (!contract) {
    throw new Error('Contrato nao encontrado.')
  }

  if (!allowedContractStatuses.has(contract.status)) {
    throw new Error('Plano financeiro so pode ser gerado para contratos assinados/ativos.')
  }

  const installmentCount = input.installmentCount ?? contract.durationMonths
  if (!Number.isInteger(installmentCount) || installmentCount <= 0 || installmentCount > 360) {
    throw new Error('Quantidade de parcelas invalida.')
  }

  const totalAmount = input.totalAmount
    ? parseMoney(input.totalAmount, 'Valor total do plano')
    : contract.totalValue.toDecimalPlaces(2)

  const dueDay = assertValidDueDay(input.dueDay ?? contract.dueDay)
  const firstDueDate = parseCivilDate(input.firstDueDate, 'do primeiro vencimento')

  const installments = buildPreview({
    installmentCount,
    totalAmount,
    firstDueDate,
    dueDay,
  })

  return {
    contractId,
    installmentCount,
    totalAmount: totalAmount.toString(),
    dueDay,
    firstDueDate: toDateOnly(firstDueDate),
    installments,
  }
}

export async function createFinancialPlanService(actor: AuthUser, contractId: string, input: FinancialPlanInput) {
  assertCanCreatePlan(actor)

  const contract: any = await findContractForFinancialPlan(contractId)
  if (!contract) {
    throw new Error('Contrato nao encontrado.')
  }

  if (!allowedContractStatuses.has(contract.status)) {
    throw new Error('Plano financeiro so pode ser gerado para contratos assinados/ativos.')
  }

  if (contract.financialPlan) {
    throw new Error('Plano financeiro ja existe para este contrato.')
  }

  const installmentCount = input.installmentCount ?? contract.durationMonths
  if (!Number.isInteger(installmentCount) || installmentCount <= 0 || installmentCount > 360) {
    throw new Error('Quantidade de parcelas invalida.')
  }

  const totalAmount = input.totalAmount
    ? parseMoney(input.totalAmount, 'Valor total do plano')
    : contract.totalValue.toDecimalPlaces(2)

  const dueDay = assertValidDueDay(input.dueDay ?? contract.dueDay)
  const firstDueDate = parseCivilDate(input.firstDueDate, 'do primeiro vencimento')

  const schedule = buildInstallmentSchedule({
    installmentCount,
    totalAmount,
    firstDueDate,
    dueDay,
  })

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const plan = await createFinancialPlan(
          {
            contractId,
            totalAmount,
            installmentCount,
            dueDay,
            firstDueDate,
            generationRule: 'EQUAL_INSTALLMENTS_WITH_REMAINDER_DISTRIBUTION',
            generatedByUserId: actor.id,
            notes: input.notes,
          },
          tx,
        )

        for (const item of schedule) {
          await createInstallment(
            {
              contractId,
              financialPlanId: plan.id,
              number: item.number,
              dueDate: item.dueDate,
              originalAmount: item.originalAmount,
              adjustedAmount: item.adjustedAmount,
              status: 'PENDING',
            },
            tx,
          )
        }

        await createAuditLog({
          actorUserId: actor.id,
          action: 'FINANCIAL_PLAN_CREATED',
          entity: 'ContractFinancialPlan',
          entityId: plan.id,
          metadata: {
            contractId,
            installmentCount,
            totalAmount: totalAmount.toString(),
            firstDueDate: toDateOnly(firstDueDate),
            dueDay,
          },
        })

        return plan
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    )

    return {
      plan: {
        ...result,
        totalAmount: result.totalAmount.toString(),
        firstDueDate: toDateOnly(result.firstDueDate),
        generatedAt: result.generatedAt.toISOString(),
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      },
      preview: schedule.map((item) => ({
        number: item.number,
        dueDate: toDateOnly(item.dueDate),
        amount: item.adjustedAmount.toString(),
      })),
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new Error('Plano financeiro ja existe para este contrato.')
    }

    throw error
  }
}

export async function getContractFinancialPlanService(contractId: string) {
  const plan = await findFinancialPlanByContract(contractId)

  if (!plan) {
    return null
  }

  const summary = await buildContractSummaryFromInstallments(contractId)

  return {
    ...plan,
    totalAmount: plan.totalAmount.toString(),
    firstDueDate: toDateOnly(plan.firstDueDate),
    generatedAt: plan.generatedAt.toISOString(),
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    summary,
  }
}

export async function listContractInstallmentsService(input: ListContractInstallmentsInput) {
  const where: Record<string, unknown> = {}

  if (input.status && input.status !== 'OVERDUE') {
    where.status = input.status
  }

  const [records, total] = await Promise.all([
    listInstallmentsByContract({
      contractId: input.contractId,
      where,
      skip: input.skip,
      take: input.take,
    }),
    countInstallmentsByContract(input.contractId, where),
  ])

  const mapped = records.map(mapInstallment)
  const filtered = input.status === 'OVERDUE' ? mapped.filter((item: any) => item.status === 'OVERDUE') : mapped

  const summary = buildSummaryFromInstallments(records)

  return {
    data: filtered,
    summary,
    pagination: makePagination(input.page, input.pageSize, input.status === 'OVERDUE' ? filtered.length : total),
  }
}

export async function getInstallmentByIdService(id: string) {
  const record = await findInstallmentById(id)

  if (!record) {
    return null
  }

  return mapInstallmentWithHistory(record)
}

export async function updateInstallmentService(actor: AuthUser, id: string, input: UpdateInstallmentInput) {
  assertCanUpdateInstallments(actor)

  const result = await prisma.$transaction(
    async (tx) => {
      const installment = await findInstallmentForUpdate(id, tx)

      if (!installment) {
        throw new Error('Parcela nao encontrada.')
      }

      if (installment.status === 'CANCELLED' || installment.cancelledAt) {
        throw new Error('Parcela cancelada nao pode ser editada.')
      }

      const validPaidAmount = getValidPaidAmount(installment.payments)
      const hasValidPayment = validPaidAmount.gt(0)

      const data: Record<string, unknown> = {}

      if (typeof input.description !== 'undefined') {
        data.description = input.description
      }

      if (input.dueDate) {
        if (hasValidPayment) {
          throw new Error('Nao e permitido alterar vencimento apos pagamento confirmado.')
        }
        data.dueDate = parseCivilDate(input.dueDate, 'de vencimento')
      }

      if (input.adjustedAmount) {
        if (hasValidPayment) {
          throw new Error('Nao e permitido alterar valor da parcela apos pagamento confirmado.')
        }

        const adjustedAmount = parseMoney(input.adjustedAmount, 'Valor ajustado')

        if (adjustedAmount.lt(validPaidAmount)) {
          throw new Error('Valor ajustado nao pode ser menor que o valor ja recebido.')
        }

        data.adjustedAmount = adjustedAmount
      }

      const updated = await updateInstallment(id, data, tx)

      await recomputeInstallmentState(id, tx)

      await createAuditLog({
        actorUserId: actor.id,
        action: 'INSTALLMENT_UPDATED',
        entity: 'Installment',
        entityId: id,
        metadata: {
          contractId: updated.contractId,
          updatedFields: Object.keys(data),
        },
      })

      const finalInstallment = await findInstallmentById(id, tx)
      if (!finalInstallment) {
        throw new Error('Parcela nao encontrada.')
      }

      return finalInstallment
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  )

  return mapInstallmentWithHistory(result)
}

export async function cancelInstallmentService(actor: AuthUser, id: string, input: CancelInstallmentInput) {
  assertCanCancelInstallments(actor)

  const result = await prisma.$transaction(
    async (tx) => {
      const installment = await findInstallmentForUpdate(id, tx)

      if (!installment) {
        throw new Error('Parcela nao encontrada.')
      }

      if (installment.status === 'CANCELLED') {
        throw new Error('Parcela ja cancelada.')
      }

      const validPaidAmount = getValidPaidAmount(installment.payments)
      if (validPaidAmount.gt(0)) {
        throw new Error('Nao e permitido cancelar parcela com pagamento confirmado. Realize estorno primeiro.')
      }

      const updated = await updateInstallment(
        id,
        {
          status: 'CANCELLED',
          cancellationReason: input.reason,
          cancelledAt: new Date(),
          cancelledByUserId: actor.id,
        },
        tx,
      )

      await createAuditLog({
        actorUserId: actor.id,
        action: 'INSTALLMENT_CANCELLED',
        entity: 'Installment',
        entityId: id,
        metadata: {
          contractId: updated.contractId,
          reason: input.reason,
        },
      })

      return updated
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  )

  return mapInstallmentWithHistory(result)
}

export async function listInstallmentPaymentsService(actor: AuthUser, installmentId: string) {
  assertCanReadPayments(actor)

  const installment = await findInstallmentById(installmentId)
  if (!installment) {
    throw new Error('Parcela nao encontrada.')
  }

  const payments = await listPaymentsByInstallment(installmentId)

  return {
    installment: mapInstallment(installment),
    data: payments.map(mapPayment),
  }
}

export async function recordInstallmentPaymentService(actor: AuthUser, installmentId: string, input: RecordPaymentInput) {
  assertCanCreatePayments(actor)

  const amount = parseMoney(input.amount, 'Valor do pagamento')
  const paidAt = parsePaidAt(input.paidAt)

  const result = await prisma.$transaction(
    async (tx) => {
      const installment = await findInstallmentForUpdate(installmentId, tx)

      if (!installment) {
        throw new Error('Parcela nao encontrada.')
      }

      if (installment.status === 'CANCELLED' || installment.cancelledAt) {
        throw new Error('Nao e permitido registrar pagamento em parcela cancelada.')
      }

      const derived = deriveInstallmentState({
        adjustedAmount: installment.adjustedAmount,
        status: installment.status,
        cancelledAt: installment.cancelledAt,
        dueDate: installment.dueDate,
        payments: installment.payments,
      })

      if (amount.gt(derived.balance)) {
        throw new Error('Valor do pagamento excede o saldo da parcela.')
      }

      if (input.chargeId) {
        const charge = await findChargeById(input.chargeId, tx)
        if (!charge || charge.installmentId !== installment.id) {
          throw new Error('Cobranca invalida para esta parcela.')
        }

        if (charge.status === 'CANCELLED') {
          throw new Error('Nao e permitido vincular pagamento a cobranca cancelada.')
        }
      }

      const payment = await createPayment(
        {
          installmentId,
          chargeId: input.chargeId,
          amount,
          paidAt,
          method: input.method,
          provider: input.provider,
          status: 'CONFIRMED',
          externalReference: input.externalReference,
          idempotencyKey: input.idempotencyKey,
          notes: input.notes,
          createdByUserId: actor.id,
        },
        tx,
      )

      if (input.chargeId) {
        await updateCharge(
          input.chargeId,
          {
            status: 'PAID',
          },
          tx,
        )
      }

      await recomputeInstallmentState(installmentId, tx)

      await createAuditLog({
        actorUserId: actor.id,
        action: 'PAYMENT_RECORDED',
        entity: 'Payment',
        entityId: payment.id,
        metadata: {
          installmentId,
          contractId: installment.contractId,
          amount: amount.toString(),
          method: input.method,
          provider: input.provider,
        },
      })

      return payment
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  )

  const installment = await getInstallmentByIdService(installmentId)

  return {
    payment: mapPayment(result),
    installment,
  }
}

export async function reversePaymentService(actor: AuthUser, paymentId: string, input: ReversePaymentInput) {
  assertCanReversePayments(actor)

  const payment = await prisma.$transaction(
    async (tx) => {
      const target = await findPaymentForReversal(paymentId, tx)

      if (!target) {
        throw new Error('Pagamento nao encontrado.')
      }

      if (target.reversedAt || target.status === 'REVERSED') {
        throw new Error('Pagamento ja estornado.')
      }

      const reversed = await updatePayment(
        paymentId,
        {
          status: 'REVERSED',
          reversedAt: new Date(),
          reversedByUser: {
            connect: {
              id: actor.id,
            },
          },
          reversalReason: input.reason,
        },
        tx,
      )

      await recomputeInstallmentState(target.installmentId, tx)

      await createAuditLog({
        actorUserId: actor.id,
        action: 'PAYMENT_REVERSED',
        entity: 'Payment',
        entityId: paymentId,
        metadata: {
          installmentId: target.installmentId,
          amount: target.amount.toString(),
          reason: input.reason,
        },
      })

      return reversed
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  )

  const installment = await getInstallmentByIdService(payment.installmentId)

  return {
    payment: mapPayment(payment),
    installment,
  }
}

export async function listInstallmentChargesService(actor: AuthUser, installmentId: string) {
  assertCanReadCharges(actor)

  const installment = await findInstallmentById(installmentId)
  if (!installment) {
    throw new Error('Parcela nao encontrada.')
  }

  const data = await listChargesByInstallment(installmentId)

  return {
    installment: mapInstallment(installment),
    data: data.map(mapCharge),
  }
}

export async function createInstallmentChargeService(actor: AuthUser, installmentId: string, input: CreateChargeInput) {
  assertCanCreateCharges(actor)

  const installment = await findInstallmentById(installmentId)

  if (!installment) {
    throw new Error('Parcela nao encontrada.')
  }

  const amount = parseMoney(input.amount, 'Valor da cobranca')
  const derived = deriveInstallmentState({
    adjustedAmount: installment.adjustedAmount,
    status: installment.status,
    cancelledAt: installment.cancelledAt,
    dueDate: installment.dueDate,
    payments: installment.payments,
  })

  if (amount.gt(derived.balance)) {
    throw new Error('Valor da cobranca excede o saldo da parcela.')
  }

  const charge = await createCharge({
    installmentId,
    provider: input.provider,
    method: input.method,
    status: 'PENDING',
    amount,
    externalId: input.externalId,
    idempotencyKey: input.idempotencyKey,
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'CHARGE_CREATED',
    entity: 'Charge',
    entityId: charge.id,
    metadata: {
      installmentId,
      amount: amount.toString(),
      provider: input.provider,
      method: input.method,
    },
  })

  return {
    charge: mapCharge(charge),
    installment: mapInstallment(installment),
  }
}

export async function cancelChargeService(actor: AuthUser, chargeId: string, input: CancelChargeInput) {
  assertCanCancelCharges(actor)

  const charge = await prisma.$transaction(
    async (tx) => {
      const target = await findChargeByIdForCancel(chargeId, tx)
      if (!target) {
        throw new Error('Cobranca nao encontrada.')
      }

      if (target.status === 'CANCELLED') {
        throw new Error('Cobranca ja cancelada.')
      }

      const hasConfirmedPayment = target.payments.some(
        (payment: any) => payment.status === 'CONFIRMED' && !payment.reversedAt,
      )

      if (hasConfirmedPayment) {
        throw new Error('Nao e permitido cancelar cobranca com pagamento confirmado vinculado.')
      }

      const cancelled = await updateCharge(
        chargeId,
        {
          status: 'CANCELLED',
        },
        tx,
      )

      await createAuditLog({
        actorUserId: actor.id,
        action: 'CHARGE_CANCELLED',
        entity: 'Charge',
        entityId: chargeId,
        metadata: {
          installmentId: target.installmentId,
          reason: input.reason ?? null,
        },
      })

      return cancelled
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  )

  return mapCharge(charge)
}

export async function getFinanceOverviewService(actor: AuthUser, month?: string) {
  assertCanReadFinance(actor)

  let monthStart: Date | null = null
  let monthEnd: Date | null = null

  if (month) {
    if (!monthRegex.test(month)) {
      throw new Error('Mes de referencia invalido. Use YYYY-MM.')
    }

    const [year, monthValue] = month.split('-').map(Number)
    monthStart = new Date(Date.UTC(year, monthValue - 1, 1, 0, 0, 0, 0))
    monthEnd = new Date(Date.UTC(year, monthValue, 0, 23, 59, 59, 999))
  }

  const installments = await listContractInstallmentsForOverview({})
  const today = todayUtcCivil()

  let expectedInMonth = new Prisma.Decimal(0)
  let receivedInMonth = new Prisma.Decimal(0)
  let receivable = new Prisma.Decimal(0)
  let overdue = new Prisma.Decimal(0)
  let nextDue: { dueDate: Date; balance: Prisma.Decimal; installmentId: string; contractNumber: string } | null = null

  for (const installment of installments) {
    const derived = deriveInstallmentState({
      adjustedAmount: installment.adjustedAmount,
      status: installment.status,
      cancelledAt: installment.cancelledAt,
      dueDate: installment.dueDate,
      payments: installment.payments,
    })

    if (installment.status !== 'CANCELLED') {
      receivable = receivable.plus(derived.balance)
    }

    if (derived.status === 'OVERDUE') {
      overdue = overdue.plus(derived.balance)
    }

    if (
      derived.balance.gt(0) &&
      installment.dueDate >= today &&
      (!nextDue || installment.dueDate < nextDue.dueDate)
    ) {
      nextDue = {
        dueDate: installment.dueDate,
        balance: derived.balance,
        installmentId: installment.id,
        contractNumber: installment.contract.contractNumber,
      }
    }

    if (monthStart && monthEnd && installment.dueDate >= monthStart && installment.dueDate <= monthEnd && installment.status !== 'CANCELLED') {
      expectedInMonth = expectedInMonth.plus(installment.adjustedAmount)
    }

    for (const payment of installment.payments) {
      if (payment.status !== 'CONFIRMED' || payment.reversedAt) {
        continue
      }

      if (!monthStart || !monthEnd || (payment.paidAt >= monthStart && payment.paidAt <= monthEnd)) {
        receivedInMonth = receivedInMonth.plus(payment.amount)
      }
    }
  }

  return {
    month: month ?? null,
    cards: {
      expectedInMonth: expectedInMonth.toDecimalPlaces(2).toString(),
      receivedInMonth: receivedInMonth.toDecimalPlaces(2).toString(),
      receivable: receivable.toDecimalPlaces(2).toString(),
      overdue: overdue.toDecimalPlaces(2).toString(),
      nextDue: nextDue
        ? {
            installmentId: nextDue.installmentId,
            contractNumber: nextDue.contractNumber,
            dueDate: toDateOnly(nextDue.dueDate),
            amount: nextDue.balance.toDecimalPlaces(2).toString(),
          }
        : null,
    },
  }
}

export async function listReceivablesService(actor: AuthUser, filters: ReceivablesFilters) {
  assertCanReadFinance(actor)

  const where: Record<string, unknown> = {
    contract: {
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.search
        ? {
            OR: [
              {
                contractNumber: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                title: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                client: {
                  OR: [
                    {
                      legalName: {
                        contains: filters.search,
                        mode: 'insensitive',
                      },
                    },
                    {
                      tradeName: {
                        contains: filters.search,
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              },
            ],
          }
        : {}),
    },
  }

  if (filters.status && filters.status !== 'OVERDUE') {
    where.status = filters.status
  }

  if (filters.dueDateFrom || filters.dueDateTo) {
    where.dueDate = {
      ...(filters.dueDateFrom ? { gte: parseCivilDate(filters.dueDateFrom, 'inicial') } : {}),
      ...(filters.dueDateTo ? { lte: parseCivilDate(filters.dueDateTo, 'final') } : {}),
    }
  }

  const [records, total] = await Promise.all([
    listReceivables({ where, skip: filters.skip, take: filters.take }),
    countReceivables(where),
  ])

  const mapped = records.map(mapInstallment)
  const filtered = filters.status === 'OVERDUE' ? mapped.filter((item: any) => item.status === 'OVERDUE') : mapped

  return {
    data: filtered,
    pagination: makePagination(filters.page, filters.pageSize, filters.status === 'OVERDUE' ? filtered.length : total),
  }
}

export async function getContractFinancialSummaryService(contractId: string) {
  const plan = await findFinancialPlanByContract(contractId)

  if (!plan) {
    return {
      hasPlan: false,
      plan: null,
      summary: null,
    }
  }

  const installments = await listInstallmentsByContract({
    contractId,
    skip: 0,
    take: 1000,
  })

  return {
    hasPlan: true,
    plan: {
      ...plan,
      totalAmount: plan.totalAmount.toString(),
      firstDueDate: toDateOnly(plan.firstDueDate),
      generatedAt: plan.generatedAt.toISOString(),
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    },
    summary: buildSummaryFromInstallments(installments),
  }
}

export async function listPortalFinanceService(input: PortalFinanceInput) {
  const records = await listPortalInstallmentsByClient(input.clientId, input.contractId)

  const mapped = records.map(mapInstallment)
  const groupedByContract = new Map<string, string>()

  for (const item of mapped) {
    if (!groupedByContract.has(item.contractId)) {
      groupedByContract.set(item.contractId, item.contract.contractNumber)
    }
  }

  const summary = buildSummaryFromInstallments(records)

  return {
    summary,
    contracts: Array.from(groupedByContract.entries()).map(([id, contractNumber]) => ({
      id,
      contractNumber,
    })),
    data: mapped,
  }
}
