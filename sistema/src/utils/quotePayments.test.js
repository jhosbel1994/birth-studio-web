import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planQuotePayments, finalPaymentId } from './quotePayments.js'

const quote = { id: 'q1', total: 100000, estado: 'aceptada', acceptedAt: '2026-09-01T12:00:00Z' }
const now = '2026-10-19T12:00:00Z'
function apply(payments, plan) {
  const next = new Map(payments.map(p => [p.id, p]))
  plan.deleteIds.forEach(id => next.delete(id))
  plan.writes.forEach(p => next.set(p.id, p))
  return [...next.values()]
}
const sum = payments => payments.reduce((n, p) => n + p.monto, 0)

test('accept, finish, reopen and finish again reverses the final 50% without duplicating income', () => {
  let payments = apply([], planQuotePayments(quote, [], now))
  assert.equal(sum(payments), 50000)
  const finished = { ...quote, estado: 'terminada', completedAt: now }
  payments = apply(payments, planQuotePayments(finished, payments, now))
  assert.equal(sum(payments), 100000)
  const reopened = planQuotePayments(quote, payments, now)
  assert.deepEqual(reopened.deleteIds, [finalPaymentId(quote.id)])
  payments = apply(payments, reopened)
  assert.equal(sum(payments), 50000)
  assert.deepEqual(planQuotePayments(quote, payments, now).writes, [])
  payments = apply(payments, planQuotePayments(finished, payments, now))
  assert.equal(sum(payments), 100000)
  assert.deepEqual(planQuotePayments(finished, payments, now).writes, [])
})

test('repairs already accepted quotes with a leftover final payment and preserves manual payments', () => {
  const manual = { id: 'manual', cotizacionId: 'q1', monto: 20000, tipo: 'saldo' }
  let payments = apply([manual], planQuotePayments({ ...quote, estado: 'terminada' }, [manual], now))
  assert.equal(sum(payments), 100000)
  const deposit = payments.find(p => p.tipo === 'anticipo')
  payments = apply(payments, planQuotePayments(quote, payments, now))
  assert.equal(sum(payments), 50000)
  assert.deepEqual(payments.find(p => p.id === manual.id), manual)
  assert.deepEqual(payments.find(p => p.id === deposit.id), deposit)
})

test('reopening a fully manually paid quote does not remove actual income', () => {
  const payments = [{ id: 'manual-full', monto: 100000, tipo: 'saldo' }]
  assert.deepEqual(planQuotePayments(quote, payments, now), {
    deleteIds: [], writes: [], anticipo: null, pago: null,
  })
})

test('a final payment identifier alone does not authorize deleting a manual payment', () => {
  const payments = [{ id: finalPaymentId('q1'), monto: 50000, tipo: 'saldo' }]
  assert.deepEqual(planQuotePayments(quote, payments, now).deleteIds, [])
})

test('finishing charges only the unpaid balance and keeps its completion date', () => {
  const payments = [{ id: 'manual', monto: 70000 }]
  const plan = planQuotePayments({ ...quote, estado: 'terminada', completedAt: now }, payments, now)
  assert.equal(plan.anticipo, null)
  assert.equal(plan.pago.monto, 30000)
  assert.equal(plan.pago.fecha, '2026-10-19')
})
