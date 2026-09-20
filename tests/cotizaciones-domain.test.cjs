const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  DomainError,
  buildQuoteRecord,
  formatFolio,
  matchClients,
  santiagoDate,
  validateRequest,
} = require('../server/cotizaciones/domain.cjs')

function validBody(overrides = {}) {
  return {
    cliente: { nombre: 'Óptica Cielo Azul', crear_si_no_existe: true },
    tipo_proyecto: 'publicidad',
    proyecto: 'Letrero retroiluminado',
    items: [
      { descripcion: 'Letrero corpóreo', cantidad: 1, precio_unitario_neto: 580000 },
      { descripcion: 'Instalación', cantidad: 1, precio_unitario_neto: 100000 },
    ],
    ...overrides,
  }
}

test('validates and calculates the exact quote totals', () => {
  const input = validateRequest(validBody())
  assert.equal(input.subtotal, 680000)
  assert.equal(input.iva, 129200)
  assert.equal(input.total, 809200)
  assert.equal(input.anticipo, 404600)
  assert.equal(input.saldo, 404600)
})

test('rejects missing client, empty items and ambiguous numeric strings', () => {
  assert.throws(
    () => validateRequest({ cliente: {}, proyecto: 'Prueba', items: [] }),
    error => error instanceof DomainError && error.errors.some(item => item.field === 'cliente.nombre') && error.errors.some(item => item.field === 'items'),
  )
  assert.throws(
    () => validateRequest(validBody({ items: [{ descripcion: 'Letrero', cantidad: '1', precio_unitario_neto: '1000' }] })),
    error => error instanceof DomainError && error.code === 'INVALID_REQUEST',
  )
})

test('uses default validity and rejects values outside 1 to 30 days', () => {
  assert.equal(validateRequest(validBody()).validez, 15)
  assert.throws(() => validateRequest(validBody({ validez_dias: 31 })), DomainError)
})

test('ignores consumer state and builds a pending quote compatible with the UI', () => {
  const input = validateRequest(validBody({ estado: 'aceptada' }))
  const quote = buildQuoteRecord(input, { id: 'client-1', nombre: 'Óptica Cielo Azul' }, 307, {
    now: new Date('2026-09-20T02:30:00.000Z'),
  })
  assert.equal(quote.numero, '00307')
  assert.equal(quote.estado, 'por_aceptar')
  assert.equal(quote.fecha, '2026-09-19')
  assert.equal(quote.fechaVencimiento, '2026-10-04')
})

test('normalizes RUT, email and accented names using the documented priority', () => {
  const target = validateRequest(validBody({
    cliente: { nombre: 'Otro nombre', rut: '76.123.456-7', email: 'VENTAS@EJEMPLO.CL' },
  })).cliente
  const matches = matchClients([
    { id: 'name', nombre: 'Otro Nombre' },
    { id: 'rut', nombre: 'Cliente', rut: '76123456-7' },
  ], target)
  assert.deepEqual(matches.map(item => item.id), ['rut'])
})

test('formats folios and resolves Santiago date independently from UTC day', () => {
  assert.equal(formatFolio(307), '00307')
  assert.equal(santiagoDate(new Date('2026-09-20T02:30:00.000Z')), '2026-09-19')
})
