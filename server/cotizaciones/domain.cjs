const crypto = require('node:crypto')

const DEFAULT_PAYMENT = 'Transferencia bancaria — 50% anticipo, 50% contra entrega'
const SYSTEM_URL = 'https://www.bspublicidad.cl/cotizador/#/cotizaciones'

class DomainError extends Error {
  constructor(code, message, status, errors = []) {
    super(message)
    this.name = 'DomainError'
    this.code = code
    this.status = status
    this.errors = errors
  }
}

function normalizeWhitespace(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function normalizeSearch(value) {
  return normalizeWhitespace(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CL')
}

function normalizeRut(value) {
  return normalizeWhitespace(value).replace(/[^0-9kK]/g, '').toUpperCase()
}

function normalizeEmail(value) {
  return normalizeWhitespace(value).toLowerCase()
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
}

function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function hashRequest(body) {
  return hashValue(stableStringify(body))
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function validateRequest(body) {
  const errors = []
  if (!isPlainObject(body)) {
    throw new DomainError('INVALID_REQUEST', 'La solicitud contiene campos inválidos', 400, [
      { field: 'body', message: 'Debe ser un objeto JSON' },
    ])
  }

  const rawClient = isPlainObject(body.cliente) ? body.cliente : {}
  const clientName = normalizeWhitespace(rawClient.nombre)
  const clientId = rawClient.id == null ? null : normalizeWhitespace(rawClient.id)
  const rut = rawClient.rut == null ? '' : normalizeWhitespace(rawClient.rut)
  const email = rawClient.email == null ? '' : normalizeEmail(rawClient.email)
  const phone = rawClient.telefono == null ? '' : normalizeWhitespace(rawClient.telefono)
  const company = rawClient.empresa == null ? '' : normalizeWhitespace(rawClient.empresa)
  const createIfMissing = rawClient.crear_si_no_existe == null ? false : rawClient.crear_si_no_existe

  if (!clientName || clientName.length > 120) errors.push({ field: 'cliente.nombre', message: 'Debe tener entre 1 y 120 caracteres' })
  if (clientId != null && (!clientId || clientId.length > 160)) errors.push({ field: 'cliente.id', message: 'Debe ser un identificador válido' })
  if (rut.length > 20) errors.push({ field: 'cliente.rut', message: 'No puede superar 20 caracteres' })
  if (email && (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) errors.push({ field: 'cliente.email', message: 'Debe ser un correo válido de hasta 160 caracteres' })
  if (phone.length > 40) errors.push({ field: 'cliente.telefono', message: 'No puede superar 40 caracteres' })
  if (company.length > 160) errors.push({ field: 'cliente.empresa', message: 'No puede superar 160 caracteres' })
  if (typeof createIfMissing !== 'boolean') errors.push({ field: 'cliente.crear_si_no_existe', message: 'Debe ser booleano' })

  const projectType = body.tipo_proyecto == null ? 'publicidad' : body.tipo_proyecto
  const project = normalizeWhitespace(body.proyecto)
  const deliveryTerm = body.plazo_entrega == null ? '' : normalizeWhitespace(body.plazo_entrega)
  const paymentMethod = body.forma_pago == null ? DEFAULT_PAYMENT : normalizeWhitespace(body.forma_pago)
  const validityDays = body.validez_dias == null ? 15 : body.validez_dias

  if (!['publicidad', 'estructuras'].includes(projectType)) errors.push({ field: 'tipo_proyecto', message: 'Debe ser publicidad o estructuras' })
  if (!project || project.length > 500) errors.push({ field: 'proyecto', message: 'Debe tener entre 1 y 500 caracteres' })
  if (deliveryTerm.length > 120) errors.push({ field: 'plazo_entrega', message: 'No puede superar 120 caracteres' })
  if (!paymentMethod || paymentMethod.length > 240) errors.push({ field: 'forma_pago', message: 'Debe tener entre 1 y 240 caracteres' })
  if (!Number.isInteger(validityDays) || validityDays < 1 || validityDays > 30) errors.push({ field: 'validez_dias', message: 'Debe ser un entero entre 1 y 30' })

  const rawItems = body.items
  if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > 30) {
    errors.push({ field: 'items', message: 'Debe contener entre 1 y 30 ítems' })
  }

  const items = Array.isArray(rawItems) ? rawItems.map((rawItem, index) => {
    const item = isPlainObject(rawItem) ? rawItem : {}
    const description = normalizeWhitespace(item.descripcion)
    const quantity = item.cantidad
    const unitPrice = item.precio_unitario_neto
    if (!description || description.length > 500) errors.push({ field: `items[${index}].descripcion`, message: 'Debe tener entre 1 y 500 caracteres' })
    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1000) errors.push({ field: `items[${index}].cantidad`, message: 'Debe ser un número mayor que 0 y máximo 1000' })
    if (!Number.isInteger(unitPrice) || unitPrice <= 0 || unitPrice > 100000000) errors.push({ field: `items[${index}].precio_unitario_neto`, message: 'Debe ser un entero positivo y máximo 100.000.000' })
    const total = typeof quantity === 'number' && Number.isFinite(quantity) && Number.isInteger(unitPrice)
      ? Math.round(quantity * unitPrice)
      : 0
    if (!Number.isSafeInteger(total)) errors.push({ field: `items[${index}]`, message: 'El total del ítem excede el rango permitido' })
    return { descripcion: description, cantidad: quantity, precioUnitario: unitPrice, total }
  }) : []

  if (errors.length) throw new DomainError('INVALID_REQUEST', 'La solicitud contiene campos inválidos', 400, errors)

  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  const iva = Math.round(subtotal * 0.19)
  const total = subtotal + iva
  const anticipo = Math.round(total * 0.5)
  const saldo = total - anticipo
  if (![subtotal, iva, total, anticipo, saldo].every(Number.isSafeInteger)) {
    throw new DomainError('INVALID_REQUEST', 'La solicitud contiene campos inválidos', 400, [
      { field: 'items', message: 'El total excede el rango permitido' },
    ])
  }

  return {
    cliente: {
      id: clientId,
      nombre: clientName,
      rut,
      email,
      telefono: phone,
      empresa: company,
      crearSiNoExiste: createIfMissing,
      nombreNormalizado: normalizeSearch(clientName),
      rutNormalizado: normalizeRut(rut),
      correoNormalizado: normalizeEmail(email),
    },
    tipoProyecto: projectType,
    descripcion: project,
    plazoEntrega: deliveryTerm,
    formaPago: paymentMethod,
    validez: validityDays,
    items,
    subtotal,
    iva,
    total,
    anticipo,
    saldo,
  }
}

function matchClients(clients, target) {
  const rows = Array.isArray(clients) ? clients : []
  const priorities = [
    target.rutNormalizado && (client => normalizeRut(client.rut) === target.rutNormalizado),
    target.correoNormalizado && (client => normalizeEmail(client.correo || client.email) === target.correoNormalizado),
    client => normalizeSearch(client.nombre) === target.nombreNormalizado,
  ].filter(Boolean)

  for (const predicate of priorities) {
    const matches = rows.filter(predicate)
    if (matches.length) return matches
  }
  return []
}

function santiagoDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function addCalendarDays(isoDate, days) {
  const [year, month, day] = isoDate.split('-').map(Number)
  const value = new Date(Date.UTC(year, month - 1, day + days))
  return value.toISOString().slice(0, 10)
}

function formatFolio(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid quote number')
  return String(value).padStart(5, '0')
}

function clientFingerprint(client) {
  const identity = client.rutNormalizado || client.correoNormalizado || client.nombreNormalizado
  return hashValue(identity).slice(0, 32)
}

function buildQuoteRecord(input, client, number, options = {}) {
  const now = options.now || new Date()
  const timestamp = now.toISOString()
  const date = santiagoDate(now)
  return {
    numero: formatFolio(number),
    clienteId: client.id,
    clienteNombre: client.nombre || input.cliente.nombre,
    tipoProyecto: input.tipoProyecto,
    descripcion: input.descripcion,
    formaPago: input.formaPago,
    plazoEntrega: input.plazoEntrega,
    incluye: '',
    noIncluye: '',
    conIva: true,
    fecha: date,
    validez: input.validez,
    fechaVencimiento: addCalendarDays(date, input.validez),
    fechaInicio: '',
    fechaEntrega: '',
    items: input.items,
    subtotal: input.subtotal,
    iva: input.iva,
    total: input.total,
    anticipo: input.anticipo,
    saldo: input.saldo,
    descuento: 0,
    montoDescuento: 0,
    traslado: 0,
    estado: 'por_aceptar',
    origen: 'api_externa',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function buildSuccessResponse(quote, client, options = {}) {
  return {
    ok: true,
    request_id: options.requestId,
    folio: `#${quote.numero}`,
    cotizacion_id: options.quoteId,
    cliente_id: client.id,
    cliente_creado: Boolean(options.clientCreated),
    subtotal_neto: quote.subtotal,
    iva: quote.iva,
    total: quote.total,
    anticipo: quote.anticipo,
    saldo: quote.saldo,
    estado: quote.estado,
    estado_etiqueta: 'Por aceptar',
    url_sistema: SYSTEM_URL,
  }
}

module.exports = {
  DEFAULT_PAYMENT,
  SYSTEM_URL,
  DomainError,
  addCalendarDays,
  buildQuoteRecord,
  buildSuccessResponse,
  clientFingerprint,
  formatFolio,
  hashRequest,
  hashValue,
  matchClients,
  normalizeEmail,
  normalizeRut,
  normalizeSearch,
  santiagoDate,
  stableStringify,
  validateRequest,
}
