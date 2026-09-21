// Consulta de cotizaciones para el MCP (solo lectura). Lee las MISMAS
// colecciones que el sistema web: 'cotizaciones', 'clientes' y 'pagos'.
// Permite filtrar por estado, empresa, nombre de persona, RUT o folio, y
// calcula el saldo real de cada cotización a partir de los pagos registrados.

const { getAdminDb } = require('./firebase-repository.cjs')
const { normalizeSearch, normalizeRut } = require('./domain.cjs')

const ESTADOS = ['por_aceptar', 'aceptada', 'terminada', 'rechazada']
const ESTADO_ETIQUETA = {
  por_aceptar: 'Por aceptar',
  aceptada: 'Aceptada',
  terminada: 'Terminada',
  rechazada: 'Rechazada',
}

// Normaliza un folio a 5 dígitos: "239", "#00239", "00239" -> "00239".
function normalizarFolio(valor) {
  const soloDigitos = String(valor || '').replace(/\D/g, '')
  if (!soloDigitos) return ''
  return soloDigitos.padStart(5, '0')
}

async function leerColeccion(db, nombre) {
  const snap = await db.collection(nombre).get()
  return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }))
}

async function consultarCotizaciones(input = {}, options = {}) {
  const db = options.db || getAdminDb()
  const limite = Math.min(Math.max(parseInt(input.limite, 10) || 20, 1), 100)

  // Estado pedido: 'pendientes' = trabajos aceptados sin terminar.
  let estadoFiltro = String(input.estado || 'todas').trim().toLowerCase()
  if (estadoFiltro === 'pendientes') estadoFiltro = 'aceptada'
  if (estadoFiltro !== 'todas' && !ESTADOS.includes(estadoFiltro)) estadoFiltro = 'todas'

  const folioFiltro = normalizarFolio(input.folio)
  const empresaFiltro = normalizeSearch(input.empresa)
  const nombreFiltro = normalizeSearch(input.nombre)
  const rutFiltro = normalizeRut(input.rut)
  const busqueda = normalizeSearch(input.busqueda)

  const [cotizaciones, clientes, pagos] = await Promise.all([
    leerColeccion(db, 'cotizaciones'),
    leerColeccion(db, 'clientes'),
    leerColeccion(db, 'pagos'),
  ])

  const clientePorId = new Map(clientes.map(c => [c.id, c]))
  const pagadoPorCotizacion = new Map()
  for (const p of pagos) {
    if (!p.cotizacionId) continue
    pagadoPorCotizacion.set(p.cotizacionId, (pagadoPorCotizacion.get(p.cotizacionId) || 0) + (Number(p.monto) || 0))
  }

  const filas = cotizaciones.map(cot => {
    const cliente = clientePorId.get(cot.clienteId) || {}
    const nombre = cliente.nombre || cot.clienteNombre || ''
    const empresa = cliente.empresa || ''
    const rut = cliente.rut || ''
    const total = Number(cot.total) || 0
    const pagado = pagadoPorCotizacion.get(cot.id) || 0
    return {
      id: cot.id,
      folio: `#${cot.numero || ''}`,
      numero: cot.numero || '',
      cliente: nombre,
      empresa,
      rut,
      estado: cot.estado || 'por_aceptar',
      estadoEtiqueta: ESTADO_ETIQUETA[cot.estado] || 'Por aceptar',
      tipoProyecto: cot.tipoProyecto || 'publicidad',
      descripcion: cot.descripcion || '',
      total,
      pagado,
      saldoPendiente: Math.max(0, total - pagado),
      fecha: cot.fecha || '',
      fechaVencimiento: cot.fechaVencimiento || '',
      createdAt: cot.createdAt || '',
      _busqueda: normalizeSearch(`${nombre} ${empresa} ${cot.numero || ''} ${cot.descripcion || ''}`),
      _rutNorm: normalizeRut(rut),
      _empresaNorm: normalizeSearch(empresa),
      _nombreNorm: normalizeSearch(nombre),
    }
  })

  let resultado = filas
  if (folioFiltro) resultado = resultado.filter(f => normalizarFolio(f.numero) === folioFiltro)
  if (estadoFiltro !== 'todas') resultado = resultado.filter(f => f.estado === estadoFiltro)
  if (empresaFiltro) resultado = resultado.filter(f => f._empresaNorm.includes(empresaFiltro))
  if (nombreFiltro) resultado = resultado.filter(f => f._nombreNorm.includes(nombreFiltro) || f._empresaNorm.includes(nombreFiltro))
  if (rutFiltro) resultado = resultado.filter(f => f._rutNorm && f._rutNorm.includes(rutFiltro))
  if (busqueda) resultado = resultado.filter(f => f._busqueda.includes(busqueda))

  // Conteo por estado del conjunto filtrado (antes de recortar por límite).
  const conteos = { por_aceptar: 0, aceptada: 0, terminada: 0, rechazada: 0 }
  for (const f of resultado) if (conteos[f.estado] != null) conteos[f.estado] += 1

  // Orden: folio descendente (las más nuevas primero).
  resultado.sort((a, b) => normalizarFolio(b.numero).localeCompare(normalizarFolio(a.numero)))

  const total = resultado.length
  const items = resultado.slice(0, limite).map(f => {
    const { _busqueda, _rutNorm, _empresaNorm, _nombreNorm, ...limpio } = f
    return limpio
  })

  return { ok: true, total, truncado: total > limite, conteos, items }
}

module.exports = {
  consultarCotizaciones,
  normalizarFolio,
  ESTADOS,
  ESTADO_ETIQUETA,
}
