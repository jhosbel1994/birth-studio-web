/**
 * form.js — Birth Studio Publicidad
 * ──────────────────────────────────────────────
 * 1. Formulario de cotización → EmailJS
 * 2. Mostrar/ocultar campos según selección
 * 3. Slots de horario generados dinámicamente
 * 4. Formulario de agenda → abre WhatsApp
 */

// ── EmailJS Credentials ──
var EMAILJS_SERVICE_ID = 'service_qtcrtcr';
var EMAILJS_TEMPLATE_ID = 'template_3zwrb8h';
var EMAILJS_PUBLIC_KEY = 'x6DqzGj_3ceKhk2NQ';
var WA_NUMBER = '56977247545';

// Espera a que EmailJS esté listo
function waitForEmailJS(callback) {
    if (typeof emailjs !== 'undefined') {
        emailjs.init(EMAILJS_PUBLIC_KEY);
        callback();
    } else {
        setTimeout(function() { waitForEmailJS(callback); }, 100);
    }
}

/* ══════════════════════════════════════════
   1. FORMULARIO DE COTIZACIÓN → EmailJS
══════════════════════════════════════════ */
function initQuoteForm() {
    var form = document.getElementById('quote-form');
    if (!form) return;

    var fachadaGroup = document.getElementById('fachada-group');
    var medidasInputs = document.getElementById('medidas-inputs');
    var visitaHint = document.getElementById('visita-hint');
    var medidasSi = document.getElementById('medidas-si');
    var medidasNo = document.getElementById('medidas-no');

    // Mostrar campo Fachada solo si aplica
    var tipoRadios = form.querySelectorAll('input[name="tipo"]');
    tipoRadios.forEach(function(radio) {
        radio.addEventListener('change', function() {
            var val = this.value;
            var showFachada = (val === 'Letras Corpóreas' || val === 'Bastidor');
            if (fachadaGroup) fachadaGroup.hidden = !showFachada;
        });
    });

    // Mostrar/ocultar campos de medidas
    if (medidasSi) {
        medidasSi.addEventListener('change', function() {
            if (medidasInputs) medidasInputs.hidden = false;
            if (visitaHint) visitaHint.hidden = true;
        });
    }
    if (medidasNo) {
        medidasNo.addEventListener('change', function() {
            if (medidasInputs) medidasInputs.hidden = true;
            if (visitaHint) visitaHint.hidden = false;
        });
    }

    // Submit → EmailJS
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        if (!validateForm(form)) return;

        var data = new FormData(form);
        var ancho = data.get('ancho') || 'No especificado';
        var alto = data.get('alto') || 'No especificado';
        var tieneMedidas = data.get('tiene_medidas');
        var medidas = (tieneMedidas === 'si') ? ancho + ' m × ' + alto + ' m' : 'Sin medidas';

        var templateParams = {
            nombre: data.get('nombre') || '-',
            email: data.get('email') || '-',
            telefono: data.get('telefono') || '-',
            tipo: data.get('tipo') || '-',
            fachada: data.get('fachada') || 'N/A',
            medidas: medidas,
            descripcion: data.get('descripcion') || 'Sin descripción.'
        };

        var submitBtn = form.querySelector('button[type="submit"]');
        var originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';

        if (typeof emailjs === 'undefined') {
            showSuccess(form, '⚠ Error: EmailJS no cargó.', true);
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            return;
        }

        emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
            .then(function(response) {
                showSuccess(form, '✓ ¡Cotización enviada! Te contactaremos pronto.');
                form.reset();
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            })
            .catch(function(error) {
                console.error('EmailJS Error:', error);
                showSuccess(form, '⚠ Error al enviar. Intenta de nuevo.', true);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            });
    });
}

/* ══════════════════════════════════════════
   2. SLOTS DE HORARIO
══════════════════════════════════════════ */
function initTimeSlots() {
    var container = document.getElementById('time-slots');
    if (!container) return;

    var slots = [];
    for (var h = 9; h < 18; h++) {
        slots.push(pad(h) + ':00');
        if (h < 17) slots.push(pad(h) + ':30');
    }

    var selected = null;
    slots.forEach(function(time) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'time-slot';
        btn.textContent = time;
        btn.dataset.time = time;

        btn.addEventListener('click', function() {
            if (selected) selected.classList.remove('is-selected');
            btn.classList.add('is-selected');
            selected = btn;
        });

        container.appendChild(btn);
    });
}

function pad(n) {
    return n < 10 ? '0' + n : '' + n;
}

/* ══════════════════════════════════════════
   3. FORMULARIO DE AGENDA → WhatsApp
══════════════════════════════════════════ */
function initScheduleForm() {
    var form = document.getElementById('schedule-form');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        if (!validateForm(form)) return;

        var nombre = document.getElementById('s-name') ? document.getElementById('s-name').value.trim() : '';
        var telefono = document.getElementById('s-phone') ? document.getElementById('s-phone').value.trim() : '';
        var fecha = document.getElementById('s-date') ? document.getElementById('s-date').value : '';
        var direccion = document.getElementById('s-address') ? document.getElementById('s-address').value.trim() : '';
        var notas = document.getElementById('s-notes') ? document.getElementById('s-notes').value.trim() : '';

        var selectedSlot = form.querySelector('.time-slot.is-selected');
        var hora = selectedSlot ? selectedSlot.dataset.time : '';

        if (!hora) {
            alert('Por favor selecciona una hora preferida.');
            return;
        }

        var fechaFormateada = fecha
            ? new Date(fecha + 'T12:00:00').toLocaleDateString('es-CL', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })
            : 'Por coordinar';

        var msg = [
            '¡Hola Birth Studio! 👋',
            '',
            'Quiero agendar una visita a mi local:',
            '',
            '📋 *Datos:*',
            '• Nombre: ' + nombre,
            '• Teléfono: ' + telefono,
            '• Fecha: ' + fechaFormateada,
            '• Hora: ' + hora,
            direccion ? '• Dirección: ' + direccion : null,
            notas ? '• Notas: ' + notas : null,
            '',
            'Quedo atento/a a su confirmación. ¡Gracias!'
        ].filter(function(l) { return l !== null; }).join('\n');

        var waUrl = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg);
        window.open(waUrl, '_blank');

        showSuccess(form, '¡WhatsApp abierto! Solo presiona "Enviar" en la app.');
    });
}

/* ══════════════════════════════════════════
   UTILIDADES
══════════════════════════════════════════ */
function validateForm(form) {
    var valid = true;
    var fields = form.querySelectorAll('[required]');

    fields.forEach(function(field) {
        field.classList.remove('is-invalid');

        if (!field.value.trim()) {
            field.classList.add('is-invalid');
            valid = false;
        }

        if (field.type === 'email' && field.value) {
            var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(field.value.trim())) {
                field.classList.add('is-invalid');
                valid = false;
            }
        }
    });

    if (!valid) {
        var firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) {
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstInvalid.focus();
        }
    }

    return valid;
}

function showSuccess(form, message, isError) {
    var existing = form.querySelector('.form-success');
    if (existing) existing.remove();

    var successDiv = document.createElement('div');
    successDiv.className = 'form-success';

    var bgColor = isError ? 'rgba(255,68,68,0.1)' : 'rgba(37,211,102,0.1)';
    var borderColor = isError ? 'rgba(255,68,68,0.4)' : 'rgba(37,211,102,0.4)';
    var textColor = isError ? '#ff4444' : '#4ade80';

    successDiv.style.cssText = [
        'background: ' + bgColor,
        'border: 1px solid ' + borderColor,
        'color: ' + textColor,
        'padding: 1rem',
        'border-radius: 6px',
        'font-size: 0.9rem',
        'text-align: center',
        'margin-top: 0.5rem'
    ].join(';');

    successDiv.textContent = message;
    form.appendChild(successDiv);

    setTimeout(function() {
        if (successDiv.parentNode) successDiv.remove();
    }, 6000);
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {
    // Espera a que EmailJS cargue antes de iniciar formularios
    waitForEmailJS(function() {
        initTimeSlots();
        initQuoteForm();
        initScheduleForm();
    });
});
