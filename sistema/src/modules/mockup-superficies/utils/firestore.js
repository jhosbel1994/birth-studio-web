// Persistencia de escenas del módulo Mockup Vitrina. Aislado del resto del
// sistema a propósito (Regla Cero): colección Firestore propia
// ("mockupsVitrina") y helpers locales, sin tocar utils/storage.js.
import {
  collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, onSnapshot,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { onAuthStateChanged } from 'firebase/auth'
import { db, storage, auth } from '../../../firebase'

const COL = 'mockupsVitrina'

// Carpeta de Storage: se reutiliza a proposito el prefijo "galeria/" (la
// misma que usa uploadGaleriaImagen, una feature ya en produccion) en vez
// de una carpeta propia "mockupsVitrina/". Las reglas de Storage del
// proyecto son un allowlist por ruta: una carpeta nueva rebota como error
// de CORS (rechazo de permisos disfrazado). Subir bajo "galeria/{uuid}-..."
// — mismo patron de una sola profundidad que Galeria — garantiza que
// cualquier regla que permita Galeria permita esto. La coleccion Firestore
// sigue siendo "mockupsVitrina" (separada); estos archivos NO aparecen en
// la galeria del sitio porque esa se arma desde la coleccion, no listando
// la carpeta de Storage.
const STORAGE_PREFIX = 'galeria'

function mensajeFirebase(e) {
  if (e?.code === 'permission-denied') {
    return 'Firebase rechazó el acceso a Mockup Vitrina. Cierra sesión, entra con Google autorizado y confirma que las reglas permitan la colección mockupsVitrina.'
  }
  if (e?.code === 'failed-precondition') {
    return 'Firestore necesita preparar un índice para listar las escenas de Mockup Vitrina.'
  }
  return e?.message || 'No se pudo conectar con Firebase para Mockup Vitrina.'
}

// Espera a que Firebase tenga una sesion activa antes de subir. El sistema
// marca "logueado" via localStorage (independiente de Firebase Auth), asi
// que auth.currentUser puede estar vacio aunque la UI diga que hay sesion
// — y Storage rechaza escrituras sin request.auth, lo que aparece como
// error de CORS. Si tras esperar no hay sesion, se avisa claro.
function ensureAuth(timeoutMs = 8000) {
  if (auth.currentUser) return Promise.resolve(auth.currentUser)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsub()
      reject(new Error('Tu sesión de Firebase no está activa. Cierra sesión y vuelve a entrar con Google, luego reintenta.'))
    }, timeoutMs)
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { clearTimeout(timer); unsub(); resolve(user) }
    })
  })
}

function snapToObj(snap) {
  const d = snap.data()
  if (d.createdAt?.toDate) d.createdAt = d.createdAt.toDate().toISOString()
  return { ...d, id: snap.id }
}

function snapsToArr(snap) {
  return snap.docs.map(snapToObj)
}

export async function getEscenas() {
  await ensureAuth()
  const snap = await getDocs(query(collection(db, COL), orderBy('createdAt', 'desc')))
  return snapsToArr(snap)
}

export function subscribeEscenas(cb, onError) {
  let cancelled = false
  let unsubscribe = () => {}

  ensureAuth()
    .then(() => {
      if (cancelled) return
      unsubscribe = onSnapshot(
        query(collection(db, COL), orderBy('createdAt', 'desc')),
        snap => cb(snapsToArr(snap)),
        e => {
          cb([])
          onError?.(mensajeFirebase(e))
        },
      )
    })
    .catch(e => {
      if (cancelled) return
      cb([])
      onError?.(mensajeFirebase(e))
    })

  return () => {
    cancelled = true
    unsubscribe()
  }
}

export async function saveEscena(escena) {
  await ensureAuth()
  const id = escena.id || crypto.randomUUID()
  const data = { ...escena, id, createdAt: escena.createdAt || new Date().toISOString() }
  await setDoc(doc(db, COL, id), data)
  return data
}

export async function deleteEscena(id) {
  await ensureAuth()
  await deleteDoc(doc(db, COL, id))
}

export async function uploadEscenaFoto(file) {
  await ensureAuth()
  const path = `${STORAGE_PREFIX}/${crypto.randomUUID()}-${file.name}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  return { url, path }
}

export async function deleteEscenaFoto(storagePath) {
  if (!storagePath) return
  try {
    await ensureAuth()
    await deleteObject(ref(storage, storagePath))
  } catch {
    // el archivo ya no existe en Storage — no debe bloquear el borrado del doc
  }
}
