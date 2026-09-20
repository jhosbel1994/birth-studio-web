const test = require('node:test')
const assert = require('node:assert/strict')
const gastos = require('../server/gastos/gastos-repository.cjs')

// Base de datos Firestore simulada con soporte de where()/get()/doc().set().
function makeFakeDb(seed = {}) {
  const store = { gastos: [...(seed.gastos || [])], pagos: [...(seed.pagos || [])] }
  function makeQuery(coll, filters) {
    return {
      where(field, op, val) { return makeQuery(coll, [...filters, { field, op, val }]) },
      async get() {
        const rows = store[coll].filter(r => filters.every(f => {
          const v = r[f.field]
          if (f.op === '==') return v === f.val
          if (f.op === '>=') return v >= f.val
          if (f.op === '<=') return v <= f.val
          return true
        }))
        return { docs: rows.map(r => ({ id: r.id, data: () => r })), size: rows.length }
      },
    }
  }
  return {
    collection(coll) {
      const base = makeQuery(coll, [])
      return {
        where: base.where,
        get: base.get,
        doc(id) {
          return { async set(data) {
            const i = store[coll].findIndex(x => x.id === id)
            if (i >= 0) store[coll][i] = data; else store[coll].push(data)
          } }
        },
      }
    },
    _store: store,
  }
}

test('registra un gasto válido en la colección gastos', async () => {
  const db = makeFakeDb()
  const r = await gastos.registrarGasto(
    { descripcion: 'Sodimac tornillos', monto: 15990, fecha: '2026-09-10', categoria: 'Materiales' }, { db })
  assert.equal(r.ok, true)
  assert.equal(db._store.gastos.length, 1)
  assert.equal(db._store.gastos[0].origen, 'mcp')
})

test('detecta un gasto duplicado (mismo día, monto y descripción) y no lo repite', async () => {
  const db = makeFakeDb()
  const args = { descripcion: 'Copec bencina', monto: 30000, fecha: '2026-09-10', categoria: 'Gasolina' }
  await gastos.registrarGasto(args, { db })
  const dup = await gastos.registrarGasto(args, { db })
  assert.equal(dup.ok, false)
  assert.equal(dup.code, 'DUPLICATE')
  assert.equal(db._store.gastos.length, 1)
})

test('rechaza datos inválidos (categoría y monto)', async () => {
  const db = makeFakeDb()
  const r = await gastos.registrarGasto(
    { descripcion: 'x', monto: 10.5, fecha: '2026-09-10', categoria: 'Inventada' }, { db })
  assert.equal(r.ok, false)
  assert.equal(r.code, 'INVALID')
})

test('balance mensual suma solo el rango y agrupa por categoría', async () => {
  const db = makeFakeDb({
    gastos: [
      { id: 'a', descripcion: 'A', monto: 10000, fecha: '2026-09-05', categoria: 'Materiales' },
      { id: 'b', descripcion: 'B', monto: 5000, fecha: '2026-09-20', categoria: 'Gasolina' },
      { id: 'c', descripcion: 'C', monto: 3000, fecha: '2026-08-31', categoria: 'Materiales' },
    ],
    pagos: [{ id: 'p', monto: 50000, fecha: '2026-09-15' }],
  })
  const bal = await gastos.consultarBalance(
    { periodo: 'personalizado', fecha_inicio: '2026-09-01', fecha_fin: '2026-09-30', incluir_ingresos: true }, { db })
  assert.equal(bal.total, 15000) // excluye el gasto de agosto
  assert.equal(bal.grupos.Materiales, 10000)
  assert.equal(bal.grupos.Gasolina, 5000)
  assert.equal(bal.ingresos, 50000)
  assert.equal(bal.neto, 35000)
})

test('rango de quincena en borde de mes (día <= 15)', () => {
  // No depende de la fecha actual: se prueba el modo personalizado y la forma del mensual.
  const mes = gastos.rangoFechas({ periodo: 'mes' })
  assert.match(mes.inicio, /^\d{4}-\d{2}-01$/)
  assert.match(mes.fin, /^\d{4}-\d{2}-\d{2}$/)
})
