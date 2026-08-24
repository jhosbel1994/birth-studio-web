// Persistencia de escenas del módulo Mockup Vitrina. Aislado del resto del
// sistema a propósito (Regla Cero): colección Firestore propia
// ("mockupsVitrina") y helpers locales, sin tocar utils/storage.js.
import {
  collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, onSnapshot,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../../../firebase'

const COL = 'mockupsVitrina'

function snapToObj(snap) {
  const d = snap.data()
  if (d.createdAt?.toDate) d.createdAt = d.createdAt.toDate().toISOString()
  return { ...d, id: snap.id }
}

function snapsToArr(snap) {
  return snap.docs.map(snapToObj)
}

export async function getEscenas() {
  const snap = await getDocs(query(collection(db, COL), orderBy('createdAt', 'desc')))
  return snapsToArr(snap)
}

export function subscribeEscenas(cb) {
  return onSnapshot(query(collection(db, COL), orderBy('createdAt', 'desc')), snap => cb(snapsToArr(snap)))
}

export async function saveEscena(escena) {
  const id = escena.id || crypto.randomUUID()
  const data = { ...escena, id, createdAt: escena.createdAt || new Date().toISOString() }
  await setDoc(doc(db, COL, id), data)
  return data
}

export async function deleteEscena(id) {
  await deleteDoc(doc(db, COL, id))
}

export async function uploadEscenaFoto(file) {
  const path = `${COL}/${crypto.randomUUID()}-${file.name}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  return { url, path }
}

export async function deleteEscenaFoto(storagePath) {
  if (!storagePath) return
  try {
    await deleteObject(ref(storage, storagePath))
  } catch {
    // el archivo ya no existe en Storage — no debe bloquear el borrado del doc
  }
}
