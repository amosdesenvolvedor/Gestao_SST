import test from 'node:test'
import assert from 'node:assert/strict'
import { Prisma } from '@prisma/client'
import { applyCommercialConditionToForecast } from './commercial-terms-calculator.js'
import type { ForecastItem } from './forecast-calculator.js'

function parseDate(dateOnly: string) {
  const [year, month, day] = dateOnly.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
}

function makeForecast(amounts: string[]): ForecastItem[] {
  const baseStart = parseDate('2026-01-01')

  return amounts.map((amount, index) => {
    const refStart = new Date(baseStart)
    refStart.setUTCMonth(refStart.getUTCMonth() + index)

    const refEnd = new Date(refStart)
    refEnd.setUTCMonth(refEnd.getUTCMonth() + 1)
    refEnd.setUTCDate(refEnd.getUTCDate() - 1)

    return {
      number: index + 1,
      dueDate: refEnd,
      referenceStartDate: refStart,
      referenceEndDate: refEnd,
      cycleStartDate: refStart,
      cycleEndDate: refEnd,
      cycleDays: 30,
      coveredDays: 30,
      chargeType: 'INTEGRAL',
      proportion: '30/30',
      amount: new Prisma.Decimal(amount),
    }
  })
}

function sum(items: Array<{ adjustedAmount: Prisma.Decimal }>) {
  return items.reduce((acc, item) => acc.plus(item.adjustedAmount), new Prisma.Decimal(0)).toFixed(2)
}

test('contrato sem desconto preserva valores originais', () => {
  const forecast = makeForecast(['1000.00', '1000.00', '1000.00'])

  const computed = applyCommercialConditionToForecast(forecast, {
    modality: 'MONTHLY_RECURRING',
    paymentMethod: 'PIX',
    discountPercent: new Prisma.Decimal('0'),
    discountFixedAmount: new Prisma.Decimal('0'),
  })

  assert.equal(computed.discountAmount.toFixed(2), '0.00')
  assert.equal(sum(computed.allocations), '3000.00')
  assert.ok(computed.allocations.every((item) => item.originalAmount.eq(item.adjustedAmount)))
})

test('desconto percentual personalizado em modalidade mensal', () => {
  const forecast = makeForecast(['1000.00', '1000.00'])

  const computed = applyCommercialConditionToForecast(forecast, {
    modality: 'MONTHLY_RECURRING',
    paymentMethod: 'PIX',
    discountPercent: new Prisma.Decimal('10'),
  })

  assert.equal(computed.eligibleAmount.toFixed(2), '2000.00')
  assert.equal(computed.discountAmount.toFixed(2), '200.00')
  assert.equal(sum(computed.allocations), '1800.00')
})

test('desconto fixo personalizado com distribuicao exata de centavos', () => {
  const forecast = makeForecast(['999.99', '1000.01'])

  const computed = applyCommercialConditionToForecast(forecast, {
    modality: 'MONTHLY_RECURRING',
    paymentMethod: 'PIX',
    discountFixedAmount: new Prisma.Decimal('100.00'),
  })

  assert.equal(computed.discountAmount.toFixed(2), '100.00')
  assert.equal(sum(computed.allocations), '1900.00')
})

test('pagamento anual antecipado cobre periodo selecionado e marca parcelas cobertas', () => {
  const forecast = makeForecast([
    '1000.00',
    '1000.00',
    '1000.00',
    '1000.00',
    '1000.00',
    '1000.00',
    '1000.00',
    '1000.00',
    '1000.00',
    '1000.00',
    '1000.00',
    '1000.00',
    '1000.00',
  ])

  const computed = applyCommercialConditionToForecast(forecast, {
    modality: 'ANNUAL_PIX_ADVANCE',
    paymentMethod: 'PIX',
    advanceMonths: 12,
    discountPercent: new Prisma.Decimal('7'),
  })

  assert.equal(computed.eligibleAmount.toFixed(2), '12000.00')
  assert.equal(computed.discountAmount.toFixed(2), '840.00')
  assert.equal(computed.netAmount.toFixed(2), '11160.00')
  assert.equal(computed.allocations.filter((item) => item.coveredByAdvance).length, 12)
  assert.equal(computed.allocations[12].adjustedAmount.toFixed(2), '1000.00')
})

test('antecipacao multi-anual limita cobertura ao total de competencias da vigencia', () => {
  const forecast = makeForecast(new Array(18).fill('1000.00'))

  const computed = applyCommercialConditionToForecast(forecast, {
    modality: 'ANNUAL_PIX_ADVANCE',
    paymentMethod: 'PIX',
    advanceMonths: 24,
    discountPercent: new Prisma.Decimal('5'),
  })

  assert.equal(computed.eligibleAmount.toFixed(2), '18000.00')
  assert.equal(computed.discountAmount.toFixed(2), '900.00')
  assert.equal(computed.allocations.filter((item) => item.coveredByAdvance).length, 18)
})

test('impede desconto acima da base elegivel', () => {
  const forecast = makeForecast(['1000.00'])

  assert.throws(
    () =>
      applyCommercialConditionToForecast(forecast, {
        modality: 'MONTHLY_RECURRING',
        paymentMethod: 'PIX',
        discountFixedAmount: new Prisma.Decimal('1000.01'),
      }),
    /Desconto excede o valor elegivel/,
  )
})

test('pagamento anual antecipado exige pix', () => {
  const forecast = makeForecast(['1000.00'])

  assert.throws(
    () =>
      applyCommercialConditionToForecast(forecast, {
        modality: 'ANNUAL_PIX_ADVANCE',
        paymentMethod: 'BOLETO',
        advanceMonths: 12,
      }),
    /deve utilizar PIX/,
  )
})
