import emailjs from '@emailjs/browser'
import { clp, fechaCorta } from './formatters'

const EMAILJS_SERVICE = 'service_qtcrtcr'
const EMAILJS_PUBLIC_KEY = 'x6DqzGj_3ceKhk2NQ'
const EMAILJS_TEMPLATE_COT = 'kvlfwpb'

emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY })

const EMPRESA = {
  nombre: 'Birth Studio SpA',
  correo: 'bstudio.designe@gmail.com',
  whatsapp: '+56 9 7724 7545',
  web: 'www.bspublicidad.cl',
  rut: '77.990.344-3',
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildEmailHTML(cotizacion, cliente) {
  const nombre = escapeHtml(cliente?.nombre || cotizacion.clienteNombre || 'Cliente')
  const descripcion = escapeHtml(cotizacion.descripcion || '')
  const items = (cotizacion.items || [])
    .map(i => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eeeeee;font-size:13px;color:#0a0a0a;">${escapeHtml(i.descripcion)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eeeeee;font-size:13px;text-align:center;color:#666666;">${escapeHtml(i.cantidad)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eeeeee;font-size:13px;text-align:right;color:#666666;">${clp(i.precioUnitario)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eeeeee;font-size:13px;text-align:right;font-weight:700;color:#0a0a0a;">${clp(i.total)}</td>
      </tr>`)
    .join('')

  return `<!doctype html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#0a0a0a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;">
    <tr>
      <td>
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e8e8e8;">
          <tr>
            <td style="background:#0a0a0a;padding:22px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:1px;">BIRTH STUDIO</td>
                  <td style="text-align:right;">
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,.45);">Cotización</div>
                    <div style="font-size:26px;font-weight:800;color:#e8000d;">#${escapeHtml(cotizacion.numero)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              <p style="margin:0 0 8px;font-size:15px;">Hola <strong>${nombre}</strong>,</p>
              <p style="margin:0 0 18px;font-size:14px;line-height:1.55;color:#666666;">
                Te enviamos la cotización solicitada de Birth Studio SpA.
                ${descripcion ? `<br><span style="color:#999999;">${descripcion}</span>` : ''}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 18px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e8e8e8;">
                <thead>
                  <tr style="background:#0a0a0a;">
                    <th style="padding:10px 12px;text-align:left;font-size:10px;color:#ffffff;text-transform:uppercase;letter-spacing:1px;">Descripción</th>
                    <th style="padding:10px 8px;text-align:center;font-size:10px;color:#ffffff;text-transform:uppercase;letter-spacing:1px;">Cant.</th>
                    <th style="padding:10px 8px;text-align:right;font-size:10px;color:#ffffff;text-transform:uppercase;letter-spacing:1px;">P. unit.</th>
                    <th style="padding:10px 12px;text-align:right;font-size:10px;color:#ffffff;text-transform:uppercase;letter-spacing:1px;">Total</th>
                  </tr>
                </thead>
                <tbody>${items}</tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 22px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:5px 0;text-align:right;font-size:13px;color:#666666;">Subtotal neto</td><td style="padding:5px 0 5px 18px;text-align:right;font-size:13px;color:#666666;width:130px;">${clp(cotizacion.subtotal)}</td></tr>
                ${cotizacion.iva > 0 ? `<tr><td style="padding:5px 0;text-align:right;font-size:13px;color:#666666;">IVA (19%)</td><td style="padding:5px 0 5px 18px;text-align:right;font-size:13px;color:#666666;">${clp(cotizacion.iva)}</td></tr>` : ''}
                <tr><td style="padding:12px 0 4px;border-top:2px solid #0a0a0a;text-align:right;font-size:18px;font-weight:800;color:#0a0a0a;">TOTAL</td><td style="padding:12px 0 4px 18px;border-top:2px solid #0a0a0a;text-align:right;font-size:18px;font-weight:800;color:#e8000d;">${clp(cotizacion.total)}</td></tr>
                <tr><td style="padding:4px 0;text-align:right;font-size:12px;color:#999999;">Anticipo 50%</td><td style="padding:4px 0 4px 18px;text-align:right;font-size:12px;color:#999999;">${clp(cotizacion.anticipo)}</td></tr>
                <tr><td style="padding:4px 0;text-align:right;font-size:12px;color:#999999;">Saldo contraentrega</td><td style="padding:4px 0 4px 18px;text-align:right;font-size:12px;color:#999999;">${clp(cotizacion.saldo)}</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 26px;">
              <div style="background:#f5f5f5;border-left:4px solid #e8000d;padding:14px 16px;font-size:13px;line-height:1.55;color:#666666;">
                ${cotizacion.formaPago ? `<div><strong style="color:#0a0a0a;">Forma de pago:</strong> ${escapeHtml(cotizacion.formaPago)}</div>` : ''}
                ${cotizacion.plazoEntrega ? `<div><strong style="color:#0a0a0a;">Plazo de entrega:</strong> ${escapeHtml(cotizacion.plazoEntrega)}</div>` : ''}
                <div><strong style="color:#0a0a0a;">Validez:</strong> hasta el ${fechaCorta(cotizacion.fechaVencimiento)}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#0a0a0a;padding:20px 28px;text-align:center;">
              <p style="margin:0 0 5px;color:#ffffff;font-size:13px;font-weight:700;">${EMPRESA.nombre}</p>
              <p style="margin:0;color:rgba(255,255,255,.52);font-size:11px;line-height:1.5;">RUT ${EMPRESA.rut} · ${EMPRESA.correo} · ${EMPRESA.whatsapp} · ${EMPRESA.web}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildEmailText(cotizacion, cliente) {
  const nombre = cliente?.nombre || cotizacion.clienteNombre || 'Cliente'
  const items = (cotizacion.items || [])
    .map(i => `- ${i.descripcion}: ${i.cantidad} x ${clp(i.precioUnitario)} = ${clp(i.total)}`)
    .join('\n')

  return `Hola ${nombre},

Te enviamos la cotización #${cotizacion.numero} de Birth Studio SpA.
${cotizacion.descripcion ? `Proyecto: ${cotizacion.descripcion}\n` : ''}
Detalle:
${items}

Subtotal neto: ${clp(cotizacion.subtotal)}
${cotizacion.iva > 0 ? `IVA (19%): ${clp(cotizacion.iva)}\n` : ''}TOTAL: ${clp(cotizacion.total)}
Anticipo 50%: ${clp(cotizacion.anticipo)}
Saldo contraentrega: ${clp(cotizacion.saldo)}

${cotizacion.formaPago ? `Forma de pago: ${cotizacion.formaPago}` : ''}
${cotizacion.plazoEntrega ? `Plazo de entrega: ${cotizacion.plazoEntrega}` : ''}
Validez: hasta el ${fechaCorta(cotizacion.fechaVencimiento)}

Atentamente,
Birth Studio SpA
${EMPRESA.correo} | ${EMPRESA.whatsapp}
${EMPRESA.web}`
}

export async function enviarCotizacionEmailJS(cotizacion, cliente, emailDestino) {
  const htmlContent = buildEmailHTML(cotizacion, cliente)
  const textoPlano = buildEmailText(cotizacion, cliente)
  const nombre = cliente?.nombre || cotizacion.clienteNombre || 'Cliente'
  const asunto = `Cotización #${cotizacion.numero} - Birth Studio SpA`

  return emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE_COT, {
    to_email: emailDestino,
    to_name: nombre,
    reply_to: EMPRESA.correo,
    from_name: EMPRESA.nombre,
    numero: cotizacion.numero,
    subject: asunto,
    asunto,
    message: textoPlano,
    cuerpo_html: htmlContent,
    cuerpo_texto: textoPlano,
    name: EMPRESA.nombre,
    email: EMPRESA.correo,
  })
}

export function abrirGmailCompose(cotizacion, cliente, emailDestino) {
  const asunto = `Cotización #${cotizacion.numero} - Birth Studio SpA`
  const cuerpo = buildEmailText(cotizacion, cliente)
  const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailDestino)}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
  window.open(url, '_blank')
}

export function buildWhatsAppUrl(cotizacion, cliente) {
  const tel = cliente?.telefono?.replace(/\D/g, '') || ''
  const telWA = tel.startsWith('56') ? tel : tel ? `56${tel}` : ''
  const texto = encodeURIComponent(
    `Hola ${cliente?.nombre || cotizacion.clienteNombre || ''}, te envío la cotización #${cotizacion.numero} de Birth Studio SpA por ${clp(cotizacion.total)}.\n` +
    `Validez: hasta el ${fechaCorta(cotizacion.fechaVencimiento)}.\n` +
    `Si tienes dudas, feliz te ayudo.`
  )
  return telWA ? `https://wa.me/${telWA}?text=${texto}` : `https://wa.me/?text=${texto}`
}
