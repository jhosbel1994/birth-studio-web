// Regenera productos.data.json a partir de la FUENTE ÚNICA del cotizador:
// sistema/src/data/productos.js. Así el MCP responde con los precios EXACTOS
// del cotizador, sin transcribirlos a mano (nunca inventamos precios).
//
// Uso (desde la raíz del proyecto):
//   node server/cotizador/generar-precios.mjs
//
// Vuelve a correrlo cada vez que cambien los precios en productos.js.

import { writeFileSync } from 'node:fs'

const P = await import('../../sistema/src/data/productos.js')

const data = {
  MULTIPLICADORES: P.MULTIPLICADORES,
  CATEGORIAS: P.CATEGORIAS,
  PRODUCTOS: P.PRODUCTOS,
  TARJETAS: P.TARJETAS,
  BANDERAS_VELA: P.BANDERAS_VELA,
  VOLANTES: P.VOLANTES,
  BASTIDORES_PROVEEDOR: P.BASTIDORES_PROVEEDOR,
  BASTIDORES_BIRTH: P.BASTIDORES_BIRTH,
  PALOMAS: P.PALOMAS,
  PENDONES: P.PENDONES,
}

const out = new URL('./productos.data.json', import.meta.url)
writeFileSync(out, JSON.stringify(data, null, 2) + '\n')
console.log('✔ productos.data.json regenerado desde sistema/src/data/productos.js')
