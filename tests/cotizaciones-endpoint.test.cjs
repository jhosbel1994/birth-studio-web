const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHandler, credentialDiagnostics } = require('../api/external/cotizaciones.js')
const { DomainError } = require('../server/cotizaciones/domain.cjs')

const API_KEY = 'test-key-with-at-least-thirty-two-bytes'

function request(overrides = {}) {
  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'idempotency-key': 'quote-request-0001',
    },
    body: {
      cliente: { nombre: 'Óptica Cielo Azul', crear_si_no_existe: true },
      proyecto: 'Letrero luminoso',
      items: [{ descripcion: 'Letrero', cantidad: 1, precio_unitario_neto: 100000 }],
    },
    ...overrides,
  }
}

function response() {
  return {
    headers: {}, statusCode: 0, body: null,
    setHeader(name, value) { this.headers[name] = value },
    status(value) { this.statusCode = value; return this },
    json(value) { this.body = value; return this },
  }
}

function repository(result) {
  return {
    calls: [],
    async createQuote(payload) {
      this.calls.push(payload)
      if (result instanceof Error) throw result
      return result || {
        status: 201,
        body: { ok: true, folio: '#00307', total: 119000 },
      }
    },
  }
}

async function invoke(req, repo = repository()) {
  const res = response()
  await createHandler({ apiKey: API_KEY, repository: repo, logger: { error() {} } })(req, res)
  return { res, repo }
}

test('creates a valid quote through the injected repository', async () => {
  const { res, repo } = await invoke(request())
  assert.equal(res.statusCode, 201)
  assert.equal(res.body.folio, '#00307')
  assert.equal(repo.calls.length, 1)
  assert.equal(repo.calls[0].input.total, 119000)
})

test('returns identical unauthorized responses for missing and wrong API keys', async () => {
  const missing = await invoke(request({ headers: { ...request().headers, 'x-api-key': undefined } }))
  const wrong = await invoke(request({ headers: { ...request().headers, 'x-api-key': 'wrong' } }))
  assert.equal(missing.res.statusCode, 401)
  assert.equal(wrong.res.statusCode, 401)
  assert.equal(missing.res.body.code, wrong.res.body.code)
  assert.equal(missing.repo.calls.length, 0)
})

test('returns service unavailable when the server API key is not securely configured', async () => {
  const res = response()
  await createHandler({ apiKey: 'too-short', repository: repository(), logger: { error() {} } })(request(), res)
  assert.equal(res.statusCode, 503)
  assert.equal(res.body.code, 'SERVICE_NOT_CONFIGURED')
})

test('returns service unavailable when Firestore server credentials are absent', async () => {
  const names = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_PRIVATE_KEY_BASE64']
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]))
  names.forEach(name => delete process.env[name])
  try {
    const res = response()
    await createHandler({ apiKey: API_KEY, logger: { error() {} } })(request(), res)
    assert.equal(res.statusCode, 503)
    assert.equal(res.body.code, 'SERVICE_NOT_CONFIGURED')
    assert.doesNotMatch(JSON.stringify(res.body), /FIREBASE_/)
  } finally {
    names.forEach(name => {
      if (previous[name] === undefined) delete process.env[name]
      else process.env[name] = previous[name]
    })
  }
})

test('rejects unsupported methods and invalid JSON', async () => {
  const method = await invoke(request({ method: 'GET' }))
  assert.equal(method.res.statusCode, 405)
  assert.equal(method.res.headers.Allow, 'POST')

  const invalid = await invoke(request({ body: '{not-json' }))
  assert.equal(invalid.res.statusCode, 400)
  assert.equal(invalid.res.body.code, 'INVALID_JSON')
})

test('requires JSON content type and a valid idempotency key', async () => {
  const contentType = await invoke(request({ headers: { ...request().headers, 'content-type': 'text/plain' } }))
  assert.equal(contentType.res.statusCode, 400)
  const idem = await invoke(request({ headers: { ...request().headers, 'idempotency-key': 'short' } }))
  assert.equal(idem.res.statusCode, 400)
})

test('maps repository domain failures without leaking internal errors', async () => {
  const notFound = await invoke(request(), repository(new DomainError('CLIENT_NOT_FOUND', 'No se encontró el cliente solicitado', 404)))
  assert.equal(notFound.res.statusCode, 404)
  assert.equal(notFound.res.body.code, 'CLIENT_NOT_FOUND')

  const internal = await invoke(request(), repository(new Error('private database detail')))
  assert.equal(internal.res.statusCode, 500)
  assert.equal(internal.res.body.message, 'No fue posible crear la cotización')
  assert.doesNotMatch(JSON.stringify(internal.res.body), /database detail/)
})

test('logs bounded diagnostic metadata for unexpected failures', async () => {
  const entries = []
  const res = response()
  const logger = { error(...args) { entries.push(args) } }
  const error = new Error(`database detail\n${'x'.repeat(400)}`)
  error.code = 7

  await createHandler({ apiKey: API_KEY, repository: repository(error), logger })(request(), res)

  assert.equal(res.statusCode, 500)
  assert.equal(entries.length, 1)
  assert.equal(entries[0][0], 'external quote request failed')
  assert.equal(entries[0][1].error_name, 'Error')
  assert.equal(entries[0][1].error_code, '7')
  assert.equal(entries[0][1].error_message.length, 300)
  assert.doesNotMatch(entries[0][1].error_message, /[\r\n]/)
  assert.doesNotMatch(JSON.stringify(res.body), /database detail/)
})

test('reports only credential fingerprints and shape metadata', () => {
  const pem = '-----BEGIN PRIVATE KEY-----\nprivate-data\n-----END PRIVATE KEY-----'
  const diagnostics = credentialDiagnostics({
    FIREBASE_PROJECT_ID: 'project-id',
    FIREBASE_CLIENT_EMAIL: 'service@example.iam.gserviceaccount.com',
    FIREBASE_PRIVATE_KEY_BASE64: Buffer.from(pem).toString('base64'),
  })

  assert.equal(diagnostics.project_id_length, 10)
  assert.equal(diagnostics.client_email_length, 39)
  assert.equal(diagnostics.private_key_decoded_length, pem.length)
  assert.equal(diagnostics.private_key_pem_valid, true)
  assert.match(diagnostics.private_key_fingerprint, /^[a-f0-9]{12}$/)
  assert.doesNotMatch(JSON.stringify(diagnostics), /project-id|service@example|private-data/)
})

test('passes through a successful idempotent replay', async () => {
  const replay = repository({ status: 200, body: { ok: true, folio: '#00307', idempotent_replay: true } })
  const { res } = await invoke(request(), replay)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.idempotent_replay, true)
})
