// Consulta de precios del cotizador para el MCP (solo lectura).
// Los datos salen de productos.data.json, que se genera desde la fuente única
// del front (sistema/src/data/productos.js) con generar-precios.mjs. Nunca se
// escriben precios a mano aquí: si cambian, se regenera el JSON.

const CATALOGO = require('./productos.data.json')

// ─── Normalización de texto para búsquedas (sin tildes, minúsculas) ───────────
function norm(value) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CL')
}

const CATEGORIA_LABEL = Object.fromEntries((CATALOGO.CATEGORIAS || []).map(c => [c.id, c.label]))

// Aplanar TODO el catálogo a filas buscables:
//   { grupo, nombre, precio, unidad, aplicaMultiplicador, nota }
function construirIndice() {
  const filas = []
  const push = (grupo, nombre, precio, unidad, aplicaMultiplicador, nota) => {
    filas.push({ grupo, nombre, precio, unidad, aplicaMultiplicador: !!aplicaMultiplicador, nota: nota || '' })
  }

  // PRODUCTOS (mapa por categoría)
  for (const [catId, items] of Object.entries(CATALOGO.PRODUCTOS || {})) {
    const grupo = CATEGORIA_LABEL[catId] || catId
    for (const it of items) push(grupo, it.nombre, it.precio, it.unidad, it.aplicaMultiplicador, it.nota)
  }
  // Pendones roller (precio final)
  for (const p of CATALOGO.PENDONES || []) push('Pendones Roller', p.nombre, p.precio, 'unidad', false)
  // Bandera vela
  for (const b of CATALOGO.BANDERAS_VELA || []) push('Bandera Vela', b.nombre, b.precio, 'unidad', b.aplicaMultiplicador)
  // Bastidores Birth (venta por m²)
  for (const b of CATALOGO.BASTIDORES_BIRTH || []) push('Bastidores (venta Birth)', b.nombre, b.precio, b.unidad, false)
  // Bastidores proveedor (una cara / doble cara)
  for (const b of CATALOGO.BASTIDORES_PROVEEDOR || []) {
    push('Bastidores (proveedor)', `${b.nombre} — 1 cara`, b.precioCara, 'unidad', false, `área ${b.area} m²`)
    push('Bastidores (proveedor)', `${b.nombre} — doble cara`, b.precioDoble, 'unidad', false, `área ${b.area} m²`)
  }
  // Palomas publicitarias (doble cara)
  for (const p of CATALOGO.PALOMAS || []) push('Palomas publicitarias', p.nombre, p.precio, 'unidad', false)
  // Tarjetas de presentación (precio proveedor por cantidad y caras)
  const tj = CATALOGO.TARJETAS
  if (tj?.preciosProveedor) {
    for (const [cant, caras] of Object.entries(tj.preciosProveedor)) {
      for (const [cara, precio] of Object.entries(caras)) {
        const caraTxt = cara === '1cara' ? '1 cara' : '2 caras'
        push('Tarjetas de presentación', `Tarjetas ${cant} u — ${caraTxt}`, precio, `pack ${cant}`, false, 'precio proveedor')
      }
    }
  }
  // Volantes (precio final por medida, caras y cantidad)
  const vl = CATALOGO.VOLANTES
  if (vl?.precios) {
    for (const [medida, caras] of Object.entries(vl.precios)) {
      for (const [cara, cants] of Object.entries(caras)) {
        for (const [cant, precio] of Object.entries(cants)) {
          push('Volantes', `Volante ${medida} ${cara} — ${cant} u`, precio, `pack ${cant}`, false)
        }
      }
    }
  }
  return filas
}

const INDICE = construirIndice()

// Multiplicadores de instalación (para explicar el precio final de los ítems
// que aplican multiplicador: precio proveedor × valor).
const MULTIPLICADORES = CATALOGO.MULTIPLICADORES || []

// ─── Búsqueda ─────────────────────────────────────────────────────────────────
function buscarPrecios(input = {}) {
  const limite = Math.min(Math.max(parseInt(input.limite, 10) || 30, 1), 60)
  const q = norm(input.busqueda)
  const cat = norm(input.categoria)

  // Sin criterio: devolver el listado de categorías para que el modelo elija.
  if (!q && !cat) {
    return {
      ok: true,
      modo: 'categorias',
      categorias: (CATALOGO.CATEGORIAS || []).map(c => c.label),
      multiplicadores: MULTIPLICADORES,
      total: 0,
      resultados: [],
    }
  }

  let filas = INDICE
  if (cat) {
    filas = filas.filter(f => norm(f.grupo).includes(cat))
  }
  if (q) {
    const tokens = q.split(/\s+/).filter(Boolean)
    filas = filas.filter(f => {
      const hay = norm(`${f.grupo} ${f.nombre} ${f.nota}`)
      return hay.includes(q) || tokens.every(t => hay.includes(t))
    })
  }

  const total = filas.length
  return {
    ok: true,
    modo: 'resultados',
    total,
    resultados: filas.slice(0, limite),
    multiplicadores: MULTIPLICADORES,
    truncado: total > limite,
  }
}

module.exports = {
  buscarPrecios,
  construirIndice,
  MULTIPLICADORES,
  _INDICE: INDICE,
}
