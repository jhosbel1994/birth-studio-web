const test = require('node:test')
const assert = require('node:assert/strict')
const { makeFakeDb } = require('./helpers/fake-firestore.cjs')
const { consultarCotizaciones, normalizarFolio } = require('../server/cotizaciones/consultas.cjs')

function seedDb() {
  return makeFakeDb({
    clientes: [
      { id: 'c1', nombre: 'Juan Pérez', empresa: 'Panadería Sur', rut: '12.345.678-9' },
      { id: 'c2', nombre: 'María Soto', empresa: 'Ferretería Norte', rut: '9.876.543-2' },
    ],
    cotizaciones: [
      { id: 'q1', numero: '00310', clienteId: 'c1', clienteNombre: 'Juan Pérez', estado: 'aceptada', total: 500000, fecha: '2026-09-01', descripcion: 'Letrero LED' },
      { id: 'q2', numero: '00311', clienteId: 'c2', clienteNombre: 'María Soto', estado: 'por_aceptar', total: 200000, fecha: '2026-09-05', descripcion: 'Pendón' },
      { id: 'q3', numero: '00312', clienteId: 'c1', clienteNombre: 'Juan Pérez', estado: 'terminada', total: 300000, fecha: '2026-09-08', descripcion: 'Adhesivos' },
      { id: 'q4', numero: '00313', clienteId: 'c2', clienteNombre: 'María Soto', estado: 'rechazada', total: 100000, fecha: '2026-09-09', descripcion: 'Tarjetas' },
    ],
    pagos: [
      { id: 'p1', cotizacionId: 'q1', monto: 250000, fecha: '2026-09-02' }, // saldo 250.000
      { id: 'p2', cotizacionId: 'q3', monto: 300000, fecha: '2026-09-08' }, // pagada
    ],
  })
}

test('lista todas las cotizaciones con conteos por estado', async () => {
  const r = await consultarCotizaciones({}, { db: seedDb() })
  assert.equal(r.total, 4)
  assert.deepEqual(r.conteos, { por_aceptar: 1, aceptada: 1, terminada: 1, rechazada: 1 })
})

test('filtra por estado y "pendientes" equivale a aceptada', async () => {
  const aceptadas = await consultarCotizaciones({ estado: 'aceptada' }, { db: seedDb() })
  assert.equal(aceptadas.items.length, 1)
  assert.equal(aceptadas.items[0].folio, '#00310')
  const pendientes = await consultarCotizaciones({ estado: 'pendientes' }, { db: seedDb() })
  assert.equal(pendientes.items.length, 1)
  assert.equal(pendientes.items[0].estado, 'aceptada')
})

test('calcula el saldo pendiente a partir de los pagos', async () => {
  const r = await consultarCotizaciones({ folio: '310' }, { db: seedDb() })
  assert.equal(r.items[0].total, 500000)
  assert.equal(r.items[0].pagado, 250000)
  assert.equal(r.items[0].saldoPendiente, 250000)
  const pagada = await consultarCotizaciones({ folio: '312' }, { db: seedDb() })
  assert.equal(pagada.items[0].saldoPendiente, 0)
})

test('filtra por empresa, por RUT y por nombre de persona', async () => {
  const porEmpresa = await consultarCotizaciones({ empresa: 'panaderia' }, { db: seedDb() })
  assert.equal(porEmpresa.items.every(c => c.empresa === 'Panadería Sur'), true)
  assert.equal(porEmpresa.total, 2)

  const porRut = await consultarCotizaciones({ rut: '9876543' }, { db: seedDb() })
  assert.equal(porRut.items.every(c => c.cliente === 'María Soto'), true)

  const porNombre = await consultarCotizaciones({ nombre: 'juan perez' }, { db: seedDb() })
  assert.equal(porNombre.total, 2)
})

test('filtra por folio exacto (normaliza a 5 dígitos)', async () => {
  const r = await consultarCotizaciones({ folio: '#00311' }, { db: seedDb() })
  assert.equal(r.total, 1)
  assert.equal(r.items[0].folio, '#00311')
})

test('normalizarFolio rellena a 5 dígitos', () => {
  assert.equal(normalizarFolio('312'), '00312')
  assert.equal(normalizarFolio('#00312'), '00312')
  assert.equal(normalizarFolio(''), '')
})
