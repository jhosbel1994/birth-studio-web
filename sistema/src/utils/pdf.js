import { jsPDF } from 'jspdf'
import { clp, fechaCorta } from './formatters'
import logoBirthUrl from '../assets/logo-birth.png'

const EMPRESA = {
  nombre: 'Birth Studio SpA',
  rut: '77.990.344-3',
  correo: 'bstudio.designe@gmail.com',
  web: 'www.bspublicidad.cl',
  whatsapp: '+56 9 7724 7545',
  ciudad: 'Talca, Chile',
}

const ROJO = [232, 0, 13]
const NEGRO = [10, 10, 10]
const GRIS = [100, 100, 100]
const GRIS_CLARO = [220, 220, 220]
const BLANCO = [255, 255, 255]

// logoImg puede ser HTMLImageElement o base64 string
function addHeader(doc, etiqueta, numero, logoImg) {
  doc.setFillColor(...NEGRO)
  doc.rect(0, 0, 210, 32, 'F')

  // Logo
  if (logoImg) {
    try {
      doc.addImage(logoImg, 'PNG', 10, 3, 44, 25)
    } catch {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(20)
      doc.setTextColor(...BLANCO)
      doc.text('BIRTH', 14, 20)
    }
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.setTextColor(...BLANCO)
    doc.text('BIRTH', 14, 20)
  }

  // Etiqueta arriba derecha (COTIZACIÓN / CONTRATO DE LETRAS...)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRIS_CLARO)
  doc.text(etiqueta, 196, 13, { align: 'right' })

  // Número (solo para cotizaciones)
  if (numero) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...ROJO)
    doc.text(`#${numero}`, 196, 24, { align: 'right' })
  }
}

function cargarLogo() {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = logoBirthUrl
  })
}

function addEmpresaInfo(doc, y) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRIS)
  doc.text(EMPRESA.nombre, 14, y)
  doc.text(`RUT ${EMPRESA.rut}`, 14, y + 4)
  doc.text(EMPRESA.correo, 14, y + 8)
  doc.text(`${EMPRESA.web}  ·  ${EMPRESA.whatsapp}`, 14, y + 12)
  doc.text(EMPRESA.ciudad, 14, y + 16)
}

function linea(doc, y) {
  doc.setDrawColor(...GRIS_CLARO)
  doc.setLineWidth(0.3)
  doc.line(14, y, 196, y)
}

// modo: 'download' | 'preview' | 'blob'
export async function generarCotizacionPDF(cotizacion, cliente, modo = 'download') {
  const logo = await cargarLogo()
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  addHeader(doc, 'COTIZACIÓN', cotizacion.numero, logo)

  let y = 40
  addEmpresaInfo(doc, y)

  linea(doc, y + 21)
  y += 26

  // Info cotización - lado derecho
  doc.setFontSize(8)
  doc.setTextColor(...GRIS)
  const fechaDoc = fechaCorta(cotizacion.fecha)
  const fechaVence = fechaCorta(cotizacion.fechaVencimiento)
  doc.text('Fecha:', 130, y)
  doc.setTextColor(...NEGRO)
  doc.text(fechaDoc, 155, y)

  doc.setTextColor(...GRIS)
  doc.text('Válida hasta:', 130, y + 5)
  doc.setTextColor(...NEGRO)
  doc.text(fechaVence, 155, y + 5)

  doc.setTextColor(...GRIS)
  doc.text('Estado:', 130, y + 10)
  doc.setTextColor(...NEGRO)
  const estadoLabel = cotizacion.estado === 'aceptada' ? 'Aceptada' : cotizacion.estado === 'rechazada' ? 'Rechazada' : 'Por aceptar'
  doc.text(estadoLabel, 155, y + 10)

  // Datos cliente - lado izquierdo
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...NEGRO)
  doc.text('SEÑORES:', 14, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(cliente?.nombre || cotizacion.clienteNombre || '—', 14, y + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRIS)
  if (cliente?.empresa) doc.text(cliente.empresa, 14, y + 10)
  if (cliente?.rut) doc.text(`RUT: ${cliente.rut}`, 14, y + 14)
  if (cliente?.ciudad) doc.text(cliente.ciudad, 14, y + 18)

  y += 28
  linea(doc, y)
  y += 6

  // Descripción proyecto
  if (cotizacion.descripcion) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...NEGRO)
    doc.text('PROYECTO:', 14, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS)
    const lineas = doc.splitTextToSize(cotizacion.descripcion, 180)
    doc.text(lineas, 14, y + 5)
    y += 5 + lineas.length * 4.5 + 4
  }

  linea(doc, y)
  y += 6

  // Tabla items
  const colWidths = [100, 20, 30, 32]
  const colX = [14, 114, 134, 164]
  const rowH = 7

  // Header tabla
  doc.setFillColor(10, 10, 10)
  doc.rect(14, y, 182, rowH, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...BLANCO)
  doc.text('DESCRIPCIÓN', colX[0] + 2, y + 5)
  doc.text('CANT.', colX[1] + 2, y + 5)
  doc.text('PRECIO UNIT.', colX[2] + 2, y + 5)
  doc.text('TOTAL', colX[3] + 2, y + 5)

  y += rowH

  // Filas items
  cotizacion.items?.forEach((item, i) => {
    if (y > 240) {
      doc.addPage()
      y = 20
    }
    if (i % 2 === 0) {
      doc.setFillColor(248, 248, 248)
      doc.rect(14, y, 182, rowH, 'F')
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...NEGRO)

    const descLineas = doc.splitTextToSize(item.descripcion || '', colWidths[0] - 4)
    doc.text(descLineas[0], colX[0] + 2, y + 5)
    doc.text(String(item.cantidad || 1), colX[1] + 2, y + 5)
    doc.text(clp(item.precioUnitario), colX[2] + 2, y + 5)
    doc.text(clp(item.total), colX[3] + 2, y + 5)

    // Borde inferior fila
    doc.setDrawColor(...GRIS_CLARO)
    doc.setLineWidth(0.2)
    doc.line(14, y + rowH, 196, y + rowH)
    y += rowH
  })

  y += 6

  // Totales
  const totalesX = 130
  const totalesValX = 196

  const addTotal = (label, valor, bold = false, rojo = false) => {
    if (y > 260) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(bold ? 10 : 8)
    doc.setTextColor(rojo ? ROJO[0] : (bold ? NEGRO[0] : GRIS[0]), rojo ? ROJO[1] : (bold ? NEGRO[1] : GRIS[1]), rojo ? ROJO[2] : (bold ? NEGRO[2] : GRIS[2]))
    doc.text(label, totalesX, y)
    doc.text(clp(valor), totalesValX, y, { align: 'right' })
    y += bold ? 6 : 5
  }

  linea(doc, y)
  y += 5
  addTotal('Subtotal neto:', cotizacion.subtotal)
  if (cotizacion.iva > 0) addTotal('IVA (19%):', cotizacion.iva)
  linea(doc, y)
  y += 3
  addTotal('TOTAL:', cotizacion.total, true, true)
  y += 2
  addTotal('Anticipo (50%):', cotizacion.anticipo)
  addTotal('Saldo contraentrega:', cotizacion.saldo)

  y += 5
  linea(doc, y)
  y += 6

  // Forma de pago / plazo
  if (cotizacion.formaPago || cotizacion.plazoEntrega) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    if (cotizacion.formaPago) {
      doc.setTextColor(...NEGRO)
      doc.setFont('helvetica', 'bold')
      doc.text('Forma de pago:', 14, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRIS)
      doc.text(cotizacion.formaPago, 55, y)
      y += 5
    }
    if (cotizacion.plazoEntrega) {
      doc.setTextColor(...NEGRO)
      doc.setFont('helvetica', 'bold')
      doc.text('Plazo de entrega:', 14, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRIS)
      doc.text(cotizacion.plazoEntrega, 55, y)
      y += 5
    }
  }

  // Incluye / No incluye
  if (cotizacion.incluye || cotizacion.noIncluye) {
    y += 3
    if (cotizacion.incluye) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...NEGRO)
      doc.text('Incluye:', 14, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRIS)
      const inc = doc.splitTextToSize(cotizacion.incluye, 170)
      doc.text(inc, 14, y + 4)
      y += 4 + inc.length * 4 + 2
    }
    if (cotizacion.noIncluye) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...NEGRO)
      doc.text('No incluye:', 14, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRIS)
      const noInc = doc.splitTextToSize(cotizacion.noIncluye, 170)
      doc.text(noInc, 14, y + 4)
      y += 4 + noInc.length * 4 + 2
    }
  }

  // Footer
  const footerY = 285
  doc.setDrawColor(...GRIS_CLARO)
  doc.setLineWidth(0.3)
  doc.line(14, footerY - 4, 196, footerY - 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRIS)
  doc.text(
    `${EMPRESA.nombre}  ·  RUT ${EMPRESA.rut}  ·  ${EMPRESA.correo}  ·  ${EMPRESA.whatsapp}  ·  ${EMPRESA.web}`,
    105,
    footerY,
    { align: 'center' }
  )

  const filename = `Cotizacion_${cotizacion.numero}_${(cliente?.nombre || 'cliente').replace(/\s+/g, '_')}.pdf`
  if (modo === 'preview') {
    const blob = doc.output('blob')
    return { url: URL.createObjectURL(blob), filename }
  }
  if (modo === 'blob') {
    return { blob: doc.output('blob'), filename }
  }
  doc.save(filename)
  return { filename }
}

// ─── CONTRATO LETRAS CORPÓREAS ─────────────────────────────────────────────
export async function generarContratoLetras(contrato, cliente) {
  const logo = await cargarLogo()
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const fecha = fechaCorta(contrato.fecha || new Date().toISOString())

  addHeader(doc, 'CONTRATO DE INSTALACIÓN', null, logo)

  let y = 38

  // Título
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...NEGRO)
  doc.text('CONTRATO DE INSTALACIÓN DE LETRAS CORPÓREAS', 105, y, { align: 'center' })
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRIS)
  doc.text(`Talca, ${fecha}`, 105, y, { align: 'center' })
  y += 8

  linea(doc, y)
  y += 6

  const clausula = (titulo, texto) => {
    if (y > 255) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...NEGRO)
    doc.text(titulo, 14, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRIS)
    const lineas = doc.splitTextToSize(texto, 182)
    doc.text(lineas, 14, y)
    y += lineas.length * 4.2 + 5
  }

  const cn = cliente?.nombre || contrato.clienteNombre || '[CLIENTE]'
  const cnRut = cliente?.rut || '[RUT]'
  const ciudad = cliente?.ciudad || 'Talca'

  clausula('1. PARTES', `CONTRATANTE: ${cn}, RUT ${cnRut}, domiciliado en ${ciudad}.\nCONTRATISTA: Birth Studio SpA, RUT 77.990.344-3, domiciliada en Talca, en adelante "Birth Studio".`)

  clausula('2. OBJETO DEL CONTRATO', `Birth Studio se compromete a fabricar e instalar ${contrato.descripcionTrabajo || '[descripción de letras corpóreas, señalética, etc.]'}, según las especificaciones acordadas entre las partes.`)

  clausula('3. VALOR Y FORMA DE PAGO', `El valor total del servicio es de ${clp(contrato.valorTotal || 0)} (${contrato.valorTexto || '[valor en palabras]'} pesos). Se acuerda el pago de un anticipo del 50% (${clp((contrato.valorTotal || 0) / 2)}) al momento de la firma del presente contrato, y el saldo restante (${clp((contrato.valorTotal || 0) / 2)}) contra entrega conforme del trabajo.`)

  clausula('4. PLAZO DE EJECUCIÓN', `El plazo de ejecución es de ${contrato.plazo || '[X días hábiles]'} desde recibido el anticipo correspondiente.`)

  clausula('5. CONDICIONES DE INSTALACIÓN', 'El contratante se compromete a: (a) proporcionar acceso al lugar de instalación en la fecha acordada; (b) contar con suministro eléctrico disponible cuando sea necesario; (c) gestionar los permisos municipales o de terceros que se requieran para la instalación. El incumplimiento de estas condiciones podrá derivar en reprogramación con costo adicional a cargo del contratante.')

  clausula('6. GARANTÍA', 'Birth Studio garantiza los trabajos contra defectos de fabricación por un período de 6 meses desde la instalación. La garantía no cubre daños causados por terceros, vandalismo, condiciones climáticas extremas, ni modificaciones realizadas por personas ajenas a Birth Studio.')

  clausula('7. RESOLUCIÓN DE CONFLICTOS', 'Cualquier controversia derivada del presente contrato será resuelta de común acuerdo entre las partes. En caso de no lograrse acuerdo, las partes se someten a la jurisdicción de los tribunales ordinarios de la ciudad de Talca, Chile.')

  y += 10

  // Firmas
  linea(doc, y)
  y += 10
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...NEGRO)
  doc.text('_______________________________', 30, y)
  doc.text('_______________________________', 130, y)
  y += 5
  doc.setTextColor(...GRIS)
  doc.text(cn, 30, y)
  doc.text('Birth Studio SpA', 130, y)
  y += 4
  doc.text(`RUT: ${cnRut}`, 30, y)
  doc.text('RUT: 77.990.344-3', 130, y)
  y += 4
  doc.text('CONTRATANTE', 30, y)
  doc.text('CONTRATISTA', 130, y)

  // Footer
  const footerY = 290
  doc.setFontSize(7)
  doc.setTextColor(...GRIS)
  doc.text(`${EMPRESA.nombre}  ·  RUT ${EMPRESA.rut}  ·  ${EMPRESA.correo}  ·  ${EMPRESA.web}`, 105, footerY, { align: 'center' })

  doc.save(`Contrato_Letras_${(cn).replace(/\s/g, '_')}.pdf`)
}

// ─── CONTRATO DESARROLLO WEB ──────────────────────────────────────────────────
export async function generarContratoWeb(contrato, cliente) {
  const logo = await cargarLogo()
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const fecha = fechaCorta(contrato.fecha || new Date().toISOString())

  addHeader(doc, 'CONTRATO DESARROLLO WEB', null, logo)

  let y = 38

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...NEGRO)
  doc.text('CONTRATO DE DESARROLLO DE SITIO WEB', 105, y, { align: 'center' })
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRIS)
  doc.text(`Talca, ${fecha}`, 105, y, { align: 'center' })
  y += 8

  linea(doc, y)
  y += 6

  const clausula = (titulo, texto) => {
    if (y > 255) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...NEGRO)
    doc.text(titulo, 14, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRIS)
    const lineas = doc.splitTextToSize(texto, 182)
    doc.text(lineas, 14, y)
    y += lineas.length * 4.2 + 5
  }

  const cn = cliente?.nombre || contrato.clienteNombre || '[CLIENTE]'
  const cnRut = cliente?.rut || '[RUT]'
  const ciudad = cliente?.ciudad || 'Talca'

  clausula('1. PARTES', `CONTRATANTE: ${cn}, RUT ${cnRut}, domiciliado en ${ciudad}.\nCONTRATISTA: Birth Studio SpA, RUT 77.990.344-3, domiciliada en Talca, en adelante "Birth Studio".`)

  clausula('2. OBJETO', `Birth Studio se compromete a desarrollar ${contrato.descripcionProyecto || '[descripción del sitio web y funcionalidades acordadas]'} según las especificaciones definidas entre las partes previo al inicio del desarrollo.`)

  clausula('3. VALOR Y FORMA DE PAGO', `El valor total del proyecto es de ${clp(contrato.valorTotal || 0)}. Se establece un anticipo del 50% (${clp((contrato.valorTotal || 0) / 2)}) al inicio del proyecto y el saldo restante (${clp((contrato.valorTotal || 0) / 2)}) contra entrega y aceptación del sitio funcionando.`)

  clausula('4. PLAZO DE DESARROLLO', `El plazo de desarrollo es de ${contrato.plazo || '[X semanas hábiles]'} desde recibido el anticipo. Este plazo puede verse afectado si el contratante demora en proveer los contenidos (textos, imágenes, logos) necesarios para el desarrollo.`)

  clausula('5. PROPIEDAD INTELECTUAL', 'Una vez recibido el pago total, el contratante recibe la propiedad del sitio web. Birth Studio conserva el derecho de incluir el proyecto en su portafolio y materiales de marketing, salvo acuerdo en contrario.')

  clausula('6. REVISIONES', 'El contrato incluye hasta 2 (dos) rondas de revisión y ajustes sobre el diseño y contenido. Revisiones adicionales serán cotizadas por separado.')

  clausula('7. COSTOS EXTERNOS', 'Los costos de dominio, hosting, servicios de terceros (Firebase, Brevo, APIs, etc.) y cualquier otro servicio externo requerido para el funcionamiento del sitio son de cargo exclusivo del contratante.')

  clausula('8. MANTENIMIENTO POST-ENTREGA', 'El servicio de mantenimiento y soporte técnico posterior a la entrega no está incluido en este contrato, salvo que se acuerde por separado mediante una propuesta adicional.')

  clausula('9. RESOLUCIÓN DE CONFLICTOS', 'Cualquier controversia será resuelta de común acuerdo. En caso de no lograrse acuerdo, las partes se someten a los tribunales ordinarios de Talca, Chile.')

  y += 10

  linea(doc, y)
  y += 10
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...NEGRO)
  doc.text('_______________________________', 30, y)
  doc.text('_______________________________', 130, y)
  y += 5
  doc.setTextColor(...GRIS)
  doc.text(cn, 30, y)
  doc.text('Birth Studio SpA', 130, y)
  y += 4
  doc.text(`RUT: ${cnRut}`, 30, y)
  doc.text('RUT: 77.990.344-3', 130, y)
  y += 4
  doc.text('CONTRATANTE', 30, y)
  doc.text('CONTRATISTA', 130, y)

  const footerY = 290
  doc.setFontSize(7)
  doc.setTextColor(...GRIS)
  doc.text(`${EMPRESA.nombre}  ·  RUT ${EMPRESA.rut}  ·  ${EMPRESA.correo}  ·  ${EMPRESA.web}`, 105, footerY, { align: 'center' })

  doc.save(`Contrato_Web_${(cn).replace(/\s/g, '_')}.pdf`)
}
