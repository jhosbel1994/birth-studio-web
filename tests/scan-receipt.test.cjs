const { test } = require('node:test')
const assert = require('node:assert/strict')
const { normalizeReceipt, extractJson } = require('../api/scan-receipt.js')

test('normalizes Chilean receipt fields and keeps valid line items', () => {
  const receipt = normalizeReceipt({
    establecimiento: '  Ferretería Central  ',
    rut: '76.123.456-7',
    folio: 'B-120',
    fecha: '2026-09-19',
    neto: '10000',
    iva: 1900,
    total: 11900.4,
    categoria: 'Materiales',
    detalle: [{ descripcion: 'Perfil aluminio', cantidad: 2, monto: 11900 }],
    confianza: 1.2,
  })

  assert.equal(receipt.establecimiento, 'Ferretería Central')
  assert.equal(receipt.total, 11900)
  assert.equal(receipt.categoria, 'Materiales')
  assert.equal(receipt.detalle.length, 1)
  assert.equal(receipt.confianza, 1)
})

test('rejects invalid dates and categories without inventing values', () => {
  const receipt = normalizeReceipt({ fecha: '19/09/2026', total: 'no legible', categoria: 'Viajes' })
  assert.equal(receipt.fecha, null)
  assert.equal(receipt.total, null)
  assert.equal(receipt.categoria, 'Otros')
})

test('extracts JSON even when the provider wraps it in text', () => {
  assert.deepEqual(extractJson('resultado: {"total":1200} fin'), { total: 1200 })
})
