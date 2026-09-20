const crypto = require('node:crypto')
const { Firestore } = require('@google-cloud/firestore')
const {
  DomainError,
  buildQuoteRecord,
  buildSuccessResponse,
  clientFingerprint,
  hashValue,
  matchClients,
} = require('./domain.cjs')

const CLIENT_SCAN_LIMIT = 500
let serverDb

function requiredEnv(name) {
  const value = String(process.env[name] || '').trim()
  if (!value) throw new DomainError('SERVICE_NOT_CONFIGURED', 'El servicio no está configurado', 503)
  return value
}

function getAdminDb() {
  if (!serverDb) {
    serverDb = new Firestore({
      projectId: requiredEnv('FIREBASE_PROJECT_ID'),
      credentials: {
        client_email: requiredEnv('FIREBASE_CLIENT_EMAIL'),
        private_key: requiredEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
      },
    })
  }
  return serverDb
}

function snapData(snapshot) {
  return snapshot.exists ? { ...snapshot.data(), id: snapshot.id } : null
}

async function scanClients(db) {
  const snapshot = await db.collection('clientes').limit(CLIENT_SCAN_LIMIT + 1).get()
  if (snapshot.size > CLIENT_SCAN_LIMIT) {
    throw new DomainError('SERVICE_NOT_CONFIGURED', 'La búsqueda de clientes requiere mantenimiento', 503)
  }
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
}

async function resolveClient(db, target) {
  if (target.id) return { id: target.id, existing: null, shouldCreate: false }

  const matches = matchClients(await scanClients(db), target)
  if (matches.length > 1) {
    throw new DomainError('CLIENT_AMBIGUOUS', 'Existe más de un cliente coincidente', 409)
  }
  if (matches.length === 1) return { id: matches[0].id, existing: matches[0], shouldCreate: false }
  if (!target.crearSiNoExiste) {
    throw new DomainError('CLIENT_NOT_FOUND', 'No se encontró el cliente solicitado', 404)
  }
  return { id: `api-${clientFingerprint(target)}`, existing: null, shouldCreate: true }
}

function newClientRecord(target, id, timestamp) {
  return {
    id,
    nombre: target.nombre,
    apellido: '',
    empresa: target.empresa,
    rut: target.rut,
    direccion: '',
    correo: target.email,
    telefono: target.telefono,
    notas: '',
    nombreNormalizado: target.nombreNormalizado,
    rutNormalizado: target.rutNormalizado,
    correoNormalizado: target.correoNormalizado,
    origen: 'api_externa',
    createdAt: timestamp,
  }
}

function createFirebaseQuoteRepository(options = {}) {
  const db = options.db || getAdminDb()

  return {
    async createQuote({ input, requestHash, idempotencyKey, requestId, now = new Date() }) {
      const idempotencyId = hashValue(idempotencyKey)
      const idemRef = db.collection('externalCotizacionRequests').doc(idempotencyId)
      const completedRequest = await idemRef.get()
      if (completedRequest.exists) {
        const saved = completedRequest.data()
        if (saved.requestHash !== requestHash) {
          throw new DomainError('IDEMPOTENCY_CONFLICT', 'La clave de idempotencia ya fue utilizada', 409)
        }
        return { status: 200, body: { ...saved.response, idempotent_replay: true } }
      }

      const clientResolution = await resolveClient(db, input.cliente)
      const quoteId = crypto.randomUUID()
      const timestamp = now.toISOString()

      return db.runTransaction(async transaction => {
        const idemSnapshot = await transaction.get(idemRef)
        if (idemSnapshot.exists) {
          const saved = idemSnapshot.data()
          if (saved.requestHash !== requestHash) {
            throw new DomainError('IDEMPOTENCY_CONFLICT', 'La clave de idempotencia ya fue utilizada', 409)
          }
          return { status: 200, body: { ...saved.response, idempotent_replay: true } }
        }

        const clientRef = db.collection('clientes').doc(clientResolution.id)
        const settingsRef = db.collection('settings').doc('app')
        const [clientSnapshot, settingsSnapshot] = await Promise.all([
          transaction.get(clientRef),
          transaction.get(settingsRef),
        ])

        let client = snapData(clientSnapshot)
        let clientCreated = false
        if (!client) {
          if (!clientResolution.shouldCreate) {
            throw new DomainError('CLIENT_NOT_FOUND', 'No se encontró el cliente solicitado', 404)
          }
          client = newClientRecord(input.cliente, clientResolution.id, timestamp)
          clientCreated = true
        }

        const currentNumber = settingsSnapshot.exists
          ? Number(settingsSnapshot.data().ultimoNumeroCotizacion || 238)
          : 238
        if (!Number.isSafeInteger(currentNumber) || currentNumber < 0) {
          throw new DomainError('INTERNAL_ERROR', 'No fue posible crear la cotización', 500)
        }

        const nextNumber = currentNumber + 1
        const quote = { id: quoteId, ...buildQuoteRecord(input, client, nextNumber, { now }) }
        const response = buildSuccessResponse(quote, client, {
          requestId, quoteId, clientCreated,
        })

        if (clientCreated) transaction.set(clientRef, client)
        transaction.set(settingsRef, { ultimoNumeroCotizacion: nextNumber }, { merge: true })
        transaction.set(db.collection('cotizaciones').doc(quoteId), quote)
        transaction.set(idemRef, {
          requestHash,
          quoteId,
          response,
          completedAt: timestamp,
        })

        return { status: 201, body: response }
      })
    },
  }
}

module.exports = {
  CLIENT_SCAN_LIMIT,
  createFirebaseQuoteRepository,
  getAdminDb,
  newClientRecord,
  resolveClient,
}
