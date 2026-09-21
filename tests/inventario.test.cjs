const test = require('node:test')
const assert = require('node:assert/strict')
const { makeFakeDb } = require('./helpers/fake-firestore.cjs')
const { consultarInventario, estadoStock } = require('../server/inventario/inventario-repository.cjs')

function seedDb() {
  return makeFakeDb({
    inventario: [
      { id: 'i1', nombre: 'Acrílico 3mm', tipo: 'plancha', cantidad: 10, stockVerde: 5, stockMinimo: 2, precio: 75000 },
      { id: 'i2', nombre: 'Vinilo adhesivo', tipo: 'm2', cantidad: 3, stockVerde: 10, stockMinimo: 2, precio: 5000 }, // amarillo
      { id: 'i3', nombre: 'Neón flex', tipo: 'unidad', cantidad: 1, stockVerde: 8, stockMinimo: 2, precio: 18000 }, // rojo (<= mínimo)
      { id: 'i4', nombre: 'Tornillos', tipo: 'caja', cantidad: 0, precio: 3000 }, // rojo (agotado)
    ],
  })
}

test('semáforo estadoStock verde/amarillo/rojo/ok', () => {
  assert.equal(estadoStock({ cantidad: 10, stockVerde: 5, stockMinimo: 2 }), 'verde')
  assert.equal(estadoStock({ cantidad: 3, stockVerde: 10, stockMinimo: 2 }), 'amarillo')
  assert.equal(estadoStock({ cantidad: 1, stockVerde: 8, stockMinimo: 2 }), 'rojo')
  assert.equal(estadoStock({ cantidad: 0 }), 'rojo')
  assert.equal(estadoStock({ cantidad: 5 }), 'ok')
})

test('lista el inventario con resumen y valor total', async () => {
  const r = await consultarInventario({}, { db: seedDb() })
  assert.equal(r.resumen.items, 4)
  // valor = 10*75000 + 3*5000 + 1*18000 + 0 = 750000 + 15000 + 18000 = 783000
  assert.equal(r.resumen.valorTotal, 783000)
  assert.equal(r.resumen.bajoStock, 3) // vinilo (amarillo) + neón (rojo) + tornillos (rojo/agotado)
  assert.equal(r.resumen.agotados, 1)
})

test('solo_bajo_stock devuelve solo amarillos y rojos', async () => {
  const r = await consultarInventario({ solo_bajo_stock: true }, { db: seedDb() })
  const estados = r.items.map(i => i.estado)
  assert.equal(estados.includes('verde'), false)
  assert.equal(estados.includes('ok'), false)
  assert.equal(r.items.length, 3) // vinilo, neón, tornillos
})

test('busca por nombre', async () => {
  const r = await consultarInventario({ busqueda: 'acrilico' }, { db: seedDb() })
  assert.equal(r.items.length, 1)
  assert.equal(r.items[0].nombre, 'Acrílico 3mm')
  assert.equal(r.items[0].valor, 750000)
})
