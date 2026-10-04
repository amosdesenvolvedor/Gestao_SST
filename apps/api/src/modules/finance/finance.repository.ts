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

export type FinancialPlanRecord = any
export type InstallmentRecord = any
export type PaymentRecord = any
export type ChargeRecord = any

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
      totalValue: true,
      dueDay: true,
      durationMonths: true,
      financialPlan: {
        select: {
          id: true,
        },
      },
    },
  })
}

export async function createFinancialPlan(
  data: Record<string, unknown>,
  tx?: Prisma.TransactionClient,
): Promise<FinancialPlanRecord> {
  return (db(tx) as any).contractFinancialPlan.create({ data, select: financialPlanSelect })
}

export async function findFinancialPlanByContract(contractId: string) {
  return (prisma as any).contractFinancialPlan.findUnique({
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
  return (db(tx) as any).payment.findUnique({ where: { id }, select: paymentSelect })
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
          adjustedAmount: true,
          status: true,
          cancelledAt: true,
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
  return (db(tx) as any).charge.findUnique({ where: { id }, select: chargeSelect })
}

export async function findChargeByIdForCancel(id: string, tx: Prisma.TransactionClient) {
  return (tx as any).charge.findUnique({
    where: { id },
    select: {
      id: true,
      installmentId: true,
      status: true,
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
