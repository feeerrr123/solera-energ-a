    // ---- Comprobador de ayudas (orientativo: nunca promete una ayuda ni un importe) ----
    import { ayudasPosibles } from './shared/logica.js';
    import { iniciarLead, mostrarExito } from './shared/lead.js';
    (function () {
      const A = window.AYUDAS, L = window.LEAD;
      const $ = (id) => document.getElementById(id);
      const form = $('form-ayudas'), res = $('resultado'), lead = $('form');
      const LISTAS = { titular: 'titulares', provincia: 'provincias', cultivo: 'cultivos', concesion: 'concesiones', instalacion: 'instalaciones' };
      const CAMPOS = Object.keys(LISTAS);
      const textoDe = (campo, id) => {
        const it = A.formulario[LISTAS[campo]].find((x) => x.id === id);
        return it ? it.texto : id;
      };
      let respuestas = {};

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        let falta = null;
        for (const c of CAMPOS) {
          const vacio = !form.elements[c].value;
          form.querySelector('[data-error="' + c + '"]').textContent = vacio ? A.formulario.falta : '';
          if (vacio && !falta) falta = form.elements[c];
        }
        if (falta) { falta.focus(); return; }
        respuestas = {};
        for (const c of CAMPOS) respuestas[c] = form.elements[c].value;

        const lineas = ayudasPosibles(respuestas, A.lineas);
        const bloque = lineas.length ? A.resultado.conLineas : A.resultado.sinLineas;
        $('res-titulo').textContent = bloque.titulo;
        $('res-texto').textContent = bloque.texto;
        $('res-concesion').hidden = respuestas.concesion !== 'no';
        $('res-lineas').hidden = lineas.length === 0;
        const ul = $('res-lista');
        ul.textContent = '';
        for (const l of lineas) {
          const li = document.createElement('li');
          li.className = 'py-3';
          const n = document.createElement('p');
          n.className = 'text-[15px] font-semibold text-ink';
          n.textContent = l.nombre;
          li.appendChild(n);
          if (l.nota) {
            const t = document.createElement('p');
            t.className = 'mt-0.5 text-[13px] leading-relaxed text-ink-soft';
            t.textContent = l.nota;
            li.appendChild(t);
          }
          ul.appendChild(li);
        }
        form.hidden = true;
        res.hidden = false;
        res.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      $('rehacer').addEventListener('click', () => {
        res.hidden = true;
        form.hidden = false;
        form.querySelector('select').focus();
      });

      iniciarLead(lead, {
        origen: 'ayudas', L,
        datos: () => Object.fromEntries(CAMPOS.map((c) => [c, textoDe(c, respuestas[c])])),
        alExito: (respuesta, payload) => { lead.hidden = true; mostrarExito(document.querySelector('[data-lead-ok]'), respuesta, payload, L); },
      });
    })();
