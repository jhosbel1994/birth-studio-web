// ─── FÓRMULAS DE COSTEO — LETRAS CORPÓREAS ────────────────────────────────
// Lógica pura (sin React). Implementa MODULO_LETRAS_CORPOREAS.md sección 4.

import { PRODUCCION_DEFAULT, LOGISTICA_POR_DIA_DEFAULT } from '../data/costeoLetras'

function sumaGrupo(items, itemsState, precios) {
  return items.reduce((acc, item) => {
    const st = itemsState[item.id]
    if (!st?.activo) return acc
    const cantidad = item.unidad === 'fijo' ? 1 : (parseFloat(st.cantidad) || 0)
    const precio = parseFloat(precios[item.id] ?? item.precio ?? 0) || 0
    return acc + cantidad * precio
  }, 0)
}

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

export function sumarFachada(items, rows, precios) {
  return items.reduce((acc, item) => acc + calcularFilaFachada(item, rows[item.id], precios).subtotal, 0)
}

export function calcularCosteoLetras({
  gruposSimples, // { acrilico, trovicel, insumos, logisticaFija }
  itemsState,
  precios,
  fachadaTotal,
  horasCnc,
  desgastePct,
  logisticaLibre, // { trasladoFueraTalca, diasAndamio, diasEmpleado }
  margen,
  m2Proyecto,
  precioCalleM2,
}) {
  const acrilico = sumaGrupo(gruposSimples.acrilico, itemsState, precios)
  const trovicel = sumaGrupo(gruposSimples.trovicel, itemsState, precios)
  const insumos = sumaGrupo(gruposSimples.insumos, itemsState, precios)
  const logisticaFija = sumaGrupo(gruposSimples.logisticaFija, itemsState, precios)

  const baseMateriales = acrilico + trovicel + fachadaTotal + insumos
  const desgaste = Math.round(baseMateriales * ((parseFloat(desgastePct) || 0) / 100))

  const precioCnc = parseFloat(precios.prod_cnc_hora ?? PRODUCCION_DEFAULT.precioCncHora) || 0
  const precioLuz = parseFloat(precios.prod_luz_hora ?? PRODUCCION_DEFAULT.precioLuzHora) || 0
  const horas = parseFloat(horasCnc) || 0
  const produccionTotal = Math.round(horas * (precioCnc + precioLuz))

  const precioAndamioDia = parseFloat(precios.log_andamio_dia ?? LOGISTICA_POR_DIA_DEFAULT.precioAndamioDia) || 0
  const precioEmpleadoDia = parseFloat(precios.log_empleado_dia ?? LOGISTICA_POR_DIA_DEFAULT.precioEmpleadoDia) || 0
  const logisticaVariable =
    Math.round((parseFloat(logisticaLibre.diasAndamio) || 0) * precioAndamioDia) +
    Math.round((parseFloat(logisticaLibre.diasEmpleado) || 0) * precioEmpleadoDia) +
    (parseFloat(logisticaLibre.trasladoFueraTalca) || 0)
  const logistica = logisticaFija + logisticaVariable

  const costoTotal = Math.round(baseMateriales + produccionTotal + logistica + desgaste)
  const ventaNeta = Math.round(costoTotal * (parseFloat(margen) || 0))
  const ventaIva = Math.round(ventaNeta * 1.19)
  const anticipo = Math.round(ventaIva * 0.5)
  const utilidad = ventaNeta - costoTotal

  const m2 = parseFloat(m2Proyecto) || 0
  const precioM2 = m2 > 0 ? Math.round(ventaNeta / m2) : 0
  const totalCalle = m2 > 0 ? Math.round(m2 * (parseFloat(precioCalleM2) || 0)) : 0
  const diferenciaCalle = ventaNeta - totalCalle
  const utilidadAPrecioCalle = totalCalle - costoTotal

  return {
    acrilico, trovicel, insumos, fachadaTotal, logistica,
    baseMateriales, desgaste, produccionTotal,
    costoTotal, ventaNeta, ventaIva, anticipo, utilidad, precioM2,
    totalCalle, diferenciaCalle, utilidadAPrecioCalle,
  }
}
