const ALLOWED_EMAILS = new Set([
  'jhosbelevilla@gmail.com',
  'bstudio.designe@gmail.com',
])

const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyDeidi9JsSnGUsODCV2rj1VwZ1ATd2_Apc'
const ALLOWED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const ALLOWED_CATEGORIES = new Set([
  'Materiales', 'Gasolina', 'Comida', 'Insumos', 'Arriendo',
  'Servicios externos', 'Publicidad', 'Otros',
])

// Limpia la ANTHROPIC_API_KEY por si en Vercel quedó con espacios, saltos de
// línea o comillas envolventes (causas frecuentes de "invalid x-api-key").
function cleanApiKey(raw) {
  let key = String(raw || '').trim()
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim()
  }
  return key
}

function cleanText(value, maxLength = 180) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : null
}

function cleanAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : null
}

function extractJson(text) {
  const match = String(text || '').match(/\{[\s\S]*\}/)
  if (!match) throw new Error('La respuesta del reconocimiento no contiene JSON')
  return JSON.parse(match[0])
}

function normalizeReceipt(raw = {}) {
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(raw.fecha || '') ? raw.fecha : null
  const categoria = ALLOWED_CATEGORIES.has(raw.categoria) ? raw.categoria : 'Otros'
  const detalle = Array.isArray(raw.detalle)
    ? raw.detalle.slice(0, 30).map(item => ({
        descripcion: cleanText(item?.descripcion, 120),
        cantidad: cleanAmount(item?.cantidad),
        monto: cleanAmount(item?.monto),
      })).filter(item => item.descripcion || item.monto != null)
    : []
  const confianza = Number(raw.confianza)

  return {
    establecimiento: cleanText(raw.establecimiento),
    rut: cleanText(raw.rut, 20),
    folio: cleanText(raw.folio || raw.numero_transaccion, 60),
    fecha,
    neto: cleanAmount(raw.neto),
    iva: cleanAmount(raw.iva),
    total: cleanAmount(raw.total ?? raw.monto),
    categoria,
    detalle,
    confianza: Number.isFinite(confianza) ? Math.min(1, Math.max(0, confianza)) : null,
  }
}

function originAllowed(origin) {
  if (!origin) return true
  try {
    const { hostname } = new URL(origin)
    return hostname === 'bspublicidad.cl'
      || hostname === 'www.bspublicidad.cl'
      || hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname.endsWith('.vercel.app')
  } catch {
    return false
  }
}

async function verifyFirebaseUser(idToken) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken }),
    },
  )
  if (!response.ok) throw new Error('Sesión Firebase inválida')
  const data = await response.json()
  const user = data.users?.[0]
  const email = String(user?.email || '').toLowerCase()
  if (!user?.emailVerified || !ALLOWED_EMAILS.has(email)) {
    throw new Error('Cuenta no autorizada')
  }
  return user
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })
  if (!originAllowed(req.headers.origin)) return res.status(403).json({ error: 'Origen no autorizado' })
  const apiKey = cleanApiKey(process.env.ANTHROPIC_API_KEY)
  if (!apiKey) {
    return res.status(503).json({ error: 'El reconocimiento de boletas aún no está configurado' })
  }

  const authorization = req.headers.authorization || ''
  const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!idToken) return res.status(401).json({ error: 'Inicia sesión nuevamente para escanear' })

  try {
    await verifyFirebaseUser(idToken)
  } catch (error) {
    return res.status(401).json({ error: error.message })
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
  } catch {
    return res.status(400).json({ error: 'La solicitud contiene datos inválidos' })
  }
  const mediaType = String(body.mediaType || '')
  const imageBase64 = String(body.imageBase64 || '')
  if (!ALLOWED_MEDIA_TYPES.has(mediaType)) {
    return res.status(400).json({ error: 'Formato de imagen no compatible' })
  }
  if (!imageBase64 || imageBase64.length > 3_500_000) {
    return res.status(413).json({ error: 'La imagen es demasiado grande para analizarla' })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 40_000)
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_RECEIPT_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageBase64 },
            },
            {
              type: 'text',
              text: `Analiza esta boleta, factura o ticket chileno. Devuelve únicamente un objeto JSON válido, sin markdown, con esta forma:
{"establecimiento":"string o null","rut":"string o null","folio":"string o null","fecha":"YYYY-MM-DD o null","neto":numero entero o null,"iva":numero entero o null,"total":numero entero o null,"categoria":"una categoría permitida","detalle":[{"descripcion":"string","cantidad":numero o null,"monto":numero entero o null}],"confianza":numero entre 0 y 1}

Categorías permitidas: Materiales, Gasolina, Comida, Insumos, Arriendo, Servicios externos, Publicidad, Otros.
Usa pesos chilenos enteros sin puntos ni símbolos. "total" debe ser el total final pagado, no el neto ni el efectivo entregado. No inventes datos ilegibles; usa null.`,
            },
          ],
        }],
      }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      let message = data?.error?.message || `Error ${response.status} del servicio de reconocimiento`
      // Traducir los errores de configuración más comunes a algo accionable.
      if (response.status === 401 || /x-api-key|authentication/i.test(message)) {
        message = 'La clave de Anthropic (ANTHROPIC_API_KEY en Vercel) no es válida. Debe empezar con "sk-ant-", sin comillas ni espacios, y luego hay que volver a desplegar.'
      } else if (/credit|balance|billing/i.test(message)) {
        message = 'La cuenta de Anthropic no tiene saldo. Agrega crédito en console.anthropic.com y reintenta.'
      }
      return res.status(response.status >= 500 ? 502 : 400).json({ error: message })
    }
    const text = data.content?.find(block => block.type === 'text')?.text
    return res.status(200).json({ datos: normalizeReceipt(extractJson(text)) })
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? 'El análisis tardó demasiado. Intenta con otra foto.'
      : 'No se pudo analizar la boleta'
    return res.status(502).json({ error: message })
  } finally {
    clearTimeout(timeout)
  }
}

module.exports = handler
module.exports.normalizeReceipt = normalizeReceipt
module.exports.extractJson = extractJson
