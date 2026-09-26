    // ---- Pre-dimensionado orientativo: potencia y RANGO de inversión; el desglose, a cambio del contacto ----
    import { dimensionar, miles, decimal, rellenar } from './shared/logica.js';
    import { iniciarLead, mostrarExito } from './shared/lead.js';
    (function () {
      const D = window.DIM, L = window.LEAD, T = D.resultado;
      const $ = (id) => document.getElementById(id);
      const form = $('form-dim'), res = $('resultado'), lead = $('form');
      const modo = () => form.elements.modoCaudal.value;
      let r = null, entrada = null;

      const alternarModo = () => {
        $('bloque-conocido').hidden = modo() !== 'conocido';
        $('bloque-estimar').hidden = modo() !== 'estimar';
      };
      for (const radio of form.elements.modoCaudal) radio.addEventListener('change', alternarModo);

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        for (const el of form.querySelectorAll('[data-error]')) el.textContent = '';
        const f = form.elements;
        entrada = { modoCaudal: modo(), alturaM: f.alturaM.value, caudalM3h: f.caudalM3h.value, hectareas: f.hectareas.value, cultivo: f.cultivo.value, horasRiego: f.horasRiego.value };
        r = dimensionar(entrada, D.parametros);
        if (!r.ok) {
          for (const [campo, msg] of Object.entries(r.errores)) {
            const el = form.querySelector('[data-error="' + campo + '"]');
            if (el) el.textContent = msg.charAt(0).toUpperCase() + msg.slice(1);
          }
          const primero = form.querySelector('[data-error]:not(:empty)');
          if (primero) primero.closest('label').querySelector('input, select').focus();
          return;
        }
        $('r-kwp').textContent = decimal(r.kwp);
        $('r-precio').textContent = rellenar(T.precioRango, { min: miles(r.precioMin), max: miles(r.precioMax) });
        $('r-horas').hidden = !r.avisoHoras;
        $('detalle-bloqueado').hidden = false;
        $('detalle').hidden = true;
        lead.hidden = false;
        try { sessionStorage.setItem('solera.dimensionado', JSON.stringify({ kwp: r.kwp, precioMin: r.precioMin, precioMax: r.precioMax, caudal: r.caudal, altura: r.altura })); } catch (_) {}
        form.hidden = true;
        res.hidden = false;
        res.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      $('rehacer').addEventListener('click', () => {
        res.hidden = true;
        form.hidden = false;
        form.elements.alturaM.focus();
      });

      const pintarDetalle = () => {
        const d = T.detalle;
        const filas = [
          [r.caudalEstimado ? d.caudalEstimado : d.caudal, decimal(r.caudal) + ' ' + d.m3h],
          [d.altura, decimal(r.altura) + ' ' + d.m],
          [d.potHidraulica, decimal(r.potHidraulicaKw, 2) +' ' + d.kw],
          [d.potBomba, decimal(r.potBombaKw) + ' ' + d.kw],
          [d.paneles, String(r.paneles)],
        ];
        const dl = $('detalle-lista');
        dl.textContent = '';
        for (const [k, v] of filas) {
          const fila = document.createElement('div');
          fila.className = 'flex flex-wrap items-baseline justify-between gap-x-4 py-2.5';
          const dt = document.createElement('dt'); dt.className = 'text-ink-soft'; dt.textContent = k;
          const dd = document.createElement('dd'); dd.className = 'font-mono text-ink'; dd.textContent = v;
          fila.append(dt, dd);
          dl.appendChild(fila);
        }
      };

      iniciarLead(lead, {
        origen: 'dimensionado', L,
        datos: () => {
          const d = { alturaM: r.altura, horasRiego: r.horas, kwp: r.kwp, precioMin: r.precioMin, precioMax: r.precioMax };
          if (entrada.modoCaudal === 'estimar') {
            d.hectareas = Number(String(entrada.hectareas).replace(',', '.'));
            const c = D.parametros.cultivos.find((x) => x.id === entrada.cultivo);
            d.cultivo = c ? c.texto : entrada.cultivo;
          } else {
            d.caudalM3h = r.caudal;
          }
          return d;
        },
        alExito: (respuesta, payload) => {
          $('detalle-bloqueado').hidden = true;
          pintarDetalle();
          $('detalle').hidden = false;
          mostrarExito(document.querySelector('[data-lead-ok]'), respuesta, payload, L);
        },
      });
    })();
