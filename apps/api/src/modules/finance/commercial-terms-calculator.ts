import { Prisma } from '@prisma/client'
import type { ForecastItem } from './forecast-calculator.js'

export type CommercialPaymentModality = 'MONTHLY_RECURRING' | 'ANNUAL_PIX_ADVANCE'

export type CommercialConditionInput = {
  modality: CommercialPaymentModality
  paymentMethod: 'PIX' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'BOLETO' | 'CASH' | 'OTHER'
  discountPercent?: Prisma.Decimal
  discountFixedAmount?: Prisma.Decimal
  advanceMonths?: number
  coverageStartDate?: Date
}

export type CommercialConditionComputation = {
  modality: CommercialPaymentModality
  paymentMethod: CommercialConditionInput['paymentMethod']
  coverageStartDate: Date | null
  coverageEndDate: Date | null
  eligibleAmount: Prisma.Decimal
  discountAmount: Prisma.Decimal
  netAmount: Prisma.Decimal
  allocations: Array<{
    number: number
    originalAmount: Prisma.Decimal
    adjustedAmount: Prisma.Decimal
    discountAllocatedAmount: Prisma.Decimal
    coveredByAdvance: boolean
  }>
}

function toCents(value: Prisma.Decimal) {
  return Number(value.toDecimalPlaces(2).mul(100).toFixed(0))
}

function fromCents(cents: number) {
  return new Prisma.Decimal(cents).div(100).toDecimalPlaces(2)
}

function allocateProportionally(total: Prisma.Decimal, bases: Prisma.Decimal[]) {
  const totalCents = toCents(total)
  const sumBase = bases.reduce((acc, item) => acc.plus(item), new Prisma.Decimal(0))

  if (sumBase.lte(0) || totalCents <= 0) {
    return bases.map(() => new Prisma.Decimal(0))
  }

  const rows = bases.map((base, index) => {
    const raw = new Prisma.Decimal(totalCents).mul(base).div(sumBase)
    const floor = Number(raw.floor().toFixed(0))

    return {
      index,
      cents: floor,
      fraction: raw.minus(floor),
    }
  })

  let distributed = rows.reduce((acc, item) => acc + item.cents, 0)
  let remainder = totalCents - distributed

  rows
    .sort((a, b) => {
      if (a.fraction.eq(b.fraction)) {
        return a.index - b.index
      }
      return a.fraction.gt(b.fraction) ? -1 : 1
    })
    .forEach((row) => {
      if (remainder <= 0) {
        return
      }
      row.cents += 1
      remainder -= 1
      distributed += 1
    })

  if (distributed !== totalCents) {
    throw new Error('Falha ao distribuir valores com precisao monetaria.')
  }

  return rows.sort((a, b) => a.index - b.index).map((row) => fromCents(row.cents))
}

function normalizeDate(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0))
}

function validateCondition(condition: CommercialConditionInput) {
  if (condition.modality === 'ANNUAL_PIX_ADVANCE' && condition.paymentMethod !== 'PIX') {
    throw new Error('Pagamento anual antecipado deve utilizar PIX.')
  }

  if (
    condition.modality === 'ANNUAL_PIX_ADVANCE' &&
    (!Number.isInteger(condition.advanceMonths) || (condition.advanceMonths as number) <= 0)
  ) {
    throw new Error('Informe um periodo de antecipacao valido em meses.')
  }

  if (condition.discountPercent && (condition.discountPercent.lt(0) || condition.discountPercent.gt(100))) {
    throw new Error('Percentual de desconto invalido.')
  }

  if (condition.discountFixedAmount && condition.discountFixedAmount.lt(0)) {
    throw new Error('Valor fixo de desconto invalido.')
  }
}

function pickEligibleIndexes(forecast: ForecastItem[], condition: CommercialConditionInput) {
  if (forecast.length === 0) {
    return []
  }

  if (condition.modality === 'MONTHLY_RECURRING') {
    return forecast.map((_, index) => index)
  }

  const startDate = normalizeDate(condition.coverageStartDate ?? forecast[0].referenceStartDate)

  const startIndex = forecast.findIndex((item) => normalizeDate(item.referenceEndDate) >= startDate)
  if (startIndex < 0) {
    throw new Error('Periodo de cobertura informado nao cruza a vigencia do contrato.')
  }

  const months = condition.advanceMonths as number
  const endIndexExclusive = Math.min(forecast.length, startIndex + months)

  const indexes: number[] = []
  for (let index = startIndex; index < endIndexExclusive; index += 1) {
    indexes.push(index)
  }

  if (indexes.length === 0) {
    throw new Error('Nao foi possivel selecionar competencias para cobertura antecipada.')
  }

  return indexes
}

export function applyCommercialConditionToForecast(
  forecast: ForecastItem[],
  condition: CommercialConditionInput,
): CommercialConditionComputation {
  validateCondition(condition)

  if (forecast.length === 0) {
    throw new Error('Previsao financeira vazia.')
  }

  const eligibleIndexes = new Set(pickEligibleIndexes(forecast, condition))
  const eligibleItems = forecast.filter((_, index) => eligibleIndexes.has(index))

  const eligibleAmount = eligibleItems.reduce((acc, item) => acc.plus(item.amount), new Prisma.Decimal(0)).toDecimalPlaces(2)

  if (eligibleAmount.lte(0)) {
    throw new Error('Base elegivel para desconto invalida.')
  }

  const discountPercent = condition.discountPercent ?? new Prisma.Decimal(0)
  const discountFixedAmount = condition.discountFixedAmount ?? new Prisma.Decimal(0)

  const discountFromPercent = eligibleAmount.mul(discountPercent).div(100)
  const grossDiscount = discountFromPercent.plus(discountFixedAmount).toDecimalPlaces(2)

  if (grossDiscount.lt(0)) {
    throw new Error('Desconto nao pode ser negativo.')
  }

  if (grossDiscount.gt(eligibleAmount)) {
    throw new Error('Desconto excede o valor elegivel para negociacao.')
  }

  const discountAmount = grossDiscount
  const netAmount = eligibleAmount.minus(discountAmount).toDecimalPlaces(2)

  if (netAmount.lt(0)) {
    throw new Error('Valor liquido da negociacao nao pode ser negativo.')
  }

  const perInstallmentDiscount = allocateProportionally(
    discountAmount,
    eligibleItems.map((item) => item.amount),
  )

  const discountByIndex = new Map<number, Prisma.Decimal>()
  let discountCursor = 0
  forecast.forEach((_, index) => {
    if (eligibleIndexes.has(index)) {
      discountByIndex.set(index, perInstallmentDiscount[discountCursor])
      discountCursor += 1
    }
  })

  const allocations = forecast.map((item, index) => {
    const itemDiscount = discountByIndex.get(index) ?? new Prisma.Decimal(0)
    const adjustedAmount = item.amount.minus(itemDiscount).toDecimalPlaces(2)

    if (adjustedAmount.lt(0)) {
      throw new Error('Alocacao de desconto gerou parcela negativa.')
    }

    return {
      number: item.number,
      originalAmount: item.amount.toDecimalPlaces(2),
      adjustedAmount,
      discountAllocatedAmount: itemDiscount.toDecimalPlaces(2),
      coveredByAdvance: condition.modality === 'ANNUAL_PIX_ADVANCE' && eligibleIndexes.has(index),
    }
  })

  const firstEligible = eligibleItems[0]
  const lastEligible = eligibleItems[eligibleItems.length - 1]

  return {
    modality: condition.modality,
    paymentMethod: condition.paymentMethod,
    coverageStartDate: condition.modality === 'ANNUAL_PIX_ADVANCE' ? firstEligible.referenceStartDate : null,
    coverageEndDate: condition.modality === 'ANNUAL_PIX_ADVANCE' ? lastEligible.referenceEndDate : null,
    eligibleAmount,
    discountAmount,
    netAmount,
    allocations,
  }
}
