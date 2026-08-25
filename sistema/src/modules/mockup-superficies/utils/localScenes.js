// Guardado LOCAL de escenas del Mockup Vitrina (IndexedDB), sin depender de
// Firebase Storage (que está pausado / requiere plan Blaze). Las imágenes ya
// viven como dataURL dentro de la escena, así que se persiste el objeto tal
// cual — sin subir nada a la nube. Ventaja extra: al ser dataURL del mismo
// origen, el "Usar en Prototipo" (exportar canvas) no queda "tainted".
//
// Límite conocido: las escenas quedan solo en ESTE navegador/PC. La nube
// (Firebase) queda como paso posterior cuando se active Storage.

const DB_NAME = 'birth_mockup_vitrina'
const STORE = 'escenas'
const VERSION = 1
const ACTIVE_SCENE_KEY = 'birth_mockup_vitrina_active_scene_id'

function abrir() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Tu navegador no soporta guardado local (IndexedDB).'))
      return
    }
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('No se pudo abrir el guardado local.'))
  })
}

export async function guardarEscenaLocal(escena) {
  const db = await abrir()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(escena)
      tx.oncomplete = () => {
        recordarEscenaActivaLocal(escena.id)
        resolve(escena)
      }
      tx.onerror = () => reject(tx.error || new Error('No se pudo guardar la escena localmente.'))
      tx.onabort = () => reject(tx.error || new Error('El navegador abortó el guardado (¿espacio lleno?).'))
    })
  } finally {
    db.close()
  }
}

export async function obtenerEscenaLocal(id) {
  if (!id) return null
  const db = await abrir()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(id)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error || new Error('No se pudo abrir la escena guardada.'))
    })
  } finally {
    db.close()
  }
}

export function recordarEscenaActivaLocal(id) {
  try {
    if (id) window.localStorage.setItem(ACTIVE_SCENE_KEY, id)
  } catch {
    // Si localStorage esta bloqueado, el guardado principal en IndexedDB sigue funcionando.
  }
}

export function obtenerEscenaActivaLocal() {
  try {
    return window.localStorage.getItem(ACTIVE_SCENE_KEY)
  } catch {
    return null
  }
}

export function olvidarEscenaActivaLocal() {
  try {
    window.localStorage.removeItem(ACTIVE_SCENE_KEY)
  } catch {
    // No bloquea el flujo de nueva escena.
  }
}

export async function listarEscenasLocal() {
  const db = await abrir()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).getAll()
      req.onsuccess = () => {
        const arr = (req.result || []).slice().sort(
          (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
        )
        resolve(arr)
      }
      req.onerror = () => reject(req.error || new Error('No se pudieron leer las escenas guardadas.'))
    })
  } finally {
    db.close()
  }
}

export async function borrarEscenaLocal(id) {
  const db = await abrir()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error || new Error('No se pudo eliminar la escena.'))
    })
  } finally {
    db.close()
  }
}
