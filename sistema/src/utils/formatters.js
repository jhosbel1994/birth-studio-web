// CLP con puntos de miles: $437.500
export function clp(value) {
  if (!value && value !== 0) return '$0'
  return '$' + Math.round(value).toLocaleString('es-CL')
}

// Número de cotización formateado: #00239
export function numeroCotizacion(n) {
  return '#' + String(n).padStart(5, '0')
}

// Fecha legible: 02 Jun 2026
export function fechaCorta(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Fecha input value: YYYY-MM-DD
export function fechaInput(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toISOString().split('T')[0]
}

// Hoy en formato YYYY-MM-DD
export function hoy() {
  return new Date().toISOString().split('T')[0]
}

// Fecha + días
export function sumarDias(dateStr, dias) {
  const d = new Date(dateStr || new Date())
  d.setDate(d.getDate() + dias)
  return d.toISOString().split('T')[0]
}

// Label de estado
export const ESTADOS = {
  por_aceptar: { label: 'Por aceptar', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  aceptada: { label: 'Aceptada', color: 'bg-green-100 text-green-800 border-green-200' },
  rechazada: { label: 'Rechazada', color: 'bg-red-100 text-red-800 border-red-200' },
}

export const CATEGORIAS_GASTO = [
  'Materiales',
  'Gasolina',
  'Comida',
  'Insumos',
  'Arriendo',
  'Servicios externos',
  'Publicidad',
  'Otros',
]

export const CATEGORIAS_GALERIA = [
  'Señalética/Letreros',
  'Impresión y Gráfica',
  'Diseño y Digital',
  'Servicio',
  'Promoción',
]
