// Servidor MCP (Model Context Protocol) para Claude — conector personalizado.
// Expone la herramienta "crear_cotizacion", que llama al endpoint seguro
// /api/external/cotizaciones usando la COTIZADOR_API_KEY guardada del lado
// servidor (nunca viaja al chat de Claude).
//
// Transporte: Streamable HTTP (un solo endpoint POST que habla JSON-RPC 2.0).
// Se agrega en Claude como conector personalizado por URL: https://.../api/mcp

const crypto = require('node:crypto')
const gastos = require('../server/gastos/gastos-repository.cjs')
const ingresos = require('../server/finanzas/ingresos-repository.cjs')
const consultasCot = require('../server/cotizaciones/consultas.cjs')
const inventario = require('../server/inventario/inventario-repository.cjs')
const precios = require('../server/cotizador/precios-repository.cjs')

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

const TOOL_REGISTRAR_GASTO = {
  name: 'registrar_gasto',
  description:
    'Registra un gasto en el sistema de Birth Studio (queda en Gastos & Finanzas). Úsalo cuando el ' +
    'usuario envíe una foto de una boleta/factura o describa un gasto: extrae los datos de la imagen, ' +
    'muéstrale un resumen y pide confirmación antes de registrar. Montos en pesos chilenos enteros; ' +
    '"monto" es el TOTAL pagado.',
  inputSchema: {
    type: 'object',
    properties: {
      descripcion: {
        type: 'string',
        description: 'Proveedor/comercio y detalle del gasto. Ej: "Sodimac - tornillos y silicona"',
      },
      monto: {
        type: 'integer',
        description: 'Monto TOTAL pagado en pesos chilenos, entero, sin puntos ni símbolos',
      },
      fecha: {
        type: 'string',
        description: 'Fecha de la boleta en formato YYYY-MM-DD (la de la boleta, no necesariamente hoy)',
      },
      categoria: { type: 'string', enum: gastos.CATEGORIAS, description: 'Categoría del gasto' },
      notas: {
        type: 'string',
        description: 'Notas opcionales: N° de boleta, RUT del proveedor, neto/IVA si vienen desglosados, etc.',
      },
    },
    required: ['descripcion', 'monto', 'fecha', 'categoria'],
  },
}

const TOOL_CONSULTAR_BALANCE = {
  name: 'consultar_balance',
  description:
    'Consulta el total de gastos (y opcionalmente ingresos) de Birth Studio en un período. Solo lectura. ' +
    'Útil para "¿cuánto gasté esta semana/mes?", "gastos por categoría", "gastos de este proveedor". ' +
    'Zona horaria de Chile; la semana parte el lunes; la quincena es 1–15 y 16–fin de mes.',
  inputSchema: {
    type: 'object',
    properties: {
      periodo: {
        type: 'string',
        enum: ['hoy', 'semana', 'quincena', 'mes', 'personalizado'],
        description: 'Período a consultar. Por defecto "mes".',
      },
      fecha_inicio: { type: 'string', description: 'Inicio YYYY-MM-DD (obligatorio si periodo = personalizado)' },
      fecha_fin: { type: 'string', description: 'Fin YYYY-MM-DD (obligatorio si periodo = personalizado)' },
      categoria: { type: 'string', enum: gastos.CATEGORIAS, description: 'Filtrar por una categoría (opcional)' },
      agrupar_por: {
        type: 'string',
        enum: ['categoria', 'dia', 'proveedor'],
        description: 'Cómo desglosar el total. Por defecto "categoria".',
      },
      incluir_ingresos: {
        type: 'boolean',
        description: 'Si es true, incluye ingresos (pagos recibidos) y el neto (ingresos − gastos).',
      },
    },
  },
}

const TOOL_REGISTRAR_INGRESO = {
  name: 'registrar_ingreso',
  description:
    'Registra un ingreso (pago recibido) en Birth Studio; queda en Gastos & Finanzas. Úsalo cuando el ' +
    'usuario reciba dinero: un abono/anticipo, el saldo o el pago total de una cotización, o cualquier otro ' +
    'ingreso. Montos en pesos chilenos enteros. Muestra un resumen y pide confirmación antes de registrar. ' +
    'Para vincularlo a una cotización usa su folio (solo en ámbito Birth).',
  inputSchema: {
    type: 'object',
    properties: {
      monto: { type: 'integer', description: 'Monto recibido en pesos chilenos, entero, sin puntos ni símbolos' },
      fecha: { type: 'string', description: 'Fecha del pago en formato YYYY-MM-DD' },
      tipo: {
        type: 'string',
        enum: ['anticipo', 'saldo', 'total', 'otro'],
        description: 'Tipo de ingreso. Por defecto "otro".',
      },
      folio: {
        type: 'string',
        description: 'Folio de la cotización a la que corresponde el pago (ej: "00312" o "312"). Opcional; solo aplica en ámbito Birth.',
      },
      ambito: {
        type: 'string',
        enum: ['birth', 'personal'],
        description: 'Bolsillo al que entra el dinero. Por defecto "birth".',
      },
      origen_birth: {
        type: 'boolean',
        description: 'Solo si ambito="personal": el dinero PROVIENE de Birth (retiro). Descuenta de Birth y suma a Personal.',
      },
      notas: { type: 'string', description: 'Notas opcionales (ej: medio de pago, N° de comprobante)' },
    },
    required: ['monto', 'fecha'],
  },
}

const TOOL_CONSULTAR_COTIZACIONES = {
  name: 'consultar_cotizaciones',
  description:
    'Consulta las cotizaciones de Birth Studio y el estado de cada una (por aceptar, aceptada, terminada, ' +
    'rechazada). Solo lectura. Filtra por estado, nombre de empresa, nombre de persona, RUT o folio. Usa ' +
    'estado="pendientes" para ver los trabajos aceptados que aún NO se terminan. Devuelve folio, cliente, ' +
    'estado, total y saldo pendiente (calculado con los pagos ya registrados).',
  inputSchema: {
    type: 'object',
    properties: {
      estado: {
        type: 'string',
        enum: ['todas', 'por_aceptar', 'aceptada', 'terminada', 'rechazada', 'pendientes'],
        description: 'Filtra por estado. "pendientes" = aceptadas sin terminar. Por defecto "todas".',
      },
      empresa: { type: 'string', description: 'Filtra por nombre de empresa (coincidencia parcial)' },
      nombre: { type: 'string', description: 'Filtra por nombre de la persona o empresa (coincidencia parcial)' },
      rut: { type: 'string', description: 'Filtra por RUT de la persona o empresa' },
      folio: { type: 'string', description: 'Folio exacto de la cotización (ej: "00312" o "312")' },
      busqueda: { type: 'string', description: 'Texto libre: busca en cliente, empresa, folio o descripción' },
      limite: { type: 'integer', description: 'Máximo de cotizaciones a devolver (1 a 100). Por defecto 20.' },
    },
  },
}

const TOOL_CONSULTAR_INVENTARIO = {
  name: 'consultar_inventario',
  description:
    'Consulta el inventario de materiales de Birth Studio (stock actual con semáforo verde/amarillo/rojo). ' +
    'Solo lectura. Útil para "¿qué tengo en inventario?", "¿qué está por agotarse?". Filtra por nombre; con ' +
    'solo_bajo_stock=true muestra únicamente lo que está bajo (amarillo) o crítico/agotado (rojo).',
  inputSchema: {
    type: 'object',
    properties: {
      busqueda: { type: 'string', description: 'Filtra materiales cuyo nombre contenga este texto' },
      solo_bajo_stock: { type: 'boolean', description: 'Si es true, solo materiales bajo stock o agotados' },
      limite: { type: 'integer', description: 'Máximo de materiales a devolver (1 a 200). Por defecto 50.' },
    },
  },
}

const TOOL_CONSULTAR_PRECIO = {
  name: 'consultar_precio',
  description:
    'Consulta los precios del cotizador de Birth Studio (telas, acrílico, sintra, LED, pendones, tarjetas, ' +
    'volantes, bastidores, etc.). Solo lectura. Busca por texto (ej: "acrílico 3mm", "led", "pendón 2.0") o ' +
    'por categoría; sin criterio devuelve la lista de categorías. IMPORTANTE: los ítems marcados "aplica ' +
    'multiplicador" son PRECIO DE PROVEEDOR; el precio final se multiplica por el nivel de instalación ' +
    '(×2 sin instalación, ×3 con instalación sin andamio, ×4 con andamio).',
  inputSchema: {
    type: 'object',
    properties: {
      busqueda: { type: 'string', description: 'Texto a buscar en los productos (nombre o material)' },
      categoria: { type: 'string', description: 'Nombre de una categoría para listar sus precios (ej: "Sintra", "Iluminación LED")' },
      limite: { type: 'integer', description: 'Máximo de resultados (1 a 60). Por defecto 30.' },
    },
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

// Registra un gasto y devuelve texto para Claude.
async function registrarGastoTool(args = {}) {
  const r = await gastos.registrarGasto(args)
  if (!r.ok) return { isError: true, text: `⚠️ ${r.message}` }
  const g = r.gasto
  const text =
    `✅ Gasto registrado.\n` +
    `• ${g.descripcion}\n` +
    `• Monto: ${clp(g.monto)}\n` +
    `• Fecha: ${g.fecha}\n` +
    `• Categoría: ${g.categoria}` +
    (g.notas ? `\n• Notas: ${g.notas}` : '')
  return { isError: false, text }
}

// Consulta balances y devuelve texto para Claude.
async function consultarBalanceTool(args = {}) {
  const r = await gastos.consultarBalance(args)
  const lineas = Object.entries(r.grupos)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `   • ${k}: ${clp(v)}`)
  let text =
    `📊 Balance — ${r.etiqueta}\n` +
    `Total gastos: ${clp(r.total)} (${r.cantidad} ${r.cantidad === 1 ? 'gasto' : 'gastos'})` +
    (r.filtroCategoria ? ` · categoría: ${r.filtroCategoria}` : '')
  if (lineas.length) text += `\nDesglose por ${r.agruparPor}:\n${lineas.join('\n')}`
  if (r.ingresos != null) {
    text +=
      `\nIngresos (pagos recibidos): ${clp(r.ingresos)}` +
      `\nNeto (ingresos − gastos): ${clp(r.neto)}`
  }
  return { isError: false, text }
}

// Registra un ingreso y devuelve texto para Claude.
async function registrarIngresoTool(args = {}) {
  const r = await ingresos.registrarIngreso(args)
  if (!r.ok) return { isError: true, text: `⚠️ ${r.message}` }
  const p = r.pago
  let text =
    `✅ Ingreso registrado.\n` +
    `• Monto: ${clp(p.monto)}\n` +
    `• Fecha: ${p.fecha}\n` +
    `• Tipo: ${p.tipo}\n` +
    `• Ámbito: ${p.ambito === 'personal' ? 'Personal' : 'Birth'}`
  if (r.cotizacion) text += `\n• Vinculado a: #${r.cotizacion.numero} — ${r.cotizacion.clienteNombre || 'cliente'}`
  if (p.origenBirth) text += `\n• Retiro desde Birth (se descontó de Birth y sumó a Personal)`
  if (p.notas) text += `\n• Notas: ${p.notas}`
  return { isError: false, text }
}

// Consulta cotizaciones y su estado; devuelve texto para Claude.
async function consultarCotizacionesTool(args = {}) {
  const r = await consultasCot.consultarCotizaciones(args)
  if (!r.items.length) {
    return { isError: false, text: 'No se encontraron cotizaciones con esos filtros.' }
  }
  const lineas = r.items.map(c => {
    const emp = c.empresa ? ` (${c.empresa})` : ''
    const saldo = c.saldoPendiente > 0 ? ` · saldo ${clp(c.saldoPendiente)}` : ' · pagada'
    return `• ${c.folio} · ${c.estadoEtiqueta} · ${c.cliente}${emp} · total ${clp(c.total)}${saldo}`
  })
  const cabecera = r.truncado ? `${r.total} (mostrando ${r.items.length})` : `${r.total}`
  const text =
    `📋 Cotizaciones — ${cabecera}\n` +
    `Por aceptar: ${r.conteos.por_aceptar} · Aceptadas: ${r.conteos.aceptada} · ` +
    `Terminadas: ${r.conteos.terminada} · Rechazadas: ${r.conteos.rechazada}\n` +
    lineas.join('\n')
  return { isError: false, text }
}

// Consulta el inventario; devuelve texto para Claude.
async function consultarInventarioTool(args = {}) {
  const r = await inventario.consultarInventario(args)
  const emoji = e => (e === 'rojo' ? '🔴' : e === 'amarillo' ? '🟡' : e === 'verde' ? '🟢' : '⚪')
  if (!r.items.length) {
    return { isError: false, text: 'No se encontraron materiales con esos filtros.' }
  }
  const lineas = r.items.map(i =>
    `${emoji(i.estado)} ${i.nombre}: ${i.cantidad} ${i.unidad}${i.valor ? ` · valor ${clp(i.valor)}` : ''}`)
  const alerta = r.resumen.bajoStock
    ? `⚠️ ${r.resumen.bajoStock} bajo stock${r.resumen.agotados ? `, ${r.resumen.agotados} agotados` : ''}\n`
    : ''
  const text =
    `📦 Inventario — ${r.resumen.items} ítems · valor ${clp(r.resumen.valorTotal)}\n` +
    alerta +
    lineas.join('\n')
  return { isError: false, text }
}

// Consulta precios del cotizador; devuelve texto para Claude.
async function consultarPrecioTool(args = {}) {
  const r = precios.buscarPrecios(args)
  if (r.modo === 'categorias') {
    return {
      isError: false,
      text:
        `Categorías del cotizador:\n${r.categorias.map(c => `• ${c}`).join('\n')}\n\n` +
        `Dime una categoría o busca por texto (ej: "acrílico 3mm", "led", "pendón").`,
    }
  }
  if (!r.resultados.length) {
    return { isError: false, text: 'No encontré precios para esa búsqueda. Prueba otra palabra o pide la lista de categorías.' }
  }
  const lineas = r.resultados.map(f => {
    const mult = f.aplicaMultiplicador ? ' (precio proveedor ×mult)' : ''
    const nota = f.nota ? ` — ${f.nota}` : ''
    return `• ${f.nombre}: ${clp(f.precio)}/${f.unidad}${mult}${nota}`
  })
  const mult = r.multiplicadores.map(m => `${m.label} ×${m.valor}`).join(' · ')
  const cabecera = r.truncado ? `${r.total} (mostrando ${r.resultados.length})` : `${r.total}`
  const text =
    `💲 Precios del cotizador — ${cabecera}\n${lineas.join('\n')}\n\n` +
    `Multiplicadores de instalación: ${mult}. Los ítems "(precio proveedor ×mult)" se multiplican por el nivel de instalación.`
  return { isError: false, text }
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
      return rpcResult(id, {
        tools: [
          TOOL_CREAR_COTIZACION,
          TOOL_REGISTRAR_GASTO,
          TOOL_CONSULTAR_BALANCE,
          TOOL_REGISTRAR_INGRESO,
          TOOL_CONSULTAR_COTIZACIONES,
          TOOL_CONSULTAR_INVENTARIO,
          TOOL_CONSULTAR_PRECIO,
        ],
      })

    case 'tools/call': {
      const name = params && params.name
      const args = (params && params.arguments) || {}
      try {
        let out
        if (name === 'crear_cotizacion') out = await crearCotizacion(args)
        else if (name === 'registrar_gasto') out = await registrarGastoTool(args)
        else if (name === 'consultar_balance') out = await consultarBalanceTool(args)
        else if (name === 'registrar_ingreso') out = await registrarIngresoTool(args)
        else if (name === 'consultar_cotizaciones') out = await consultarCotizacionesTool(args)
        else if (name === 'consultar_inventario') out = await consultarInventarioTool(args)
        else if (name === 'consultar_precio') out = await consultarPrecioTool(args)
        else return rpcError(id, -32602, `Herramienta desconocida: ${name}`)
        return rpcResult(id, { content: [{ type: 'text', text: out.text }], isError: out.isError })
      } catch {
        return rpcResult(id, {
          content: [{ type: 'text', text: 'No se pudo completar la operación. Intenta de nuevo.' }],
          isError: true,
        })
      }
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
