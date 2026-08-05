// ─── FÓRMULAS DE COSTEO — MÓDULO DE MATERIALES ─────────────────────────────
// Lógica pura (sin React). `material.precio === null` significa "sin precio
// fijo": el costo unitario se toma del campo manual `precioManual` que el
// usuario escribe al activar el ítem en la cotización.

export function calcularCostoMaterial(material, estado) {
  const precioBase = material.precio != null ? material.precio : (parseFloat(estado?.precioManual) || 0)
  const cantidad = parseFloat(estado?.cantidad) || 0
  const subtotal = estado?.activo ? Math.round(cantidad * precioBase) : 0
  return { precioBase, cantidad, subtotal }
}

export function calcularMateriales(materiales, itemsState, multiplicador) {
  const costoTotal = materiales.reduce(
    (acc, m) => acc + calcularCostoMaterial(m, itemsState[m.id]).subtotal,
    0
  )
  const mult = parseFloat(multiplicador) || 0
  const ventaNeta = Math.round(costoTotal * mult)
  const ventaIva = Math.round(ventaNeta * 1.19)
  const anticipo = Math.round(ventaIva * 0.5)
  const utilidad = ventaNeta - costoTotal

  return { costoTotal, ventaNeta, ventaIva, anticipo, utilidad }
}
