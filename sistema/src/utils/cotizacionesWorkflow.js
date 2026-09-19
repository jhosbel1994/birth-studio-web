const DAY_MS = 24 * 60 * 60 * 1000

export const DEFAULT_QUOTE_VALIDITY_DAYS = 15

function asDate(value) {
  if (!value) return null
  if (value?.toDate) return value.toDate()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function initialDepositAmount(total) {
  return Math.max(0, Math.round((Number(total) || 0) * 0.5))
}

export function remainingBalanceAmount(total, paid) {
  return Math.max(0, Math.round(Number(total) || 0) - Math.round(Number(paid) || 0))
}

export function markQuoteSent(cotizacion, now = new Date()) {
  const iso = now.toISOString()
  return {
    ...cotizacion,
    enviadaAt: iso,
    updatedAt: iso,
    rechazoAutomaticoAt: null,
    rechazoMotivo: null,
  }
}

export function quoteExpiryDate(cotizacion) {
  if (cotizacion?.estado !== 'por_aceptar' || !cotizacion?.enviadaAt) return null
  const sent = asDate(cotizacion.enviadaAt)
  const updated = asDate(cotizacion.updatedAt)
  if (!sent) return null
  const activity = updated && updated > sent ? updated : sent
  const validity = Math.max(1, Number.parseInt(cotizacion.validez, 10) || DEFAULT_QUOTE_VALIDITY_DAYS)
  return new Date(activity.getTime() + validity * DAY_MS)
}

export function shouldAutoReject(cotizacion, now = new Date()) {
  const expiry = quoteExpiryDate(cotizacion)
  return !!expiry && expiry.getTime() <= now.getTime()
}

export function autoRejectedQuote(cotizacion, now = new Date()) {
  const iso = now.toISOString()
  return {
    ...cotizacion,
    estado: 'rechazada',
    rechazoAutomaticoAt: iso,
    rechazoMotivo: 'Sin respuesta durante el plazo de vigencia',
    updatedAt: iso,
  }
}

export function quoteTrackingLabel(cotizacion, now = new Date()) {
  const expiry = quoteExpiryDate(cotizacion)
  if (!expiry) return ''
  const days = Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / DAY_MS))
  if (days === 0) return 'Vence hoy'
  if (days === 1) return 'Vence mañana'
  return `Vence en ${days} días`
}

