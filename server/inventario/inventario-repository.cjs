// Consulta de inventario para el MCP (solo lectura). Lee la MISMA colección
// 'inventario' que el sistema web y calcula el semáforo de stock con la MISMA
// lógica que Inventario.jsx (estadoStock), para no dar respuestas distintas a
// las que ve el usuario en pantalla.

const { getAdminDb } = require('../cotizaciones/firebase-repository.cjs')

// Semáforo con dos umbrales editables por ítem:
//   stockVerde  = óptimo (verde si la cantidad llega o supera este número)
//   stockMinimo = crítico (rojo si la cantidad cae a este número o menos)
// Entre ambos -> amarillo. Sin umbrales -> 'ok' (solo marca agotado en rojo).
// Devuelve 'verde' | 'amarillo' | 'rojo' | 'ok'.
function estadoStock(i = {}) {
  const c = Number(i.cantidad) || 0
  const rojo = Number(i.stockMinimo) || 0
  const verde = Number(i.stockVerde) || 0
  if (verde > 0 && c >= verde) return 'verde'
  if (c <= 0) return 'rojo'
  if (rojo > 0 && c <= rojo) return 'rojo'
  if (verde > 0) return 'amarillo'
  if (rojo > 0) return 'verde'
  return 'ok'
}

function norm(value) {
  return String(value == null ? '' : value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CL')
}

async function consultarInventario(input = {}, options = {}) {
  const db = options.db || getAdminDb()
  const limite = Math.min(Math.max(parseInt(input.limite, 10) || 50, 1), 200)
  const busqueda = norm(input.busqueda)
  const soloBajoStock = input.solo_bajo_stock === true

  const snap = await db.collection('inventario').get()
  let items = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }))

  const filas = items.map(it => {
    const cantidad = Number(it.cantidad) || 0
    const precio = Number(it.precio) || 0
    const estado = estadoStock(it)
    return {
      nombre: it.nombre || '',
      cantidad,
      unidad: it.tipo || 'unidad',
      estado, // verde | amarillo | rojo | ok
      precioUnitario: precio,
      valor: Math.round(cantidad * precio),
      stockMinimo: Number(it.stockMinimo) || 0,
      stockVerde: Number(it.stockVerde) || 0,
      nota: it.nota || '',
    }
  })

  let resultado = filas
  if (busqueda) resultado = resultado.filter(f => norm(f.nombre).includes(busqueda))
  if (soloBajoStock) resultado = resultado.filter(f => f.estado === 'rojo' || f.estado === 'amarillo')

  resultado.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-CL'))

  // Resumen sobre el conjunto filtrado.
  const valorTotal = resultado.reduce((s, f) => s + f.valor, 0)
  const bajoStock = resultado.filter(f => f.estado === 'rojo' || f.estado === 'amarillo').length
  const agotados = resultado.filter(f => f.cantidad <= 0).length

  const total = resultado.length
  return {
    ok: true,
    total,
    truncado: total > limite,
    resumen: { items: total, valorTotal, bajoStock, agotados },
    items: resultado.slice(0, limite),
  }
}

module.exports = {
  consultarInventario,
  estadoStock,
}
