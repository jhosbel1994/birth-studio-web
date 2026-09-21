// Registro de ingresos (pagos) para el MCP. Escribe en la MISMA colección
// 'pagos' que el sistema web y respeta su forma: ámbito Birth/Personal, vínculo
// por folio de cotización, tipo de pago y el "retiro" Birth->Personal (que
// además genera el gasto vinculado en Birth, igual que savePagoConRetiro).

const crypto = require('node:crypto')
const { getAdminDb } = require('../cotizaciones/firebase-repository.cjs')
const { normalizarFolio } = require('../cotizaciones/consultas.cjs')

const TIPOS = ['anticipo', 'saldo', 'total', 'otro']
const AMBITOS = ['birth', 'personal']

function clp(n) {
  return '$' + (Number(n) || 0).toLocaleString('es-CL')
}

// Busca una cotización por folio (5 dígitos). Devuelve { id, numero, clienteNombre, total } o null.
async function buscarCotizacionPorFolio(db, folio) {
  const numero = normalizarFolio(folio)
  if (!numero) return null
  const snap = await db.collection('cotizaciones').where('numero', '==', numero).get()
  if (!snap.docs.length) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

async function registrarIngreso(input = {}, options = {}) {
  const db = options.db || getAdminDb()

  const monto = Number(input.monto)
  const fecha = String(input.fecha || '').trim()
  const notas = String(input.notas || '').trim().slice(0, 300)
  const ambito = AMBITOS.includes(input.ambito) ? input.ambito : 'birth'
  const origenBirth = ambito === 'personal' && input.origen_birth === true
  let tipo = TIPOS.includes(input.tipo) ? input.tipo : 'otro'

  const errores = []
  if (!Number.isInteger(monto) || monto <= 0 || monto > 100000000) {
    errores.push('monto (entero en CLP mayor que 0, sin puntos ni símbolos)')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) errores.push('fecha (formato YYYY-MM-DD)')
  if (errores.length) {
    return { ok: false, code: 'INVALID', message: `Datos inválidos: ${errores.join('; ')}.` }
  }

  // Vínculo con cotización SOLO en ámbito Birth (igual que la web).
  let cotizacion = null
  if (ambito === 'birth' && input.folio) {
    cotizacion = await buscarCotizacionPorFolio(db, input.folio)
    if (!cotizacion) {
      return { ok: false, code: 'NOT_FOUND', message: `No se encontró la cotización con folio ${normalizarFolio(input.folio) || input.folio}.` }
    }
  }
  // En ámbito personal el pago no se vincula a cotización.
  if (ambito === 'personal') tipo = TIPOS.includes(input.tipo) ? input.tipo : 'otro'

  // Antiduplicado suave: mismo día + mismo monto + misma cotización + mismas notas.
  const mismoDia = await db.collection('pagos').where('fecha', '==', fecha).get()
  const duplicado = mismoDia.docs.find(doc => {
    const p = doc.data()
    return Number(p.monto) === monto
      && (p.cotizacionId || null) === (cotizacion ? cotizacion.id : null)
      && String(p.notas || '').trim().toLowerCase() === notas.toLowerCase()
  })
  if (duplicado) {
    return {
      ok: false, code: 'DUPLICATE', pagoId: duplicado.id,
      message: `Ya existe un ingreso igual (${clp(monto)}, ${fecha}). No se registró de nuevo.`,
    }
  }

  const now = new Date().toISOString()

  // Retiro Birth->Personal: crea además el gasto vinculado en Birth (categoría
  // "Retiro") para que en un solo paso baje el balance Birth y suba el Personal.
  let gastoVinculadoId = null
  if (origenBirth) {
    gastoVinculadoId = crypto.randomUUID()
    await db.collection('gastos').doc(gastoVinculadoId).set({
      id: gastoVinculadoId,
      descripcion: notas ? `Retiro: ${notas}` : 'Retiro a finanzas personales',
      monto,
      fecha,
      categoria: 'Retiro',
      ambito: 'birth',
      origen: 'mcp',
      createdAt: now,
    })
  }

  const id = crypto.randomUUID()
  const pago = {
    id,
    monto,
    fecha,
    tipo,
    notas,
    ambito,
    cotizacionId: cotizacion ? cotizacion.id : null,
    ...(origenBirth ? { origenBirth: true, gastoVinculadoId } : {}),
    origen: 'mcp',
    createdAt: now,
  }
  await db.collection('pagos').doc(id).set(pago)

  return { ok: true, pago, cotizacion }
}

module.exports = {
  registrarIngreso,
  buscarCotizacionPorFolio,
  TIPOS,
  AMBITOS,
}
