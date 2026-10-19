import type { ChargeProvider, PaymentMethod } from '@gestao-sst/shared'
import { apiClient } from '@/lib/api-client'
import type {
  AnnualAdvanceCharge,
  ContractCommercialHistoryVersion,
  FinanceCharge,
  FinanceInstallment,
  FinanceOverview,
  FinancePayment,
  FinancePlan,
  PaginatedResponse,
} from '@/types/finance'

function toQueryString(filters: Record<string, string | number | undefined>) {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (typeof value !== 'undefined' && value !== '') {
      params.set(key, String(value))
    }
  })

  const query = params.toString()
  return query ? `?${query}` : ''
}

export function getFinanceOverview(month?: string) {
  const query = toQueryString({ month })
  return apiClient<FinanceOverview>(`/api/v1/finance/overview${query}`)
}

export function listFinanceReceivables(filters: {
  page: number
  pageSize: number
  search?: string
  clientId?: string
  status?: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  dueDateFrom?: string
  dueDateTo?: string
}) {
  const query = toQueryString(filters)
  return apiClient<PaginatedResponse<FinanceInstallment>>(`/api/v1/finance/receivables${query}`)
}

export function previewContractFinancialPlan(
  contractId: string,
  input: {
    installmentCount?: number
    totalAmount?: string
    dueDay?: number
    firstDueDate: string
    notes?: string
    commercialCondition?: {
      modality: 'MONTHLY_RECURRING' | 'ANNUAL_PIX_ADVANCE'
      discountPercent?: string
      discountFixedAmount?: string
      advanceMonths?: number
      coverageStartDate?: string
      commercialJustification: string
    }
  },
) {
  return apiClient<{
    preview: {
      contractId: string
      installmentCount: number
      totalAmount: string
      dueDay: number
      firstDueDate: string
      generationFormula: string
      proportionalCount: number
      totalPlanned: string
      commercialCondition: {
        modality: 'MONTHLY_RECURRING' | 'ANNUAL_PIX_ADVANCE'
        paymentMethod: PaymentMethod
        eligibleAmount: string
        discountAmount: string
        netAmount: string
        coverageStartDate: string | null
        coverageEndDate: string | null
        advanceMonths: number | null
        justification: string | null
      } | null
      installments: Array<{
        number: number
        dueDate: string
        amount: string
        adjustedAmount: string
        discountAllocatedAmount: string
        coveredByAdvance: boolean
        referenceStartDate: string
        referenceEndDate: string
        chargeType: 'INTEGRAL' | 'PROPORCIONAL'
        proportion: string
      }>
    }
  }>(`/api/v1/contracts/${contractId}/financial-plan/preview`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function createContractFinancialPlan(
  contractId: string,
  input: {
    installmentCount?: number
    totalAmount?: string
    dueDay?: number
    firstDueDate: string
    notes?: string
    commercialCondition?: {
      modality: 'MONTHLY_RECURRING' | 'ANNUAL_PIX_ADVANCE'
      discountPercent?: string
      discountFixedAmount?: string
      advanceMonths?: number
      coverageStartDate?: string
      commercialJustification: string
    }
  },
) {
  return apiClient<{
    plan: Omit<FinancePlan, 'summary'>
    preview: Array<{
      number: number
      dueDate: string
      amount: string
      adjustedAmount: string
      discountAllocatedAmount: string
      coveredByAdvance: boolean
      referenceStartDate: string
      referenceEndDate: string
      chargeType: 'INTEGRAL' | 'PROPORCIONAL'
      proportion: string
    }>
    commercialCondition: {
      modality: 'MONTHLY_RECURRING' | 'ANNUAL_PIX_ADVANCE'
      paymentMethod: PaymentMethod
      eligibleAmount: string
      discountAmount: string
      netAmount: string
      coverageStartDate: string | null
      coverageEndDate: string | null
      advanceMonths: number | null
      justification: string | null
    } | null
  }>(`/api/v1/contracts/${contractId}/financial-plan`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getContractFinancialPlan(contractId: string) {
  return apiClient<{ plan: FinancePlan }>(`/api/v1/contracts/${contractId}/financial-plan`)
}

export function getContractFinanceSummary(contractId: string) {
  return apiClient<{
    hasPlan: boolean
    plan: Omit<FinancePlan, 'summary'> | null
    summary: FinancePlan['summary'] | null
  }>(`/api/v1/contracts/${contractId}/finance-summary`)
}

export function getContractCommercialHistory(contractId: string) {
  return apiClient<{
    contractId: string
    currentConditionId: string | null
    versions: ContractCommercialHistoryVersion[]
  }>(`/api/v1/contracts/${contractId}/commercial-history`)
}

export function createAnnualAdvanceCharge(
  contractId: string,
  input: {
    dueDate: string
    idempotencyKey: string
    internalReference?: string
    notes?: string
  },
) {
  return apiClient<{
    charge: AnnualAdvanceCharge
    idempotencyReplay: boolean
  }>(`/api/v1/contracts/${contractId}/annual-advance-charge`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function confirmAnnualAdvanceChargePayment(
  id: string,
  input: {
    paidAt?: string
    externalReference?: string
    notes?: string
  },
) {
  return apiClient<{
    charge: AnnualAdvanceCharge
    idempotencyReplay: boolean
  }>(`/api/v1/annual-advance-charges/${id}/confirm-payment`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function cancelAnnualAdvanceCharge(id: string, reason: string) {
  return apiClient<{ charge: AnnualAdvanceCharge }>(`/api/v1/annual-advance-charges/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export function failAnnualAdvanceCharge(id: string, reason: string) {
  return apiClient<{ charge: AnnualAdvanceCharge }>(`/api/v1/annual-advance-charges/${id}/fail`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export function reverseAnnualAdvanceChargePayment(id: string, reason: string) {
  return apiClient<{ charge: AnnualAdvanceCharge }>(`/api/v1/annual-advance-charges/${id}/reverse-payment`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export function listContractInstallments(
  contractId: string,
  filters: {
    page: number
    pageSize: number
    status?: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  },
) {
  const query = toQueryString(filters)
  return apiClient<{
    data: FinanceInstallment[]
    summary: FinancePlan['summary']
    pagination: PaginatedResponse<FinanceInstallment>['pagination']
  }>(`/api/v1/contracts/${contractId}/installments${query}`)
}

export function getInstallmentById(id: string) {
  return apiClient<{ installment: FinanceInstallment & { payments: Array<{
    id: string
    amount: string
    status: string
    paidAt: string
    method: PaymentMethod
    provider: ChargeProvider
    reversedAt: string | null
    reversalReason: string | null
    externalReference: string | null
    createdAt: string
  }> } }>(`/api/v1/installments/${id}`)
}

export function updateInstallment(id: string, input: { dueDate?: string; adjustedAmount?: string; description?: string | null }) {
  return apiClient<{ installment: FinanceInstallment }>(`/api/v1/installments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function cancelInstallment(id: string, reason: string) {
  return apiClient<{ installment: FinanceInstallment }>(`/api/v1/installments/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export function listInstallmentPayments(id: string) {
  return apiClient<{ installment: FinanceInstallment; data: FinancePayment[] }>(`/api/v1/installments/${id}/payments`)
}

export function createInstallmentPayment(
  id: string,
  input: {
    amount: string
    paidAt: string
    method: PaymentMethod
    provider: ChargeProvider
    chargeId?: string
    externalReference?: string
    idempotencyKey?: string
    notes?: string
  },
) {
  return apiClient<{ payment: FinancePayment; installment: FinanceInstallment }>(`/api/v1/installments/${id}/payments`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function reversePayment(id: string, reason: string) {
  return apiClient<{ payment: FinancePayment; installment: FinanceInstallment }>(`/api/v1/payments/${id}/reverse`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export function listInstallmentCharges(id: string) {
  return apiClient<{ installment: FinanceInstallment; data: FinanceCharge[] }>(`/api/v1/installments/${id}/charges`)
}

export function createInstallmentCharge(
  id: string,
  input: {
    provider: ChargeProvider
    method: PaymentMethod
    amount: string
    externalId?: string
    idempotencyKey?: string
  },
) {
  return apiClient<{ charge: FinanceCharge; installment: FinanceInstallment }>(`/api/v1/installments/${id}/charges`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function cancelCharge(id: string, reason?: string) {
  return apiClient<{ charge: FinanceCharge }>(`/api/v1/charges/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export function createChargePaymentLink(
  id: string,
  input: {
    idempotencyKey: string
    title?: string
    payerEmail?: string
    successUrl?: string
    failureUrl?: string
    pendingUrl?: string
  },
) {
  return apiClient<{
    charge: FinanceCharge
    paymentLink: {
      preferenceId: string
      initPoint: string | null
      sandboxInitPoint: string | null
    }
  }>(`/api/v1/charges/${id}/payment-link`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
