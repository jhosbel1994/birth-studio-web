const test = require('node:test')
const assert = require('node:assert/strict')
const { makeFakeDb } = require('./helpers/fake-firestore.cjs')
const ingresos = require('../server/finanzas/ingresos-repository.cjs')

test('registra un ingreso simple en ámbito Birth (sin cotización)', async () => {
  const db = makeFakeDb()
  const r = await ingresos.registrarIngreso(
    { monto: 150000, fecha: '2026-09-10', tipo: 'otro', notas: 'Transferencia' }, { db })
  assert.equal(r.ok, true)
  assert.equal(db._store.pagos.length, 1)
  assert.equal(db._store.pagos[0].ambito, 'birth')
  assert.equal(db._store.pagos[0].cotizacionId, null)
  assert.equal(db._store.pagos[0].origen, 'mcp')
})

test('vincula el ingreso a una cotización por folio', async () => {
  const db = makeFakeDb({
    cotizaciones: [{ id: 'cot1', numero: '00312', clienteNombre: 'ACME', total: 500000 }],
  })
  const r = await ingresos.registrarIngreso(
    { monto: 250000, fecha: '2026-09-11', tipo: 'anticipo', folio: '312' }, { db })
  assert.equal(r.ok, true)
  assert.equal(r.cotizacion.numero, '00312')
  assert.equal(db._store.pagos[0].cotizacionId, 'cot1')
  assert.equal(db._store.pagos[0].tipo, 'anticipo')
})

test('folio inexistente devuelve NOT_FOUND', async () => {
  const db = makeFakeDb({ cotizaciones: [] })
  const r = await ingresos.registrarIngreso(
    { monto: 1000, fecha: '2026-09-11', folio: '999' }, { db })
  assert.equal(r.ok, false)
  assert.equal(r.code, 'NOT_FOUND')
})

test('retiro Personal desde Birth crea el gasto vinculado (categoría Retiro)', async () => {
  const db = makeFakeDb()
  const r = await ingresos.registrarIngreso(
    { monto: 100000, fecha: '2026-09-12', ambito: 'personal', origen_birth: true, notas: 'Sueldo' }, { db })
  assert.equal(r.ok, true)
  assert.equal(db._store.pagos[0].ambito, 'personal')
  assert.equal(db._store.pagos[0].origenBirth, true)
  assert.equal(db._store.gastos.length, 1)
  assert.equal(db._store.gastos[0].categoria, 'Retiro')
  assert.equal(db._store.gastos[0].ambito, 'birth')
  assert.equal(db._store.gastos[0].monto, 100000)
  assert.equal(db._store.pagos[0].gastoVinculadoId, db._store.gastos[0].id)
})

test('no vincula por folio en ámbito Personal', async () => {
  const db = makeFakeDb({
    cotizaciones: [{ id: 'cot1', numero: '00312', clienteNombre: 'ACME', total: 500000 }],
  })
  const r = await ingresos.registrarIngreso(
    { monto: 5000, fecha: '2026-09-12', ambito: 'personal', folio: '312' }, { db })
  assert.equal(r.ok, true)
  assert.equal(db._store.pagos[0].cotizacionId, null)
})

test('detecta ingreso duplicado (mismo monto, fecha, cotización y notas)', async () => {
  const db = makeFakeDb({
    cotizaciones: [{ id: 'cot1', numero: '00312', clienteNombre: 'ACME', total: 500000 }],
  })
  const args = { monto: 250000, fecha: '2026-09-11', folio: '312', notas: 'abono' }
  await ingresos.registrarIngreso(args, { db })
  const dup = await ingresos.registrarIngreso(args, { db })
  assert.equal(dup.ok, false)
  assert.equal(dup.code, 'DUPLICATE')
  assert.equal(db._store.pagos.length, 1)
})

test('rechaza monto no entero', async () => {
  const db = makeFakeDb()
  const r = await ingresos.registrarIngreso({ monto: 10.5, fecha: '2026-09-10' }, { db })
  assert.equal(r.ok, false)
  assert.equal(r.code, 'INVALID')
})
