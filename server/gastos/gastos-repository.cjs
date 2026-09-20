// Lógica server-side de gastos para el MCP: registrar un gasto y consultar
// balances. Reutiliza la MISMA conexión Firestore (cuenta de servicio) y la
// MISMA colección 'gastos' que usa el flujo web, para no crear datos paralelos.

const crypto = require('node:crypto')
const { getAdminDb } = require('../cotizaciones/firebase-repository.cjs')

// Mismas 8 categorías que el sistema web (CATEGORIAS_GASTO en formatters.js).
const CATEGORIAS = [
  'Materiales', 'Gasolina', 'Comida', 'Insumos',
  'Arriendo', 'Servicios externos', 'Publicidad', 'Otros',
]

function clp(n) {
  return '$' + (Number(n) || 0).toLocaleString('es-CL')
}
function pad(n) {
  return String(n).padStart(2, '0')
}

// ─── Fechas en zona horaria America/Santiago ──────────────────────────────────

function santiagoHoy() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const v = Object.fromEntries(parts.map(p => [p.type, p.value]))
  return `${v.year}-${v.month}-${v.day}`
}
// Suma días a una fecha 'YYYY-MM-DD' usando UTC (evita corrimientos por zona).
function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}
// Día de la semana con lunes=0 (Chile).
function weekdayMon0(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}

// Devuelve { inicio, fin, etiqueta } para el período pedido (hora local de Chile).
function rangoFechas(input = {}) {
  const periodo = String(input.periodo || 'mes')
  const hoy = santiagoHoy()
  const [y, m, d] = hoy.split('-').map(Number)
  const ultimoDiaMes = new Date(Date.UTC(y, m, 0)).getUTCDate()

  if (periodo === 'personalizado') {
    const re = /^\d{4}-\d{2}-\d{2}$/
    const ini = re.test(input.fecha_inicio) ? input.fecha_inicio : hoy
    const fin = re.test(input.fecha_fin) ? input.fecha_fin : hoy
    return { inicio: ini, fin, etiqueta: `${ini} a ${fin}` }
  }
  if (periodo === 'hoy' || periodo === 'diario') {
    return { inicio: hoy, fin: hoy, etiqueta: `hoy (${hoy})` }
  }
  if (periodo === 'semana' || periodo === 'semanal') {
    const ini = addDays(hoy, -weekdayMon0(hoy))
    return { inicio: ini, fin: addDays(ini, 6), etiqueta: `semana (${ini} a ${addDays(ini, 6)})` }
  }
  if (periodo === 'quincena' || periodo === 'quincenal') {
    if (d <= 15) return { inicio: `${y}-${pad(m)}-01`, fin: `${y}-${pad(m)}-15`, etiqueta: `1ª quincena ${y}-${pad(m)}` }
    return { inicio: `${y}-${pad(m)}-16`, fin: `${y}-${pad(m)}-${pad(ultimoDiaMes)}`, etiqueta: `2ª quincena ${y}-${pad(m)}` }
  }
  // mes (por defecto)
  return { inicio: `${y}-${pad(m)}-01`, fin: `${y}-${pad(m)}-${pad(ultimoDiaMes)}`, etiqueta: `mes ${y}-${pad(m)}` }
}

// ─── Registrar gasto ──────────────────────────────────────────────────────────

async function registrarGasto(input = {}, options = {}) {
  const db = options.db || getAdminDb()

  const descripcion = String(input.descripcion || '').trim()
  const monto = Number(input.monto)
  const fecha = String(input.fecha || '').trim()
  const categoria = String(input.categoria || '').trim()
  const notas = String(input.notas || '').trim().slice(0, 500)

  const errores = []
  if (!descripcion || descripcion.length > 200) errores.push('descripcion (texto de 1 a 200 caracteres)')
  if (!Number.isInteger(monto) || monto <= 0 || monto > 100000000) errores.push('monto (entero en CLP mayor que 0, sin puntos ni símbolos)')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) errores.push('fecha (formato YYYY-MM-DD)')
  if (!CATEGORIAS.includes(categoria)) errores.push(`categoria (una de: ${CATEGORIAS.join(', ')})`)
  if (errores.length) {
    return { ok: false, code: 'INVALID', message: `Datos inválidos: ${errores.join('; ')}.` }
  }

  // Antiduplicado: mismo día + mismo monto + misma descripción.
  const mismoDia = await db.collection('gastos').where('fecha', '==', fecha).get()
  const duplicado = mismoDia.docs.find(doc => {
    const g = doc.data()
    return Number(g.monto) === monto
      && String(g.descripcion || '').trim().toLowerCase() === descripcion.toLowerCase()
  })
  if (duplicado) {
    return {
      ok: false, code: 'DUPLICATE', gastoId: duplicado.id,
      message: `Ya existe un gasto igual (${descripcion}, ${clp(monto)}, ${fecha}). No se registró de nuevo.`,
    }
  }

  const id = crypto.randomUUID()
  const gasto = {
    id, descripcion, monto, fecha, categoria, notas,
    origen: 'mcp', createdAt: new Date().toISOString(),
  }
  await db.collection('gastos').doc(id).set(gasto)
  return { ok: true, gasto }
}

// ─── Consultar balance ────────────────────────────────────────────────────────

async function consultarBalance(input = {}, options = {}) {
  const db = options.db || getAdminDb()
  const { inicio, fin, etiqueta } = rangoFechas(input)
  const agruparPor = ['categoria', 'dia', 'proveedor'].includes(input.agrupar_por) ? input.agrupar_por : 'categoria'
  const filtroCategoria = CATEGORIAS.includes(input.categoria) ? input.categoria : null

  const snap = await db.collection('gastos')
    .where('fecha', '>=', inicio).where('fecha', '<=', fin).get()
  let gastos = snap.docs.map(doc => doc.data())
  if (filtroCategoria) gastos = gastos.filter(g => g.categoria === filtroCategoria)

  const total = gastos.reduce((s, g) => s + (Number(g.monto) || 0), 0)
  const grupos = {}
  for (const g of gastos) {
    const clave = agruparPor === 'categoria' ? (g.categoria || 'Otros')
      : agruparPor === 'dia' ? g.fecha
      : (g.descripcion || '—')
    grupos[clave] = (grupos[clave] || 0) + (Number(g.monto) || 0)
  }

  let ingresos = null
  let neto = null
  if (input.incluir_ingresos) {
    const psnap = await db.collection('pagos')
      .where('fecha', '>=', inicio).where('fecha', '<=', fin).get()
    ingresos = psnap.docs.reduce((s, p) => s + (Number(p.data().monto) || 0), 0)
    neto = ingresos - total
  }

  return {
    ok: true, inicio, fin, etiqueta, total, cantidad: gastos.length,
    agruparPor, grupos, filtroCategoria, ingresos, neto,
  }
}

module.exports = {
  CATEGORIAS,
  registrarGasto,
  consultarBalance,
  rangoFechas,
  santiagoHoy,
}
