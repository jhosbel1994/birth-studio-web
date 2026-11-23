(function () {
  'use strict';
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var banner = document.getElementById('novedades');
  function localAsset(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try { var url = new URL(value, location.href); return url.origin === location.origin && (url.protocol === 'http:' || url.protocol === 'https:') ? url.href : ''; } catch (_) { return ''; }
  }

  function initBanner(items, interval) {
    var viewport = banner.querySelector('.b-news__viewport');
    var index = 0;
    var timer;
    var paused = reducedMotion.matches;
    var focusPaused = false;
    var hovered = false;
    var inView = true;
    var slides = [];

    viewport.replaceChildren();
    items.forEach(function (item, i) {
      var slide = document.createElement('article');
      slide.className = 'b-news__slide';
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'diapositiva');
      slide.setAttribute('aria-label', (i + 1) + ' de ' + items.length);
      var copy = document.createElement('div');
      copy.className = 'b-news__copy';
      var label = document.createElement('p');
      label.className = 'b-news__label';
      label.textContent = item.etiqueta;
      var title = document.createElement('h2');
      title.textContent = item.titulo;
      var description = document.createElement('p');
      description.className = 'b-news__description';
      description.textContent = item.descripcion;
      var link = document.createElement('a');
      link.className = 'b-news__link';
      link.href = item.enlace;
      link.textContent = item.boton + ' →';
      copy.append(label, title, description);
      slide.append(copy, link);
      if (localAsset(item.imagen)) {
        var artwork = document.createElement('a');
        artwork.className = 'b-news__artwork';
        artwork.href = localAsset(item.imagen);
        artwork.target = '_blank';
        artwork.rel = 'noopener';
        artwork.setAttribute('aria-label', 'Ampliar imagen: ' + item.titulo);
        var picture = document.createElement('picture');
        if (localAsset(item.imagenMovil)) {
          var mobile = document.createElement('source');
          mobile.media = '(max-width: 760px)';
          mobile.srcset = localAsset(item.imagenMovil);
          mobile.width = 1080;
          mobile.height = 720;
          picture.append(mobile);
        }
        var img = document.createElement('img');
        img.src = localAsset(item.imagen);
        img.alt = typeof item.altImagen === 'string' && item.altImagen.trim() ? item.altImagen : item.titulo + '. ' + item.descripcion;
        img.width = 1920;
        img.height = 480;
        img.decoding = 'async';
        img.addEventListener('error', function () { slide.classList.remove('b-news__slide--image'); artwork.hidden = true; });
        picture.append(img);
        artwork.append(picture);
        slide.append(artwork);
        slide.classList.add('b-news__slide--image');
      }
      if (typeof item.servicio === 'string' && typeof item.mensajeWhatsapp === 'string') {
        var contactBar = document.createElement('div');
        contactBar.className = 'b-news__contact';
        var identity = document.createElement('div');
        identity.className = 'b-news__identity';
        var name = document.createElement('p');
        name.className = 'b-news__name';
        name.textContent = item.titulo;
        identity.append(name);
        if (localAsset(item.imagen)) {
          var zoom = document.createElement('a');
          zoom.className = 'b-news__zoom';
          zoom.href = localAsset(item.imagen);
          zoom.target = '_blank';
          zoom.rel = 'noopener';
          zoom.textContent = 'Ampliar imagen';
          identity.append(zoom);
        }
        var buttons = document.createElement('div');
        buttons.className = 'b-news__actions';
        var whatsapp = document.createElement('a');
        whatsapp.className = 'b-news__whatsapp';
        whatsapp.href = 'https://wa.me/56977247545?text=' + encodeURIComponent(item.mensajeWhatsapp);
        whatsapp.target = '_blank';
        whatsapp.rel = 'noopener';
        whatsapp.dataset.service = item.servicio;
        whatsapp.textContent = 'Consultar por WhatsApp';
        var email = document.createElement('a');
        email.className = 'b-news__email';
        var emailUrl = new URL('/', location.origin);
        emailUrl.searchParams.set('contacto', 'correo');
        emailUrl.searchParams.set('servicio', item.servicio);
        emailUrl.hash = 'visita-form';
        email.href = emailUrl.href;
        email.textContent = 'Cotizar por correo';
        buttons.append(whatsapp, email);
        contactBar.append(identity, buttons);
        slide.append(contactBar);
        slide.classList.add('b-news__slide--contact');
      }
      viewport.append(slide);
      slides.push(slide);
    });

    function stop() { window.clearTimeout(timer); }
    function schedule() {
      stop();
      if (items.length < 2 || paused || hovered || focusPaused || !inView || document.hidden) return;
      timer = window.setTimeout(function () { show(index + 1); schedule(); }, interval);
    }
    function show(value) {
      index = (value + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        var active = i === index;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
        slide.inert = !active;
      });
    }
    banner.addEventListener('pointerenter', function (event) { if (event.pointerType !== 'touch') { hovered = true; stop(); } });
    banner.addEventListener('pointerleave', function () { hovered = false; schedule(); });
    banner.addEventListener('focusin', function () { focusPaused = true; stop(); });
    banner.addEventListener('focusout', function () { window.setTimeout(function () { if (!banner.contains(document.activeElement)) focusPaused = false; schedule(); }, 0); });
    document.addEventListener('visibilitychange', schedule);
    reducedMotion.addEventListener('change', function (event) { paused = event.matches; schedule(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { inView = entries[0].isIntersecting; schedule(); }).observe(banner);
    }
    show(0);
    schedule();
  }

  if (banner) {
    fetch('/data/novedades.json').then(function (r) {
      if (!r.ok) throw new Error('Novedades no disponibles');
      return r.json();
    }).then(function (data) {
      var items = Array.isArray(data.novedades) ? data.novedades.filter(function (item) {
        if (!item || typeof item.titulo !== 'string' || !item.titulo.trim() || typeof item.descripcion !== 'string' || typeof item.etiqueta !== 'string' || typeof item.boton !== 'string' || typeof item.enlace !== 'string') return false;
        try { var url = new URL(item.enlace, location.href); return url.origin === location.origin && (url.protocol === 'http:' || url.protocol === 'https:'); } catch (_) { return false; }
      }) : [];
      if (items.length) initBanner(items, Math.max(3000, Number(data.intervaloMs) || 3000));
    }).catch(function () { /* La primera novedad permanece visible sin depender de la carga. */ });
  }

  var workflow = document.querySelector('.b-workflow');
  if (workflow && !reducedMotion.matches && 'IntersectionObserver' in window) {
    workflow.classList.add('is-ready');
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { workflow.classList.add('is-visible'); observer.disconnect(); }
    }, { threshold: 0.12 });
    observer.observe(workflow);
    reducedMotion.addEventListener('change', function (event) { if (event.matches) workflow.classList.add('is-visible'); });
  }
})();
