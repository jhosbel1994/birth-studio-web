// ─── FÓRMULAS DE COSTEO — LETRAS CORPÓREAS ────────────────────────────────
// Lógica pura (sin React). Implementa MODULO_LETRAS_CORPOREAS.md sección 4.

// Fila de fachada: cantidad de planchas + precio editable + medida propia (mm)
export function calcularFilaFachada(item, row, precios) {
  const precio = parseFloat(precios[item.id] ?? item.precio ?? 0) || 0
  const cantidad = parseFloat(row?.cantidad) || 0
  const anchoM = (parseFloat(row?.anchoMm) || 0) / 1000
  const altoM = (parseFloat(row?.altoMm) || 0) / 1000
  const m2Cubiertos = cantidad * anchoM * altoM
  const subtotal = row?.activo ? Math.round(cantidad * precio) : 0
  return { precio, m2Cubiertos, subtotal }
}
