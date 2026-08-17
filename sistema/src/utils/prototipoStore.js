// Puente entre la pagina de Prototipo y el generador de cotizaciones.
// Guarda el ultimo render (JPEG comprimido como dataURL) en localStorage,
// para poder adjuntarlo al PDF de una cotizacion sin depender de Firebase
// Storage. Es local al dispositivo: quien genera el prototipo y quien crea
// la cotizacion suelen ser la misma persona en el mismo equipo.
const KEY = 'BIRTH_PROTOTIPO'

export function guardarPrototipo(dataUrl) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ dataUrl, ts: Date.now() }))
    return true
  } catch {
    return false
  }
}

export function obtenerPrototipo() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    return p && p.dataUrl ? p : null
  } catch {
    return null
  }
}

export function limpiarPrototipo() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* sin acceso a localStorage */
  }
}
