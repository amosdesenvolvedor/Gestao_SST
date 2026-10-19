import type { ChargeProvider, PaymentMethod, PaymentStatus } from '@gestao-sst/shared'

export type FinanceInstallmentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED'

export type FinanceInstallment = {
  id: string
  contractId: string
  financialPlanId: string
  number: number
  dueDate: string
  referenceStartDate: string
  referenceEndDate: string
  cycleStartDate: string
  cycleEndDate: string
  cycleDays: number
  coveredDays: number
  chargeType: 'INTEGRAL' | 'PROPORCIONAL'
  proportion: string
  originalAmount: string
  adjustedAmount: string
  discountAllocatedAmount: string
  coveredByAdvance: boolean
  commercialConditionId: string | null
  paidAmount: string
  balance: string
  status: FinanceInstallmentStatus
  persistedStatus: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED'
  description: string | null
  cancellationReason: string | null
  cancelledAt: string | null
  cancelledByUserId: string | null
  createdAt: string
  updatedAt: string
  contract: {
    id: string
    clientId: string
    contractNumber: string
    title: string
    status: string
    client: {
      id: string
      legalName: string
      tradeName: string | null
    }
  }
}

export type FinanceSummary = {
  totalPlanned: string
  totalPaid: string
  totalBalance: string
  totalOverdue: string
  nextDueDate: string | null
  nextDueAmount: string | null
  hasDelinquency: boolean
}

export type AnnualAdvanceCharge = {
  id: string
  contractId: string
  commercialConditionId: string
  referenceCode: string
  idempotencyKey: string
  internalReference: string | null
  paymentMethod: PaymentMethod
  grossAmount: string
  discountAmount: string
  netAmount: string
  coverageStartDate: string
  coverageEndDate: string
  dueDate: string
  billingStatus: 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | 'FAILED' | 'REVERSED'
  effectiveBillingStatus: 'PENDING_PAYMENT' | 'OVERDUE' | 'PAID' | 'CANCELLED' | 'FAILED' | 'REVERSED'
  paymentStatus: 'NOT_CONFIRMED' | 'CONFIRMED' | 'REVERSED'
  paidAt: string | null
  cancelledAt: string | null
  failedAt: string | null
  reversedAt: string | null
  createdByUserId: string
  confirmedByUserId: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  installments: Array<{
    installmentId: string
    installmentNumber: number
    dueDate: string
    allocatedAmount: string
    installmentStatus: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED'
  }>
}

export type ContractCommercialHistoryVersion = {
  id: string
  version: number
  modality: 'MONTHLY_RECURRING' | 'ANNUAL_PIX_ADVANCE'
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
  status: 'CURRENT' | 'SUPERSEDED'
  annualAdvanceCharges: AnnualAdvanceCharge[]
}

export type FinancePlan = {
  id: string
  contractId: string
  totalAmount: string
  installmentCount: number
  dueDay: number
  firstDueDate: string
  generationRule: string
  version: number
  generatedAt: string
  generatedByUserId: string | null
  notes: string | null
  commercialCondition?: {
    id: string
    version: number
    modality: 'MONTHLY_RECURRING' | 'ANNUAL_PIX_ADVANCE'
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
  } | null
  annualAdvanceCharges?: AnnualAdvanceCharge[]
  createdAt: string
  updatedAt: string
  summary: FinanceSummary
}

export type FinanceOverview = {
  month: string | null
  cards: {
    expectedInMonth: string
    receivedInMonth: string
    receivable: string
    overdue: string
    nextDue: {
      installmentId: string
      contractNumber: string
      dueDate: string
      amount: string
    } | null
  }
}

export type FinancePayment = {
  id: string
  installmentId: string
  chargeId: string | null
  amount: string
  paidAt: string
  method: PaymentMethod
  provider: ChargeProvider
  status: PaymentStatus
  externalReference: string | null
  idempotencyKey: string | null
  notes: string | null
  createdByUserId: string | null
  reversedAt: string | null
  reversedByUserId: string | null
  reversalReason: string | null
  createdAt: string
  updatedAt: string
}

export type FinanceCharge = {
  id: string
  installmentId: string
  provider: ChargeProvider
  method: PaymentMethod
  status: string
  amount: string
  externalId: string | null
  idempotencyKey: string | null
  createdAt: string
  updatedAt: string
}

export type PaginationMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type PaginatedResponse<T> = {
  data: T[]
  pagination: PaginationMeta
}
