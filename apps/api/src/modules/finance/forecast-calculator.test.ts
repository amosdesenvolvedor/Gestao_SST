import test from 'node:test'
import assert from 'node:assert/strict'
import { Prisma } from '@prisma/client'
import { buildContractForecast } from './forecast-calculator.js'

function parseDate(dateOnly: string) {
  const [year, month, day] = dateOnly.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
}

function sumAmounts(items: Array<{ amount: Prisma.Decimal }>) {
  return items.reduce((acc, item) => acc.plus(item.amount), new Prisma.Decimal(0)).toFixed(2)
}

test('periodos integrais em varios ciclos', () => {
  const result = buildContractForecast({
    startDate: parseDate('2026-01-11'),
    endDate: parseDate('2026-04-10'),
    dueDay: 10,
    totalAmount: new Prisma.Decimal('4000.00'),
    firstDueDate: parseDate('2026-02-10'),
  })

  assert.equal(result.length, 3)
  assert.ok(result.every((item) => item.chargeType === 'INTEGRAL'))
  assert.equal(sumAmounts(result), '4000.00')
})

test('inicio parcial do ciclo gera proporcional', () => {
  const result = buildContractForecast({
    startDate: parseDate('2026-01-20'),
    endDate: parseDate('2026-03-10'),
    dueDay: 10,
    totalAmount: new Prisma.Decimal('3000.00'),
    firstDueDate: parseDate('2026-02-10'),
  })

  assert.ok(result[0].chargeType === 'PROPORCIONAL')
  assert.equal(result[0].referenceStartDate.toISOString().slice(0, 10), '2026-01-20')
  assert.equal(result[0].referenceEndDate.toISOString().slice(0, 10), '2026-02-10')
  assert.equal(sumAmounts(result), '3000.00')
})

test('termino parcial do ciclo gera proporcional', () => {
  const result = buildContractForecast({
    startDate: parseDate('2026-01-11'),
    endDate: parseDate('2026-03-02'),
    dueDay: 10,
    totalAmount: new Prisma.Decimal('3000.00'),
    firstDueDate: parseDate('2026-02-10'),
  })

  const last = result[result.length - 1]
  assert.equal(last.chargeType, 'PROPORCIONAL')
  assert.equal(last.referenceEndDate.toISOString().slice(0, 10), '2026-03-02')
  assert.equal(sumAmounts(result), '3000.00')
})

test('vigencia inferior a um ciclo completo', () => {
  const result = buildContractForecast({
    startDate: parseDate('2026-01-25'),
    endDate: parseDate('2026-01-28'),
    dueDay: 31,
    totalAmount: new Prisma.Decimal('800.00'),
    firstDueDate: parseDate('2026-01-28'),
  })

  assert.equal(result.length, 1)
  assert.equal(result[0].chargeType, 'PROPORCIONAL')
  assert.equal(result[0].coveredDays, 4)
  assert.equal(sumAmounts(result), '800.00')
})

test('vencimento em dia inexistente usa clamp de mes e considera bissexto', () => {
  const result = buildContractForecast({
    startDate: parseDate('2028-01-31'),
    endDate: parseDate('2028-03-31'),
    dueDay: 31,
    totalAmount: new Prisma.Decimal('3000.00'),
    firstDueDate: parseDate('2028-02-29'),
  })

  assert.ok(result.some((item) => item.dueDate.toISOString().slice(0, 10) === '2028-02-29'))
  assert.equal(sumAmounts(result), '3000.00')
})

test('vigencia invalida gera erro', () => {
  assert.throws(
    () =>
      buildContractForecast({
        startDate: parseDate('2026-04-01'),
        endDate: parseDate('2026-03-01'),
        dueDay: 10,
        totalAmount: new Prisma.Decimal('1000.00'),
      }),
    /Vigencia invalida/,
  )
})
