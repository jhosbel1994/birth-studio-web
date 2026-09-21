const test = require('node:test')
const assert = require('node:assert/strict')
const precios = require('../server/cotizador/precios-repository.cjs')

test('sin criterio devuelve la lista de categorías y los multiplicadores', () => {
  const r = precios.buscarPrecios({})
  assert.equal(r.modo, 'categorias')
  assert.ok(r.categorias.length > 10)
  assert.deepEqual(r.multiplicadores.map(m => m.valor), [2, 3, 4])
})

test('busca por texto y encuentra el acrílico 3mm con su precio exacto', () => {
  const r = precios.buscarPrecios({ busqueda: 'acrilico 3mm' })
  assert.equal(r.modo, 'resultados')
  const plancha = r.resultados.find(f => f.nombre.includes('Blanco/Negro/Transparente 3mm'))
  assert.ok(plancha, 'debe encontrar la plancha de acrílico 3mm')
  // Precio EXACTO del cotizador (guarda contra desincronización del JSON).
  assert.equal(plancha.precio, 75000)
  assert.equal(plancha.aplicaMultiplicador, true)
})

test('busca "led" y trae las calugas LED', () => {
  const r = precios.buscarPrecios({ busqueda: 'led' })
  const calugas = r.resultados.find(f => f.nombre.includes('Calugas LED'))
  assert.ok(calugas)
  assert.equal(calugas.precio, 37000)
})

test('filtra por categoría', () => {
  const r = precios.buscarPrecios({ categoria: 'Sintra' })
  assert.ok(r.resultados.length > 0)
  assert.equal(r.resultados.every(f => /sintra/i.test(f.grupo)), true)
})

test('el índice aplana todo el catálogo (más de 100 filas)', () => {
  assert.ok(precios._INDICE.length > 100)
})
