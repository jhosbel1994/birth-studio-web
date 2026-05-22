/**
 * form.js — Birth Studio Publicidad
 * ──────────────────────────────────────────────
 * 1. Formulario de cotización → mailto:
 * 2. Mostrar/ocultar campos según selección
 * 3. Slots de horario generados dinámicamente
 * 4. Formulario de agenda → abre WhatsApp con
 *    mensaje pre-formateado
 */

var WA_NUMBER = '56977247545';  // Sin + ni espacios
var MAIL_TO   = 'birth.publicidad@gmail.com'; // ← Cambia por tu correo real


/* ══════════════════════════════════════════
   1. FORMULARIO DE COTIZACIÓN
══════════════════════════════════════════ */
function initQuoteForm() {
    var form          = document.getElementById('quote-form');
    if (!form) return;

    var fachadaGroup  = document.getElementById('fachada-group');
    var medidasInputs = document.getElementById('medidas-inputs');
    var visitaHint    = document.getElementById('visita-hint');
    var tipoSelect    = document.getElementById('q-tipo');
    var medidasSelect = document.getElementById('q-medidas');

    /* ── Mostrar campo Fachada solo si aplica ── */
    if (tipoSelect) {
        tipoSelect.addEventListener('change', function() {
            var val = this.value;
            var showFachada = (val === 'Letras Corpóreas' || val === 'Bastidor');

            if (fachadaGroup) fachadaGroup.hidden = !showFachada;
        });
    }

    /* ── Mostrar/ocultar campos de medidas ── */
    if (medidasSelect) {
        medidasSelect.addEventListener('change', function() {
            var v = this.value;
            if (medidasInputs) medidasInputs.hidden = (v !== 'si');
            if (visitaHint)    visitaHint.hidden    = (v !== 'no');
        });
    }

    /* ── Submit → mailto: ── */
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        if (!validateForm(form)) return;

        var data = new FormData(form);

        // Construye el cuerpo del correo
        var ancho = data.get('ancho') || 'No especificado';
        var alto  = data.get('alto')  || 'No especificado';

        var tieneMedidas = data.get('tiene_medidas');
        var medidas = (tieneMedidas === 'si')
            ? ancho + ' m × ' + alto + ' m'
            : 'Sin medidas (solicitará visita en terreno)';

        var body = [
            'Nueva cotización — Birth Studio Publicidad',
            '════════════════════════════════',
            '',
            'DATOS DE CONTACTO',
            '─────────────────',
            'Nombre:    ' + (data.get('nombre')    || '-'),
            'Correo:    ' + (data.get('email')     || '-'),
            'Teléfono:  ' + (data.get('telefono')  || '-'),
            '',
            'DETALLE DEL PROYECTO',
            '─────────────────',
            'Tipo:      ' + (data.get('tipo')      || '-'),
            'Fachada:   ' + (data.get('fachada')   || 'N/A'),
            'Medidas:   ' + medidas,
            '',
            'DESCRIPCIÓN',
            '─────────────────',
            (data.get('descripcion') || 'Sin descripción adicional.'),
            '',
            '════════════════════════════════',
            'Enviado desde birthstudio.cl'
        ].join('\n');

        var subject = encodeURIComponent('Cotización: ' + (data.get('tipo') || 'Servicio') + ' — ' + (data.get('nombre') || ''));
        var bodyEnc = encodeURIComponent(body);

        window.location.href = 'mailto:' + MAIL_TO + '?subject=' + subject + '&body=' + bodyEnc;

        showSuccess(form, '¡Solicitud lista! Se abrirá tu cliente de correo.');
    });
}


/* ══════════════════════════════════════════
   2. (Horario ahora es un <select> en el HTML,
   ya no se generan botones por JS)
══════════════════════════════════════════ */


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

        // Hora seleccionada (select)
        var horaSelect = document.getElementById('s-time');
        var hora = horaSelect ? horaSelect.value : '';

        if (!hora) {
            alert('Por favor selecciona una hora preferida.');
            return;
        }

        // No se agendan visitas los fines de semana
        if (fecha) {
            var dia = new Date(fecha + 'T12:00:00').getDay(); // 0 dom, 6 sáb
            if (dia === 0 || dia === 6) {
                alert('Los fines de semana no agendamos visitas. Elige un día de lunes a viernes.');
                return;
            }
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
    initQuoteForm();
    initScheduleForm();
});
