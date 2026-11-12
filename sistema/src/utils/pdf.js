import { jsPDF } from 'jspdf'
import { clp, fechaCorta } from './formatters'
import logoBirthUrl from '../assets/logo-birth.png'
import logoTensionUrl from '../assets/logo-tension.png'

const EMPRESA = {
  nombre: 'Birth Studio SpA',
  razonSocial: 'Sociedad de Servicios Birth Studio SpA',
  rut: '78.534.949-0',
  correo: 'bstudio.designe@gmail.com',
  web: 'www.bspublicidad.cl',
  whatsapp: '+56 9 7724 7545',
  ciudad: 'Talca, Chile',
  // Datos bancarios para transferencia
  banco: 'Banco Estado',
  tipoCuenta: 'Chequera electrónica',
  numeroCuenta: '90279056174',
  correoPagos: 'ventas@bspublicidad.cl',
}

// Misma SpA (mismo RUT), marca distinta para proyectos de obras y
// estructuras — no debe aparecer nada de Birth en este PDF.
const EMPRESA_TENSION = {
  ...EMPRESA,
  nombre: 'Tensión Obras y Estructuras',
  razonSocial: 'Tensión Obras y Estructuras',
}

function empresaDe(cotizacion) {
  return cotizacion?.tipoProyecto === 'estructuras' ? EMPRESA_TENSION : EMPRESA
}

function logoUrlDe(cotizacion) {
  return cotizacion?.tipoProyecto === 'estructuras' ? logoTensionUrl : logoBirthUrl
}

const ROJO = [232, 0, 13]
const NEGRO = [10, 10, 10]
const GRIS = [100, 100, 100]
const GRIS_CLARO = [220, 220, 220]
const BLANCO = [255, 255, 255]

// logoImg puede ser HTMLImageElement o base64 string
function addHeader(doc, etiqueta, numero, logoImg, marcaFallback = 'BIRTH') {
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
      doc.text(marcaFallback, 14, 20)
    }
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.setTextColor(...BLANCO)
    doc.text(marcaFallback, 14, 20)
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

// Página extra con el render del prototipo (generado en la sección
// "Prototipo Logo"). Solo se agrega si la cotización trae `prototipoImg`.
function addPrototipoPage(doc, empresa, logoImg, imgDataUrl, numero, marcaFallback) {
  doc.addPage()
  addHeader(doc, 'PROTOTIPO DEL LETRERO', numero, logoImg, marcaFallback)

  let props
  try { props = doc.getImageProperties(imgDataUrl) } catch { return }
  const fmt = /^data:image\/png/i.test(imgDataUrl) ? 'PNG' : 'JPEG'

  // Tamano moderado: visible pero no de pagina completa (aprox. mitad del ancho).
  const maxW = 120, maxH = 90, topY = 52
  const ratio = props.width / props.height
  let w = maxW, h = w / ratio
  if (h > maxH) { h = maxH; w = h * ratio }
  const x = (210 - w) / 2
  const y = topY

  // Marco sutil alrededor de la imagen
  doc.setDrawColor(205)
  doc.setLineWidth(0.3)
  doc.rect(x - 1.2, y - 1.2, w + 2.4, h + 2.4)
  doc.addImage(imgDataUrl, fmt, x, y, w, h)

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRIS)
  doc.text(
    'Imagen referencial del letrero. El resultado final puede variar según materiales y condiciones de instalación.',
    105, y + h + 9, { align: 'center' }
  )
}

function cargarLogo(logoUrl = logoBirthUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      // Reducir a max 500px de ancho para que el PDF no pese varios MB
      const maxW = 500
      const scale = Math.min(1, maxW / img.naturalWidth)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(null)
    img.src = logoUrl
  })
}

function addEmpresaInfo(doc, y, empresa = EMPRESA) {
  // Razón social destacada
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...NEGRO)
  doc.text(empresa.razonSocial || empresa.nombre, 14, y)
  // Resto de datos
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRIS)
  doc.text(`RUT ${empresa.rut}`, 14, y + 4)
  doc.text(empresa.correo, 14, y + 8)
  doc.text(`${empresa.web}  ·  ${empresa.whatsapp}`, 14, y + 12)
  doc.text(empresa.ciudad, 14, y + 16)
}

// Caja con los datos bancarios para transferencia. Se dibuja en la página 1.
function addDatosBancarios(doc, y, empresa = EMPRESA) {
  const x = 14, w = 88, h = 32
  // Marco
  doc.setFillColor(248, 248, 248)
  doc.setDrawColor(...GRIS_CLARO)
  doc.setLineWidth(0.3)
  doc.rect(x, y, w, h, 'FD')
  // Banda superior negra con título
  doc.setFillColor(...NEGRO)
  doc.rect(x, y, w, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...BLANCO)
  doc.text('DATOS BANCARIOS PARA TRANSFERENCIA', x + 3, y + 4)
  // Contenido
  let ty = y + 11
  const row = (label, valor, bold = false) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...GRIS)
    doc.text(label, x + 3, ty)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(...NEGRO)
    doc.text(String(valor), x + 30, ty)
    ty += 4
  }
  row('Titular:', empresa.nombre)
  row('RUT:', empresa.rut)
  row('Banco:', empresa.banco)
  row('Tipo cuenta:', empresa.tipoCuenta)
  row('N° cuenta:', empresa.numeroCuenta, true)
  row('Correo:', empresa.correoPagos)
  return y + h
}

// Condiciones comerciales estándar de la cotización (página aparte).
const CONDICIONES_COMERCIALES = [
  ['Forma de pago', 'Transferencia bancaria o link de pago mediante tarjetas de crédito, débito y prepago. Al optar por link de pago se enviará un enlace por el 100% del valor total de la cotización.'],
  ['Beneficio de pago', 'Hasta 3 cuotas sin interés con tarjeta de crédito.'],
  ['Condiciones de pago', '50% de abono al inicio del trabajo y 50% de saldo contra entrega del producto o servicio. La entrega, instalación o envío podrá ser suspendida en caso de existir saldo pendiente. Al no optar por instalación o envío, el saldo deberá estar pagado previo al retiro; en caso de despacho, al menos 24 horas antes de la fecha programada.'],
  ['Descuentos', 'Los descuentos aplican únicamente para pagos mediante transferencia bancaria. El porcentaje de descuento puede variar en caso de modificaciones a los ítems cotizados.'],
  ['Plazo de entrega', 'Los plazos de fabricación comienzan a regir una vez aprobado el trabajo, recibido el abono inicial y la información completa por parte del cliente. Si el cliente posterga la confirmación, aprobación o pago, los plazos quedarán sujetos a reprogramación según la disponibilidad de producción vigente.'],
  ['Transporte y despacho', 'El servicio de despacho es opcional y su valor depende de la ubicación de entrega. Para ubicaciones fuera de nuestro rango habitual podrá aplicarse un cargo adicional por concepto de traslado.'],
  ['Embalaje', 'Si el producto es solicitado con envío y es de grandes dimensiones, se cobrará envoltura desde $120.000 + IVA.'],
  ['Instalación', 'Cuando esté considerada: se realiza en horario laboral diurno. El cliente debe proporcionar el área despejada, acceso seguro (escalera/andamio según corresponda), un punto eléctrico operativo con descarga a tierra cercano al letrero y acceso a la zona técnica para las conexiones. El desmontaje de un letrero antiguo o la remoción de elementos obstructivos se cotiza y cobra de forma adicional.'],
  ['Garantía', '6 meses sobre iluminación y componentes eléctricos, válida siempre y cuando el letrero no haya sido intervenido, manipulado o modificado por terceros, ni haya sufrido daños de origen natural (condiciones climáticas extremas, descargas eléctricas u otros). La garantía aplica únicamente cuando la instalación fue realizada por nuestra empresa. Cualquier visita o reparación tras una intervención externa se considera servicio de mantención con costo adicional.'],
  ['Observaciones', 'Para la producción debe enviarse el logo en formato editable: AI (Illustrator), EPS, SVG o PDF editable (no la imagen convertida a PDF). Los productos fabricados a medida se desarrollan exclusivamente para el cliente, por lo que los pagos realizados no son reembolsables una vez iniciada la producción. La aceptación de la cotización implica la aceptación de estas condiciones comerciales.'],
]

// Página final con las condiciones comerciales extraídas.
function addCondicionesPage(doc, empresa, logoImg, numero, marcaFallback) {
  doc.addPage()
  addHeader(doc, 'CONDICIONES COMERCIALES', numero, logoImg, marcaFallback)

  let y = 42
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...NEGRO)
  doc.text('CONDICIONES COMERCIALES', 14, y)
  y += 3
  linea(doc, y + 2)
  y += 8

  CONDICIONES_COMERCIALES.forEach(([titulo, texto]) => {
    const lineas = doc.splitTextToSize(texto, 182)
    const bloqueH = 5 + lineas.length * 3.8 + 4
    if (y + bloqueH > 280) {
      doc.addPage()
      addHeader(doc, 'CONDICIONES COMERCIALES', numero, logoImg, marcaFallback)
      y = 42
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...NEGRO)
    doc.text(titulo, 14, y)
    y += 4.5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRIS)
    doc.text(lineas, 14, y)
    y += lineas.length * 3.8 + 5
  })

  // Validez
  if (y > 275) { doc.addPage(); addHeader(doc, 'CONDICIONES COMERCIALES', numero, logoImg, marcaFallback); y = 42 }
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRIS)
  doc.text('Validez de la cotización: según la fecha indicada en la página anterior.', 14, y + 2)
}

function linea(doc, y) {
  doc.setDrawColor(...GRIS_CLARO)
  doc.setLineWidth(0.3)
  doc.line(14, y, 196, y)
}

// modo: 'download' | 'preview' | 'blob'
export async function generarCotizacionPDF(cotizacion, cliente, modo = 'download') {
  const empresa = empresaDe(cotizacion)
  const logo = await cargarLogo(logoUrlDe(cotizacion))
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  addHeader(doc, 'COTIZACIÓN', cotizacion.numero, logo, empresa === EMPRESA_TENSION ? 'TENSIÓN' : 'BIRTH')

  let y = 40
  addEmpresaInfo(doc, y, empresa)

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
  const estadoLabel = cotizacion.estado === 'terminada' ? 'Terminada' : cotizacion.estado === 'aceptada' ? 'Aceptada' : cotizacion.estado === 'rechazada' ? 'Rechazada' : 'Por aceptar'
  doc.text(estadoLabel, 155, y + 10)

  // Datos cliente - lado izquierdo
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...NEGRO)
  doc.text('SEÑORES:', 14, y)

  const nombreCompleto = [cliente?.nombre, cliente?.apellido].filter(Boolean).join(' ') || cotizacion.clienteNombre || '—'
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(nombreCompleto, 14, y + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRIS)
  let offsetCliente = 10
  if (cliente?.empresa) { doc.text(cliente.empresa, 14, y + offsetCliente); offsetCliente += 4 }
  if (cliente?.rut)     { doc.text(`RUT: ${cliente.rut}`, 14, y + offsetCliente); offsetCliente += 4 }
  if (cliente?.ciudad)  { doc.text(cliente.ciudad, 14, y + offsetCliente) }

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

  // Tabla items — columnas: N° · Descripción · Cant. · Precio unit. · Total
  const colNum = 14      // N°  (ancho 10)
  const colDesc = 24     // Descripción (ancho 90)
  const colCant = 114    // Cant. (ancho 20)
  const colPrecio = 134  // Precio unit. (ancho 30)
  const colTotal = 164   // Total (ancho 32, termina en 196)
  const descWidth = 90
  const headerH = 7

  const addItemsHeader = () => {
    doc.setFillColor(10, 10, 10)
    doc.rect(14, y, 182, headerH, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...BLANCO)
    doc.text('N°', colNum + 2, y + 5)
    doc.text('DESCRIPCIÓN', colDesc + 2, y + 5)
    doc.text('CANT.', colCant + 2, y + 5)
    doc.text('PRECIO UNIT.', colPrecio + 2, y + 5)
    doc.text('TOTAL', colTotal + 2, y + 5)
    y += headerH
  }

  // Header tabla
  addItemsHeader()

  // Filas items
  cotizacion.items?.forEach((item, i) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const descLineas = doc.splitTextToSize(String(item.descripcion || ''), descWidth - 4)
    const lineas = descLineas.length > 0 ? descLineas : ['']
    const rowH = Math.max(7, lineas.length * 4 + 3)

    if (y + rowH > 270) {
      doc.addPage()
      y = 20
      addItemsHeader()
    }
    if (i % 2 === 0) {
      doc.setFillColor(248, 248, 248)
      doc.rect(14, y, 182, rowH, 'F')
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...NEGRO)

    // N° de ítem (negrita para que resalte)
    doc.setFont('helvetica', 'bold')
    doc.text(String(i + 1), colNum + 2, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.text(lineas, colDesc + 2, y + 5, { lineHeightFactor: 1.15 })
    doc.text(String(item.cantidad || 1), colCant + 2, y + 5)
    doc.text(clp(item.precioUnitario), colPrecio + 2, y + 5)
    doc.text(clp(item.total), colTotal + 2, y + 5)

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

  // Datos bancarios (izquierda), en paralelo con el bloque de totales (derecha)
  const bancoTop = y - 2
  const bancoBottom = addDatosBancarios(doc, bancoTop, empresa)

  const tieneDescuento = cotizacion.descuento > 0 && cotizacion.montoDescuento > 0
  if (tieneDescuento) {
    const subtotalBruto = cotizacion.subtotal + cotizacion.montoDescuento
    addTotal('Subtotal bruto:', subtotalBruto)

    // Línea descuento en rojo
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...ROJO)
    doc.text(`Descuento ${cotizacion.descuento}%:`, totalesX, y)
    doc.text(`-${clp(cotizacion.montoDescuento)}`, totalesValX, y, { align: 'right' })
    y += 5
  }

  addTotal('Subtotal neto:', cotizacion.subtotal)
  if (cotizacion.iva > 0) addTotal('IVA (19%):', cotizacion.iva)
  if (cotizacion.traslado > 0) addTotal('Traslado:', cotizacion.traslado)
  linea(doc, y)
  y += 3
  addTotal('TOTAL:', cotizacion.total, true, true)
  y += 2
  addTotal('Anticipo (50%):', cotizacion.anticipo)
  addTotal('Saldo contraentrega:', cotizacion.saldo)

  // Evitar que el bloque de totales quede por encima de la caja bancaria
  y = Math.max(y, bancoBottom + 2)

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
    `${empresa.razonSocial || empresa.nombre}  ·  RUT ${empresa.rut}  ·  ${empresa.correo}  ·  ${empresa.whatsapp}  ·  ${empresa.web}`,
    105,
    footerY,
    { align: 'center' }
  )

  // Página de condiciones comerciales
  addCondicionesPage(doc, empresa, logo, cotizacion.numero,
    empresa === EMPRESA_TENSION ? 'TENSIÓN' : 'BIRTH')

  // Página extra con el prototipo 3D, si la cotización lo trae adjunto
  if (cotizacion.prototipoImg) {
    addPrototipoPage(doc, empresa, logo, cotizacion.prototipoImg, cotizacion.numero,
      empresa === EMPRESA_TENSION ? 'TENSIÓN' : 'BIRTH')
  }

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
export async function generarContratoLetras(contrato, cliente, modo = 'download') {
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

  clausula('1. PARTES', `CONTRATANTE: ${cn}, RUT ${cnRut}, domiciliado en ${ciudad}.\nCONTRATISTA: Sociedad de Servicios Birth Studio SpA, RUT 78.534.949-0, domiciliada en Talca, en adelante "Birth Studio".`)

  clausula('2. OBJETO DEL CONTRATO', `Birth Studio se compromete a fabricar e instalar ${contrato.descripcionTrabajo || '[descripción de letras corpóreas, señalética, etc.]'}, según las especificaciones acordadas entre las partes.`)

  clausula('3. VALOR Y FORMA DE PAGO', `El valor total del servicio es de ${clp(contrato.valorTotal || 0)} (${contrato.valorTexto || '[valor en palabras]'} pesos). Se acuerda el pago de un anticipo del 50% (${clp((contrato.valorTotal || 0) / 2)}) al momento de la firma del presente contrato, y el saldo restante (${clp((contrato.valorTotal || 0) / 2)}) contra entrega conforme del trabajo.`)

  clausula('4. PLAZO DE EJECUCIÓN', `El plazo de ejecución es de ${contrato.plazo || '[X días hábiles]'} desde recibido el anticipo correspondiente.`)

  clausula('5. CONDICIONES DE INSTALACIÓN', 'El contratante se compromete a: (a) proporcionar acceso al lugar de instalación en la fecha acordada; (b) contar con suministro eléctrico disponible cuando sea necesario; (c) gestionar los permisos municipales o de terceros que se requieran para la instalación. El incumplimiento de estas condiciones podrá derivar en reprogramación con costo adicional a cargo del contratante.')

  clausula('6. GARANTÍA', 'Birth Studio garantiza la iluminación y los componentes eléctricos por un período de 6 meses desde la instalación, válida siempre y cuando el letrero no haya sido intervenido, manipulado o modificado por terceros, ni haya sufrido daños de origen natural (condiciones climáticas extremas, descargas eléctricas, vandalismo u otros). Cualquier visita o reparación tras una intervención externa se considera servicio de mantención con costo adicional.')

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
  doc.text('Sociedad de Servicios Birth Studio SpA', 130, y)
  y += 4
  doc.text(`RUT: ${cnRut}`, 30, y)
  doc.text('RUT: 78.534.949-0', 130, y)
  y += 4
  doc.text('CONTRATANTE', 30, y)
  doc.text('CONTRATISTA', 130, y)

  // Footer
  const footerY = 290
  doc.setFontSize(7)
  doc.setTextColor(...GRIS)
  doc.text(`${EMPRESA.razonSocial}  ·  RUT ${EMPRESA.rut}  ·  ${EMPRESA.correo}  ·  ${EMPRESA.web}`, 105, footerY, { align: 'center' })

  const filename = `Contrato_Letras_${(cn).replace(/\s/g, '_')}.pdf`
  if (modo === 'preview') return { url: URL.createObjectURL(doc.output('blob')), filename }
  if (modo === 'blob') return { blob: doc.output('blob'), filename }
  doc.save(filename)
  return { filename }
}

// ─── CONTRATO DESARROLLO WEB ──────────────────────────────────────────────────
export async function generarContratoWeb(contrato, cliente, modo = 'download') {
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

  clausula('1. PARTES', `CONTRATANTE: ${cn}, RUT ${cnRut}, domiciliado en ${ciudad}.\nCONTRATISTA: Sociedad de Servicios Birth Studio SpA, RUT 78.534.949-0, domiciliada en Talca, en adelante "Birth Studio".`)

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
  doc.text('Sociedad de Servicios Birth Studio SpA', 130, y)
  y += 4
  doc.text(`RUT: ${cnRut}`, 30, y)
  doc.text('RUT: 78.534.949-0', 130, y)
  y += 4
  doc.text('CONTRATANTE', 30, y)
  doc.text('CONTRATISTA', 130, y)

  const footerY = 290
  doc.setFontSize(7)
  doc.setTextColor(...GRIS)
  doc.text(`${EMPRESA.razonSocial}  ·  RUT ${EMPRESA.rut}  ·  ${EMPRESA.correo}  ·  ${EMPRESA.web}`, 105, footerY, { align: 'center' })

  const filename = `Contrato_Web_${(cn).replace(/\s/g, '_')}.pdf`
  if (modo === 'preview') return { url: URL.createObjectURL(doc.output('blob')), filename }
  if (modo === 'blob') return { blob: doc.output('blob'), filename }
  doc.save(filename)
  return { filename }
}
