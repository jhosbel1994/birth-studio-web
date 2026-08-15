// ─── CONTADOR PÚBLICO DE PROYECTOS ────────────────────────────────────────────
// Lee publicStats/main (el Dashboard del sistema interno /cotizador lo
// actualiza cada vez que cambia el conteo de cotizaciones "Aceptadas") y lo
// suma a la base histórica del HTML (proyectos previos a la existencia del
// sistema). Si falla la conexión, se queda con el número base — nunca rompe.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'

const firebaseConfig = {
  apiKey: 'AIzaSyDeidi9JsSnGUsODCV2rj1VwZ1ATd2_Apc',
  authDomain: 'birth-studio-cotizador.firebaseapp.com',
  projectId: 'birth-studio-cotizador',
  storageBucket: 'birth-studio-cotizador.firebasestorage.app',
  messagingSenderId: '552581246431',
  appId: '1:552581246431:web:ae2a72cc783caed23e286a',
}

async function actualizarContadorProyectos() {
  const el = document.getElementById('stat-proyectos')
  if (!el) return
  const base = Number(el.dataset.base || 0)

  try {
    const app = initializeApp(firebaseConfig, 'statsApp')
    const db = getFirestore(app)
    const snap = await getDoc(doc(db, 'publicStats', 'main'))
    const aceptadas = snap.exists() ? (snap.data().aceptadas || 0) : 0
    el.textContent = '+' + (base + aceptadas)
  } catch (err) {
    // sin conexión o Firestore caído: se queda con el número base del HTML
  }
}

actualizarContadorProyectos()
