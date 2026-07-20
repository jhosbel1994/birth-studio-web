import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc,
  query, orderBy, runTransaction, onSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase'

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
