import { Prisma } from '@prisma/client'

export type ForecastChargeType = 'INTEGRAL' | 'PROPORCIONAL'

export type ForecastItem = {
  number: number
  dueDate: Date
  referenceStartDate: Date
  referenceEndDate: Date
  cycleStartDate: Date
  cycleEndDate: Date
  cycleDays: number
  coveredDays: number
  chargeType: ForecastChargeType
  proportion: string
  amount: Prisma.Decimal
}

type ForecastInput = {
  startDate: Date
  endDate: Date
  dueDay: number
  totalAmount: Prisma.Decimal
  firstDueDate?: Date
}

function startOfCivilDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0))
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function daysInclusive(startDate: Date, endDate: Date) {
  const ms = endDate.getTime() - startDate.getTime()
  return Math.floor(ms / 86400000) + 1
}

function clampDay(year: number, monthIndex: number, day: number) {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0, 0, 0, 0, 0)).getUTCDate()
  const targetDay = Math.min(day, lastDay)
  return new Date(Date.UTC(year, monthIndex, targetDay, 0, 0, 0, 0))
}

function addMonthsWithDay(date: Date, months: number, day: number) {
  return clampDay(date.getUTCFullYear(), date.getUTCMonth() + months, day)
}

function decimalToCents(value: Prisma.Decimal) {
  return Number(value.toDecimalPlaces(2).mul(100).toFixed(0))
}

function centsToDecimal(cents: number) {
  return new Prisma.Decimal(cents).div(100).toDecimalPlaces(2)
}

function assertValidInput(input: ForecastInput) {
  if (input.endDate < input.startDate) {
    throw new Error('Vigencia invalida: data final anterior a data inicial.')
  }

  if (!Number.isInteger(input.dueDay) || input.dueDay < 1 || input.dueDay > 31) {
    throw new Error('Dia de vencimento invalido.')
  }

  if (input.totalAmount.lte(0)) {
    throw new Error('Valor total do contrato invalido.')
  }
}

export function deriveFirstDueDate(startDate: Date, endDate: Date, dueDay: number) {
  const candidateInStartMonth = clampDay(startDate.getUTCFullYear(), startDate.getUTCMonth(), dueDay)
  const candidate = candidateInStartMonth >= startDate
    ? candidateInStartMonth
    : clampDay(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, dueDay)

  if (candidate > endDate) {
    return endDate
  }

  return candidate
}

function buildWeightedCycles(input: ForecastInput) {
  const startDate = startOfCivilDay(input.startDate)
  const endDate = startOfCivilDay(input.endDate)
  const firstDueDate = startOfCivilDay(
    input.firstDueDate ?? deriveFirstDueDate(startDate, endDate, input.dueDay),
  )

  if (firstDueDate < startDate) {
    throw new Error('Primeiro vencimento nao pode ser anterior ao inicio da vigencia.')
  }

  if (firstDueDate > endDate) {
    throw new Error('Primeiro vencimento nao pode ser posterior ao fim da vigencia.')
  }

  const weighted: Array<{
    number: number
    dueDate: Date
    referenceStartDate: Date
    referenceEndDate: Date
    cycleStartDate: Date
    cycleEndDate: Date
    cycleDays: number
    coveredDays: number
    chargeType: ForecastChargeType
    weight: Prisma.Decimal
  }> = []

  let dueDate = firstDueDate
  let number = 1

  for (let guard = 0; guard < 600; guard += 1) {
    const previousDueDate = addMonthsWithDay(dueDate, -1, input.dueDay)
    const cycleStartDate = addDays(previousDueDate, 1)
    const cycleEndDate = dueDate

    const referenceStartDate = startDate > cycleStartDate ? startDate : cycleStartDate
    const referenceEndDate = endDate < cycleEndDate ? endDate : cycleEndDate

    if (referenceEndDate >= referenceStartDate) {
      const cycleDays = daysInclusive(cycleStartDate, cycleEndDate)
      const coveredDays = daysInclusive(referenceStartDate, referenceEndDate)
      const chargeType: ForecastChargeType = coveredDays === cycleDays ? 'INTEGRAL' : 'PROPORCIONAL'

      weighted.push({
        number,
        dueDate,
        referenceStartDate,
        referenceEndDate,
        cycleStartDate,
        cycleEndDate,
        cycleDays,
        coveredDays,
        chargeType,
        weight: new Prisma.Decimal(coveredDays).div(cycleDays),
      })
      number += 1
    }

    if (referenceEndDate >= endDate) {
      break
    }

    dueDate = addMonthsWithDay(dueDate, 1, input.dueDay)
  }

  if (weighted.length === 0) {
    throw new Error('Nao foi possivel gerar previsao financeira para a vigencia informada.')
  }

  return weighted
}

function allocateByWeight(totalAmount: Prisma.Decimal, weights: Prisma.Decimal[]) {
  const totalCents = decimalToCents(totalAmount)
  const totalWeight = weights.reduce((acc, item) => acc.plus(item), new Prisma.Decimal(0))

  if (totalWeight.lte(0)) {
    throw new Error('Nao foi possivel calcular os pesos da previsao financeira.')
  }

  const projections = weights.map((weight, index) => {
    const rawCents = new Prisma.Decimal(totalCents).mul(weight).div(totalWeight)
    const baseCents = Number(rawCents.floor().toFixed(0))
    const fraction = rawCents.minus(baseCents)

    return {
      index,
      baseCents,
      fraction,
    }
  })

  let distributed = projections.reduce((acc, item) => acc + item.baseCents, 0)
  let remainder = totalCents - distributed

  projections
    .sort((a, b) => {
      if (a.fraction.eq(b.fraction)) {
        return a.index - b.index
      }
      return a.fraction.gt(b.fraction) ? -1 : 1
    })
    .forEach((item) => {
      if (remainder <= 0) {
        return
      }

      item.baseCents += 1
      remainder -= 1
      distributed += 1
    })

  if (distributed !== totalCents) {
    throw new Error('Falha ao distribuir centavos da previsao financeira.')
  }

  return projections
    .sort((a, b) => a.index - b.index)
    .map((item) => centsToDecimal(item.baseCents))
}

export function buildContractForecast(input: ForecastInput): ForecastItem[] {
  assertValidInput(input)

  const weighted = buildWeightedCycles(input)
  const amounts = allocateByWeight(
    input.totalAmount.toDecimalPlaces(2),
    weighted.map((item) => item.weight),
  )

  return weighted.map((item, index) => ({
    number: item.number,
    dueDate: item.dueDate,
    referenceStartDate: item.referenceStartDate,
    referenceEndDate: item.referenceEndDate,
    cycleStartDate: item.cycleStartDate,
    cycleEndDate: item.cycleEndDate,
    cycleDays: item.cycleDays,
    coveredDays: item.coveredDays,
    chargeType: item.chargeType,
    proportion: `${item.coveredDays}/${item.cycleDays}`,
    amount: amounts[index],
  }))
}
