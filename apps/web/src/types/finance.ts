import type { ChargeProvider, PaymentMethod, PaymentStatus } from '@gestao-sst/shared'

export type FinanceInstallmentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED'

export type FinanceInstallment = {
  id: string
  contractId: string
  financialPlanId: string
  number: number
  dueDate: string
  originalAmount: string
  adjustedAmount: string
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
