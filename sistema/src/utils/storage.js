const KEYS = {
  clientes: 'BIRTH_CLIENTES',
  cotizaciones: 'BIRTH_COTIZACIONES',
  contratos: 'BIRTH_CONTRATOS',
  gastos: 'BIRTH_GASTOS',
  pagos: 'BIRTH_PAGOS',
  settings: 'BIRTH_SETTINGS',
}

function load(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
export function getSettings() {
  return load(KEYS.settings) || { ultimoNumeroCotizacion: 238 }
}

export function saveSettings(settings) {
  save(KEYS.settings, settings)
}

export function nextNumeroCotizacion() {
  const s = getSettings()
  s.ultimoNumeroCotizacion += 1
  saveSettings(s)
  return s.ultimoNumeroCotizacion
}

// ─── CLIENTES ─────────────────────────────────────────────────────────────────
export function getClientes() {
  return load(KEYS.clientes) || []
}

export function saveCliente(cliente) {
  const list = getClientes()
  if (cliente.id) {
    const idx = list.findIndex(c => c.id === cliente.id)
    if (idx >= 0) list[idx] = cliente
    else list.push(cliente)
  } else {
    cliente.id = crypto.randomUUID()
    cliente.createdAt = new Date().toISOString()
    list.push(cliente)
  }
  save(KEYS.clientes, list)
  return cliente
}

export function deleteCliente(id) {
  save(KEYS.clientes, getClientes().filter(c => c.id !== id))
}

export function getClienteById(id) {
  return getClientes().find(c => c.id === id) || null
}

// ─── COTIZACIONES ─────────────────────────────────────────────────────────────
export function getCotizaciones() {
  return load(KEYS.cotizaciones) || []
}

export function saveCotizacion(cotizacion) {
  const list = getCotizaciones()
  if (cotizacion.id) {
    const idx = list.findIndex(c => c.id === cotizacion.id)
    if (idx >= 0) list[idx] = cotizacion
    else list.push(cotizacion)
  } else {
    cotizacion.id = crypto.randomUUID()
    cotizacion.createdAt = new Date().toISOString()
    const num = nextNumeroCotizacion()
    cotizacion.numero = String(num).padStart(5, '0')
    list.push(cotizacion)
  }
  save(KEYS.cotizaciones, list)
  return cotizacion
}

export function deleteCotizacion(id) {
  save(KEYS.cotizaciones, getCotizaciones().filter(c => c.id !== id))
}

export function getCotizacionById(id) {
  return getCotizaciones().find(c => c.id === id) || null
}

// ─── CONTRATOS ────────────────────────────────────────────────────────────────
export function getContratos() {
  return load(KEYS.contratos) || []
}

export function saveContrato(contrato) {
  const list = getContratos()
  if (contrato.id) {
    const idx = list.findIndex(c => c.id === contrato.id)
    if (idx >= 0) list[idx] = contrato
    else list.push(contrato)
  } else {
    contrato.id = crypto.randomUUID()
    contrato.createdAt = new Date().toISOString()
    list.push(contrato)
  }
  save(KEYS.contratos, list)
  return contrato
}

export function deleteContrato(id) {
  save(KEYS.contratos, getContratos().filter(c => c.id !== id))
}

// ─── GASTOS ───────────────────────────────────────────────────────────────────
export function getGastos() {
  return load(KEYS.gastos) || []
}

export function saveGasto(gasto) {
  const list = getGastos()
  if (gasto.id) {
    const idx = list.findIndex(g => g.id === gasto.id)
    if (idx >= 0) list[idx] = gasto
    else list.push(gasto)
  } else {
    gasto.id = crypto.randomUUID()
    gasto.createdAt = new Date().toISOString()
    list.push(gasto)
  }
  save(KEYS.gastos, list)
  return gasto
}

export function deleteGasto(id) {
  save(KEYS.gastos, getGastos().filter(g => g.id !== id))
}

// ─── PAGOS ────────────────────────────────────────────────────────────────────
export function getPagos() {
  return load(KEYS.pagos) || []
}

export function savePago(pago) {
  const list = getPagos()
  if (pago.id) {
    const idx = list.findIndex(p => p.id === pago.id)
    if (idx >= 0) list[idx] = pago
    else list.push(pago)
  } else {
    pago.id = crypto.randomUUID()
    pago.createdAt = new Date().toISOString()
    list.push(pago)
  }
  save(KEYS.pagos, list)
  return pago
}

export function deletePago(id) {
  save(KEYS.pagos, getPagos().filter(p => p.id !== id))
}

export function getPagosByCotizacion(cotizacionId) {
  return getPagos().filter(p => p.cotizacionId === cotizacionId)
}
