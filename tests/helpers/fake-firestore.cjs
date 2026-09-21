// Firestore simulado para las pruebas del MCP. Soporta lo que usan los
// repositorios: collection().get(), .where(op).get(), .doc(id).set()/get()/merge.
// Vive en tests/helpers/ para NO ser tomado como archivo de test por el runner
// (node --test tests/*.test.cjs solo mira la carpeta tests/).

function makeFakeDb(seed = {}) {
  const store = {}
  for (const [k, v] of Object.entries(seed)) store[k] = (v || []).map(x => ({ ...x }))
  const ensure = c => (store[c] = store[c] || [])

  function query(coll, filters) {
    return {
      where(field, op, val) { return query(coll, [...filters, { field, op, val }]) },
      async get() {
        const rows = ensure(coll).filter(r => filters.every(f => {
          const v = r[f.field]
          if (f.op === '==') return v === f.val
          if (f.op === '>=') return v >= f.val
          if (f.op === '<=') return v <= f.val
          return true
        }))
        return {
          docs: rows.map(r => ({ id: r.id, exists: true, data: () => r })),
          size: rows.length,
          empty: rows.length === 0,
        }
      },
    }
  }

  return {
    collection(coll) {
      const q = query(coll, [])
      return {
        where: q.where,
        get: q.get,
        doc(id) {
          return {
            async set(data, opts) {
              const arr = ensure(coll)
              const i = arr.findIndex(x => x.id === id)
              if (i >= 0) arr[i] = opts && opts.merge ? { ...arr[i], ...data } : data
              else arr.push({ ...data, id: data.id != null ? data.id : id })
            },
            async get() {
              const r = ensure(coll).find(x => x.id === id)
              return { exists: !!r, id, data: () => r }
            },
          }
        },
      }
    },
    _store: store,
  }
}

module.exports = { makeFakeDb }
