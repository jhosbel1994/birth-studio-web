// Página pública de seguimiento del proyecto (la que ve el cliente por QR/link).
// Seguridad: NO expone la colección 'cotizaciones' al público. Lee con el admin
// SDK (server-side) por un token aleatorio y devuelve SOLO campos seguros
// (folio, nombre, proyecto y fases con fecha). Nunca precios, RUT, ítems ni
// datos de otros clientes. Las reglas de Firestore quedan intactas.

const { getAdminDb } = require('../server/cotizaciones/firebase-repository.cjs')

// Las 4 fases, en orden. Debe coincidir con sistema/src/utils/fases.js.
const FASES = [
  { id: 'inicial', label: 'Fase inicial' },
  { id: 'mitad', label: 'A mitad de fase' },
  { id: 'termino', label: 'En término' },
  { id: 'entregado', label: 'Entregado' },
]

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/

function escapeHtml(value = '') {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function fmtFecha(iso, conHora = true) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  try {
    return new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      day: '2-digit', month: '2-digit', year: 'numeric',
      ...(conHora ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(d)
  } catch {
    return ''
  }
}

function pagina({ titulo, cuerpo, status = 200 }) {
  return {
    status,
    html: `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(titulo)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin:0; background:#f4f4f5; color:#0a0a0a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; }
  .wrap { max-width:520px; margin:0 auto; padding:0 16px 48px; }
  .card { background:#fff; border:1px solid #e6e6e6; border-radius:18px; overflow:hidden; margin-top:20px; box-shadow:0 6px 24px rgba(0,0,0,.05); }
  .top { background:#0a0a0a; color:#fff; padding:22px 22px 20px; }
  .brand { font-size:20px; font-weight:800; letter-spacing:1px; }
  .sub { font-size:11px; text-transform:uppercase; letter-spacing:2px; color:rgba(255,255,255,.5); margin-top:2px; }
  .folio { float:right; text-align:right; }
  .folio .n { font-size:22px; font-weight:800; color:#e8000d; line-height:1; }
  .body { padding:22px; }
  .cliente { font-size:16px; font-weight:700; }
  .proyecto { font-size:14px; color:#666; margin:4px 0 20px; line-height:1.5; }
  .steps { list-style:none; margin:0; padding:0; }
  .step { display:flex; gap:14px; padding:0; position:relative; }
  .rail { display:flex; flex-direction:column; align-items:center; }
  .dot { width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; flex-shrink:0; border:2px solid #e0e0e0; background:#fff; color:#bbb; }
  .step.done .dot { background:#16a34a; border-color:#16a34a; color:#fff; }
  .step.current .dot { background:#e8000d; border-color:#e8000d; color:#fff; box-shadow:0 0 0 4px rgba(232,0,13,.15); }
  .line { width:2px; flex:1; background:#e6e6e6; min-height:26px; }
  .step.done .line { background:#16a34a; }
  .txt { padding-bottom:22px; padding-top:2px; }
  .step:last-child .txt { padding-bottom:0; }
  .lab { font-size:15px; font-weight:700; }
  .step.pending .lab { color:#999; font-weight:600; }
  .date { font-size:12.5px; color:#888; margin-top:2px; }
  .current .lab { color:#e8000d; }
  .banner { margin:20px 0 0; background:#ecfdf3; border:1px solid #b7f0cd; color:#127a3a; border-radius:12px; padding:12px 14px; font-size:14px; font-weight:600; text-align:center; }
  .foot { text-align:center; color:#9a9a9a; font-size:12px; margin-top:22px; line-height:1.6; }
  .foot a { color:#666; text-decoration:none; }
  .empty { text-align:center; padding:40px 22px; color:#666; }
</style>
</head>
<body>
  <div class="wrap">${cuerpo}</div>
</body>
</html>`,
  }
}

function paginaProyecto(cot) {
  const faseActual = cot.fase || null
  const idx = FASES.findIndex(f => f.id === faseActual)
  const historial = Array.isArray(cot.faseHistorial) ? cot.faseHistorial : []
  const fechaDe = (id) => {
    const h = historial.find(x => x && x.fase === id)
    return h ? h.at : ''
  }

  const steps = FASES.map((f, i) => {
    const done = idx >= 0 && i < idx
    const current = i === idx
    const estado = done ? 'done' : current ? 'current' : 'pending'
    const marca = done ? '✓' : String(i + 1)
    const fecha = fechaDe(f.id)
    const fechaTxt = fecha ? `<div class="date">${escapeHtml(fmtFecha(fecha))}</div>` : ''
    const linea = i < FASES.length - 1 ? '<div class="line"></div>' : ''
    return `<li class="step ${estado}">
      <div class="rail"><div class="dot">${marca}</div>${linea}</div>
      <div class="txt"><div class="lab">${escapeHtml(f.label)}</div>${fechaTxt}</div>
    </li>`
  }).join('')

  const entregado = faseActual === 'entregado'
  const banner = entregado
    ? `<div class="banner">✅ Proyecto entregado${cot.entregaAt ? ` · ${escapeHtml(fmtFecha(cot.entregaAt))}` : ''}</div>`
    : ''

  const cuerpo = `
    <div class="card">
      <div class="top">
        <div class="folio"><div class="sub">Folio</div><div class="n">#${escapeHtml(cot.numero || '')}</div></div>
        <div class="brand">BIRTH STUDIO</div>
        <div class="sub">Seguimiento de tu proyecto</div>
      </div>
      <div class="body">
        <div class="cliente">${escapeHtml(cot.clienteNombre || 'Cliente')}</div>
        ${cot.descripcion ? `<div class="proyecto">${escapeHtml(cot.descripcion)}</div>` : '<div class="proyecto"></div>'}
        <ul class="steps">${steps}</ul>
        ${banner}
      </div>
    </div>
    <div class="foot">
      Birth Studio SpA · <a href="https://www.bspublicidad.cl">bspublicidad.cl</a><br>
      ¿Dudas? Escríbenos por WhatsApp +56 9 7724 7545
    </div>`

  return pagina({ titulo: `Seguimiento #${cot.numero || ''} — Birth Studio`, cuerpo })
}

function paginaNoEncontrado() {
  const cuerpo = `
    <div class="card">
      <div class="top"><div class="brand">BIRTH STUDIO</div><div class="sub">Seguimiento de proyecto</div></div>
      <div class="empty">No encontramos este seguimiento.<br>Revisa el enlace o pídenos uno nuevo.</div>
    </div>
    <div class="foot">Birth Studio SpA · <a href="https://www.bspublicidad.cl">bspublicidad.cl</a></div>`
  return pagina({ titulo: 'Seguimiento no encontrado — Birth Studio', cuerpo, status: 404 })
}

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET')
    const { status, html } = paginaNoEncontrado()
    return res.status(405).send(html)
  }

  let token = ''
  try {
    const url = new URL(req.url, 'https://x')
    token = String(url.searchParams.get('t') || '').trim()
  } catch {
    token = ''
  }

  if (!TOKEN_PATTERN.test(token)) {
    const { status, html } = paginaNoEncontrado()
    return res.status(status).send(html)
  }

  try {
    const db = getAdminDb()
    const snap = await db.collection('cotizaciones')
      .where('seguimientoToken', '==', token).limit(1).get()

    if (snap.empty) {
      const { status, html } = paginaNoEncontrado()
      return res.status(status).send(html)
    }

    const data = snap.docs[0].data()
    // Proyección de SOLO campos seguros (nada de precios, RUT, ítems, etc.).
    const seguro = {
      numero: data.numero || '',
      clienteNombre: data.clienteNombre || '',
      descripcion: data.descripcion || '',
      fase: data.fase || null,
      faseHistorial: Array.isArray(data.faseHistorial) ? data.faseHistorial : [],
      entregaAt: data.entregaAt || '',
    }
    const { status, html } = paginaProyecto(seguro)
    return res.status(status).send(html)
  } catch {
    // Ante cualquier error no filtramos detalles: página genérica.
    const { status, html } = paginaNoEncontrado()
    return res.status(status).send(html)
  }
}

module.exports = handler
module.exports.escapeHtml = escapeHtml
module.exports.fmtFecha = fmtFecha
module.exports.paginaProyecto = paginaProyecto
module.exports.paginaNoEncontrado = paginaNoEncontrado
