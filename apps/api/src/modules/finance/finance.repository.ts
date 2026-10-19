/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

const financialPlanSelect = {
  id: true,
  contractId: true,
  totalAmount: true,
  installmentCount: true,
  dueDay: true,
  firstDueDate: true,
  generationRule: true,
  version: true,
  generatedAt: true,
  generatedByUserId: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const

const installmentSelect = {
  id: true,
  contractId: true,
  financialPlanId: true,
  number: true,
  dueDate: true,
  originalAmount: true,
  adjustedAmount: true,
  discountAllocatedAmount: true,
  coveredByAdvance: true,
  commercialConditionId: true,
  status: true,
  description: true,
  cancellationReason: true,
  cancelledAt: true,
  cancelledByUserId: true,
  createdAt: true,
  updatedAt: true,
  contract: {
    select: {
      id: true,
      contractNumber: true,
      title: true,
      clientId: true,
      status: true,
      startDate: true,
      endDate: true,
      dueDay: true,
      client: {
        select: {
          id: true,
          legalName: true,
          tradeName: true,
        },
      },
    },
  },
  payments: {
    select: {
      id: true,
      amount: true,
      status: true,
      paidAt: true,
      method: true,
      provider: true,
      reversedAt: true,
      reversalReason: true,
      externalReference: true,
      createdAt: true,
    },
    orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
  },
} as const

const paymentSelect = {
  id: true,
  installmentId: true,
  chargeId: true,
  amount: true,
  paidAt: true,
  method: true,
  provider: true,
  status: true,
  externalReference: true,
  idempotencyKey: true,
  notes: true,
  createdByUserId: true,
  reversedAt: true,
  reversedByUserId: true,
  reversalReason: true,
  createdAt: true,
  updatedAt: true,
} as const

const chargeSelect = {
  id: true,
  installmentId: true,
  provider: true,
  method: true,
  status: true,
  amount: true,
  externalId: true,
  idempotencyKey: true,
  createdAt: true,
  updatedAt: true,
} as const

const commercialConditionSelect = {
  id: true,
  contractId: true,
  version: true,
  modality: true,
  paymentMethod: true,
  discountPercent: true,
  discountFixedAmount: true,
  eligibleAmount: true,
  discountAmount: true,
  netAmount: true,
  advanceMonths: true,
  coverageStartDate: true,
  coverageEndDate: true,
  commercialJustification: true,
  grantedByUserId: true,
  supersededAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

const annualAdvanceChargeSelect = {
  id: true,
  contractId: true,
  commercialConditionId: true,
  referenceCode: true,
  idempotencyKey: true,
  internalReference: true,
  paymentMethod: true,
  grossAmount: true,
  discountAmount: true,
  netAmount: true,
  coverageStartDate: true,
  coverageEndDate: true,
  dueDate: true,
  billingStatus: true,
  paymentStatus: true,
  paidAt: true,
  cancelledAt: true,
  failedAt: true,
  reversedAt: true,
  createdByUserId: true,
  confirmedByUserId: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  contract: {
    select: {
      id: true,
      clientId: true,
    },
  },
  commercialCondition: {
    select: commercialConditionSelect,
  },
  installmentLinks: {
    select: {
      installmentId: true,
      allocatedAmount: true,
      installment: {
        select: {
          id: true,
          number: true,
          dueDate: true,
          status: true,
          adjustedAmount: true,
        },
      },
    },
    orderBy: [{ installment: { number: 'asc' } }],
  },
  externalPayment: {
    select: {
      id: true,
      annualAdvanceChargeId: true,
      provider: true,
      integrationStatus: true,
      externalPaymentId: true,
      externalOrderId: true,
      externalReference: true,
      externalIdempotencyKey: true,
      lastProviderStatus: true,
      lastProviderStatusDetail: true,
      lastProviderStatusAt: true,
      lastWebhookAt: true,
      lastSyncedAt: true,
      lastErrorCode: true,
      lastErrorMessage: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const

const annualAdvanceExternalPaymentSelect = {
  id: true,
  annualAdvanceChargeId: true,
  provider: true,
  integrationStatus: true,
  externalPaymentId: true,
  externalOrderId: true,
  externalReference: true,
  externalIdempotencyKey: true,
  lastProviderStatus: true,
  lastProviderStatusDetail: true,
  lastProviderStatusAt: true,
  lastWebhookAt: true,
  lastSyncedAt: true,
  lastErrorCode: true,
  lastErrorMessage: true,
  createdAt: true,
  updatedAt: true,
  annualAdvanceCharge: {
    select: annualAdvanceChargeSelect,
  },
} as const

const paymentProviderWebhookEventSelect = {
  id: true,
  provider: true,
  topic: true,
  action: true,
  eventId: true,
  resourceId: true,
  xRequestId: true,
  signatureTs: true,
  dedupeKey: true,
  payload: true,
  processingStatus: true,
  processingError: true,
  processedAt: true,
  annualAdvanceExternalPaymentId: true,
  createdAt: true,
  updatedAt: true,
} as const

export type FinancialPlanRecord = any
export type InstallmentRecord = any
export type PaymentRecord = any
export type ChargeRecord = any
export type CommercialConditionRecord = any
export type AnnualAdvanceChargeRecord = any
export type AnnualAdvanceExternalPaymentRecord = any
export type PaymentProviderWebhookEventRecord = any

type DbClient = Prisma.TransactionClient | typeof prisma

function db(tx?: Prisma.TransactionClient): DbClient {
  return tx ?? prisma
}

export async function findContractForFinancialPlan(contractId: string, tx?: Prisma.TransactionClient) {
  return (db(tx) as any).contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      contractNumber: true,
      clientId: true,
      status: true,
      startDate: true,
      endDate: true,
      totalValue: true,
      dueDay: true,
      durationMonths: true,
      paymentMethod: true,
      financialPlan: {
        select: {
          id: true,
        },
      },
    },
  })
}

export async function listActiveClientMembershipClientIds(userId: string, tx?: Prisma.TransactionClient) {
  const records = await (db(tx) as any).clientMembership.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      clientId: true,
    },
  })

  return records.map((item: { clientId: string }) => item.clientId)
}

export async function createFinancialPlan(
  data: Record<string, unknown>,
  tx?: Prisma.TransactionClient,
): Promise<FinancialPlanRecord> {
  return (db(tx) as any).contractFinancialPlan.create({ data, select: financialPlanSelect })
}

export async function findFinancialPlanByContract(contractId: string, tx?: Prisma.TransactionClient) {
  return (db(tx) as any).contractFinancialPlan.findUnique({
    where: { contractId },
    select: financialPlanSelect,
  })
}

export async function createInstallment(
  data: Record<string, unknown>,
  tx?: Prisma.TransactionClient,
): Promise<InstallmentRecord> {
  return (db(tx) as any).installment.create({ data, select: installmentSelect })
}

export async function listInstallmentsByContract(params: {
  contractId: string
  where?: Record<string, unknown>
  skip: number
  take: number
}): Promise<InstallmentRecord[]> {
  return (prisma as any).installment.findMany({
    where: {
      contractId: params.contractId,
      ...(params.where ?? {}),
    },
    skip: params.skip,
    take: params.take,
    orderBy: [{ number: 'asc' }],
    select: installmentSelect,
  })
}

export async function countInstallmentsByContract(contractId: string, where?: Record<string, unknown>) {
  return (prisma as any).installment.count({
    where: {
      contractId,
      ...(where ?? {}),
    },
  })
}

export async function findInstallmentById(id: string, tx?: Prisma.TransactionClient) {
  return (db(tx) as any).installment.findUnique({
    where: { id },
    select: installmentSelect,
  })
}

export async function findInstallmentForUpdate(id: string, tx: Prisma.TransactionClient) {
  return (tx as any).installment.findUnique({
    where: { id },
    select: {
      id: true,
      contractId: true,
      number: true,
      dueDate: true,
      adjustedAmount: true,
      status: true,
      cancelledAt: true,
      contract: {
        select: {
          id: true,
          clientId: true,
          contractNumber: true,
        },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          status: true,
          reversedAt: true,
        },
      },
    },
  })
}

export async function updateInstallment(
  id: string,
  data: Record<string, unknown>,
  tx?: Prisma.TransactionClient,
): Promise<InstallmentRecord> {
  return (db(tx) as any).installment.update({ where: { id }, data, select: installmentSelect })
}

export async function listContractInstallmentsForOverview(where: Record<string, unknown>) {
  return (prisma as any).installment.findMany({
    where,
    select: installmentSelect,
  })
}

export async function listReceivables(params: {
  where: Record<string, unknown>
  skip: number
  take: number
}) {
  return (prisma as any).installment.findMany({
    where: params.where,
    skip: params.skip,
    take: params.take,
    orderBy: [{ dueDate: 'asc' }, { number: 'asc' }],
    select: installmentSelect,
  })
}

export async function countReceivables(where: Record<string, unknown>) {
  return (prisma as any).installment.count({ where })
}

export async function createPayment(
  data: Record<string, unknown>,
  tx?: Prisma.TransactionClient,
): Promise<PaymentRecord> {
  return (db(tx) as any).payment.create({ data, select: paymentSelect })
}

export async function updatePayment(
  id: string,
  data: Record<string, unknown>,
  tx?: Prisma.TransactionClient,
): Promise<PaymentRecord> {
  return (db(tx) as any).payment.update({ where: { id }, data, select: paymentSelect })
}

export async function listPaymentsByInstallment(installmentId: string): Promise<PaymentRecord[]> {
  return (prisma as any).payment.findMany({
    where: { installmentId },
    orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
    select: paymentSelect,
  })
}

export async function findPaymentById(id: string, tx?: Prisma.TransactionClient): Promise<PaymentRecord | null> {
  return (db(tx) as any).payment.findUnique({
    where: { id },
    select: {
      ...paymentSelect,
      installment: {
        select: {
          id: true,
          contractId: true,
          contract: {
            select: {
              clientId: true,
            },
          },
        },
      },
    },
  })
}

export async function findPaymentForReversal(id: string, tx: Prisma.TransactionClient) {
  return (tx as any).payment.findUnique({
    where: { id },
    select: {
      id: true,
      installmentId: true,
      amount: true,
      status: true,
      reversedAt: true,
      installment: {
        select: {
          id: true,
          contractId: true,
          adjustedAmount: true,
          status: true,
          cancelledAt: true,
          contract: {
            select: {
              clientId: true,
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              status: true,
              reversedAt: true,
            },
          },
        },
      },
    },
  })
}

export async function listPaymentsByIdempotencyKeys(keys: string[], tx?: Prisma.TransactionClient) {
  return (db(tx) as any).payment.findMany({
    where: {
      idempotencyKey: {
        in: keys,
      },
    },
    select: paymentSelect,
  })
}

export async function createCharge(
  data: Record<string, unknown>,
  tx?: Prisma.TransactionClient,
): Promise<ChargeRecord> {
  return (db(tx) as any).charge.create({ data, select: chargeSelect })
}

export async function updateCharge(
  id: string,
  data: Record<string, unknown>,
  tx?: Prisma.TransactionClient,
): Promise<ChargeRecord> {
  return (db(tx) as any).charge.update({ where: { id }, data, select: chargeSelect })
}

export async function listChargesByInstallment(installmentId: string): Promise<ChargeRecord[]> {
  return (prisma as any).charge.findMany({
    where: { installmentId },
    orderBy: [{ createdAt: 'desc' }],
    select: chargeSelect,
  })
}

export async function findChargeById(id: string, tx?: Prisma.TransactionClient): Promise<ChargeRecord | null> {
  return (db(tx) as any).charge.findUnique({
    where: { id },
    select: {
      ...chargeSelect,
      installment: {
        select: {
          id: true,
          contractId: true,
          contract: {
            select: {
              clientId: true,
            },
          },
        },
      },
    },
  })
}

export async function findChargeByIdForCancel(id: string, tx: Prisma.TransactionClient) {
  return (tx as any).charge.findUnique({
    where: { id },
    select: {
      id: true,
      installmentId: true,
      status: true,
      installment: {
        select: {
          id: true,
          contractId: true,
          contract: {
            select: {
              clientId: true,
            },
          },
        },
      },
      payments: {
        select: {
          id: true,
          status: true,
          reversedAt: true,
        },
      },
    },
  })
}

export async function listPortalInstallmentsByClient(clientId: string, contractId?: string) {
  return (prisma as any).installment.findMany({
    where: {
      contract: {
        clientId,
        ...(contractId ? { id: contractId } : {}),
      },
    },
    orderBy: [{ dueDate: 'asc' }, { number: 'asc' }],
    select: installmentSelect,
  })
}

export async function findActiveCommercialConditionByContract(contractId: string, tx?: Prisma.TransactionClient) {
  return (db(tx) as any).contractCommercialCondition.findFirst({
    where: {
      contractId,
      isActive: true,
    },
    orderBy: [{ version: 'desc' }],
    select: commercialConditionSelect,
  })
}

export async function getNextCommercialConditionVersion(contractId: string, tx?: Prisma.TransactionClient) {
  const latest = await (db(tx) as any).contractCommercialCondition.findFirst({
    where: { contractId },
    orderBy: [{ version: 'desc' }],
    select: { version: true },
  })

  return (latest?.version ?? 0) + 1
}

export async function supersedeCommercialConditionsByContract(contractId: string, tx: Prisma.TransactionClient) {
  await (tx as any).contractCommercialCondition.updateMany({
    where: {
      contractId,
      isActive: true,
    },
    data: {
      isActive: false,
      supersededAt: new Date(),
    },
  })
}

export async function createCommercialCondition(
  data: Record<string, unknown>,
  tx: Prisma.TransactionClient,
): Promise<CommercialConditionRecord> {
  return (tx as any).contractCommercialCondition.create({
    data,
    select: commercialConditionSelect,
  })
}

export async function listCommercialConditionsByContract(contractId: string, tx?: Prisma.TransactionClient) {
  return (db(tx) as any).contractCommercialCondition.findMany({
    where: { contractId },
    orderBy: [{ version: 'desc' }],
    select: commercialConditionSelect,
  })
}

export async function listInstallmentsByCommercialCondition(
  contractId: string,
  commercialConditionId: string,
  tx?: Prisma.TransactionClient,
) {
  return (db(tx) as any).installment.findMany({
    where: {
      contractId,
      commercialConditionId,
      coveredByAdvance: true,
      status: {
        not: 'CANCELLED',
      },
    },
    orderBy: [{ number: 'asc' }],
    select: installmentSelect,
  })
}

export async function findAnnualAdvanceChargeById(id: string, tx?: Prisma.TransactionClient) {
  return (db(tx) as any).annualAdvanceCharge.findUnique({
    where: { id },
    select: annualAdvanceChargeSelect,
  })
}

export async function findAnnualAdvanceChargeByIdempotencyKey(idempotencyKey: string, tx?: Prisma.TransactionClient) {
  return (db(tx) as any).annualAdvanceCharge.findUnique({
    where: { idempotencyKey },
    select: annualAdvanceChargeSelect,
  })
}

export async function findAnnualAdvanceChargeByContractAndCondition(
  contractId: string,
  commercialConditionId: string,
  tx?: Prisma.TransactionClient,
) {
  return (db(tx) as any).annualAdvanceCharge.findUnique({
    where: {
      contractId_commercialConditionId: {
        contractId,
        commercialConditionId,
      },
    },
    select: annualAdvanceChargeSelect,
  })
}

export async function createAnnualAdvanceCharge(
  data: Record<string, unknown>,
  tx: Prisma.TransactionClient,
): Promise<AnnualAdvanceChargeRecord> {
  return (tx as any).annualAdvanceCharge.create({
    data,
    select: annualAdvanceChargeSelect,
  })
}

export async function createAnnualAdvanceChargeInstallmentLinks(
  links: Array<{ annualAdvanceChargeId: string; installmentId: string; allocatedAmount: unknown }>,
  tx: Prisma.TransactionClient,
) {
  await (tx as any).annualAdvanceChargeInstallment.createMany({
    data: links,
    skipDuplicates: true,
  })
}

export async function updateAnnualAdvanceCharge(
  id: string,
  data: Record<string, unknown>,
  tx: Prisma.TransactionClient,
): Promise<AnnualAdvanceChargeRecord> {
  return (tx as any).annualAdvanceCharge.update({
    where: { id },
    data,
    select: annualAdvanceChargeSelect,
  })
}

export async function listAnnualAdvanceChargesByContract(contractId: string, tx?: Prisma.TransactionClient) {
  return (db(tx) as any).annualAdvanceCharge.findMany({
    where: { contractId },
    orderBy: [{ createdAt: 'desc' }],
    select: {
      ...annualAdvanceChargeSelect,
      createdByUser: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      confirmedByUser: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  })
}

export async function hasBlockingAnnualAdvanceChargeForInstallment(installmentId: string, tx?: Prisma.TransactionClient) {
  const found = await (db(tx) as any).annualAdvanceCharge.findFirst({
    where: {
      billingStatus: {
        in: ['PENDING_PAYMENT', 'PAID'],
      },
      installmentLinks: {
        some: {
          installmentId,
        },
      },
    },
    select: {
      id: true,
      referenceCode: true,
      billingStatus: true,
      paymentStatus: true,
    },
  })

  return found
}

export async function findAnnualAdvanceExternalPaymentByAnnualAdvanceChargeId(
  annualAdvanceChargeId: string,
  tx?: Prisma.TransactionClient,
) {
  return (db(tx) as any).annualAdvanceExternalPayment.findUnique({
    where: { annualAdvanceChargeId },
    select: annualAdvanceExternalPaymentSelect,
  })
}

export async function findAnnualAdvanceExternalPaymentByExternalPaymentId(
  provider: 'MERCADO_PAGO',
  externalPaymentId: string,
  tx?: Prisma.TransactionClient,
) {
  return (db(tx) as any).annualAdvanceExternalPayment.findFirst({
    where: {
      provider,
      externalPaymentId,
    },
    select: annualAdvanceExternalPaymentSelect,
  })
}

export async function createAnnualAdvanceExternalPayment(
  data: Record<string, unknown>,
  tx: Prisma.TransactionClient,
): Promise<AnnualAdvanceExternalPaymentRecord> {
  return (tx as any).annualAdvanceExternalPayment.create({
    data,
    select: annualAdvanceExternalPaymentSelect,
  })
}

export async function updateAnnualAdvanceExternalPayment(
  id: string,
  data: Record<string, unknown>,
  tx: Prisma.TransactionClient,
): Promise<AnnualAdvanceExternalPaymentRecord> {
  return (tx as any).annualAdvanceExternalPayment.update({
    where: { id },
    data,
    select: annualAdvanceExternalPaymentSelect,
  })
}

export async function findWebhookEventByDedupeKey(dedupeKey: string, tx?: Prisma.TransactionClient) {
  return (db(tx) as any).paymentProviderWebhookEvent.findUnique({
    where: { dedupeKey },
    select: paymentProviderWebhookEventSelect,
  })
}

export async function createWebhookEvent(
  data: Record<string, unknown>,
  tx: Prisma.TransactionClient,
): Promise<PaymentProviderWebhookEventRecord> {
  return (tx as any).paymentProviderWebhookEvent.create({
    data,
    select: paymentProviderWebhookEventSelect,
  })
}

export async function updateWebhookEvent(
  id: string,
  data: Record<string, unknown>,
  tx: Prisma.TransactionClient,
): Promise<PaymentProviderWebhookEventRecord> {
  return (tx as any).paymentProviderWebhookEvent.update({
    where: { id },
    data,
    select: paymentProviderWebhookEventSelect,
  })
}
