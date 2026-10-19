/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from '@prisma/client'
import type { ChargeProvider, PaymentMethod } from '@gestao-sst/shared'
import type { AuthUser } from '../../plugins/auth.js'
import { prisma } from '../../lib/prisma.js'
import { env } from '../../config/env.js'
import { createAuditLog } from '../../shared/audit.js'
import { makePagination } from '../../shared/pagination.js'
import {
  createAnnualAdvanceCharge,
  createAnnualAdvanceExternalPayment,
  createAnnualAdvanceChargeInstallmentLinks,
  createWebhookEvent,
  countInstallmentsByContract,
  countReceivables,
  createCommercialCondition,
  createCharge,
  createFinancialPlan,
  createInstallment,
  createPayment,
  findAnnualAdvanceChargeByContractAndCondition,
  findAnnualAdvanceChargeById,
  findAnnualAdvanceChargeByIdempotencyKey,
  findAnnualAdvanceExternalPaymentByAnnualAdvanceChargeId,
  findAnnualAdvanceExternalPaymentByExternalPaymentId,
  findChargeById,
  findChargeByIdForCancel,
  findActiveCommercialConditionByContract,
  findContractForFinancialPlan,
  findFinancialPlanByContract,
  findInstallmentById,
  findInstallmentForUpdate,
  listActiveClientMembershipClientIds,
  findPaymentForReversal,
  getNextCommercialConditionVersion,
  hasBlockingAnnualAdvanceChargeForInstallment,
  listCommercialConditionsByContract,
  listAnnualAdvanceChargesByContract,
  listInstallmentsByCommercialCondition,
  listChargesByInstallment,
  listContractInstallmentsForOverview,
  listInstallmentsByContract,
  listPaymentsByIdempotencyKeys,
  listPaymentsByInstallment,
  listPortalInstallmentsByClient,
  listReceivables,
  findWebhookEventByDedupeKey,
  supersedeCommercialConditionsByContract,
  updateAnnualAdvanceExternalPayment,
  updateAnnualAdvanceCharge,
  updateCharge,
  updateInstallment,
  updatePayment,
  updateWebhookEvent,
  type ChargeRecord,
  type CommercialConditionRecord,
  type InstallmentRecord,
  type PaymentRecord,
} from './finance.repository.js'
import {
  applyCommercialConditionToForecast,
  type CommercialPaymentModality,
} from './commercial-terms-calculator.js'
import { buildContractForecast, deriveFirstDueDate } from './forecast-calculator.js'
import {
  createMercadoPagoCardPaymentLink as createMercadoPagoCardPaymentLinkGateway,
  createMercadoPagoPixPayment as createMercadoPagoPixPaymentGateway,
  getMercadoPagoPaymentById as getMercadoPagoPaymentByIdGateway,
  validateMercadoPagoWebhookSignature as validateMercadoPagoWebhookSignatureGateway,
} from './mercado-pago.gateway.js'

const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/
const monthRegex = /^\d{4}-\d{2}$/
const allowedContractStatuses = new Set(['SIGNED', 'ACTIVE', 'EXPIRING'])
const globalFinanceScopeRoles = new Set(['SUPER_ADMIN', 'ADMIN'])

type FinancialPlanInput = {
  installmentCount?: number
  totalAmount?: string
  dueDay?: number
  firstDueDate: string
  notes?: string
  commercialCondition?: {
    modality: CommercialPaymentModality
    discountPercent?: string
    discountFixedAmount?: string
    advanceMonths?: number
    coverageStartDate?: string
    commercialJustification: string
  }
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

type CreateChargePaymentLinkInput = {
  idempotencyKey: string
  title?: string
  payerEmail?: string
  successUrl?: string
  failureUrl?: string
  pendingUrl?: string
}

type ReversePaymentInput = {
  reason: string
}

type PortalFinanceInput = {
  clientId: string
  contractId?: string
}

type CreateAnnualAdvanceChargeInput = {
  dueDate: string
  idempotencyKey: string
  internalReference?: string
  notes?: string
}

type ConfirmAnnualAdvancePaymentInput = {
  paidAt?: string
  externalReference?: string
  notes?: string
}

type CancelAnnualAdvanceChargeInput = {
  reason: string
}

type FailAnnualAdvanceChargeInput = {
  reason: string
}

type ReverseAnnualAdvancePaymentInput = {
  reason: string
}

type CreateAnnualAdvancePixChargeInput = {
  idempotencyKey: string
  payerEmail?: string
  expiresAt?: string
}

type MercadoPagoWebhookInput = {
  topic?: string
  type?: string
  action?: string
  dataId?: string
  xSignature?: string | string[]
  xRequestId?: string | string[]
  payload?: Record<string, unknown>
}

type MercadoPagoGatewayBindings = {
  createCardPaymentLink: typeof createMercadoPagoCardPaymentLinkGateway
  createPixPayment: typeof createMercadoPagoPixPaymentGateway
  getPaymentById: typeof getMercadoPagoPaymentByIdGateway
  validateWebhookSignature: typeof validateMercadoPagoWebhookSignatureGateway
}

const defaultMercadoPagoGateway: MercadoPagoGatewayBindings = {
  createCardPaymentLink: createMercadoPagoCardPaymentLinkGateway,
  createPixPayment: createMercadoPagoPixPaymentGateway,
  getPaymentById: getMercadoPagoPaymentByIdGateway,
  validateWebhookSignature: validateMercadoPagoWebhookSignatureGateway,
}

let mercadoPagoGateway: MercadoPagoGatewayBindings = defaultMercadoPagoGateway

export function setMercadoPagoGatewayForTests(overrides: Partial<MercadoPagoGatewayBindings> | null) {
  mercadoPagoGateway = overrides
    ? {
        ...defaultMercadoPagoGateway,
        ...overrides,
      }
    : defaultMercadoPagoGateway
}

type ActiveCommercialCondition = {
  id: string
  version: number
  modality: CommercialPaymentModality
  paymentMethod: PaymentMethod
  discountPercent: string | null
  discountFixedAmount: string
  eligibleAmount: string
  discountAmount: string
  netAmount: string
  advanceMonths: number | null
  coverageStartDate: string | null
  coverageEndDate: string | null
  commercialJustification: string
  grantedByUserId: string
  createdAt: string
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

function parsePercentage(value: string, fieldName: string): Prisma.Decimal {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) {
    throw new Error(`${fieldName} invalido.`)
  }

  const decimal = new Prisma.Decimal(value).toDecimalPlaces(2)
  if (decimal.lt(0) || decimal.gt(100)) {
    throw new Error(`${fieldName} invalido.`)
  }

  return decimal
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

function parseOrDefaultFirstDueDate(value: string | undefined, contract: { startDate: Date; endDate: Date; dueDay: number }) {
  if (!value) {
    return deriveFirstDueDate(contract.startDate, contract.endDate, contract.dueDay)
  }

  return parseCivilDate(value, 'do primeiro vencimento')
}

function normalizeCommercialCondition(
  input: FinancialPlanInput['commercialCondition'] | undefined,
  contractPaymentMethod: PaymentMethod,
) {
  if (!input) {
    return null
  }

  const discountPercent = input.discountPercent
    ? parsePercentage(input.discountPercent, 'Percentual de desconto')
    : undefined

  const discountFixedAmount = input.discountFixedAmount
    ? parseMoney(input.discountFixedAmount, 'Valor fixo de desconto')
    : undefined

  if ((!discountPercent || discountPercent.eq(0)) && (!discountFixedAmount || discountFixedAmount.eq(0))) {
    throw new Error('Informe um desconto percentual ou fixo para a condicao comercial.')
  }

  return {
    modality: input.modality,
    paymentMethod: contractPaymentMethod,
    discountPercent,
    discountFixedAmount,
    advanceMonths: input.advanceMonths,
    coverageStartDate: input.coverageStartDate
      ? parseCivilDate(input.coverageStartDate, 'de inicio da cobertura')
      : undefined,
    commercialJustification: input.commercialJustification.trim(),
  }
}

function mapActiveCommercialCondition(record: CommercialConditionRecord | null): ActiveCommercialCondition | null {
  if (!record) {
    return null
  }

  return {
    id: record.id,
    version: record.version,
    modality: record.modality,
    paymentMethod: record.paymentMethod,
    discountPercent: record.discountPercent ? record.discountPercent.toString() : null,
    discountFixedAmount: record.discountFixedAmount.toString(),
    eligibleAmount: record.eligibleAmount.toString(),
    discountAmount: record.discountAmount.toString(),
    netAmount: record.netAmount.toString(),
    advanceMonths: record.advanceMonths,
    coverageStartDate: toIso(record.coverageStartDate),
    coverageEndDate: toIso(record.coverageEndDate),
    commercialJustification: record.commercialJustification,
    grantedByUserId: record.grantedByUserId,
    createdAt: record.createdAt.toISOString(),
  }
}

function buildFinancialForecast(input: {
  contract: { startDate: Date; endDate: Date; dueDay: number; durationMonths: number }
  firstDueDate?: string
  totalAmount: Prisma.Decimal
  installmentCount?: number
}) {
  const dueDay = assertValidDueDay(input.contract.dueDay)
  const firstDueDate = parseOrDefaultFirstDueDate(input.firstDueDate, {
    startDate: input.contract.startDate,
    endDate: input.contract.endDate,
    dueDay,
  })

  const forecast = buildContractForecast({
    startDate: input.contract.startDate,
    endDate: input.contract.endDate,
    dueDay,
    totalAmount: input.totalAmount,
    firstDueDate,
  })

  if (typeof input.installmentCount !== 'undefined' && input.installmentCount !== forecast.length) {
    throw new Error('Quantidade de parcelas informada nao e compativel com a vigencia e regra de vencimento.')
  }

  return {
    dueDay,
    firstDueDate,
    forecast,
  }
}

function deriveInstallmentForecastMetadata(record: InstallmentRecord) {
  const cycleEndDate = record.dueDate
  const previousCycleDueDate = addMonthsWithDay(cycleEndDate, -1, record.contract.dueDay)
  const cycleStartDate = new Date(previousCycleDueDate)
  cycleStartDate.setUTCDate(cycleStartDate.getUTCDate() + 1)

  const referenceStartDate = record.contract.startDate > cycleStartDate ? record.contract.startDate : cycleStartDate
  const referenceEndDate = record.contract.endDate < cycleEndDate ? record.contract.endDate : cycleEndDate

  const cycleDays = Math.max(1, Math.floor((cycleEndDate.getTime() - cycleStartDate.getTime()) / 86400000) + 1)
  const coveredDays = Math.max(1, Math.floor((referenceEndDate.getTime() - referenceStartDate.getTime()) / 86400000) + 1)
  const chargeType = coveredDays === cycleDays ? 'INTEGRAL' : 'PROPORCIONAL'

  return {
    cycleStartDate,
    cycleEndDate,
    referenceStartDate,
    referenceEndDate,
    cycleDays,
    coveredDays,
    chargeType,
    proportion: `${coveredDays}/${cycleDays}`,
  }
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

function mapAnnualAdvanceCharge(record: any) {
  const isOverdue = record.billingStatus === 'PENDING_PAYMENT' && record.dueDate < todayUtcCivil()
  const effectiveBillingStatus = isOverdue ? 'OVERDUE' : record.billingStatus

  return {
    id: record.id,
    contractId: record.contractId,
    commercialConditionId: record.commercialConditionId,
    referenceCode: record.referenceCode,
    idempotencyKey: record.idempotencyKey,
    internalReference: record.internalReference,
    paymentMethod: record.paymentMethod,
    grossAmount: record.grossAmount.toString(),
    discountAmount: record.discountAmount.toString(),
    netAmount: record.netAmount.toString(),
    coverageStartDate: toDateOnly(record.coverageStartDate),
    coverageEndDate: toDateOnly(record.coverageEndDate),
    dueDate: toDateOnly(record.dueDate),
    billingStatus: record.billingStatus,
    effectiveBillingStatus,
    paymentStatus: record.paymentStatus,
    paidAt: toIso(record.paidAt),
    cancelledAt: toIso(record.cancelledAt),
    failedAt: toIso(record.failedAt),
    reversedAt: toIso(record.reversedAt),
    createdByUserId: record.createdByUserId,
    confirmedByUserId: record.confirmedByUserId,
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    installments: (record.installmentLinks ?? []).map((link: any) => ({
      installmentId: link.installmentId,
      installmentNumber: link.installment.number,
      dueDate: toDateOnly(link.installment.dueDate),
      allocatedAmount: link.allocatedAmount.toString(),
      installmentStatus: link.installment.status,
    })),
    commercialCondition: record.commercialCondition
      ? {
          id: record.commercialCondition.id,
          version: record.commercialCondition.version,
          modality: record.commercialCondition.modality,
          paymentMethod: record.commercialCondition.paymentMethod,
          discountPercent: record.commercialCondition.discountPercent
            ? record.commercialCondition.discountPercent.toString()
            : null,
          discountFixedAmount: record.commercialCondition.discountFixedAmount.toString(),
          eligibleAmount: record.commercialCondition.eligibleAmount.toString(),
          discountAmount: record.commercialCondition.discountAmount.toString(),
          netAmount: record.commercialCondition.netAmount.toString(),
          advanceMonths: record.commercialCondition.advanceMonths,
          coverageStartDate: record.commercialCondition.coverageStartDate
            ? toDateOnly(record.commercialCondition.coverageStartDate)
            : null,
          coverageEndDate: record.commercialCondition.coverageEndDate
            ? toDateOnly(record.commercialCondition.coverageEndDate)
            : null,
          commercialJustification: record.commercialCondition.commercialJustification,
          grantedByUserId: record.commercialCondition.grantedByUserId,
          isActive: record.commercialCondition.isActive,
        }
      : null,
    externalPayment: record.externalPayment
      ? {
          id: record.externalPayment.id,
          provider: record.externalPayment.provider,
          integrationStatus: record.externalPayment.integrationStatus,
          externalPaymentId: record.externalPayment.externalPaymentId,
          externalOrderId: record.externalPayment.externalOrderId,
          externalReference: record.externalPayment.externalReference,
          externalIdempotencyKey: record.externalPayment.externalIdempotencyKey,
          lastProviderStatus: record.externalPayment.lastProviderStatus,
          lastProviderStatusDetail: record.externalPayment.lastProviderStatusDetail,
          lastProviderStatusAt: toIso(record.externalPayment.lastProviderStatusAt),
          lastWebhookAt: toIso(record.externalPayment.lastWebhookAt),
          lastSyncedAt: toIso(record.externalPayment.lastSyncedAt),
          lastErrorCode: record.externalPayment.lastErrorCode,
          lastErrorMessage: record.externalPayment.lastErrorMessage,
          createdAt: record.externalPayment.createdAt.toISOString(),
          updatedAt: record.externalPayment.updatedAt.toISOString(),
        }
      : null,
  }
}

function mapInstallment(record: InstallmentRecord) {
  const forecastMetadata = deriveInstallmentForecastMetadata(record)
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
    referenceStartDate: toDateOnly(forecastMetadata.referenceStartDate),
    referenceEndDate: toDateOnly(forecastMetadata.referenceEndDate),
    cycleStartDate: toDateOnly(forecastMetadata.cycleStartDate),
    cycleEndDate: toDateOnly(forecastMetadata.cycleEndDate),
    cycleDays: forecastMetadata.cycleDays,
    coveredDays: forecastMetadata.coveredDays,
    chargeType: forecastMetadata.chargeType,
    proportion: forecastMetadata.proportion,
    originalAmount: record.originalAmount.toString(),
    adjustedAmount: record.adjustedAmount.toString(),
    discountAllocatedAmount: record.discountAllocatedAmount.toString(),
    coveredByAdvance: record.coveredByAdvance,
    commercialConditionId: record.commercialConditionId,
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

function assertCanManageCommercial(actor: AuthUser) {
  if (!actor.permissions.includes('finance.commercial.manage')) {
    throw new Error('Acesso negado para condicoes comerciais.')
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

async function resolveActorFinanceScopeClientIds(
  actor: AuthUser,
  tx?: Prisma.TransactionClient,
): Promise<Set<string> | null> {
  if (globalFinanceScopeRoles.has(actor.role)) {
    return null
  }

  if (actor.role === 'CLIENT') {
    throw new Error('Acesso negado para operacao administrativa financeira.')
  }

  const clientIds = await listActiveClientMembershipClientIds(actor.id, tx)
  if (clientIds.length === 0) {
    throw new Error('Acesso negado ao escopo financeiro do usuario.')
  }

  return new Set<string>(clientIds as string[])
}

function assertClientInFinanceScope(
  scopeClientIds: Set<string> | null,
  clientId: string,
  notFoundMessage: string,
) {
  if (!scopeClientIds) {
    return
  }

  if (!scopeClientIds.has(clientId)) {
    throw new Error(notFoundMessage)
  }
}

async function getContractForFinanceScopeOrThrow(
  actor: AuthUser,
  contractId: string,
  tx?: Prisma.TransactionClient,
  notFoundMessage = 'Contrato nao encontrado.',
) {
  const contract = await findContractForFinancialPlan(contractId, tx)
  if (!contract) {
    throw new Error(notFoundMessage)
  }

  const scopeClientIds = await resolveActorFinanceScopeClientIds(actor, tx)
  assertClientInFinanceScope(scopeClientIds, contract.clientId, notFoundMessage)

  return contract
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

export async function previewFinancialPlanService(actor: AuthUser, contractId: string, input: FinancialPlanInput) {
  assertCanCreatePlan(actor)
  assertCanManageCommercial(actor)

  const contract: any = await getContractForFinanceScopeOrThrow(actor, contractId)

  if (!allowedContractStatuses.has(contract.status)) {
    throw new Error('Plano financeiro so pode ser gerado para contratos assinados/ativos.')
  }

  const totalAmount = input.totalAmount
    ? parseMoney(input.totalAmount, 'Valor total do plano')
    : contract.totalValue.toDecimalPlaces(2)

  const forecastData = buildFinancialForecast({
    contract: {
      startDate: contract.startDate,
      endDate: contract.endDate,
      dueDay: input.dueDay ?? contract.dueDay,
      durationMonths: contract.durationMonths,
    },
    firstDueDate: input.firstDueDate,
    totalAmount,
    installmentCount: input.installmentCount,
  })

  const commercialCondition = normalizeCommercialCondition(input.commercialCondition, contract.paymentMethod)
  const commercialComputation = commercialCondition
    ? applyCommercialConditionToForecast(forecastData.forecast, {
        modality: commercialCondition.modality,
        paymentMethod: commercialCondition.paymentMethod,
        discountPercent: commercialCondition.discountPercent,
        discountFixedAmount: commercialCondition.discountFixedAmount,
        advanceMonths: commercialCondition.advanceMonths,
        coverageStartDate: commercialCondition.coverageStartDate,
      })
    : null

  const allocationsByNumber = new Map(
    (commercialComputation?.allocations ?? []).map((item) => [item.number, item]),
  )

  const installments = forecastData.forecast.map((item) => {
    const allocation = allocationsByNumber.get(item.number)

    return {
      number: item.number,
      dueDate: toDateOnly(item.dueDate),
      amount: item.amount.toString(),
      adjustedAmount: allocation ? allocation.adjustedAmount.toString() : item.amount.toString(),
      discountAllocatedAmount: allocation ? allocation.discountAllocatedAmount.toString() : '0.00',
      coveredByAdvance: allocation ? allocation.coveredByAdvance : false,
      referenceStartDate: toDateOnly(item.referenceStartDate),
      referenceEndDate: toDateOnly(item.referenceEndDate),
      chargeType: item.chargeType,
      proportion: item.proportion,
    }
  })

  const summary = forecastData.forecast.reduce(
    (acc, item) => {
      acc.total = acc.total.plus(item.amount)
      if (item.chargeType === 'PROPORCIONAL') {
        acc.proportionalCount += 1
      }
      return acc
    },
    {
      total: new Prisma.Decimal(0),
      proportionalCount: 0,
    },
  )

  return {
    contractId,
    installmentCount: forecastData.forecast.length,
    totalAmount: totalAmount.toString(),
    dueDay: forecastData.dueDay,
    firstDueDate: toDateOnly(forecastData.firstDueDate),
    generationFormula:
      'valor_parcela = valor_total * (dias_cobertos_periodo / dias_totais_periodo) normalizado para soma exata em centavos',
    proportionalCount: summary.proportionalCount,
    totalPlanned: summary.total.toDecimalPlaces(2).toString(),
    commercialCondition: commercialComputation
      ? {
          modality: commercialComputation.modality,
          paymentMethod: commercialComputation.paymentMethod,
          eligibleAmount: commercialComputation.eligibleAmount.toString(),
          discountAmount: commercialComputation.discountAmount.toString(),
          netAmount: commercialComputation.netAmount.toString(),
          coverageStartDate: commercialComputation.coverageStartDate
            ? toDateOnly(commercialComputation.coverageStartDate)
            : null,
          coverageEndDate: commercialComputation.coverageEndDate
            ? toDateOnly(commercialComputation.coverageEndDate)
            : null,
          advanceMonths: commercialCondition?.advanceMonths ?? null,
          justification: commercialCondition?.commercialJustification ?? null,
        }
      : null,
    installments,
  }
}

export async function createFinancialPlanService(actor: AuthUser, contractId: string, input: FinancialPlanInput) {
  assertCanCreatePlan(actor)

  const contract: any = await getContractForFinanceScopeOrThrow(actor, contractId)

  if (!allowedContractStatuses.has(contract.status)) {
    throw new Error('Plano financeiro so pode ser gerado para contratos assinados/ativos.')
  }

  if (contract.financialPlan) {
    throw new Error('Plano financeiro ja existe para este contrato.')
  }

  const totalAmount = input.totalAmount
    ? parseMoney(input.totalAmount, 'Valor total do plano')
    : contract.totalValue.toDecimalPlaces(2)

  const forecastData = buildFinancialForecast({
    contract: {
      startDate: contract.startDate,
      endDate: contract.endDate,
      dueDay: input.dueDay ?? contract.dueDay,
      durationMonths: contract.durationMonths,
    },
    firstDueDate: input.firstDueDate,
    totalAmount,
    installmentCount: input.installmentCount,
  })

  const commercialCondition = normalizeCommercialCondition(input.commercialCondition, contract.paymentMethod)
  const commercialComputation = commercialCondition
    ? applyCommercialConditionToForecast(forecastData.forecast, {
        modality: commercialCondition.modality,
        paymentMethod: commercialCondition.paymentMethod,
        discountPercent: commercialCondition.discountPercent,
        discountFixedAmount: commercialCondition.discountFixedAmount,
        advanceMonths: commercialCondition.advanceMonths,
        coverageStartDate: commercialCondition.coverageStartDate,
      })
    : null

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        let persistedCommercialCondition: CommercialConditionRecord | null = null

        if (commercialCondition && commercialComputation) {
          const version = await getNextCommercialConditionVersion(contractId, tx)
          await supersedeCommercialConditionsByContract(contractId, tx)

          persistedCommercialCondition = await createCommercialCondition(
            {
              contractId,
              version,
              modality: commercialComputation.modality,
              paymentMethod: commercialComputation.paymentMethod,
              discountPercent: commercialCondition.discountPercent,
              discountFixedAmount: commercialCondition.discountFixedAmount ?? new Prisma.Decimal(0),
              eligibleAmount: commercialComputation.eligibleAmount,
              discountAmount: commercialComputation.discountAmount,
              netAmount: commercialComputation.netAmount,
              advanceMonths: commercialCondition.advanceMonths,
              coverageStartDate: commercialComputation.coverageStartDate,
              coverageEndDate: commercialComputation.coverageEndDate,
              commercialJustification: commercialCondition.commercialJustification,
              grantedByUserId: actor.id,
              isActive: true,
            },
            tx,
          )
        }

        const plan = await createFinancialPlan(
          {
            contractId,
            totalAmount,
            installmentCount: forecastData.forecast.length,
            dueDay: forecastData.dueDay,
            firstDueDate: forecastData.firstDueDate,
            generationRule: 'MONTHLY_PRORATA_BY_COVERED_DAYS_WITH_EXACT_CENTS',
            generatedByUserId: actor.id,
            notes: input.notes,
          },
          tx,
        )

        const allocationsByNumber = new Map(
          (commercialComputation?.allocations ?? []).map((item) => [item.number, item]),
        )

        for (const item of forecastData.forecast) {
          const allocation = allocationsByNumber.get(item.number)

          await createInstallment(
            {
              contractId,
              financialPlanId: plan.id,
              number: item.number,
              dueDate: item.dueDate,
              originalAmount: item.amount,
              adjustedAmount: allocation ? allocation.adjustedAmount : item.amount,
              discountAllocatedAmount: allocation ? allocation.discountAllocatedAmount : new Prisma.Decimal(0),
              coveredByAdvance: allocation ? allocation.coveredByAdvance : false,
              commercialConditionId: persistedCommercialCondition?.id,
              status: 'PENDING',
              description: `Periodo ${toDateOnly(item.referenceStartDate)} a ${toDateOnly(item.referenceEndDate)} | ${item.chargeType} (${item.proportion})`,
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
            installmentCount: forecastData.forecast.length,
            totalAmount: totalAmount.toString(),
            firstDueDate: toDateOnly(forecastData.firstDueDate),
            dueDay: forecastData.dueDay,
            formula: 'valor_parcela = valor_total * (dias_cobertos_periodo / dias_totais_periodo) com distribuicao exata de centavos',
            commercialConditionId: persistedCommercialCondition?.id ?? null,
          },
        })

        if (persistedCommercialCondition) {
          await createAuditLog({
            actorUserId: actor.id,
            action: 'CONTRACT_COMMERCIAL_CONDITION_APPLIED',
            entity: 'ContractCommercialCondition',
            entityId: persistedCommercialCondition.id,
            metadata: {
              contractId,
              version: persistedCommercialCondition.version,
              modality: persistedCommercialCondition.modality,
              paymentMethod: persistedCommercialCondition.paymentMethod,
              eligibleAmount: persistedCommercialCondition.eligibleAmount.toString(),
              discountAmount: persistedCommercialCondition.discountAmount.toString(),
              netAmount: persistedCommercialCondition.netAmount.toString(),
              advanceMonths: persistedCommercialCondition.advanceMonths,
              gatewayPreparation: {
                provider: 'MERCADO_PAGO',
                action: 'PREFERENCE_ONLY',
              },
            },
          })
        }

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
      preview: forecastData.forecast.map((item) => ({
        number: item.number,
        dueDate: toDateOnly(item.dueDate),
        amount: item.amount.toString(),
        adjustedAmount:
          commercialComputation?.allocations.find((allocation) => allocation.number === item.number)?.adjustedAmount.toString() ??
          item.amount.toString(),
        discountAllocatedAmount:
          commercialComputation?.allocations.find((allocation) => allocation.number === item.number)?.discountAllocatedAmount.toString() ??
          '0.00',
        coveredByAdvance:
          commercialComputation?.allocations.find((allocation) => allocation.number === item.number)?.coveredByAdvance ?? false,
        referenceStartDate: toDateOnly(item.referenceStartDate),
        referenceEndDate: toDateOnly(item.referenceEndDate),
        chargeType: item.chargeType,
        proportion: item.proportion,
      })),
      commercialCondition: commercialComputation
        ? {
            modality: commercialComputation.modality,
            paymentMethod: commercialComputation.paymentMethod,
            eligibleAmount: commercialComputation.eligibleAmount.toString(),
            discountAmount: commercialComputation.discountAmount.toString(),
            netAmount: commercialComputation.netAmount.toString(),
            coverageStartDate: commercialComputation.coverageStartDate
              ? toDateOnly(commercialComputation.coverageStartDate)
              : null,
            coverageEndDate: commercialComputation.coverageEndDate
              ? toDateOnly(commercialComputation.coverageEndDate)
              : null,
            advanceMonths: commercialCondition?.advanceMonths ?? null,
            justification: commercialCondition?.commercialJustification ?? null,
          }
        : null,
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

export async function ensureFinancialPlanForContractService(actor: AuthUser, contractId: string) {
  const contract: any = await getContractForFinanceScopeOrThrow(actor, contractId)

  if (!allowedContractStatuses.has(contract.status)) {
    return {
      created: false,
      reason: 'status_not_eligible' as const,
    }
  }

  const existing = await findFinancialPlanByContract(contractId)
  if (existing) {
    return {
      created: false,
      reason: 'already_exists' as const,
      planId: existing.id,
    }
  }

  const actorWithFinancePermission: AuthUser = actor.permissions.includes('finance.plan.create')
    ? actor
    : {
        id: actor.id,
        role: actor.role,
        permissions: [...actor.permissions, 'finance.plan.create'],
      }

  const generated = await createFinancialPlanService(actorWithFinancePermission, contractId, {
    firstDueDate: toDateOnly(deriveFirstDueDate(contract.startDate, contract.endDate, contract.dueDay)),
  })

  return {
    created: true,
    reason: 'created' as const,
    planId: generated.plan.id,
  }
}

export async function getContractFinancialPlanService(actor: AuthUser, contractId: string) {
  assertCanReadFinance(actor)
  await getContractForFinanceScopeOrThrow(actor, contractId)

  const [plan, commercialCondition, annualAdvanceCharges] = await Promise.all([
    findFinancialPlanByContract(contractId),
    findActiveCommercialConditionByContract(contractId),
    listAnnualAdvanceChargesByContract(contractId),
  ])

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
    commercialCondition: mapActiveCommercialCondition(commercialCondition),
    annualAdvanceCharges: annualAdvanceCharges.map(mapAnnualAdvanceCharge),
    summary,
  }
}

export async function listContractInstallmentsService(actor: AuthUser, input: ListContractInstallmentsInput) {
  assertCanReadFinance(actor)
  await getContractForFinanceScopeOrThrow(actor, input.contractId)

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

export async function getInstallmentByIdService(actor: AuthUser, id: string) {
  assertCanReadFinance(actor)

  const scopeClientIds = await resolveActorFinanceScopeClientIds(actor)
  const record = await findInstallmentById(id)

  if (!record) {
    return null
  }

  assertClientInFinanceScope(scopeClientIds, record.contract.clientId, 'Parcela nao encontrada.')

  return mapInstallmentWithHistory(record)
}

export async function updateInstallmentService(actor: AuthUser, id: string, input: UpdateInstallmentInput) {
  assertCanUpdateInstallments(actor)

  const scopeClientIds = await resolveActorFinanceScopeClientIds(actor)

  const result = await prisma.$transaction(
    async (tx) => {
      const installment = await findInstallmentForUpdate(id, tx)

      if (!installment) {
        throw new Error('Parcela nao encontrada.')
      }

      assertClientInFinanceScope(scopeClientIds, installment.contract.clientId, 'Parcela nao encontrada.')

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

  const scopeClientIds = await resolveActorFinanceScopeClientIds(actor)

  const result = await prisma.$transaction(
    async (tx) => {
      const installment = await findInstallmentForUpdate(id, tx)

      if (!installment) {
        throw new Error('Parcela nao encontrada.')
      }

      assertClientInFinanceScope(scopeClientIds, installment.contract.clientId, 'Parcela nao encontrada.')

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

  const scopeClientIds = await resolveActorFinanceScopeClientIds(actor)
  const installment = await findInstallmentById(installmentId)
  if (!installment) {
    throw new Error('Parcela nao encontrada.')
  }

  assertClientInFinanceScope(scopeClientIds, installment.contract.clientId, 'Parcela nao encontrada.')

  const payments = await listPaymentsByInstallment(installmentId)

  return {
    installment: mapInstallment(installment),
    data: payments.map(mapPayment),
  }
}

export async function recordInstallmentPaymentService(actor: AuthUser, installmentId: string, input: RecordPaymentInput) {
  assertCanCreatePayments(actor)

  const scopeClientIds = await resolveActorFinanceScopeClientIds(actor)

  const amount = parseMoney(input.amount, 'Valor do pagamento')
  const paidAt = parsePaidAt(input.paidAt)

  const result = await prisma.$transaction(
    async (tx) => {
      const installment = await findInstallmentForUpdate(installmentId, tx)

      if (!installment) {
        throw new Error('Parcela nao encontrada.')
      }

      assertClientInFinanceScope(scopeClientIds, installment.contract.clientId, 'Parcela nao encontrada.')

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

  const installment = await getInstallmentByIdService(actor, installmentId)

  return {
    payment: mapPayment(result),
    installment,
  }
}

export async function reversePaymentService(actor: AuthUser, paymentId: string, input: ReversePaymentInput) {
  assertCanReversePayments(actor)

  const scopeClientIds = await resolveActorFinanceScopeClientIds(actor)

  const payment = await prisma.$transaction(
    async (tx) => {
      const target = await findPaymentForReversal(paymentId, tx)

      if (!target) {
        throw new Error('Pagamento nao encontrado.')
      }

      assertClientInFinanceScope(scopeClientIds, target.installment.contract.clientId, 'Pagamento nao encontrado.')

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

  const installment = await getInstallmentByIdService(actor, payment.installmentId)

  return {
    payment: mapPayment(payment),
    installment,
  }
}

export async function listInstallmentChargesService(actor: AuthUser, installmentId: string) {
  assertCanReadCharges(actor)

  const scopeClientIds = await resolveActorFinanceScopeClientIds(actor)
  const installment = await findInstallmentById(installmentId)
  if (!installment) {
    throw new Error('Parcela nao encontrada.')
  }

  assertClientInFinanceScope(scopeClientIds, installment.contract.clientId, 'Parcela nao encontrada.')

  const data = await listChargesByInstallment(installmentId)

  return {
    installment: mapInstallment(installment),
    data: data.map(mapCharge),
  }
}

export async function createInstallmentChargeService(actor: AuthUser, installmentId: string, input: CreateChargeInput) {
  assertCanCreateCharges(actor)

  const scopeClientIds = await resolveActorFinanceScopeClientIds(actor)

  const installment = await findInstallmentById(installmentId)

  if (!installment) {
    throw new Error('Parcela nao encontrada.')
  }

  assertClientInFinanceScope(scopeClientIds, installment.contract.clientId, 'Parcela nao encontrada.')

  const blockingAdvanceCharge = await hasBlockingAnnualAdvanceChargeForInstallment(installmentId)
  if (blockingAdvanceCharge) {
    throw new Error(
      `Parcela vinculada a antecipacao anual (${blockingAdvanceCharge.referenceCode}) com status ${blockingAdvanceCharge.billingStatus}. Regularize a antecipacao antes de emitir cobranca mensal.`,
    )
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

export async function createChargeCardPaymentLinkService(actor: AuthUser, chargeId: string, input: CreateChargePaymentLinkInput) {
  assertCanCreateCharges(actor)

  const scopeClientIds = await resolveActorFinanceScopeClientIds(actor)
  const charge = await findChargeById(chargeId)

  if (!charge) {
    throw new Error('Cobranca nao encontrada.')
  }

  assertClientInFinanceScope(scopeClientIds, charge.installment.contract.clientId, 'Cobranca nao encontrada.')

  if (charge.method !== 'CREDIT_CARD') {
    throw new Error('Link de pagamento disponivel somente para cobranca com metodo CREDIT_CARD.')
  }

  if (charge.status !== 'PENDING') {
    throw new Error('Somente cobranca pendente pode gerar link de pagamento.')
  }

  const paymentLink = await mercadoPagoGateway.createCardPaymentLink({
    amount: Number(charge.amount.toString()),
    externalReference: charge.externalId ?? `CHARGE-${charge.id}`,
    title: input.title ?? `Cobranca ${charge.id}`,
    idempotencyKey: input.idempotencyKey,
    notificationUrl: env.MERCADO_PAGO_WEBHOOK_NOTIFICATION_URL,
    payerEmail: input.payerEmail,
    successUrl: input.successUrl,
    failureUrl: input.failureUrl,
    pendingUrl: input.pendingUrl,
  })

  await createAuditLog({
    actorUserId: actor.id,
    action: 'CHARGE_CARD_PAYMENT_LINK_CREATED',
    entity: 'Charge',
    entityId: charge.id,
    metadata: {
      provider: 'MERCADO_PAGO',
      preferenceId: paymentLink.preferenceId,
      externalReference: charge.externalId ?? `CHARGE-${charge.id}`,
      idempotencyKey: input.idempotencyKey,
    },
  })

  return {
    charge: mapCharge(charge),
    paymentLink,
  }
}

export async function cancelChargeService(actor: AuthUser, chargeId: string, input: CancelChargeInput) {
  assertCanCancelCharges(actor)

  const scopeClientIds = await resolveActorFinanceScopeClientIds(actor)

  const charge = await prisma.$transaction(
    async (tx) => {
      const target = await findChargeByIdForCancel(chargeId, tx)
      if (!target) {
        throw new Error('Cobranca nao encontrada.')
      }

      assertClientInFinanceScope(scopeClientIds, target.installment.contract.clientId, 'Cobranca nao encontrada.')

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

function buildAdvancePaymentIdempotencyKey(annualAdvanceChargeId: string, installmentId: string) {
  return `annual-advance:${annualAdvanceChargeId}:${installmentId}`
}

function sumPaymentAmounts(payments: Array<{ amount: Prisma.Decimal }>) {
  return payments.reduce((acc, payment) => acc.plus(payment.amount), new Prisma.Decimal(0)).toDecimalPlaces(2)
}

function sumAllocatedAmounts(links: Array<{ allocatedAmount: Prisma.Decimal }>) {
  return links.reduce((acc, link) => acc.plus(link.allocatedAmount), new Prisma.Decimal(0)).toDecimalPlaces(2)
}

function parseExpirationAt(value?: string): string | undefined {
  if (!value) {
    return undefined
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Data de expiracao do PIX invalida.')
  }

  return parsed.toISOString()
}

function mapProviderToIntegrationStatus(status: string | null):
  | 'PENDING_PROVIDER'
  | 'PENDING_RECONCILIATION'
  | 'CONFIRMED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED' {
  if (!status) {
    return 'PENDING_RECONCILIATION'
  }

  if (status === 'approved') {
    return 'CONFIRMED'
  }

  if (status === 'refunded' || status === 'charged_back') {
    return 'REFUNDED'
  }

  if (status === 'cancelled') {
    return 'CANCELLED'
  }

  if (status === 'rejected') {
    return 'FAILED'
  }

  if (status === 'in_process' || status === 'authorized' || status === 'in_mediation') {
    return 'PENDING_RECONCILIATION'
  }

  return 'PENDING_PROVIDER'
}

function buildWebhookDedupeKey(input: {
  provider: 'MERCADO_PAGO'
  dataId?: string
  eventId?: string
  xRequestId?: string
  action?: string
  topic?: string
}) {
  const base = [
    input.provider,
    input.dataId ?? '',
    input.eventId ?? '',
    input.xRequestId ?? '',
    input.action ?? '',
    input.topic ?? '',
  ].join(':')

  return base
}

async function applyAnnualAdvanceStateFromProvider(
  tx: Prisma.TransactionClient,
  actorUserId: string | null,
  annualAdvanceChargeId: string,
  providerStatus: string | null,
  providerStatusDetail: string | null,
) {
  const charge = await findAnnualAdvanceChargeById(annualAdvanceChargeId, tx)
  if (!charge) {
    throw new Error('Cobranca anual consolidada nao encontrada para reconciliacao externa.')
  }

  if (providerStatus === 'approved') {
    await ensureAnnualAdvancePaymentsConfirmedByProvider(tx, charge.id)

    if (charge.paymentStatus !== 'CONFIRMED' || charge.billingStatus !== 'PAID') {
      await updateAnnualAdvanceCharge(
        charge.id,
        {
          billingStatus: 'PAID',
          paymentStatus: 'CONFIRMED',
          paidAt: charge.paidAt ?? new Date(),
        },
        tx,
      )
    }

    return
  }

  if (providerStatus === 'cancelled') {
    if (charge.paymentStatus === 'CONFIRMED' || charge.billingStatus === 'PAID') {
      return
    }

    await updateAnnualAdvanceCharge(
      charge.id,
      {
        billingStatus: 'CANCELLED',
        cancelledAt: charge.cancelledAt ?? new Date(),
      },
      tx,
    )

    return
  }

  if (providerStatus === 'rejected') {
    if (charge.paymentStatus === 'CONFIRMED' || charge.billingStatus === 'PAID') {
      return
    }

    await updateAnnualAdvanceCharge(
      charge.id,
      {
        billingStatus: 'FAILED',
        failedAt: charge.failedAt ?? new Date(),
      },
      tx,
    )

    return
  }

  if (providerStatus === 'refunded' || providerStatus === 'charged_back') {
    await updateAnnualAdvanceCharge(
      charge.id,
      {
        billingStatus: 'REVERSED',
        paymentStatus: 'REVERSED',
        reversedAt: charge.reversedAt ?? new Date(),
      },
      tx,
    )

    return
  }

  await createAuditLog({
    actorUserId,
    action: 'ANNUAL_ADVANCE_EXTERNAL_STATUS_IGNORED',
    entity: 'AnnualAdvanceCharge',
    entityId: charge.id,
    metadata: {
      provider: 'MERCADO_PAGO',
      providerStatus,
      providerStatusDetail,
    },
  })
}

async function ensureAnnualAdvancePaymentsConfirmedByProvider(
  tx: Prisma.TransactionClient,
  annualAdvanceChargeId: string,
) {
  const target = await findAnnualAdvanceChargeById(annualAdvanceChargeId, tx)
  if (!target) {
    throw new Error('Cobranca anual consolidada nao encontrada para quitacao externa.')
  }

  const paymentKeys = target.installmentLinks.map((link: any) =>
    buildAdvancePaymentIdempotencyKey(target.id, link.installmentId),
  )

  const existingPayments = await listPaymentsByIdempotencyKeys(paymentKeys, tx)
  const expectedNetAmount = target.netAmount.toDecimalPlaces(2)

  if (existingPayments.length === paymentKeys.length) {
    const confirmedAmount = sumPaymentAmounts(
      existingPayments.filter((payment: any) => payment.status === 'CONFIRMED' && !payment.reversedAt),
    )

    if (!confirmedAmount.eq(expectedNetAmount)) {
      throw new Error('Valor confirmado da antecipacao anual diverge do valor liquido esperado.')
    }

    return
  }

  if (existingPayments.length > 0) {
    throw new Error('Pagamentos parciais encontrados para antecipacao anual em reconciliacao externa.')
  }

  for (const link of target.installmentLinks) {
    await createPayment(
      {
        installmentId: link.installmentId,
        amount: link.allocatedAmount,
        paidAt: new Date(),
        method: 'PIX',
        provider: 'MANUAL',
        status: 'CONFIRMED',
        idempotencyKey: buildAdvancePaymentIdempotencyKey(target.id, link.installmentId),
        notes: `Quitacao por confirmacao externa ${target.referenceCode}`,
        createdByUserId: target.createdByUserId,
      },
      tx,
    )

    await recomputeInstallmentState(link.installmentId, tx)
  }
}

export async function createAnnualAdvanceChargeService(
  actor: AuthUser,
  contractId: string,
  input: CreateAnnualAdvanceChargeInput,
) {
  assertCanManageCommercial(actor)

  const dueDate = parseCivilDate(input.dueDate, 'de vencimento')

  const contract = await getContractForFinanceScopeOrThrow(actor, contractId)

  const [plan, activeCommercialCondition] = await Promise.all([
    findFinancialPlanByContract(contractId),
    findActiveCommercialConditionByContract(contractId),
  ])

  if (!plan) {
    throw new Error('Plano financeiro nao encontrado para o contrato.')
  }

  if (!activeCommercialCondition || activeCommercialCondition.modality !== 'ANNUAL_PIX_ADVANCE') {
    throw new Error('Nao existe condicao comercial anual ativa para antecipacao.')
  }

  if (activeCommercialCondition.paymentMethod !== 'PIX') {
    throw new Error('Cobranca consolidada anual exige condicao comercial com pagamento via PIX.')
  }

  if (activeCommercialCondition.netAmount.lte(0)) {
    throw new Error('Valor liquido da antecipacao anual invalido.')
  }

  const coveredInstallments: InstallmentRecord[] = await listInstallmentsByCommercialCondition(
    contractId,
    activeCommercialCondition.id,
  )

  if (coveredInstallments.length === 0) {
    throw new Error('Nenhuma parcela coberta por antecipacao foi encontrada para a condicao ativa.')
  }

  const coveredTotal = coveredInstallments.reduce(
    (acc: Prisma.Decimal, installment: InstallmentRecord) => acc.plus(installment.adjustedAmount),
    new Prisma.Decimal(0),
  ).toDecimalPlaces(2)

  if (!coveredTotal.eq(activeCommercialCondition.netAmount.toDecimalPlaces(2))) {
    throw new Error('Parcelas cobertas nao fecham com o valor liquido negociado para antecipacao.')
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const existingByIdempotency = await findAnnualAdvanceChargeByIdempotencyKey(input.idempotencyKey, tx)
      if (existingByIdempotency) {
        return {
          charge: existingByIdempotency,
          replay: true,
        }
      }

      const existingByCondition = await findAnnualAdvanceChargeByContractAndCondition(
        contractId,
        activeCommercialCondition.id,
        tx,
      )

      if (existingByCondition) {
        throw new Error('Cobranca consolidada anual ja existe para a versao comercial ativa do contrato.')
      }

      const referenceCode = `ADV-${contract.contractNumber}-V${activeCommercialCondition.version}`

      const created = await createAnnualAdvanceCharge(
        {
          contractId,
          commercialConditionId: activeCommercialCondition.id,
          referenceCode,
          idempotencyKey: input.idempotencyKey,
          internalReference: input.internalReference,
          paymentMethod: 'PIX',
          grossAmount: activeCommercialCondition.eligibleAmount,
          discountAmount: activeCommercialCondition.discountAmount,
          netAmount: activeCommercialCondition.netAmount,
          coverageStartDate: activeCommercialCondition.coverageStartDate,
          coverageEndDate: activeCommercialCondition.coverageEndDate,
          dueDate,
          billingStatus: 'PENDING_PAYMENT',
          paymentStatus: 'NOT_CONFIRMED',
          createdByUserId: actor.id,
          notes: input.notes,
        },
        tx,
      )

      await createAnnualAdvanceChargeInstallmentLinks(
        coveredInstallments.map((installment: InstallmentRecord) => ({
          annualAdvanceChargeId: created.id,
          installmentId: installment.id,
          allocatedAmount: installment.adjustedAmount,
        })),
        tx,
      )

      const fresh = await findAnnualAdvanceChargeById(created.id, tx)
      if (!fresh) {
        throw new Error('Falha ao materializar cobranca anual consolidada.')
      }

      await createAuditLog({
        actorUserId: actor.id,
        action: 'ANNUAL_ADVANCE_CHARGE_CREATED',
        entity: 'AnnualAdvanceCharge',
        entityId: fresh.id,
        metadata: {
          contractId,
          commercialConditionId: activeCommercialCondition.id,
          referenceCode: fresh.referenceCode,
          grossAmount: fresh.grossAmount.toString(),
          discountAmount: fresh.discountAmount.toString(),
          netAmount: fresh.netAmount.toString(),
          dueDate: toDateOnly(fresh.dueDate),
          coverageStartDate: toDateOnly(fresh.coverageStartDate),
          coverageEndDate: toDateOnly(fresh.coverageEndDate),
          installmentIds: fresh.installmentLinks.map((link: any) => link.installmentId),
          gatewayPreparation: {
            provider: 'MERCADO_PAGO',
            action: 'PIX_ONE_TIME_PENDING_INTEGRATION',
          },
        },
      })

      return {
        charge: fresh,
        replay: false,
      }
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  )

  return {
    charge: mapAnnualAdvanceCharge(result.charge),
    idempotencyReplay: result.replay,
  }
}

export async function createAnnualAdvancePixChargeService(
  actor: AuthUser,
  annualAdvanceChargeId: string,
  input: CreateAnnualAdvancePixChargeInput,
) {
  assertCanManageCommercial(actor)

  const scopeClientIds = await resolveActorFinanceScopeClientIds(actor)

  const result = await prisma.$transaction(
    async (tx) => {
      const target = await findAnnualAdvanceChargeById(annualAdvanceChargeId, tx)
      if (!target) {
        throw new Error('Cobranca anual consolidada nao encontrada.')
      }

      assertClientInFinanceScope(scopeClientIds, target.contract.clientId, 'Cobranca anual consolidada nao encontrada.')

      if (target.paymentMethod !== 'PIX') {
        throw new Error('Integracao externa disponivel somente para cobranca anual via PIX.')
      }

      if (target.billingStatus !== 'PENDING_PAYMENT' || target.paymentStatus !== 'NOT_CONFIRMED') {
        throw new Error('Somente cobranca anual pendente pode iniciar cobranca PIX externa.')
      }

      let externalPayment = await findAnnualAdvanceExternalPaymentByAnnualAdvanceChargeId(target.id, tx)
      if (externalPayment && externalPayment.externalIdempotencyKey === input.idempotencyKey && externalPayment.externalPaymentId) {
        const fresh = await findAnnualAdvanceChargeById(target.id, tx)
        return {
          charge: fresh,
          idempotencyReplay: true,
          pix: null,
        }
      }

      const externalReference = externalPayment?.externalReference ?? target.referenceCode
      const payerEmail = input.payerEmail ?? env.MERCADO_PAGO_TEST_PAYER_EMAIL
      if (!payerEmail) {
        throw new Error('Informe payerEmail ou configure MERCADO_PAGO_TEST_PAYER_EMAIL.')
      }

      const providerPayment = await mercadoPagoGateway.createPixPayment({
        amount: Number(target.netAmount.toString()),
        externalReference,
        payerEmail,
        description: `Antecipacao anual ${target.referenceCode}`,
        idempotencyKey: input.idempotencyKey,
        notificationUrl: env.MERCADO_PAGO_WEBHOOK_NOTIFICATION_URL,
        dateOfExpiration: parseExpirationAt(input.expiresAt),
      })

      const nextIntegrationStatus = mapProviderToIntegrationStatus(providerPayment.status)

      if (!externalPayment) {
        externalPayment = await createAnnualAdvanceExternalPayment(
          {
            annualAdvanceChargeId: target.id,
            provider: 'MERCADO_PAGO',
            integrationStatus: nextIntegrationStatus,
            externalPaymentId: providerPayment.id,
            externalReference,
            externalIdempotencyKey: input.idempotencyKey,
            lastProviderStatus: providerPayment.status,
            lastProviderStatusDetail: providerPayment.statusDetail,
            lastProviderStatusAt: new Date(),
            lastSyncedAt: new Date(),
          },
          tx,
        )
      } else {
        externalPayment = await updateAnnualAdvanceExternalPayment(
          externalPayment.id,
          {
            integrationStatus: nextIntegrationStatus,
            externalPaymentId: providerPayment.id,
            externalIdempotencyKey: input.idempotencyKey,
            lastProviderStatus: providerPayment.status,
            lastProviderStatusDetail: providerPayment.statusDetail,
            lastProviderStatusAt: new Date(),
            lastSyncedAt: new Date(),
            lastErrorCode: null,
            lastErrorMessage: null,
          },
          tx,
        )
      }

      await applyAnnualAdvanceStateFromProvider(
        tx,
        actor.id,
        target.id,
        providerPayment.status,
        providerPayment.statusDetail,
      )

      const fresh = await findAnnualAdvanceChargeById(target.id, tx)

      await createAuditLog({
        actorUserId: actor.id,
        action: 'ANNUAL_ADVANCE_PIX_EXTERNAL_CREATED',
        entity: 'AnnualAdvanceCharge',
        entityId: target.id,
        metadata: {
          provider: 'MERCADO_PAGO',
          externalPaymentId: providerPayment.id,
          externalReference,
          providerStatus: providerPayment.status,
          providerStatusDetail: providerPayment.statusDetail,
          integrationStatus: externalPayment.integrationStatus,
        },
      })

      return {
        charge: fresh,
        idempotencyReplay: false,
        pix: providerPayment,
      }
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  )

  return {
    charge: mapAnnualAdvanceCharge(result.charge),
    idempotencyReplay: result.idempotencyReplay,
    pix: result.pix,
  }
}

export async function processMercadoPagoWebhookService(input: MercadoPagoWebhookInput) {
  const dataId = input.dataId?.trim()
  if (!dataId) {
    return {
      acknowledged: true,
      reason: 'missing_data_id',
    }
  }

  mercadoPagoGateway.validateWebhookSignature({
    xSignature: input.xSignature,
    xRequestId: input.xRequestId,
    dataId,
  })

  const eventId = typeof input.payload?.id === 'string' ? input.payload.id : undefined
  const dedupeKey = buildWebhookDedupeKey({
    provider: 'MERCADO_PAGO',
    dataId,
    eventId,
    xRequestId: Array.isArray(input.xRequestId) ? input.xRequestId[0] : input.xRequestId,
    action: input.action,
    topic: input.topic ?? input.type,
  })

  await prisma.$transaction(
    async (tx) => {
      const existingEvent = await findWebhookEventByDedupeKey(dedupeKey, tx)
      if (existingEvent) {
        return
      }

      const createdEvent = await createWebhookEvent(
        {
          provider: 'MERCADO_PAGO',
          topic: input.topic ?? input.type,
          action: input.action,
          eventId,
          resourceId: dataId,
          xRequestId: Array.isArray(input.xRequestId) ? input.xRequestId[0] : input.xRequestId,
          signatureTs: Array.isArray(input.xSignature) ? input.xSignature[0] : input.xSignature,
          dedupeKey,
          payload: (input.payload ?? {}) as Prisma.InputJsonValue,
          processingStatus: 'RECEIVED',
        },
        tx,
      )

      try {
        const providerPayment = await mercadoPagoGateway.getPaymentById(dataId)
        if (!providerPayment.id) {
          throw new Error('Webhook sem identificador de pagamento valido no provedor.')
        }

        const externalPayment = await findAnnualAdvanceExternalPaymentByExternalPaymentId(
          'MERCADO_PAGO',
          providerPayment.id,
          tx,
        )

        if (!externalPayment) {
          await updateWebhookEvent(
            createdEvent.id,
            {
              processingStatus: 'IGNORED',
              processingError: 'Pagamento externo nao mapeado para antecipacao anual.',
              processedAt: new Date(),
            },
            tx,
          )

          return
        }

        const integrationStatus = mapProviderToIntegrationStatus(providerPayment.status)

        await updateAnnualAdvanceExternalPayment(
          externalPayment.id,
          {
            integrationStatus,
            lastProviderStatus: providerPayment.status,
            lastProviderStatusDetail: providerPayment.statusDetail,
            lastProviderStatusAt: new Date(),
            lastWebhookAt: new Date(),
            lastSyncedAt: new Date(),
            lastErrorCode: null,
            lastErrorMessage: null,
          },
          tx,
        )

        await applyAnnualAdvanceStateFromProvider(
          tx,
          null,
          externalPayment.annualAdvanceChargeId,
          providerPayment.status,
          providerPayment.statusDetail,
        )

        await updateWebhookEvent(
          createdEvent.id,
          {
            processingStatus: 'PROCESSED',
            processedAt: new Date(),
            annualAdvanceExternalPaymentId: externalPayment.id,
          },
          tx,
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao processar webhook Mercado Pago.'

        await updateWebhookEvent(
          createdEvent.id,
          {
            processingStatus: 'FAILED',
            processingError: message,
            processedAt: new Date(),
          },
          tx,
        )

        throw error
      }
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  )

  return {
    acknowledged: true,
  }
}

export async function confirmAnnualAdvanceChargePaymentService(
  actor: AuthUser,
  annualAdvanceChargeId: string,
  input: ConfirmAnnualAdvancePaymentInput,
) {
  assertCanManageCommercial(actor)
  assertCanCreatePayments(actor)

  const scopeClientIds = await resolveActorFinanceScopeClientIds(actor)

  const paidAt = input.paidAt ? parsePaidAt(input.paidAt) : new Date()

  let result: { charge: any; replay: boolean }

  try {
    result = await prisma.$transaction(
      async (tx) => {
        const target = await findAnnualAdvanceChargeById(annualAdvanceChargeId, tx)

        if (!target) {
          throw new Error('Cobranca anual consolidada nao encontrada.')
        }

        assertClientInFinanceScope(scopeClientIds, target.contract.clientId, 'Cobranca anual consolidada nao encontrada.')

        if (target.commercialCondition.contractId !== target.contractId) {
          throw new Error('Cobranca anual consolidada inconsistente com o contrato/condicao comercial.')
        }

        if (!target.installmentLinks.length) {
          throw new Error('Cobranca anual consolidada sem parcelas vinculadas.')
        }

        const allocatedTotal = sumAllocatedAmounts(target.installmentLinks)
        const expectedNetAmount = target.netAmount.toDecimalPlaces(2)
        if (!allocatedTotal.eq(expectedNetAmount)) {
          throw new Error('Valor alocado das parcelas difere do valor liquido da obrigacao anual.')
        }

        const paymentKeys = target.installmentLinks.map((link: any) =>
          buildAdvancePaymentIdempotencyKey(target.id, link.installmentId),
        )

        const existingPayments = await listPaymentsByIdempotencyKeys(paymentKeys, tx)

        if (target.paymentStatus === 'CONFIRMED' && target.billingStatus === 'PAID') {
          if (existingPayments.length !== paymentKeys.length) {
            throw new Error('Cobranca anual marcada como paga sem todos os pagamentos vinculados.')
          }

          const confirmedAmount = sumPaymentAmounts(
            existingPayments.filter((payment: any) => payment.status === 'CONFIRMED' && !payment.reversedAt),
          )

          if (!confirmedAmount.eq(expectedNetAmount)) {
            throw new Error('Cobranca anual marcada como paga com valor confirmado divergente.')
          }

          return {
            charge: target,
            replay: true,
          }
        }

        if (target.billingStatus === 'CANCELLED' || target.billingStatus === 'FAILED' || target.billingStatus === 'REVERSED') {
          throw new Error('Cobranca anual consolidada nao pode ser confirmada no status atual.')
        }

        if (target.paymentMethod !== 'PIX') {
          throw new Error('Confirmacao de antecipacao anual requer cobranca PIX.')
        }

        if (existingPayments.length > 0) {
          const allPaymentsPresent = existingPayments.length === paymentKeys.length
          const allStillConfirmed = existingPayments.every(
            (payment: any) => payment.status === 'CONFIRMED' && !payment.reversedAt,
          )
          const confirmedAmount = sumPaymentAmounts(existingPayments)

          if (allPaymentsPresent && allStillConfirmed && confirmedAmount.eq(expectedNetAmount)) {
            const replayUpdated = await updateAnnualAdvanceCharge(
              target.id,
              {
                billingStatus: 'PAID',
                paymentStatus: 'CONFIRMED',
                paidAt,
                confirmedByUser: {
                  connect: {
                    id: actor.id,
                  },
                },
                notes: input.notes ?? target.notes,
              },
              tx,
            )

            return {
              charge: replayUpdated,
              replay: true,
            }
          }

          throw new Error('Foram encontrados pagamentos parciais/invalidos para a antecipacao anual. Regularizacao manual necessaria.')
        }

        for (const link of target.installmentLinks) {
          const currentInstallment = await findInstallmentForUpdate(link.installmentId, tx)
          if (!currentInstallment || currentInstallment.contractId !== target.contractId) {
            throw new Error('Parcela vinculada a antecipacao anual esta inconsistente com o contrato.')
          }

          await createPayment(
            {
              installmentId: link.installmentId,
              amount: link.allocatedAmount,
              paidAt,
              method: 'PIX',
              provider: 'MANUAL',
              status: 'CONFIRMED',
              idempotencyKey: buildAdvancePaymentIdempotencyKey(target.id, link.installmentId),
              notes: input.notes ?? `Quitacao por antecipacao anual ${target.referenceCode}`,
              createdByUserId: actor.id,
            },
            tx,
          )

          await recomputeInstallmentState(link.installmentId, tx)
        }

        const updated = await updateAnnualAdvanceCharge(
          target.id,
          {
            billingStatus: 'PAID',
            paymentStatus: 'CONFIRMED',
            paidAt,
            confirmedByUser: {
              connect: {
                id: actor.id,
              },
            },
            notes: input.notes ?? target.notes,
          },
          tx,
        )

        await createAuditLog({
          actorUserId: actor.id,
          action: 'ANNUAL_ADVANCE_PAYMENT_CONFIRMED',
          entity: 'AnnualAdvanceCharge',
          entityId: updated.id,
          metadata: {
            contractId: updated.contractId,
            referenceCode: updated.referenceCode,
            paymentStatus: updated.paymentStatus,
            billingStatus: updated.billingStatus,
            paidAt: paidAt.toISOString(),
            externalReference: input.externalReference ?? null,
            confirmedAmount: expectedNetAmount.toString(),
          },
        })

        return {
          charge: updated,
          replay: false,
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    )
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2002' || error.code === 'P2034')) {
      const current = await findAnnualAdvanceChargeById(annualAdvanceChargeId)
      if (current && current.billingStatus === 'PAID' && current.paymentStatus === 'CONFIRMED') {
        return {
          charge: mapAnnualAdvanceCharge(current),
          idempotencyReplay: true,
        }
      }
      throw new Error('Conflito de concorrencia na confirmacao da antecipacao anual. Tente novamente.')
    }

    throw error
  }

  return {
    charge: mapAnnualAdvanceCharge(result.charge),
    idempotencyReplay: result.replay,
  }
}

export async function cancelAnnualAdvanceChargeService(
  actor: AuthUser,
  annualAdvanceChargeId: string,
  input: CancelAnnualAdvanceChargeInput,
) {
  assertCanManageCommercial(actor)

  const scopeClientIds = await resolveActorFinanceScopeClientIds(actor)

  const updated = await prisma.$transaction(
    async (tx) => {
      const target = await findAnnualAdvanceChargeById(annualAdvanceChargeId, tx)
      if (!target) {
        throw new Error('Cobranca anual consolidada nao encontrada.')
      }

      assertClientInFinanceScope(scopeClientIds, target.contract.clientId, 'Cobranca anual consolidada nao encontrada.')

      if (target.paymentStatus === 'CONFIRMED' || target.billingStatus === 'PAID') {
        throw new Error('Nao e permitido cancelar cobranca anual ja quitada. Realize estorno primeiro.')
      }

      if (target.billingStatus === 'CANCELLED') {
        throw new Error('Cobranca anual consolidada ja cancelada.')
      }

      const cancelled = await updateAnnualAdvanceCharge(
        annualAdvanceChargeId,
        {
          billingStatus: 'CANCELLED',
          cancelledAt: new Date(),
        },
        tx,
      )

      await createAuditLog({
        actorUserId: actor.id,
        action: 'ANNUAL_ADVANCE_CHARGE_CANCELLED',
        entity: 'AnnualAdvanceCharge',
        entityId: cancelled.id,
        metadata: {
          contractId: cancelled.contractId,
          referenceCode: cancelled.referenceCode,
          reason: input.reason,
        },
      })

      return cancelled
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  )

  return mapAnnualAdvanceCharge(updated)
}

export async function failAnnualAdvanceChargeService(
  actor: AuthUser,
  annualAdvanceChargeId: string,
  input: FailAnnualAdvanceChargeInput,
) {
  assertCanManageCommercial(actor)

  const scopeClientIds = await resolveActorFinanceScopeClientIds(actor)

  const failed = await prisma.$transaction(
    async (tx) => {
      const target = await findAnnualAdvanceChargeById(annualAdvanceChargeId, tx)
      if (!target) {
        throw new Error('Cobranca anual consolidada nao encontrada.')
      }

      assertClientInFinanceScope(scopeClientIds, target.contract.clientId, 'Cobranca anual consolidada nao encontrada.')

      if (target.paymentStatus === 'CONFIRMED' || target.billingStatus === 'PAID') {
        throw new Error('Nao e permitido marcar como falha uma cobranca anual ja quitada.')
      }

      if (target.billingStatus === 'FAILED') {
        throw new Error('Cobranca anual consolidada ja esta em falha.')
      }

      const updated = await updateAnnualAdvanceCharge(
        annualAdvanceChargeId,
        {
          billingStatus: 'FAILED',
          failedAt: new Date(),
        },
        tx,
      )

      await createAuditLog({
        actorUserId: actor.id,
        action: 'ANNUAL_ADVANCE_CHARGE_FAILED',
        entity: 'AnnualAdvanceCharge',
        entityId: updated.id,
        metadata: {
          contractId: updated.contractId,
          referenceCode: updated.referenceCode,
          reason: input.reason,
        },
      })

      return updated
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  )

  return mapAnnualAdvanceCharge(failed)
}

export async function reverseAnnualAdvancePaymentService(
  actor: AuthUser,
  annualAdvanceChargeId: string,
  input: ReverseAnnualAdvancePaymentInput,
) {
  assertCanManageCommercial(actor)
  assertCanReversePayments(actor)

  const scopeClientIds = await resolveActorFinanceScopeClientIds(actor)

  const reversed = await prisma.$transaction(
    async (tx) => {
      const target = await findAnnualAdvanceChargeById(annualAdvanceChargeId, tx)
      if (!target) {
        throw new Error('Cobranca anual consolidada nao encontrada.')
      }

      assertClientInFinanceScope(scopeClientIds, target.contract.clientId, 'Cobranca anual consolidada nao encontrada.')

      if (target.billingStatus === 'REVERSED' && target.paymentStatus === 'REVERSED') {
        return {
          charge: target,
          replay: true,
        }
      }

      if (target.paymentStatus !== 'CONFIRMED' || target.billingStatus !== 'PAID') {
        throw new Error('Somente cobranca anual quitada pode ser estornada.')
      }

      const paymentKeys = target.installmentLinks.map((link: any) =>
        buildAdvancePaymentIdempotencyKey(target.id, link.installmentId),
      )

      const payments = await listPaymentsByIdempotencyKeys(paymentKeys, tx)

      if (payments.length !== paymentKeys.length) {
        throw new Error('Pagamentos vinculados da antecipacao anual estao incompletos para estorno seguro.')
      }

      const nonReversed = payments.filter((payment: any) => !payment.reversedAt && payment.status !== 'REVERSED')
      const confirmedTotal = sumPaymentAmounts(nonReversed)
      const expectedNetAmount = target.netAmount.toDecimalPlaces(2)

      if (!confirmedTotal.eq(expectedNetAmount)) {
        throw new Error('Valor confirmado para estorno diverge do valor liquido da obrigacao anual.')
      }

      for (const payment of payments) {
        if (payment.reversedAt || payment.status === 'REVERSED') {
          continue
        }

        await updatePayment(
          payment.id,
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

        await recomputeInstallmentState(payment.installmentId, tx)
      }

      const updated = await updateAnnualAdvanceCharge(
        target.id,
        {
          billingStatus: 'REVERSED',
          paymentStatus: 'REVERSED',
          reversedAt: new Date(),
        },
        tx,
      )

      await createAuditLog({
        actorUserId: actor.id,
        action: 'ANNUAL_ADVANCE_PAYMENT_REVERSED',
        entity: 'AnnualAdvanceCharge',
        entityId: updated.id,
        metadata: {
          contractId: updated.contractId,
          referenceCode: updated.referenceCode,
          reason: input.reason,
          reversedPaymentsCount: nonReversed.length,
          reversedAmount: confirmedTotal.toString(),
        },
      })

      return {
        charge: updated,
        replay: false,
      }
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  )

  return {
    charge: mapAnnualAdvanceCharge(reversed.charge),
    idempotencyReplay: reversed.replay,
  }
}

export async function listContractCommercialHistoryService(actor: AuthUser, contractId: string) {
  assertCanReadFinance(actor)
  await getContractForFinanceScopeOrThrow(actor, contractId)

  const [activeCondition, annualAdvanceCharges, commercialConditions] = await Promise.all([
    findActiveCommercialConditionByContract(contractId),
    listAnnualAdvanceChargesByContract(contractId),
    listCommercialConditionsByContract(contractId),
  ])

  const historyByCondition = new Map<string, any[]>()

  for (const charge of annualAdvanceCharges) {
    const list = historyByCondition.get(charge.commercialConditionId) ?? []
    list.push(mapAnnualAdvanceCharge(charge))
    historyByCondition.set(charge.commercialConditionId, list)
  }

  const versionedConditions = commercialConditions
    .sort((a: any, b: any) => b.version - a.version)
    .map((condition: any) => ({
      id: condition.id,
      version: condition.version,
      modality: condition.modality,
      paymentMethod: condition.paymentMethod,
      discountPercent: condition.discountPercent ? condition.discountPercent.toString() : null,
      discountFixedAmount: condition.discountFixedAmount.toString(),
      eligibleAmount: condition.eligibleAmount.toString(),
      discountAmount: condition.discountAmount.toString(),
      netAmount: condition.netAmount.toString(),
      advanceMonths: condition.advanceMonths,
      coverageStartDate: condition.coverageStartDate ? toDateOnly(condition.coverageStartDate) : null,
      coverageEndDate: condition.coverageEndDate ? toDateOnly(condition.coverageEndDate) : null,
      commercialJustification: condition.commercialJustification,
      grantedByUserId: condition.grantedByUserId,
      createdAt: condition.createdAt.toISOString(),
      status: activeCondition?.id === condition.id ? 'CURRENT' : 'SUPERSEDED',
      annualAdvanceCharges: historyByCondition.get(condition.id) ?? [],
    }))

  return {
    contractId,
    currentConditionId: activeCondition?.id ?? null,
    versions: versionedConditions,
  }
}

export async function getFinanceOverviewService(actor: AuthUser, month?: string) {
  assertCanReadFinance(actor)

  const scopeClientIds = await resolveActorFinanceScopeClientIds(actor)

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

  const installments = await listContractInstallmentsForOverview(
    scopeClientIds
      ? {
          contract: {
            clientId: {
              in: Array.from(scopeClientIds),
            },
          },
        }
      : {},
  )
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

  const scopeClientIds = await resolveActorFinanceScopeClientIds(actor)

  if (scopeClientIds && filters.clientId && !scopeClientIds.has(filters.clientId)) {
    throw new Error('Acesso negado ao escopo financeiro solicitado.')
  }

  const clientIdFilter = scopeClientIds
    ? filters.clientId ?? undefined
    : filters.clientId

  const where: Record<string, unknown> = {
    contract: {
      ...(scopeClientIds
        ? {
            clientId: clientIdFilter
              ? clientIdFilter
              : {
                  in: Array.from(scopeClientIds),
                },
          }
        : {}),
      ...(!scopeClientIds && filters.clientId ? { clientId: filters.clientId } : {}),
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

export async function getContractFinancialSummaryService(actor: AuthUser, contractId: string) {
  assertCanReadFinance(actor)
  await getContractForFinanceScopeOrThrow(actor, contractId)

  const [plan, commercialCondition, annualAdvanceCharges] = await Promise.all([
    findFinancialPlanByContract(contractId),
    findActiveCommercialConditionByContract(contractId),
    listAnnualAdvanceChargesByContract(contractId),
  ])

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
      commercialCondition: mapActiveCommercialCondition(commercialCondition),
      annualAdvanceCharges: annualAdvanceCharges.map(mapAnnualAdvanceCharge),
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
