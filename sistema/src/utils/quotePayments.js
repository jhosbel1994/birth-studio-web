import { initialDepositAmount, remainingBalanceAmount } from './cotizacionesWorkflow.js'

export const initialDepositId = id => `anticipo-50-${id}`
export const finalPaymentId = id => `saldo-final-${id}`

// Solo el saldo generado por el cambio de estado se revierte al reabrir.
export function planQuotePayments(quote, payments, now = new Date().toISOString()) {
  const deleteIds = payments.filter(p => quote.estado !== 'terminada'
    && p.id === finalPaymentId(quote.id)
    && p.automatico === true && p.origen === 'trabajo_terminado').map(p => p.id)
  const active = payments.filter(p => !deleteIds.includes(p.id))
  const writes = []
  let paid = active.reduce((sum, p) => sum + (Number(p.monto) || 0), 0)
  function add(id, amount, fecha, tipo, notas, origen) {
    if (amount <= 0) return
    const existing = active.find(p => p.id === id)
    const payment = {
      ...existing, id, cotizacionId: quote.id,
      monto: (Number(existing?.monto) || 0) + amount,
      fecha, tipo, notas, automatico: true, origen,
      createdAt: existing?.createdAt || now,
    }
    writes.push(payment)
    paid += amount
    return payment
  }
  let anticipo = null
  let pago = null
  if (['aceptada', 'terminada'].includes(quote.estado)) {
    anticipo = add(initialDepositId(quote.id), initialDepositAmount(quote.total) - paid,
      String(quote.acceptedAt || quote.createdAt || now).slice(0, 10), 'anticipo',
      'Abono inicial automático al aceptar la cotización (50%)', 'cotizacion_aceptada') || null
  }
  if (quote.estado === 'terminada') {
    pago = add(finalPaymentId(quote.id), remainingBalanceAmount(quote.total, paid),
      String(quote.completedAt || now).slice(0, 10), 'saldo',
      'Saldo final automático al marcar el trabajo como terminado', 'trabajo_terminado') || null
  }
  return { deleteIds, writes, anticipo, pago }
}
