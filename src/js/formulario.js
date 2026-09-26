    // ---- Formulario de contacto → /api/contactos ----
    import { iniciarLead, mostrarExito } from './shared/lead.js';
    (function () {
      const form = document.getElementById('form');
      const ok = document.querySelector('[data-lead-ok]');
      if (!form || !ok) return;
      const L = window.LEAD;
      iniciarLead(form, {
        origen: 'contacto', L,
        datos: () => ({ tipo: form.elements.tipo.value }),
        extra: () => ({ municipio: form.elements.municipio.value, mensaje: form.elements.mensaje.value }),
        alExito: (respuesta, payload) => { form.hidden = true; mostrarExito(ok, respuesta, payload, L); },
      });
    })();
