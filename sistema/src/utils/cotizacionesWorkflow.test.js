import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  initialDepositAmount, remainingBalanceAmount, markQuoteSent, quoteExpiryDate,
  shouldAutoReject, autoRejectedQuote, quoteTrackingLabel,
} from './cotizacionesWorkflow.js'

test('the initial deposit is exactly half the quote total, rounded to CLP', () => {
  assert.equal(initialDepositAmount(809200), 404600)
  assert.equal(initialDepositAmount(83300), 41650)
  assert.equal(initialDepositAmount(101), 51)
  assert.equal(initialDepositAmount(-100), 0)
})

test('the final payment only charges the unpaid balance', () => {
  assert.equal(remainingBalanceAmount(809200, 404600), 404600)
  assert.equal(remainingBalanceAmount(809200, 500000), 309200)
  assert.equal(remainingBalanceAmount(809200, 809200), 0)
  assert.equal(remainingBalanceAmount(809200, 900000), 0)
})

test('sending starts a 15-day validity window and edits restart it', () => {
  const sent = markQuoteSent({ id: 'q1', estado: 'por_aceptar', validez: 15 }, new Date('2026-09-01T12:00:00Z'))
  assert.equal(quoteExpiryDate(sent).toISOString(), '2026-09-16T12:00:00.000Z')
  const edited = { ...sent, updatedAt: '2026-09-05T12:00:00.000Z' }
  assert.equal(quoteExpiryDate(edited).toISOString(), '2026-09-20T12:00:00.000Z')
})

test('only sent pending quotes expire', () => {
  const now = new Date('2026-09-17T12:00:00Z')
  const pending = { estado: 'por_aceptar', enviadaAt: '2026-09-01T12:00:00Z', updatedAt: '2026-09-01T12:00:00Z', validez: 15 }
  assert.equal(shouldAutoReject(pending, now), true)
  assert.equal(shouldAutoReject({ ...pending, estado: 'aceptada' }, now), false)
  assert.equal(shouldAutoReject({ ...pending, estado: 'rechazada' }, now), false)
  assert.equal(shouldAutoReject({ estado: 'por_aceptar', createdAt: '2026-08-01T12:00:00Z' }, now), false)
})

test('automatic rejection records its reason and the list shows remaining days', () => {
  const quote = { estado: 'por_aceptar', enviadaAt: '2026-09-01T12:00:00Z', updatedAt: '2026-09-01T12:00:00Z', validez: 15 }
  assert.equal(quoteTrackingLabel(quote, new Date('2026-09-14T12:00:00Z')), 'Vence en 2 días')
  const rejected = autoRejectedQuote(quote, new Date('2026-09-17T12:00:00Z'))
  assert.equal(rejected.estado, 'rechazada')
  assert.match(rejected.rechazoMotivo, /Sin respuesta/)
})
