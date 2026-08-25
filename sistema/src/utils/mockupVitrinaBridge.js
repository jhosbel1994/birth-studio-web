const KEY = 'BIRTH_MOCKUP_VITRINA_TO_PROTOTIPO'

export function guardarMockupVitrinaParaPrototipo(dataUrl, meta = {}) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      dataUrl,
      nombre: meta.nombre || 'Mockup final vitrina',
      w: meta.w || null,
      h: meta.h || null,
      ts: Date.now(),
    }))
    return true
  } catch {
    return false
  }
}

export function obtenerMockupVitrinaParaPrototipo() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const payload = JSON.parse(raw)
    return payload?.dataUrl ? payload : null
  } catch {
    return null
  }
}

export function limpiarMockupVitrinaParaPrototipo() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* sin acceso a localStorage */
  }
}
