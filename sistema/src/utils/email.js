import emailjs from '@emailjs/browser'
import { clp, fechaCorta } from './formatters'

const EMAILJS_SERVICE = 'service_qtcrtcr'
const EMAILJS_PUBLIC_KEY = 'x6DqzGj_3ceKhk2NQ'
// Template para cotizaciones — ver instrucciones en la UI
const EMAILJS_TEMPLATE_COT = 'template_cotizacion'

emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY })

// ─── Genera el HTML del cuerpo del email ────────────────────────────────────
function buildEmailHTML(cotizacion, cliente) {
  const nombre = cliente?.nombre || cotizacion.clienteNombre || 'Cliente'
  const items = (cotizacion.items || [])
    .map(i => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">${i.descripcion}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:center;">${i.cantidad}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:right;">${clp(i.precioUnitario)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:right;font-weight:600;">${clp(i.total)}</td>
      </tr>`)
    .join('')

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;">
    <!-- Header -->
    <tr><td style="background:#0a0a0a;padding:20px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">
            <img src="https://www.bspublicidad.cl/cotizador/logo-birth.png"
                 alt="Birth Studio"
                 width="140"
                 style="display:block;height:auto;max-height:54px;width:auto;" />
          </td>
          <td style="text-align:right;vertical-align:middle;">
            <div style="color:rgba(255,255,255,0.35);font-size:9px;text-transform:uppercase;letter-spacing:3px;font-family:Arial;">Cotización</div>
            <div style="color:#e8000d;font-size:24px;font-weight:700;font-family:Arial;line-height:1.1;">#${cotizacion.numero}</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Saludo -->
    <tr><td style="padding:32px 32px 0;">
      <p style="font-size:15px;color:#0a0a0a;margin:0 0 8px;">Estimado/a <strong>${nombre}</strong>,</p>
      <p style="font-size:14px;color:#666;margin:0 0 24px;">Adjunto encontrará la cotización <strong>#${cotizacion.numero}</strong> solicitada.${cotizacion.descripcion ? `<br><span style="color:#999;">${cotizacion.descripcion}</span>` : ''}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:0 0 24px;">
    </td></tr>

    <!-- Tabla de ítems -->
    <tr><td style="padding:0 32px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <thead>
          <tr style="background:#0a0a0a;">
            <th style="padding:10px 12px;text-align:left;font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:1px;">Descripción</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:1px;width:50px;">Cant.</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:1px;">P. Unit.</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:1px;">Total</th>
          </tr>
        </thead>
        <tbody>${items}</tbody>
      </table>
    </td></tr>

    <!-- Totales -->
    <tr><td style="padding:0 32px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:0;">
        <tr><td style="padding:6px 12px;text-align:right;font-size:13px;color:#666;">Subtotal neto</td>
            <td style="padding:6px 12px;text-align:right;font-size:13px;color:#666;width:120px;">${clp(cotizacion.subtotal)}</td></tr>
        ${cotizacion.iva > 0 ? `<tr><td style="padding:6px 12px;text-align:right;font-size:13px;color:#666;">IVA (19%)</td>
            <td style="padding:6px 12px;text-align:right;font-size:13px;color:#666;">${clp(cotizacion.iva)}</td></tr>` : ''}
        <tr style="border-top:2px solid #0a0a0a;">
          <td style="padding:10px 12px;text-align:right;font-size:16px;font-weight:700;color:#0a0a0a;">TOTAL</td>
          <td style="padding:10px 12px;text-align:right;font-size:16px;font-weight:700;color:#e8000d;">${clp(cotizacion.total)}</td>
        </tr>
        <tr><td style="padding:4px 12px;text-align:right;font-size:12px;color:#999;">Anticipo 50%</td>
            <td style="padding:4px 12px;text-align:right;font-size:12px;color:#999;">${clp(cotizacion.anticipo)}</td></tr>
        <tr><td style="padding:4px 12px;text-align:right;font-size:12px;color:#999;">Saldo contraentrega</td>
            <td style="padding:4px 12px;text-align:right;font-size:12px;color:#999;">${clp(cotizacion.saldo)}</td></tr>
      </table>
    </td></tr>

    <!-- Info de pago / entrega -->
    ${cotizacion.formaPago || cotizacion.plazoEntrega ? `
    <tr><td style="padding:0 32px 24px;">
      <div style="background:#f5f5f5;border-radius:4px;padding:16px;font-size:13px;color:#666;">
        ${cotizacion.formaPago ? `<p style="margin:0 0 6px;"><strong style="color:#0a0a0a;">Forma de pago:</strong> ${cotizacion.formaPago}</p>` : ''}
        ${cotizacion.plazoEntrega ? `<p style="margin:0;"><strong style="color:#0a0a0a;">Plazo de entrega:</strong> ${cotizacion.plazoEntrega}</p>` : ''}
      </div>
    </td></tr>` : ''}

    <!-- Validez -->
    <tr><td style="padding:0 32px 24px;">
      <p style="font-size:13px;color:#999;margin:0;">Esta cotización tiene validez hasta el <strong>${fechaCorta(cotizacion.fechaVencimiento)}</strong>.</p>
    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#0a0a0a;padding:24px 32px;text-align:center;">
      <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0 0 6px;">
        <strong style="color:#fff;">Birth Studio SpA</strong> · RUT 77.990.344-3
      </p>
      <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0;">
        bstudio.designe@gmail.com · +56 9 7724 7545 · www.bspublicidad.cl · Talca, Chile
      </p>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Texto plano para clientes de correo sin HTML ────────────────────────────
function buildEmailText(cotizacion, cliente) {
  const nombre = cliente?.nombre || cotizacion.clienteNombre || 'Cliente'
  const items = (cotizacion.items || [])
    .map(i => `  • ${i.descripcion} — ${clp(i.total)}`)
    .join('\n')

  return `Estimado/a ${nombre},

Adjunto la cotización #${cotizacion.numero}${cotizacion.descripcion ? `\nProyecto: ${cotizacion.descripcion}` : ''}

DETALLE:
${items}

Subtotal neto: ${clp(cotizacion.subtotal)}${cotizacion.iva > 0 ? `\nIVA (19%): ${clp(cotizacion.iva)}` : ''}
TOTAL: ${clp(cotizacion.total)}
Anticipo (50%): ${clp(cotizacion.anticipo)}
Saldo contraentrega: ${clp(cotizacion.saldo)}

${cotizacion.formaPago ? `Forma de pago: ${cotizacion.formaPago}` : ''}
${cotizacion.plazoEntrega ? `Plazo de entrega: ${cotizacion.plazoEntrega}` : ''}

Cotización válida hasta: ${fechaCorta(cotizacion.fechaVencimiento)}

Atentamente,
Birth Studio SpA
bstudio.designe@gmail.com | +56 9 7724 7545
www.bspublicidad.cl`
}

// ─── Envío vía EmailJS (requiere template_cotizacion en el dashboard) ─────────
export async function enviarCotizacionEmailJS(cotizacion, cliente, emailDestino) {
  const htmlContent = buildEmailHTML(cotizacion, cliente)
  const textoPlano = buildEmailText(cotizacion, cliente)
  const nombre = cliente?.nombre || cotizacion.clienteNombre || 'Cliente'

  return emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE_COT, {
    to_email: emailDestino,
    to_name: nombre,
    numero: cotizacion.numero,
    asunto: `Cotización #${cotizacion.numero} — Birth Studio SpA`,
    cuerpo_html: htmlContent,
    cuerpo_texto: textoPlano,
    // Variables que usa el template de EmailJS
    name: 'Birth Studio SpA',
    email: 'bstudio.designe@gmail.com',
  })
}

// ─── Abrir Gmail compose pre-llenado (funciona siempre, sin config) ─────────
export function abrirGmailCompose(cotizacion, cliente, emailDestino) {
  const nombre = cliente?.nombre || cotizacion.clienteNombre || ''
  const asunto = `Cotización #${cotizacion.numero} — Birth Studio SpA`
  const cuerpo = buildEmailText(cotizacion, cliente)

  const url = `https://mail.google.com/mail/?view=cm&fs=1&from=bstudio.designe%40gmail.com&to=${encodeURIComponent(emailDestino)}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
  window.open(url, '_blank')
}
