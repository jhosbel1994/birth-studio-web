const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  createFirebaseQuoteRepository,
  privateKeyFromEnv,
} = require('../server/cotizaciones/firebase-repository.cjs')
const { DomainError, hashRequest, validateRequest } = require('../server/cotizaciones/domain.cjs')

class FakeSnapshot {
  constructor(ref, value) {
    this.id = ref.id
    this.exists = value !== undefined
    this.value = value
  }

  data() {
    return this.value === undefined ? undefined : structuredClone(this.value)
  }
}

class FakeDocRef {
  constructor(db, collection, id) {
    this.db = db
    this.collectionName = collection
    this.id = id
  }

  async get() {
    return new FakeSnapshot(this, this.db.collectionData(this.collectionName).get(this.id))
  }
}

class FakeCollection {
  constructor(db, name) {
    this.db = db
    this.name = name
  }

  doc(id) {
    return new FakeDocRef(this.db, this.name, id)
  }

  limit(amount) {
    return {
      get: async () => {
        const rows = [...this.db.collectionData(this.name).entries()].slice(0, amount)
        return {
          size: rows.length,
          docs: rows.map(([id, value]) => new FakeSnapshot(this.doc(id), value)),
        }
      },
    }
  }
}

class FakeTransaction {
  constructor(db) {
    this.db = db
    this.writes = []
  }

  async get(ref) {
    return new FakeSnapshot(ref, this.db.collectionData(ref.collectionName).get(ref.id))
  }

  set(ref, value, options = {}) {
    this.writes.push({ ref, value: structuredClone(value), merge: options.merge === true })
  }

  commit() {
    this.writes.forEach(({ ref, value, merge }) => {
      const collection = this.db.collectionData(ref.collectionName)
      const previous = collection.get(ref.id)
      collection.set(ref.id, merge && previous ? { ...previous, ...value } : value)
    })
  }
}

class FakeDb {
  constructor(seed = {}) {
    this.collections = new Map()
    Object.entries(seed).forEach(([name, values]) => {
      this.collections.set(name, new Map(Object.entries(values)))
    })
    this.queue = Promise.resolve()
  }

  collectionData(name) {
    if (!this.collections.has(name)) this.collections.set(name, new Map())
    return this.collections.get(name)
  }

  collection(name) {
    return new FakeCollection(this, name)
  }

  runTransaction(callback) {
    const operation = this.queue.then(async () => {
      const transaction = new FakeTransaction(this)
      const result = await callback(transaction)
      transaction.commit()
      return result
    })
    this.queue = operation.catch(() => {})
    return operation
  }
}

function body(overrides = {}) {
  return {
    cliente: { nombre: 'Óptica Cielo Azul', rut: '76.123.456-7', crear_si_no_existe: true },
    proyecto: 'Letrero luminoso',
    items: [{ descripcion: 'Letrero', cantidad: 1, precio_unitario_neto: 100000 }],
    ...overrides,
  }
}

async function create(repository, rawBody, idempotencyKey, requestId = 'request-1') {
  return repository.createQuote({
    input: validateRequest(rawBody),
    requestHash: hashRequest(rawBody),
    idempotencyKey,
    requestId,
    now: new Date('2026-09-19T15:00:00.000Z'),
  })
}

test('atomically creates a client, reserves the folio and stores the quote', async () => {
  const db = new FakeDb({ settings: { app: { ultimoNumeroCotizacion: 306 } } })
  const repository = createFirebaseQuoteRepository({ db })
  const result = await create(repository, body(), 'repository-request-0001')

  assert.equal(result.status, 201)
  assert.equal(result.body.folio, '#00307')
  assert.equal(result.body.cliente_creado, true)
  assert.equal(db.collectionData('settings').get('app').ultimoNumeroCotizacion, 307)
  assert.equal(db.collectionData('clientes').size, 1)
  assert.equal(db.collectionData('cotizaciones').size, 1)
  assert.equal(db.collectionData('externalCotizacionRequests').size, 1)
  const quote = [...db.collectionData('cotizaciones').values()][0]
  assert.equal(quote.total, 119000)
  assert.equal(quote.estado, 'por_aceptar')
})

test('replays the same idempotency key without creating another quote or folio', async () => {
  const db = new FakeDb({ settings: { app: { ultimoNumeroCotizacion: 306 } } })
  const repository = createFirebaseQuoteRepository({ db })
  const first = await create(repository, body(), 'repository-request-0002')
  db.collectionData('clientes').set('duplicate-after-create', {
    id: 'duplicate-after-create', nombre: 'Otra sede', rut: '76123456-7',
  })
  const replay = await create(repository, body(), 'repository-request-0002', 'request-2')

  assert.equal(first.status, 201)
  assert.equal(replay.status, 200)
  assert.equal(replay.body.folio, first.body.folio)
  assert.equal(replay.body.idempotent_replay, true)
  assert.equal(db.collectionData('settings').get('app').ultimoNumeroCotizacion, 307)
  assert.equal(db.collectionData('cotizaciones').size, 1)
})

test('rejects reuse of an idempotency key with a different body', async () => {
  const db = new FakeDb({ settings: { app: { ultimoNumeroCotizacion: 306 } } })
  const repository = createFirebaseQuoteRepository({ db })
  await create(repository, body(), 'repository-request-0003')
  await assert.rejects(
    () => create(repository, body({ proyecto: 'Proyecto diferente' }), 'repository-request-0003'),
    error => error instanceof DomainError && error.code === 'IDEMPOTENCY_CONFLICT' && error.status === 409,
  )
  assert.equal(db.collectionData('cotizaciones').size, 1)
})

test('reuses one existing client and rejects ambiguous matches', async () => {
  const existing = {
    client1: { id: 'client1', nombre: 'Óptica Cielo Azul', rut: '76.123.456-7' },
  }
  const db = new FakeDb({ clientes: existing, settings: { app: { ultimoNumeroCotizacion: 306 } } })
  const repository = createFirebaseQuoteRepository({ db })
  const result = await create(repository, body(), 'repository-request-0004')
  assert.equal(result.body.cliente_id, 'client1')
  assert.equal(result.body.cliente_creado, false)

  db.collectionData('clientes').set('client2', { id: 'client2', nombre: 'Otra sede', rut: '76123456-7' })
  await assert.rejects(
    () => create(repository, body(), 'repository-request-0005'),
    error => error instanceof DomainError && error.code === 'CLIENT_AMBIGUOUS',
  )
})

test('does not create a missing client unless explicitly allowed', async () => {
  const db = new FakeDb({ settings: { app: { ultimoNumeroCotizacion: 306 } } })
  const repository = createFirebaseQuoteRepository({ db })
  const raw = body({ cliente: { nombre: 'Cliente no registrado', crear_si_no_existe: false } })
  await assert.rejects(
    () => create(repository, raw, 'repository-request-0006'),
    error => error instanceof DomainError && error.code === 'CLIENT_NOT_FOUND',
  )
  assert.equal(db.collectionData('clientes').size, 0)
  assert.equal(db.collectionData('cotizaciones').size, 0)
})

test('concurrent requests receive different consecutive folios', async () => {
  const db = new FakeDb({ settings: { app: { ultimoNumeroCotizacion: 306 } } })
  const repository = createFirebaseQuoteRepository({ db })
  const [first, second] = await Promise.all([
    create(repository, body(), 'repository-request-0007', 'request-7'),
    create(repository, body(), 'repository-request-0008', 'request-8'),
  ])
  assert.deepEqual([first.body.folio, second.body.folio].sort(), ['#00307', '#00308'])
  assert.equal(db.collectionData('settings').get('app').ultimoNumeroCotizacion, 308)
  assert.equal(db.collectionData('clientes').size, 1)
  assert.equal(db.collectionData('cotizaciones').size, 2)
})

test('decodes a base64 private key and keeps escaped-key compatibility', () => {
  const pem = '-----BEGIN PRIVATE KEY-----\nprivate-data\n-----END PRIVATE KEY-----'
  assert.equal(privateKeyFromEnv({ FIREBASE_PRIVATE_KEY_BASE64: Buffer.from(pem).toString('base64') }), pem)
  assert.equal(privateKeyFromEnv({ FIREBASE_PRIVATE_KEY: pem.replace(/\n/g, '\\n') }), pem)
  assert.throws(
    () => privateKeyFromEnv({ FIREBASE_PRIVATE_KEY_BASE64: Buffer.from('invalid').toString('base64') }),
    error => error instanceof DomainError && error.code === 'SERVICE_NOT_CONFIGURED',
  )
})
