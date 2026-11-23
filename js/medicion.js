/* Eventos anónimos listos para un gestor de estadísticas. No carga proveedores,
   no almacena datos personales y no transmite nada sin una integración externa. */
(function () {
  'use strict';
  var allowedServices = ['Letreros luminosos', 'Cajetín Luminoso LED', 'Letras Corpóreas 3D', 'Señalética corporativa', 'Acrílicos de puerta y pared', 'Corte y grabado láser', 'Letreros publicitarios', 'Diseño gráfico', 'Página Web', 'Vinilos y Vitrinas', 'Bastidor Publicitario', 'Acrílico 360°', 'Gran Formato / Rotulación', 'Otro / No estoy seguro'];
  var events = ['whatsapp_click', 'quote_start', 'quote_email_success', 'quote_error'];
  var params = new URLSearchParams(location.search);
  var source = 'direct';
  var ref = '';
  try { ref = new URL(document.referrer).hostname; } catch (_) {}
  if (params.get('utm_source') === 'chatgpt.com' || /(^|\.)(chatgpt\.com|chat\.openai\.com)$/.test(ref)) source = 'chatgpt';
  else if (/(^|\.)google\.[a-z.]+$/.test(ref)) source = 'google';
  else if (/(^|\.)bing\.com$/.test(ref)) source = 'bing';
  else if (ref && ref !== location.hostname) source = 'other';
  // Solo conserva la categoría de origen durante esta sesión, nunca la URL,
  // parámetros libres, nombre, empresa, teléfono, correo o contenido del formulario.
  try {
    var savedSource = sessionStorage.getItem('birth_traffic_source');
    if (source === 'direct' && (!ref || ref === location.hostname) && ['direct', 'chatgpt', 'google', 'bing', 'other'].indexOf(savedSource) >= 0) source = savedSource;
    sessionStorage.setItem('birth_traffic_source', source);
  } catch (_) {}
  window.birthTrack = function (event, service) {
    if (events.indexOf(event) === -1) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: event, service: allowedServices.indexOf(service) >= 0 ? service : 'general', page_path: location.pathname, traffic_source: source });
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    var url;
    try { url = new URL(a.href, location.href); } catch (_) { return; }
    if (url.hostname === 'wa.me' && url.pathname === '/56977247545') window.birthTrack('whatsapp_click', a.dataset.service || document.body.dataset.service);
  });
  var form = document.getElementById('visita-form');
  if (form) {
    var started = false;
    form.addEventListener('focusin', function () {
      if (started) return;
      started = true;
      window.birthTrack('quote_start', document.getElementById('v-tipo').value);
    });
  }
})();
