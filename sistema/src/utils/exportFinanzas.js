// Exporta el detalle de movimientos de Finanzas a CSV (Google Sheets/Excel) y PDF.
import { jsPDF } from 'jspdf'
import { clp, fechaCorta } from './formatters'

// Dispara la descarga de un archivo en el navegador.
function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

const etiquetaAmbito = (a) => (a === 'personal' ? 'Personal' : 'Birth')

// movimientos: [{ fecha, tipo:'Ingreso'|'Gasto', ambito, descripcion, categoria, monto }]
export function exportarFinanzasCSV(movimientos, nombreArchivo = 'finanzas.csv') {
  const cabecera = ['Fecha', 'Tipo', 'Ambito', 'Descripcion', 'Categoria', 'Monto']
  const escapar = (v) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const filas = movimientos.map(m => [
    m.fecha, m.tipo, etiquetaAmbito(m.ambito), m.descripcion, m.categoria, m.monto,
  ].map(escapar).join(','))
  // BOM para que Excel/Sheets respeten UTF-8 (acentos).
  const csv = '﻿' + [cabecera.join(','), ...filas].join('\r\n')
  descargar(new Blob([csv], { type: 'text/csv;charset=utf-8' }), nombreArchivo)
}

// Genera un PDF simple con la tabla de movimientos (tabla dibujada a mano,
// sin dependencias extra).
export function exportarFinanzasPDF(movimientos, opciones = {}) {
  const { titulo = 'Finanzas', subtitulo = '', nombreArchivo = 'finanzas.pdf' } = opciones
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const anchoPag = doc.internal.pageSize.getWidth()
  const altoPag = doc.internal.pageSize.getHeight()
  const margen = 12
  // Columnas: Fecha, Tipo, Ámbito, Descripción, Categoría, Monto
  const cols = [
    { t: 'Fecha', x: margen, w: 22, align: 'left' },
    { t: 'Tipo', x: margen + 22, w: 18, align: 'left' },
    { t: 'Ámbito', x: margen + 40, w: 20, align: 'left' },
    { t: 'Descripción', x: margen + 60, w: 66, align: 'left' },
    { t: 'Categoría', x: margen + 126, w: 30, align: 'left' },
    { t: 'Monto', x: anchoPag - margen, w: 26, align: 'right' },
  ]

  let y = margen

  const encabezado = () => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
    doc.text(titulo, margen, y); y += 6
    if (subtitulo) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110); doc.text(subtitulo, margen, y); y += 5 }
    doc.setTextColor(0)
    // fila de títulos
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
    y += 2
    cols.forEach(c => doc.text(c.t, c.x, y, { align: c.align }))
    y += 2
    doc.setDrawColor(200); doc.line(margen, y, anchoPag - margen, y); y += 3
    doc.setFont('helvetica', 'normal')
  }

  encabezado()

  movimientos.forEach(m => {
    if (y > altoPag - margen - 8) { doc.addPage(); y = margen; encabezado() }
    doc.setFontSize(8)
    // Color del monto según tipo
    const filaCol = m.tipo === 'Ingreso' ? [21, 128, 61] : [190, 30, 45]
    doc.setTextColor(60)
    doc.text(String(fechaCorta(m.fecha) || m.fecha || ''), cols[0].x, y)
    doc.text(m.tipo, cols[1].x, y)
    doc.text(etiquetaAmbito(m.ambito), cols[2].x, y)
    const desc = doc.splitTextToSize(String(m.descripcion || '—'), cols[3].w)[0] || ''
    doc.text(desc, cols[3].x, y)
    doc.text(String(m.categoria || '—'), cols[4].x, y)
    doc.setTextColor(...filaCol)
    doc.text(clp(m.monto), cols[5].x, y, { align: 'right' })
    doc.setTextColor(0)
    y += 6
  })

  doc.save(nombreArchivo)
}
