// Fases de avance de un trabajo aceptado. El cliente las ve en la página
// pública de seguimiento (QR/link). El ORDEN define el timeline.
//
// OJO: si cambias los ids o el orden, actualiza también api/seguimiento.js
// (la página pública repite estas 4 fases por ser una función serverless CJS
// que no puede importar este módulo ESM).

export const FASES = [
  { id: 'inicial', label: 'Fase inicial', emoji: '🟡', color: '#eab308' },
  { id: 'mitad', label: 'A mitad de fase', emoji: '🟠', color: '#f97316' },
  { id: 'termino', label: 'En término', emoji: '🔵', color: '#3b82f6' },
  { id: 'entregado', label: 'Entregado', emoji: '✅', color: '#16a34a' },
]

export const FASE_IDS = FASES.map(f => f.id)

export const faseInfo = (id) => FASES.find(f => f.id === id) || null

export const faseIndex = (id) => FASE_IDS.indexOf(id)

export function faseLabel(id) {
  const f = faseInfo(id)
  return f ? f.label : 'Sin iniciar'
}

// URL pública de seguimiento para un token. En el navegador toma el origin
// actual; en producción cae a bspublicidad.cl.
export function urlSeguimiento(token, origin) {
  const base = origin
    || (typeof window !== 'undefined' && window.location ? window.location.origin : '')
    || 'https://www.bspublicidad.cl'
  return `${base}/api/seguimiento?t=${encodeURIComponent(token)}`
}
