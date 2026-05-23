/**
 * main.js — Birth Studio Publicidad
 * ────────────────────────────────────
 * 1. Nav: fondo al hacer scroll + link activo
 * 2. Menú mobile (hamburger)
 * 3. Smooth scroll para links internos
 * 4. Fecha mínima en el calendario (hoy)
 */

/* ══════════════════════════════════════════
   1. NAV SCROLL
══════════════════════════════════════════ */
function initNav() {
    var nav = document.getElementById('nav');
    if (!nav) return;

    var sections   = document.querySelectorAll('section[id]');
    var navLinks   = document.querySelectorAll('.nav__link[href^="#"]');

    // Añade clase is-scrolled al hacer scroll
    function onScroll() {
        if (window.scrollY > 50) {
            nav.classList.add('is-scrolled');
        } else {
            nav.classList.remove('is-scrolled');
        }

        // Marca link activo según sección visible
        var current = '';

        sections.forEach(function(section) {
            var top    = section.offsetTop - 100;
            var bottom = top + section.offsetHeight;

            if (window.scrollY >= top && window.scrollY < bottom) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(function(link) {
            link.classList.remove('is-active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('is-active');
            }
        });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // ejecuta al inicio
}


/* ══════════════════════════════════════════
   2. MENÚ MOBILE
══════════════════════════════════════════ */
function initMobileMenu() {
    var toggle   = document.getElementById('nav-toggle');
    var menu     = document.getElementById('nav-menu');
    var backdrop = document.getElementById('nav-backdrop');
    var links    = menu ? menu.querySelectorAll('.nav__link') : [];

    if (!toggle || !menu) return;

    function openMenu() {
        menu.classList.add('is-open');
        toggle.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
        if (backdrop) backdrop.classList.add('is-visible');
    }

    function closeMenu() {
        menu.classList.remove('is-open');
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        if (backdrop) backdrop.classList.remove('is-visible');
    }

    toggle.addEventListener('click', function() {
        if (menu.classList.contains('is-open')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    // Cierra al tocar el backdrop (fuera del menú)
    if (backdrop) {
        backdrop.addEventListener('click', closeMenu);
    }

    // Cierra al hacer clic en un link
    links.forEach(function(link) {
        link.addEventListener('click', closeMenu);
    });

    // Cierra con Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeMenu();
    });

    // Cierra al comenzar a hacer scroll (nav compacta toma el control)
    window.addEventListener('scroll', function() {
        if (menu.classList.contains('is-open')) {
            closeMenu();
        }
    }, { passive: true });
}


/* ══════════════════════════════════════════
   3. SMOOTH SCROLL
   (Complementa el CSS scroll-behavior: smooth
   con offset para compensar nav fija)
══════════════════════════════════════════ */
function initSmoothScroll() {
    var NAV_HEIGHT = 72;

    document.querySelectorAll('a[href^="#"]').forEach(function(link) {
        link.addEventListener('click', function(e) {
            var href   = link.getAttribute('href');
            var target = document.querySelector(href);
            if (!target) return;

            e.preventDefault();

            var top = target.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT;

            window.scrollTo({ top: top, behavior: 'smooth' });
        });
    });
}


/* ══════════════════════════════════════════
   4. FECHA MÍNIMA (hoy) en el input date
══════════════════════════════════════════ */
function initMinDate() {
    var dateInput = document.getElementById('s-date');
    if (!dateInput) return;

    var today = new Date();

    // Suma 1 día (no se puede agendar para hoy mismo)
    today.setDate(today.getDate() + 1);

    var yyyy = today.getFullYear();
    var mm   = String(today.getMonth() + 1).padStart(2, '0');
    var dd   = String(today.getDate()).padStart(2, '0');

    dateInput.setAttribute('min', yyyy + '-' + mm + '-' + dd);
}


/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {
    initNav();
    initMobileMenu();
    initSmoothScroll();
    initMinDate();
});
