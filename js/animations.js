/**
 * animations.js — Birth Studio Publicidad
 * ─────────────────────────────────────────
 * 1. Intro "PUBLICIDAD" → logo reveal
 * 2. Mosaic background generation y cycling
 * 3. Scroll-triggered reveal (IntersectionObserver)
 * 4. Logo flotante ya está en CSS puro (@keyframes heroFloat)
 */

/* ══════════════════════════════════════════
   1. INTRO SEQUENCE
   Fases:
   a) 0ms      → Letras entran una a una (stagger 80ms)
   b) 1.8s     → Pausa
   c) 2.5s     → Letras se dispersan / se van
   d) 3.0s     → Overlay baja con clip-path
   e) 3.6s     → Hero content aparece
══════════════════════════════════════════ */
function runIntroSequence() {
    const intro   = document.getElementById('intro');
    const letters = document.querySelectorAll('#intro-word span');
    const hero    = document.getElementById('hero-content');

    if (!intro || !letters.length) return;

    // a) Letras entran escalonadas
    letters.forEach(function(letter, i) {
        setTimeout(function() {
            letter.classList.add('active');
        }, 300 + i * 90);
    });

    // b/c) Letras salen (invertido: de la última a la primera)
    const exitStart = 300 + letters.length * 90 + 600; // pausa de 600ms tras entrar

    letters.forEach(function(letter, i) {
        setTimeout(function() {
            letter.style.transition = 'transform 0.5s cubic-bezier(0.55,0,1,0.45), opacity 0.5s ease';
            letter.style.transform  = 'translateY(-120%)';
            letter.style.opacity    = '0';
        }, exitStart + (letters.length - 1 - i) * 60);
    });

    // d) Overlay se cierra (clip-path de arriba hacia abajo)
    const overlayStart = exitStart + letters.length * 60 + 200;

    setTimeout(function() {
        intro.classList.add('is-exiting');
    }, overlayStart);

    // e) Desbloquear scroll + mostrar hero
    setTimeout(function() {
        intro.style.display = 'none';
        document.body.classList.remove('is-loading');

        if (hero) {
            hero.classList.add('is-visible');
        }
    }, overlayStart + 900);
}


/* ══════════════════════════════════════════
   2. MOSAIC BACKGROUND — estilo Google Flow
   Genera 18 celdas (6×3) con imágenes reales
   que ciclan con crossfade suave
══════════════════════════════════════════ */
function initMosaic() {
    var container = document.getElementById('mosaic');
    if (!container) return;

    var COLS  = 6;
    var ROWS  = 3;
    var TOTAL = COLS * ROWS;

    // ── Pool de imágenes (Unsplash — reemplaza por tus fotos reales)
    // Para usar tus fotos: agrega rutas como 'assets/foto1.jpg'
    var IMAGES = [
        'https://images.unsplash.com/photo-1706466614967-f4f14a3d9d08?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1750839990929-d4505ede9df2?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1759936802353-a4999ad4e0d1?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1706466614967-f4f14a3d9d08?w=400&h=300&fit=crop',
    ];

    // Mezcla el pool para variedad inicial
    function shuffle(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
        }
        return a;
    }

    // ── Construye celdas con dos capas para crossfade
    var cells = [];

    for (var i = 0; i < TOTAL; i++) {
        var cell  = document.createElement('div');
        cell.className = 'mosaic__cell';
        cell.setAttribute('aria-hidden', 'true');

        // Capa A y B para crossfade
        var layerA = document.createElement('div');
        var layerB = document.createElement('div');
        layerA.className = 'mosaic__layer mosaic__layer--a is-front';
        layerB.className = 'mosaic__layer mosaic__layer--b';

        cell.appendChild(layerA);
        cell.appendChild(layerB);
        container.appendChild(cell);

        cells.push({ cell: cell, a: layerA, b: layerB, front: 'a' });
    }

    // ── Asigna imagen inicial a cada celda
    var pool = shuffle(IMAGES);
    cells.forEach(function(c, i) {
        var url = 'url(' + pool[i % pool.length] + ')';
        c.a.style.backgroundImage = url;
        c.imgIndex = i % pool.length;
    });

    // ── Función de swap: crossfade una celda a nueva imagen
    function swapCell(c) {
        // Elige imagen diferente a la actual
        var next;
        do { next = Math.floor(Math.random() * IMAGES.length); }
        while (next === c.imgIndex);
        c.imgIndex = next;

        var url = 'url(' + IMAGES[next] + ')';

        if (c.front === 'a') {
            c.b.style.backgroundImage = url;
            c.b.classList.add('is-front');
            c.a.classList.remove('is-front');
            c.front = 'b';
        } else {
            c.a.style.backgroundImage = url;
            c.a.classList.add('is-front');
            c.b.classList.remove('is-front');
            c.front = 'a';
        }

        // Brillo temporal en la celda activa
        c.cell.classList.add('is-bright');
        setTimeout(function() { c.cell.classList.remove('is-bright'); }, 2000);
    }

    // ── Ciclo: cambia 2-3 celdas aleatorias cada intervalo
    function cycleMosaic() {
        var count = 2 + Math.floor(Math.random() * 2);
        var picked = shuffle(cells.map(function(_, i){ return i; })).slice(0, count);
        picked.forEach(function(idx) { swapCell(cells[idx]); });
    }

    // Inicio escalonado para que no arranquen todas juntas
    cells.forEach(function(c, i) {
        setTimeout(function() { swapCell(c); }, i * 120);
    });

    setInterval(cycleMosaic, 2200);
}


/* ══════════════════════════════════════════
   3. SCROLL REVEAL — entrada al descubrir
   Al entrar al viewport, cada elemento .reveal
   se desliza desde la izquierda y aparece de
   0% a 100% de opacidad. Rápido y leve.
   Los hermanos de un grid entran escalonados
   (barrido izquierda → derecha).
══════════════════════════════════════════ */
function initReveal() {
    var els = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!els.length) return;

    // Delay escalonado entre hermanos .reveal del mismo contenedor
    els.forEach(function(el) {
        var parent = el.parentElement;
        var siblings = parent
            ? Array.prototype.slice.call(parent.children).filter(function(c) {
                  return c.classList && c.classList.contains('reveal');
              })
            : [el];
        var idx = siblings.indexOf(el);
        // cap a 5 para que la última card no tarde demasiado
        el.style.transitionDelay = (Math.min(idx, 5) * 0.07) + 's';
    });

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target); // se anima una vez
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -10% 0px'
    });

    els.forEach(function(el) { observer.observe(el); });
}


/* ══════════════════════════════════════════
   INIT — espera DOM listo
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {
    initMosaic();
    initReveal();
    runIntroSequence();
});