// Servidor MCP (Model Context Protocol) para Claude — conector personalizado.
// Expone la herramienta "crear_cotizacion", que llama al endpoint seguro
// /api/external/cotizaciones usando la COTIZADOR_API_KEY guardada del lado
// servidor (nunca viaja al chat de Claude).
//
// Transporte: Streamable HTTP (un solo endpoint POST que habla JSON-RPC 2.0).
// Se agrega en Claude como conector personalizado por URL: https://.../api/mcp

const crypto = require('node:crypto')

const PROTOCOL_VERSION = '2025-06-18'
const SERVER_NAME = 'birth-studio-cotizaciones'
const SERVER_VERSION = '1.0.0'
const QUOTES_ENDPOINT = process.env.COTIZADOR_ENDPOINT_URL
  || 'https://www.bspublicidad.cl/api/external/cotizaciones'

// Esquema de la herramienta que verá Claude. Campos de cliente "planos" para
// que al modelo le resulte fácil rellenarlos; aquí los rearmamos al formato
// que espera el endpoint.
const TOOL_CREAR_COTIZACION = {
  name: 'crear_cotizacion',
  description:
    'Crea una cotización en el sistema interno de Birth Studio (letreros, letras corpóreas, ' +
    'estructuras, publicidad). Queda en estado "por aceptar" con folio correlativo y lista para ' +
    'generar su PDF. Los precios son NETOS en pesos chilenos (sin IVA); el sistema calcula el IVA ' +
    '(19%), el total, el anticipo (50%) y el saldo. No inventes precios: confírmalos con el usuario ' +
    'antes de llamar a esta herramienta, y muéstrale un resumen para que confirme.',
  inputSchema: {
    type: 'object',
    properties: {
      cliente_nombre: { type: 'string', description: 'Nombre del cliente o empresa (obligatorio)' },
      cliente_rut: { type: 'string', description: 'RUT del cliente (opcional)' },
      cliente_email: { type: 'string', description: 'Correo del cliente (opcional)' },
      cliente_telefono: { type: 'string', description: 'Teléfono del cliente (opcional)' },
      cliente_empresa: { type: 'string', description: 'Empresa del cliente (opcional)' },
      crear_cliente_si_no_existe: {
        type: 'boolean',
        description: 'Si el cliente no existe, créalo automáticamente. Por defecto true.',
      },
      tipo_proyecto: {
        type: 'string',
        enum: ['publicidad', 'estructuras'],
        description: 'Tipo de proyecto. Por defecto "publicidad".',
      },
      proyecto: { type: 'string', description: 'Descripción del proyecto o trabajo (obligatorio)' },
      items: {
        type: 'array',
        description: 'Líneas de la cotización (mínimo 1)',
        items: {
          type: 'object',
          properties: {
            descripcion: { type: 'string', description: 'Descripción del ítem' },
            cantidad: { type: 'number', description: 'Cantidad (mayor que 0)' },
            precio_unitario_neto: {
              type: 'integer',
              description: 'Precio NETO por unidad en pesos chilenos, sin IVA, sin puntos ni símbolos',
            },
          },
          required: ['descripcion', 'cantidad', 'precio_unitario_neto'],
        },
      },
      plazo_entrega: { type: 'string', description: 'Plazo de entrega (opcional). Ej: "10 días"' },
      forma_pago: { type: 'string', description: 'Forma de pago (opcional)' },
      validez_dias: { type: 'integer', description: 'Días de validez (1 a 30). Por defecto 15.' },
    },
    required: ['cliente_nombre', 'proyecto', 'items'],
  },
}

// Formatea pesos chilenos: 808200 -> "$808.200"
function clp(n) {
  const v = Number(n) || 0
  return '$' + v.toLocaleString('es-CL')
}

// Llama al endpoint seguro de cotizaciones y devuelve un texto para Claude.
async function crearCotizacion(args = {}) {
  const apiKey = String(process.env.COTIZADOR_API_KEY || '').trim()
  if (!apiKey) {
    return { isError: true, text: 'El servicio no está configurado (falta COTIZADOR_API_KEY en el servidor).' }
  }

  const body = {
    cliente: {
      nombre: args.cliente_nombre,
      rut: args.cliente_rut,
      email: args.cliente_email,
      telefono: args.cliente_telefono,
      empresa: args.cliente_empresa,
      crear_si_no_existe: args.crear_cliente_si_no_existe !== false, // por defecto true
    },
    tipo_proyecto: args.tipo_proyecto || 'publicidad',
    proyecto: args.proyecto,
    items: Array.isArray(args.items) ? args.items : [],
    plazo_entrega: args.plazo_entrega,
    forma_pago: args.forma_pago,
    validez_dias: args.validez_dias == null ? 15 : args.validez_dias,
  }

  let response
  try {
    response = await fetch(QUOTES_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'idempotency-key': crypto.randomUUID(),
      },
      body: JSON.stringify(body),
    })
  } catch {
    return { isError: true, text: 'No se pudo contactar el servicio de cotizaciones. Intenta de nuevo.' }
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.ok) {
    // Devuelve el mensaje y, si hay errores por campo, los lista.
    const detalle = Array.isArray(data?.errors) && data.errors.length
      ? ' Detalles: ' + data.errors.map(e => `${e.field}: ${e.message}`).join('; ')
      : ''
    return { isError: true, text: `No se pudo crear la cotización: ${data?.message || 'error desconocido'}.${detalle}` }
  }

  const texto =
    `✅ Cotización creada. Folio ${data.folio}.\n` +
    `• Subtotal neto: ${clp(data.subtotal_neto)}\n` +
    `• IVA (19%): ${clp(data.iva)}\n` +
    `• Total: ${clp(data.total)}\n` +
    `• Anticipo (50%): ${clp(data.anticipo)} · Saldo: ${clp(data.saldo)}\n` +
    `• Cliente: ${args.cliente_nombre}${data.cliente_creado ? ' (creado)' : ''}\n` +
    `• Estado: ${data.estado_etiqueta}\n` +
    `Puedes verla y generar su PDF en: ${data.url_sistema}`
  return { isError: false, text: texto }
}

// ─── Protocolo MCP (JSON-RPC 2.0 sobre Streamable HTTP) ───────────────────────

function rpcResult(id, result) {
  return { jsonrpc: '2.0', id, result }
}
function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

async function handleRpc(msg) {
  const { id, method, params } = msg || {}

  switch (method) {
    case 'initialize':
      return rpcResult(id, {
        protocolVersion: (params && params.protocolVersion) || PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      })

    case 'tools/list':
      return rpcResult(id, { tools: [TOOL_CREAR_COTIZACION] })

    case 'tools/call': {
      const name = params && params.name
      const args = (params && params.arguments) || {}
      if (name !== 'crear_cotizacion') {
        return rpcError(id, -32602, `Herramienta desconocida: ${name}`)
      }
      const { isError, text } = await crearCotizacion(args)
      return rpcResult(id, { content: [{ type: 'text', text }], isError })
    }

    // Métodos que algunos clientes consultan tras conectar; respondemos vacío.
    case 'resources/list':
      return rpcResult(id, { resources: [] })
    case 'prompts/list':
      return rpcResult(id, { prompts: [] })
    case 'ping':
      return rpcResult(id, {})

    default:
      return rpcError(id, -32601, `Método no soportado: ${method}`)
  }
}

// Si se define MCP_TOKEN en el servidor, exige ?token=... en la URL del conector.
// Si no está definido, funciona sin token (útil para la primera prueba).
function tokenPermitido(req) {
  const expected = String(process.env.MCP_TOKEN || '').trim()
  if (!expected) return true
  try {
    const url = new URL(req.url, 'https://x')
    const provided = url.searchParams.get('token') || req.headers['x-mcp-token'] || ''
    const a = Buffer.from(String(provided))
    const b = Buffer.from(expected)
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  // GET/HEAD: sonda de salud (no soportamos SSE server->cliente).
  if (req.method === 'GET' || req.method === 'HEAD') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    return res.status(200).json({ name: SERVER_NAME, version: SERVER_VERSION, transport: 'streamable-http' })
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, GET')
    return res.status(405).json({ error: 'Método no permitido' })
  }
  if (!tokenPermitido(req)) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  // Parseo del cuerpo (Vercel a veces lo entrega ya parseado).
  let payload
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body)
      : Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8'))
      : req.body
  } catch {
    return res.status(400).json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido' } })
  }

  // Puede venir un mensaje o un lote (array).
  const mensajes = Array.isArray(payload) ? payload : [payload]

  // Las notificaciones (sin id) no llevan respuesta.
  const requests = mensajes.filter(m => m && m.id !== undefined && m.id !== null)
  if (requests.length === 0) {
    return res.status(202).end()
  }

  const respuestas = []
  for (const m of requests) {
    respuestas.push(await handleRpc(m))
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  return res.status(200).json(Array.isArray(payload) ? respuestas : respuestas[0])
}

module.exports = handler
module.exports.crearCotizacion = crearCotizacion
module.exports.handleRpc = handleRpc
