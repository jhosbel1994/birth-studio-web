// ─── BANNER DE PROYECTOS ──────────────────────────────────────────────────────
// Lee la colección "galeria" de Firebase (mismo proyecto que usa el sistema
// interno /cotizador) y arma el carrusel con las fotos marcadas "Destacada".
// Si aún no hay ninguna marcada (o falla la conexión), usa fotos reales
// locales de respaldo para que el banner nunca se vea vacío.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'
import {
  getFirestore, collection, query, where, orderBy, getDocs,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'

const firebaseConfig = {
  apiKey: 'AIzaSyDeidi9JsSnGUsODCV2rj1VwZ1ATd2_Apc',
  authDomain: 'birth-studio-cotizador.firebaseapp.com',
  projectId: 'birth-studio-cotizador',
  storageBucket: 'birth-studio-cotizador.firebasestorage.app',
  messagingSenderId: '552581246431',
  appId: '1:552581246431:web:ae2a72cc783caed23e286a',
}

const SLIDES_RESPALDO = [
  { url: 'assets/BARBERIA.jpg' },
  { url: 'assets/FARMACIA HORIZONTAL.jpg' },
  { url: 'assets/LIVERPOOL DIA.jpg' },
  { url: 'assets/oxxo.jpg' },
  { url: 'assets/camioneta.jpg' },
  { url: 'assets/LONA PVC.jpg' },
  { url: 'assets/instalacion01.jpeg' },
  { url: 'assets/instalacion02.jpeg' },
]

const AUTOPLAY_MS = 4000
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

function esc(str) {
  const div = document.createElement('div')
  div.textContent = str || ''
  return div.innerHTML
}

async function fetchSlidesDestacados() {
  try {
    const app = initializeApp(firebaseConfig)
    const db = getFirestore(app)
    const q = query(
      collection(db, 'galeria'),
      where('destacada', '==', true),
      orderBy('orden', 'asc')
    )
    const snap = await getDocs(q)
    const slides = snap.docs.map(d => d.data()).filter(s => s.url)
    return slides.length ? slides : SLIDES_RESPALDO
  } catch (err) {
    return SLIDES_RESPALDO
  }
}

function initBannerProyectos(slides) {
  const section = document.getElementById('banner-proyectos')
  const track = document.getElementById('pb-track')
  const dotsWrap = document.getElementById('pb-dots')
  const btnPrev = document.getElementById('pb-prev')
  const btnNext = document.getElementById('pb-next')
  if (!section || !track || !dotsWrap || !btnPrev || !btnNext || !slides.length) return

  let index = 0
  let timer = null

  track.innerHTML = slides.map(s => {
    const hasText = s.titulo || s.descripcion
    return `
      <div class="pb-slide" style="background-image:url('${s.url}')">
        <div class="pb-slide__overlay"></div>
        ${hasText ? `
          <div class="pb-slide__text">
            ${s.titulo ? `<h3 class="pb-slide__title">${esc(s.titulo)}</h3>` : ''}
            ${s.descripcion ? `<p class="pb-slide__desc">${esc(s.descripcion)}</p>` : ''}
            ${s.textoBoton ? `<a href="${s.linkBoton || '#cotizacion'}" class="pb-slide__cta">${esc(s.textoBoton)}</a>` : ''}
          </div>
        ` : ''}
      </div>
    `
  }).join('')

  dotsWrap.innerHTML = slides.map((_, i) =>
    `<button type="button" class="pb-dot${i === 0 ? ' is-active' : ''}" aria-label="Ir al proyecto ${i + 1}"></button>`
  ).join('')
  const dots = Array.from(dotsWrap.children)

  function goTo(i) {
    index = (i + slides.length) % slides.length
    track.style.transform = `translateX(-${index * 100}%)`
    dots.forEach((d, di) => d.classList.toggle('is-active', di === index))
  }
  function next() { goTo(index + 1) }
  function prev() { goTo(index - 1) }

  function stop() {
    if (timer) clearInterval(timer)
    timer = null
  }
  function play() {
    if (reduceMotion || slides.length < 2) return
    stop()
    timer = setInterval(next, AUTOPLAY_MS)
  }

  btnNext.addEventListener('click', () => { next(); play() })
  btnPrev.addEventListener('click', () => { prev(); play() })
  dots.forEach((d, i) => d.addEventListener('click', () => { goTo(i); play() }))

  section.addEventListener('mouseenter', stop)
  section.addEventListener('mouseleave', play)

  let touchStartX = 0
  section.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; stop() }, { passive: true })
  section.addEventListener('touchend', e => {
    const delta = e.changedTouches[0].clientX - touchStartX
    if (delta > 40) prev()
    else if (delta < -40) next()
    play()
  }, { passive: true })

  goTo(0)
  play()
}

fetchSlidesDestacados().then(initBannerProyectos)
