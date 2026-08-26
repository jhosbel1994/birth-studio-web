import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc,
  query, orderBy, runTransaction, onSnapshot,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../firebase'

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function snapToObj(snap) {
  if (!snap.exists()) return null
  const d = snap.data()
  if (d.createdAt?.toDate) d.createdAt = d.createdAt.toDate().toISOString()
  return { ...d, id: snap.id }
}

function snapsToArr(snap) {
  return snap.docs.map(snapToObj)
}

// ─── SETTINGS / PIN ───────────────────────────────────────────────────────────
const SETTINGS_ID = 'app'

export async function getPin() {
  const snap = await getDoc(doc(db, 'settings', SETTINGS_ID))
  return snap.exists() ? (snap.data().pin || '2025') : '2025'
}

export async function setPin(nuevoPin) {
  await setDoc(doc(db, 'settings', SETTINGS_ID), { pin: nuevoPin }, { merge: true })
}

export async function nextNumeroCotizacion() {
  return runTransaction(db, async (tx) => {
    const ref = doc(db, 'settings', SETTINGS_ID)
    const snap = await tx.get(ref)
    const current = snap.exists() ? (snap.data().ultimoNumeroCotizacion || 238) : 238
    const next = current + 1
    tx.set(ref, { ultimoNumeroCotizacion: next }, { merge: true })
    return next
  })
}

// ─── CLIENTES ─────────────────────────────────────────────────────────────────
export async function getClientes() {
  const snap = await getDocs(query(collection(db, 'clientes'), orderBy('createdAt', 'asc')))
  return snapsToArr(snap)
}

export async function saveCliente(cliente) {
  const id = cliente.id || crypto.randomUUID()
  const data = { ...cliente, id, createdAt: cliente.createdAt || new Date().toISOString() }
  await setDoc(doc(db, 'clientes', id), data)
  return data
}

export async function deleteCliente(id) {
  await deleteDoc(doc(db, 'clientes', id))
}

export async function getClienteById(id) {
  if (!id) return null
  const snap = await getDoc(doc(db, 'clientes', id))
  return snapToObj(snap)
}

// ─── COTIZACIONES ─────────────────────────────────────────────────────────────
export async function getCotizaciones() {
  const snap = await getDocs(query(collection(db, 'cotizaciones'), orderBy('createdAt', 'desc')))
  return snapsToArr(snap)
}

export async function saveCotizacion(cotizacion) {
  const id = cotizacion.id || crypto.randomUUID()
  const data = { ...cotizacion, id }
  if (!cotizacion.id) {
    data.createdAt = new Date().toISOString()
    const num = await nextNumeroCotizacion()
    data.numero = String(num).padStart(5, '0')
  }
  await setDoc(doc(db, 'cotizaciones', id), data)
  return data
}

export async function deleteCotizacion(id) {
  await deleteDoc(doc(db, 'cotizaciones', id))
}

export async function getCotizacionById(id) {
  if (!id) return null
  const snap = await getDoc(doc(db, 'cotizaciones', id))
  return snapToObj(snap)
}

// ─── CONTRATOS ────────────────────────────────────────────────────────────────
export async function getContratos() {
  const snap = await getDocs(query(collection(db, 'contratos'), orderBy('createdAt', 'desc')))
  return snapsToArr(snap)
}

export async function saveContrato(contrato) {
  const id = contrato.id || crypto.randomUUID()
  const data = { ...contrato, id, createdAt: contrato.createdAt || new Date().toISOString() }
  await setDoc(doc(db, 'contratos', id), data)
  return data
}

export async function deleteContrato(id) {
  await deleteDoc(doc(db, 'contratos', id))
}

// ─── GASTOS ───────────────────────────────────────────────────────────────────
export async function getGastos() {
  const snap = await getDocs(query(collection(db, 'gastos'), orderBy('createdAt', 'desc')))
  return snapsToArr(snap)
}

export async function saveGasto(gasto) {
  const id = gasto.id || crypto.randomUUID()
  const data = { ...gasto, id, createdAt: gasto.createdAt || new Date().toISOString() }
  await setDoc(doc(db, 'gastos', id), data)
  return data
}

export async function deleteGasto(id) {
  await deleteDoc(doc(db, 'gastos', id))
}

// Borra un gasto y, si estaba vinculado a un ítem de inventario con
// movimiento de stock, lo revierte (compra→resta, uso→suma). Fuente única
// de la reversa para que dé igual borrar desde Finanzas o desde Gastos.
export async function deleteGastoConReversa(gasto) {
  if (gasto?.inventarioId && gasto?.inventarioCantidad && gasto?.inventarioMovimiento && gasto.inventarioMovimiento !== 'ninguno') {
    const snap = await getDoc(doc(db, 'inventario', gasto.inventarioId))
    if (snap.exists()) {
      const item = snap.data()
      const delta = gasto.inventarioMovimiento === 'sumar' ? -gasto.inventarioCantidad : gasto.inventarioCantidad
      await setDoc(doc(db, 'inventario', gasto.inventarioId),
        { ...item, cantidad: Math.max(0, (item.cantidad || 0) + delta) }, { merge: true })
    }
  }
  await deleteDoc(doc(db, 'gastos', gasto.id))
}

// ─── PAGOS ────────────────────────────────────────────────────────────────────
export async function getPagos() {
  const snap = await getDocs(query(collection(db, 'pagos'), orderBy('createdAt', 'desc')))
  return snapsToArr(snap)
}

export async function savePago(pago) {
  const id = pago.id || crypto.randomUUID()
  const data = { ...pago, id, createdAt: pago.createdAt || new Date().toISOString() }
  await setDoc(doc(db, 'pagos', id), data)
  return data
}

export async function deletePago(id) {
  await deleteDoc(doc(db, 'pagos', id))
}

export async function getPagosByCotizacion(cotizacionId) {
  const pagos = await getPagos()
  return pagos.filter(p => p.cotizacionId === cotizacionId)
}

// ─── MISCELÁNEOS ──────────────────────────────────────────────────────────────
export async function getMiscelaneos() {
  const snap = await getDocs(collection(db, 'miscelaneos'))
  return snapsToArr(snap)
}

export async function saveMiscelaneo(item) {
  const id = item.id || crypto.randomUUID()
  const data = { ...item, id }
  await setDoc(doc(db, 'miscelaneos', id), data)
  return data
}

export async function deleteMiscelaneo(id) {
  await deleteDoc(doc(db, 'miscelaneos', id))
}

// ─── COSTEO LETRAS CORPÓREAS (precios editables persistentes) ────────────────
const COSTEO_LETRAS_ID = 'costeoLetras'

export async function getCosteoLetrasPrecios() {
  const snap = await getDoc(doc(db, 'settings', COSTEO_LETRAS_ID))
  return snap.exists() ? (snap.data().precios || {}) : {}
}

export async function saveCosteoLetrasPrecios(precios) {
  await setDoc(doc(db, 'settings', COSTEO_LETRAS_ID), { precios }, { merge: true })
}

// ─── PRECIOS DEL CATÁLOGO DEL COTIZADOR (overrides editables persistentes) ───
// `data/productos.js` define los precios base (seed). Un override guardado
// acá pisa ese valor — mismo patrón que costeoLetras: `precios[id] ?? seed`.
const PRECIOS_PRODUCTOS_ID = 'preciosProductos'

export async function getPreciosProductos() {
  const snap = await getDoc(doc(db, 'settings', PRECIOS_PRODUCTOS_ID))
  return snap.exists() ? (snap.data().precios || {}) : {}
}

export async function savePreciosProductos(precios) {
  await setDoc(doc(db, 'settings', PRECIOS_PRODUCTOS_ID), { precios }, { merge: true })
}

// ─── MULTIPLICADORES DE INSTALACIÓN (editables persistentes) ─────────────────
// Reemplaza los valores fijos ×2/×3/×4 de data/productos.js `MULTIPLICADORES`.
const MULTIPLICADORES_ID = 'multiplicadoresInstalacion'

export async function getMultiplicadoresInstalacion() {
  const snap = await getDoc(doc(db, 'settings', MULTIPLICADORES_ID))
  return snap.exists() ? (snap.data().valores || {}) : {}
}

export async function saveMultiplicadoresInstalacion(valores) {
  await setDoc(doc(db, 'settings', MULTIPLICADORES_ID), { valores }, { merge: true })
}

// ─── MULTIPLICADOR POR ÍTEM (override individual, 2.0–4.0) ───────────────────
// Cada ítem del catálogo puede fijar su propio multiplicador. Si existe un
// valor guardado acá, manda sobre el multiplicador de instalación de la
// sección. Mapa `{ itemId: valor }`, mismo patrón que preciosProductos.
const MULT_PRODUCTOS_ID = 'multiplicadoresProductos'

export async function getMultiplicadoresProductos() {
  const snap = await getDoc(doc(db, 'settings', MULT_PRODUCTOS_ID))
  return snap.exists() ? (snap.data().valores || {}) : {}
}

export async function saveMultiplicadoresProductos(valores) {
  await setDoc(doc(db, 'settings', MULT_PRODUCTOS_ID), { valores }, { merge: true })
}

// ─── SECCIONES PERSONALIZADAS DEL CATÁLOGO ───────────────────────────────────
// Categorías creadas por el usuario, se suman a las de data/productos.js.
// Shape: { id, label, createdAt }
export async function getCatalogoSecciones() {
  const snap = await getDocs(collection(db, 'catalogoSecciones'))
  return snapsToArr(snap)
}

export function subscribeCatalogoSecciones(cb) {
  return onSnapshot(collection(db, 'catalogoSecciones'), snap => cb(snapsToArr(snap)))
}

export async function saveCatalogoSeccion(seccion) {
  const id = seccion.id || crypto.randomUUID()
  const data = { ...seccion, id, createdAt: seccion.createdAt || new Date().toISOString() }
  await setDoc(doc(db, 'catalogoSecciones', id), data)
  return data
}

export async function deleteCatalogoSeccion(id) {
  await deleteDoc(doc(db, 'catalogoSecciones', id))
}

// ─── OVERRIDES DE SECCIONES SEMILLA (renombrar / ocultar) ────────────────────
// Las secciones de data/productos.js viven en el código. Para poder
// renombrarlas u ocultarlas sin editar el código, guardamos un override por id:
// { [id]: { label?, oculta? } }. Se aplica al construir el catálogo.
const SECCIONES_OVERRIDES_ID = 'seccionesOverrides'

export async function getSeccionesOverrides() {
  const snap = await getDoc(doc(db, 'settings', SECCIONES_OVERRIDES_ID))
  return snap.exists() ? (snap.data().overrides || {}) : {}
}

export async function saveSeccionesOverrides(overrides) {
  await setDoc(doc(db, 'settings', SECCIONES_OVERRIDES_ID), { overrides }, { merge: true })
}

// ─── ÍTEMS PERSONALIZADOS DEL CATÁLOGO ───────────────────────────────────────
// Ítems creados por el usuario dentro de cualquier sección (semilla o
// personalizada). Se fusionan con PRODUCTOS[categoria] al renderizar.
// Shape: { id, categoria, nombre, precio, unidad, aplicaMultiplicador, multiplicador, createdAt }
export async function getCatalogoItems() {
  const snap = await getDocs(collection(db, 'catalogoItems'))
  return snapsToArr(snap)
}

export function subscribeCatalogoItems(cb) {
  return onSnapshot(collection(db, 'catalogoItems'), snap => cb(snapsToArr(snap)))
}

export async function saveCatalogoItem(item) {
  const id = item.id || crypto.randomUUID()
  const data = { ...item, id, createdAt: item.createdAt || new Date().toISOString() }
  await setDoc(doc(db, 'catalogoItems', id), data)
  return data
}

export async function deleteCatalogoItem(id) {
  await deleteDoc(doc(db, 'catalogoItems', id))
}

// ─── MATERIALES (base de datos de materiales para cotizaciones) ──────────────
export async function getMateriales() {
  const snap = await getDocs(query(collection(db, 'materiales'), orderBy('nombre', 'asc')))
  return snapsToArr(snap)
}

export function subscribeMateriales(cb) {
  return onSnapshot(query(collection(db, 'materiales'), orderBy('nombre', 'asc')), snap => cb(snapsToArr(snap)))
}

export async function saveMaterial(material) {
  const id = material.id || crypto.randomUUID()
  const data = { ...material, id }
  await setDoc(doc(db, 'materiales', id), data)
  return data
}

export async function deleteMaterial(id) {
  await deleteDoc(doc(db, 'materiales', id))
}

// Inserta el seed inicial una sola vez. El chequeo "¿ya se sembró?" se hace
// dentro de una transacción sobre settings/app para que sea atómico — así
// dos cargas de página casi simultáneas (dos pestañas, primera visita en
// dos dispositivos) no alcanzan a duplicar los 34 materiales.
export async function seedMaterialesSiVacio(seed) {
  const yaSembrado = await runTransaction(db, async (tx) => {
    const ref = doc(db, 'settings', SETTINGS_ID)
    const snap = await tx.get(ref)
    if (snap.exists() && snap.data().materialesSeeded) return true
    tx.set(ref, { materialesSeeded: true }, { merge: true })
    return false
  })
  if (yaSembrado) return
  for (const m of seed) {
    const id = crypto.randomUUID()
    await setDoc(doc(db, 'materiales', id), { ...m, id })
  }
}

// Limpieza de materiales duplicados (mismo nombre+unidad+precio) — se corre
// automáticamente al abrir el panel para autocorregir cualquier duplicación
// que haya quedado de una siembra anterior a la versión atómica de arriba.
export async function limpiarMaterialesDuplicados() {
  const materiales = await getMateriales()
  const vistos = new Set()
  const idsABorrar = []
  for (const m of materiales) {
    const clave = `${m.nombre}|${m.unidad}|${m.precio}`
    if (vistos.has(clave)) idsABorrar.push(m.id)
    else vistos.add(clave)
  }
  for (const id of idsABorrar) await deleteDoc(doc(db, 'materiales', id))
  return idsABorrar.length
}

// Multiplicador de venta por defecto del módulo de Materiales.
export async function getMultiplicadorMateriales() {
  const snap = await getDoc(doc(db, 'settings', SETTINGS_ID))
  return snap.exists() && snap.data().multiplicadorMateriales != null ? snap.data().multiplicadorMateriales : 2.5
}

export async function setMultiplicadorMateriales(valor) {
  await setDoc(doc(db, 'settings', SETTINGS_ID), { multiplicadorMateriales: valor }, { merge: true })
}

// ─── INVENTARIO (stock de materiales de Birth Studio) ────────────────────────
// Shape: { id, nombre, tipo: 'm2'|'ml'|'unidad'|'plancha'|..., cantidad,
//          precio (costo unitario), proveedorId?, nota?, createdAt }
export async function getInventario() {
  const snap = await getDocs(query(collection(db, 'inventario'), orderBy('nombre', 'asc')))
  return snapsToArr(snap)
}

export function subscribeInventario(cb) {
  return onSnapshot(query(collection(db, 'inventario'), orderBy('nombre', 'asc')), snap => cb(snapsToArr(snap)))
}

export async function saveInventarioItem(item) {
  const id = item.id || crypto.randomUUID()
  const data = { ...item, id, createdAt: item.createdAt || new Date().toISOString() }
  await setDoc(doc(db, 'inventario', id), data)
  return data
}

export async function deleteInventarioItem(id) {
  await deleteDoc(doc(db, 'inventario', id))
}

// ─── PROVEEDORES (con teléfono y los materiales que venden) ──────────────────
// Shape: { id, nombre, telefono?, email?, direccion?, nota?,
//          materiales: [{ nombre, unidad, precio }], createdAt }
export async function getProveedores() {
  const snap = await getDocs(query(collection(db, 'proveedores'), orderBy('nombre', 'asc')))
  return snapsToArr(snap)
}

export function subscribeProveedores(cb) {
  return onSnapshot(query(collection(db, 'proveedores'), orderBy('nombre', 'asc')), snap => cb(snapsToArr(snap)))
}

export async function saveProveedor(prov) {
  const id = prov.id || crypto.randomUUID()
  const data = { ...prov, id, createdAt: prov.createdAt || new Date().toISOString() }
  await setDoc(doc(db, 'proveedores', id), data)
  return data
}

export async function deleteProveedor(id) {
  await deleteDoc(doc(db, 'proveedores', id))
}

// ─── GALERÍA (fotos del sitio público: banner + catálogo) ────────────────────
export async function getGaleria() {
  const snap = await getDocs(query(collection(db, 'galeria'), orderBy('orden', 'asc')))
  return snapsToArr(snap)
}

export function subscribeGaleria(cb) {
  return onSnapshot(query(collection(db, 'galeria'), orderBy('orden', 'asc')), snap => cb(snapsToArr(snap)))
}

export async function saveGaleriaItem(item) {
  const id = item.id || crypto.randomUUID()
  const data = { ...item, id, createdAt: item.createdAt || new Date().toISOString() }
  await setDoc(doc(db, 'galeria', id), data)
  return data
}

export async function deleteGaleriaItem(id) {
  await deleteDoc(doc(db, 'galeria', id))
}

export async function uploadGaleriaImagen(file) {
  const path = `galeria/${crypto.randomUUID()}-${file.name}`
  const storageRef = ref(storage, path)
  // Si Firebase Storage no está activo (falta plan Blaze / bucket sin
  // provisionar), `uploadBytes` se queda colgado sin resolver ni fallar.
  // Cortamos con un timeout para dar un error claro en vez de un
  // "Subiendo..." infinito.
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('storage-timeout')), 45000))
  await Promise.race([uploadBytes(storageRef, file), timeout])
  const url = await getDownloadURL(storageRef)
  return { url, path }
}

export async function deleteGaleriaImagen(storagePath) {
  if (!storagePath) return
  try {
    await deleteObject(ref(storage, storagePath))
  } catch {
    // el archivo ya no existe en Storage — no debe bloquear el borrado del doc
  }
}

// ─── ESTADÍSTICAS PÚBLICAS (leídas por el sitio bspublicidad.cl) ─────────────
// Colección separada de `settings` a propósito: `settings` guarda el PIN de
// acceso, así que su lectura debe quedar restringida. `publicStats` es la
// única colección con `allow read: if true` en las reglas de Firestore.
export async function syncPublicStats(aceptadas) {
  await setDoc(doc(db, 'publicStats', 'main'), {
    aceptadas,
    updatedAt: new Date().toISOString(),
  }, { merge: true })
}

// ─── SUSCRIPCIONES TIEMPO REAL ────────────────────────────────────────────────
export function subscribeClientes(cb) {
  return onSnapshot(query(collection(db, 'clientes'), orderBy('createdAt', 'asc')), snap => cb(snapsToArr(snap)))
}

export function subscribeCotizaciones(cb) {
  return onSnapshot(query(collection(db, 'cotizaciones'), orderBy('createdAt', 'desc')), snap => cb(snapsToArr(snap)))
}

export function subscribeGastos(cb) {
  return onSnapshot(query(collection(db, 'gastos'), orderBy('createdAt', 'desc')), snap => cb(snapsToArr(snap)))
}

export function subscribePagos(cb) {
  return onSnapshot(query(collection(db, 'pagos'), orderBy('createdAt', 'desc')), snap => cb(snapsToArr(snap)))
}

export function subscribeContratos(cb) {
  return onSnapshot(query(collection(db, 'contratos'), orderBy('createdAt', 'desc')), snap => cb(snapsToArr(snap)))
}

// ─── MIGRACIÓN DESDE LOCALSTORAGE (se ejecuta solo una vez) ───────────────────
const MIGRATED_KEY = 'BIRTH_MIGRATED_v1'

export async function migrarDesdeLocalStorage() {
  if (localStorage.getItem(MIGRATED_KEY)) return

  const colecciones = [
    { key: 'BIRTH_CLIENTES', col: 'clientes' },
    { key: 'BIRTH_COTIZACIONES', col: 'cotizaciones' },
    { key: 'BIRTH_CONTRATOS', col: 'contratos' },
    { key: 'BIRTH_GASTOS', col: 'gastos' },
    { key: 'BIRTH_PAGOS', col: 'pagos' },
    { key: 'BIRTH_MISCELANEOS', col: 'miscelaneos' },
  ]

  for (const { key, col } of colecciones) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const items = JSON.parse(raw)
      if (!Array.isArray(items) || items.length === 0) continue
      for (const item of items) {
        if (item.id) await setDoc(doc(db, col, item.id), item)
      }
    } catch {}
  }

  // Migrar settings (número cotización y PIN)
  try {
    const settings = JSON.parse(localStorage.getItem('BIRTH_SETTINGS') || '{}')
    const pin = localStorage.getItem('BIRTH_PIN')
    const settingsData = {}
    if (settings.ultimoNumeroCotizacion) settingsData.ultimoNumeroCotizacion = settings.ultimoNumeroCotizacion
    if (pin) settingsData.pin = pin
    if (Object.keys(settingsData).length > 0) {
      await setDoc(doc(db, 'settings', 'app'), settingsData, { merge: true })
    }
  } catch {}

  localStorage.setItem(MIGRATED_KEY, '1')
}
