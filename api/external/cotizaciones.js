const crypto = require('node:crypto')
const { DomainError, hashRequest, validateRequest } = require('../../server/cotizaciones/domain.cjs')

const MAX_BODY_BYTES = 64 * 1024
const IDEMPOTENCY_PATTERN = /^[\x21-\x7E]{16,128}$/

function sendJson(res, status, body) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  return res.status(status).json(body)
}

function errorBody(code, message, requestId, errors) {
  return {
    ok: false,
    code,
    message,
    request_id: requestId,
    ...(errors?.length ? { errors } : {}),
  }
}

function logInternalError(logger, requestId, error) {
  const safeText = (value, limit = 300) => String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, limit)

  logger.error('external quote request failed', {
    request_id: requestId,
    error_name: safeText(error?.name),
    error_code: safeText(error?.code),
    error_message: safeText(error?.message),
    error_stack: safeText(error?.stack, 1200),
  })
}

function safeCompare(value, expected) {
  const left = Buffer.from(String(value || ''), 'utf8')
  const right = Buffer.from(String(expected || ''), 'utf8')
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

function parseBody(req) {
  const length = Number(req.headers['content-length'] || 0)
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    throw new DomainError('PAYLOAD_TOO_LARGE', 'La solicitud supera el tamaño permitido', 413)
  }

  if (Buffer.isBuffer(req.body)) {
    if (req.body.length > MAX_BODY_BYTES) throw new DomainError('PAYLOAD_TOO_LARGE', 'La solicitud supera el tamaño permitido', 413)
    try { return JSON.parse(req.body.toString('utf8')) } catch { throw new DomainError('INVALID_JSON', 'El cuerpo no contiene JSON válido', 400) }
  }
  if (typeof req.body === 'string') {
    if (Buffer.byteLength(req.body, 'utf8') > MAX_BODY_BYTES) throw new DomainError('PAYLOAD_TOO_LARGE', 'La solicitud supera el tamaño permitido', 413)
    try { return JSON.parse(req.body) } catch { throw new DomainError('INVALID_JSON', 'El cuerpo no contiene JSON válido', 400) }
  }
  if (req.body && typeof req.body === 'object') {
    if (Buffer.byteLength(JSON.stringify(req.body), 'utf8') > MAX_BODY_BYTES) throw new DomainError('PAYLOAD_TOO_LARGE', 'La solicitud supera el tamaño permitido', 413)
    return req.body
  }
  throw new DomainError('INVALID_JSON', 'El cuerpo no contiene JSON válido', 400)
}

function createHandler(options = {}) {
  return async function handler(req, res) {
    const requestId = crypto.randomUUID()
    try {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST')
        return sendJson(res, 405, errorBody('METHOD_NOT_ALLOWED', 'Método no permitido', requestId))
      }

      const configuredKey = options.apiKey ?? String(process.env.COTIZADOR_API_KEY || '').trim()
      if (Buffer.byteLength(configuredKey, 'utf8') < 32) {
        return sendJson(res, 503, errorBody('SERVICE_NOT_CONFIGURED', 'El servicio no está configurado', requestId))
      }
      if (!safeCompare(req.headers['x-api-key'], configuredKey)) {
        return sendJson(res, 401, errorBody('UNAUTHORIZED', 'No autorizado', requestId))
      }

      const contentType = String(req.headers['content-type'] || '').toLowerCase()
      if (!contentType.startsWith('application/json')) {
        return sendJson(res, 400, errorBody('INVALID_REQUEST', 'Content-Type debe ser application/json', requestId, [
          { field: 'headers.content-type', message: 'Debe ser application/json' },
        ]))
      }

      const idempotencyKey = String(req.headers['idempotency-key'] || '')
      if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
        return sendJson(res, 400, errorBody('INVALID_REQUEST', 'La solicitud contiene campos inválidos', requestId, [
          { field: 'headers.idempotency-key', message: 'Debe contener entre 16 y 128 caracteres ASCII visibles' },
        ]))
      }

      const body = parseBody(req)
      const requestHash = hashRequest(body)
      const input = validateRequest(body)
      const repository = options.repository || require('../../server/cotizaciones/firebase-repository.cjs').createFirebaseQuoteRepository()
      const result = await repository.createQuote({
        input, requestHash, idempotencyKey, requestId,
      })
      return sendJson(res, result.status, result.body)
    } catch (error) {
      if (error instanceof DomainError) {
        return sendJson(res, error.status, errorBody(error.code, error.message, requestId, error.errors))
      }
      logInternalError(options.logger || console, requestId, error)
      return sendJson(res, 500, errorBody('INTERNAL_ERROR', 'No fue posible crear la cotización', requestId))
    }
  }
}

const handler = createHandler()

module.exports = handler
module.exports.createHandler = createHandler
module.exports.logInternalError = logInternalError
module.exports.parseBody = parseBody
module.exports.safeCompare = safeCompare
