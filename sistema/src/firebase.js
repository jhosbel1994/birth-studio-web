import { initializeApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyDeidi9JsSnGUsODCV2rj1VwZ1ATd2_Apc',
  authDomain: 'birth-studio-cotizador.firebaseapp.com',
  projectId: 'birth-studio-cotizador',
  storageBucket: 'birth-studio-cotizador.firebasestorage.app',
  messagingSenderId: '552581246431',
  appId: '1:552581246431:web:ae2a72cc783caed23e286a',
}

const app = initializeApp(firebaseConfig)

// Persistencia offline — la app funciona sin internet y sincroniza al volver
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
})

export const storage = getStorage(app)
