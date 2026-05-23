/**
 * form.js — Birth Studio Publicidad
 * ──────────────────────────────────────────────
 * 1. Formulario de cotización → mailto:
 * 2. Mostrar/ocultar campos según selección
 * 3. Slots de horario generados dinámicamente
 * 4. Formulario de agenda → abre WhatsApp con
 *    mensaje pre-formateado
 */

var WA_NUMBER = '56977247545';
var MAIL_TO   = 'bstudio.designe@gmail.com';

/* ══════════════════════════════════════════
   1. FORMULARIO DE COTIZACIÓN → EmailJS
══════════════════════════════════════════ */
function initQuoteForm() {
    var form          = document.getElementById('quote-form');
    if (!form) return;

    var fachadaGroup  = document.getElementById('fachada-group');
    var medidasInputs = document.getElementById('medidas-inputs');
    var visitaHint    = document.getElementById('visita-hint');
    var medidasSi     = document.getElementById('medidas-si');
    var medidasNo     = document.getElementById('medidas-no');

    /* ── Mostrar campo Fachada solo si aplica ── */
    var tipoRadios = form.querySelectorAll('input[name="tipo"]');

    tipoRadios.forEach(function(radio) {
        radio.addEventListener('change', function() {
            var val = this.value;
            var showFachada = (val === 'Letras Corpóreas' || val === 'Bastidor');

            if (fachadaGroup) {
                fachadaGroup.hidden = !showFachada;
            }
        });
    });

    /* ── Mostrar/ocultar campos de medidas ── */
    if (medidasSi) {
        medidasSi.addEventListener('change', function() {
            if (medidasInputs) medidasInputs.hidden = false;
            if (visitaHint)    visitaHint.hidden    = true;
        });
    }

    if (medidasNo) {
        medidasNo.addEventListener('change', function() {
            if (medidasInputs) medidasInputs.hidden = true;
            if (visitaHint)    visitaHint.hidden    = false;
        });
    }

    /* ── Submit → EmailJS ── */
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        if (!validateForm(form)) {
            showFormError(form, 'Por favor completa todos los campos obligatorios (*).');
            return;
        }

        var btn = form.querySelector('[type="submit"]');
        if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }

        var data = new FormData(form);

        var ancho = data.get('ancho') || 'No especificado';
        var alto  = data.get('alto')  || 'No especificado';
        var tieneMedidas = data.get('tiene_medidas');
        var medidas = (tieneMedidas === 'si')
            ? ancho + ' m × ' + alto + ' m'
            : 'Sin medidas (solicitará visita en terreno)';

        var params = {
            nombre: data.get('nombre') || '',
            email: data.get('email') || '',
            telefono: data.get('telefono') || '',
            tipo: data.get('tipo') || 'No especificado',
            fachada: data.get('fachada') || 'N/A',
            medidas: medidas,
            descripcion: data.get('descripcion') || 'Sin descripción'
        };

        function resetBtn() {
            if (btn) { btn.disabled = false; btn.innerHTML = 'Enviar solicitud <span class="btn__arrow">→</span>'; }
        }

        try {
            emailjs.send('service_qtcrtcr', 'template_3zwrb8h', params)
                .then(function() {
                    resetBtn();
                    showSuccess(form, '¡Cotización enviada! Te contactaremos pronto.');
                    form.reset();
                })
                .catch(function(error) {
                    resetBtn();
                    showFormError(form, 'Error al enviar. Intenta de nuevo o escríbenos por WhatsApp.');
                    console.error('EmailJS error:', error);
                });
        } catch (err) {
            resetBtn();
            showFormError(form, 'Error de configuración. Contáctanos por WhatsApp.');
            console.error('EmailJS excepción:', err);
        }
    });
}


/* ══════════════════════════════════════════
   2. SLOTS DE HORARIO
   Genera botones de hora (8:00 – 18:00)
══════════════════════════════════════════ */
function initTimeSlots() {
    var container = document.getElementById('time-slots');
    if (!container) return;

    // Horarios disponibles: de 9:00 a 17:30, cada 30 min
    var slots = [];
    for (var h = 9; h < 18; h++) {
        slots.push(pad(h) + ':00');
        if (h < 17) slots.push(pad(h) + ':30');
    }

    var selected = null;

    slots.forEach(function(time) {
        var btn = document.createElement('button');
        btn.type       = 'button';
        btn.className  = 'time-slot';
        btn.textContent = time;
        btn.dataset.time = time;

        btn.addEventListener('click', function() {
            // Deselecciona anterior
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

        var nombre    = document.getElementById('s-name')    ? document.getElementById('s-name').value.trim()    : '';
        var telefono  = document.getElementById('s-phone')   ? document.getElementById('s-phone').value.trim()   : '';
        var fecha     = document.getElementById('s-date')    ? document.getElementById('s-date').value           : '';
        var direccion = document.getElementById('s-address') ? document.getElementById('s-address').value.trim() : '';
        var notas     = document.getElementById('s-notes')   ? document.getElementById('s-notes').value.trim()   : '';

        // Hora seleccionada (botón .is-selected)
        var selectedSlot = form.querySelector('.time-slot.is-selected');
        var hora = selectedSlot ? selectedSlot.dataset.time : '';

        if (!hora) {
            alert('Por favor selecciona una hora preferida.');
            return;
        }

        // Formatea la fecha
        var fechaFormateada = fecha
            ? new Date(fecha + 'T12:00:00').toLocaleDateString('es-CL', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })
            : 'Por coordinar';

        // Mensaje para WhatsApp
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
            notas     ? '• Notas: ' + notas         : null,
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

/**
 * Validación básica: campos required vacíos
 * Retorna true si es válido
 */
function validateForm(form) {
    var valid  = true;
    var fields = form.querySelectorAll('[required]');

    fields.forEach(function(field) {
        field.classList.remove('is-invalid');

        if (!field.value.trim()) {
            field.classList.add('is-invalid');
            valid = false;
        }

        // Validación extra para email
        if (field.type === 'email' && field.value) {
            var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(field.value.trim())) {
                field.classList.add('is-invalid');
                valid = false;
            }
        }
    });

    if (!valid) {
        // Scroll al primer campo inválido
        var firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) {
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstInvalid.focus();
        }
    }

    return valid;
}

/**
 * Muestra mensaje de error en la parte superior del form
 */
function showFormError(form, message) {
    var existing = form.querySelector('.form-error');
    if (existing) existing.remove();

    var div = document.createElement('div');
    div.className = 'form-error';
    div.style.cssText = [
        'background: rgba(255,68,68,0.1)',
        'border: 1px solid rgba(255,68,68,0.5)',
        'color: #ff6b6b',
        'padding: 1rem',
        'border-radius: 6px',
        'font-size: 0.9rem',
        'text-align: center',
        'margin-bottom: 1rem'
    ].join(';');
    div.textContent = message;

    form.insertBefore(div, form.firstChild);
    div.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(function() { if (div.parentNode) div.remove(); }, 6000);
}

/**
 * Muestra mensaje de éxito temporal dentro del form
 */
function showSuccess(form, message) {
    // Evita duplicar el mensaje
    var existing = form.querySelector('.form-success');
    if (existing) existing.remove();

    var successDiv = document.createElement('div');
    successDiv.className = 'form-success';
    successDiv.style.cssText = [
        'background: rgba(37,211,102,0.1)',
        'border: 1px solid rgba(37,211,102,0.4)',
        'color: #4ade80',
        'padding: 1rem',
        'border-radius: 6px',
        'font-size: 0.9rem',
        'text-align: center',
        'margin-top: 0.5rem'
    ].join(';');

    successDiv.textContent = '✓ ' + message;
    form.appendChild(successDiv);

    // Auto-eliminar tras 6 segundos
    setTimeout(function() {
        if (successDiv.parentNode) successDiv.remove();
    }, 6000);
}


/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {
    initTimeSlots();
    initQuoteForm();
    initScheduleForm();
});