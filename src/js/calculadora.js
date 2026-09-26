    // ---- Calculadora de ahorro v2 ---- (parámetros y textos: window.CALC, vienen de la config; fórmula: shared/logica.js)
    import { calcularAhorro, miles, decimal, rellenar } from './shared/logica.js';
    import { iniciarLead, mostrarExito } from './shared/lead.js';
    (function () {
      const C = window.CALC, P = C.parametros, I = C.informe, L = window.LEAD;
      const $ = (id) => document.getElementById(id);
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const state = {
        fuente: P.fuentes[0].id, gastoGasoil: P.gasto.valor, gastoRed: P.gastoRed.valor,
        tipo: P.tipos[0].id, captacion: P.captaciones[0].id, kwpFijo: 0,
      };
      let dim = null; // pre-dimensionado guardado por /dimensionado en esta pestaña
      try { dim = JSON.parse(sessionStorage.getItem('solera.dimensionado')); } catch (_) {}
      if (!dim || !(dim.kwp > 0)) dim = null;
      let r = null;

      function tween(el, to, render) {
        const from = parseFloat(el.dataset.v || String(to));
        el.dataset.v = String(to);
        const gen = (el._gen = (el._gen || 0) + 1);
        const finalize = () => { if (el._gen === gen) el.textContent = render(to); };
        // red de seguridad: el valor exacto siempre acaba en pantalla aunque rAF
        // esté ralentizado (pestaña en segundo plano, dispositivo lento). No quitar.
        clearTimeout(el._ft);
        el._ft = setTimeout(finalize, 460);
        if (reduce || Math.abs(to - from) < 0.5) { finalize(); return; }
        const t0 = performance.now(), dur = 420;
        (function step(now) {
          if (el._gen !== gen) return;
          const p = Math.min((now - t0) / dur, 1);
          if (p >= 1) { finalize(); return; }
          el.textContent = render(from + (to - from) * (1 - Math.pow(1 - p, 3)));
          requestAnimationFrame(step);
        })(performance.now());
      }

      /* ── gráfico: dinero acumulado (ahorro − inversión) año a año ── */
      const NS = 'http://www.w3.org/2000/svg';
      function nodo(tag, attrs, texto) {
        const e = document.createElementNS(NS, tag);
        for (const k in attrs) e.setAttribute(k, attrs[k]);
        if (texto !== undefined) e.textContent = texto;
        return e;
      }
      function dibujar() {
        const G = I.grafico, W = 640, H = 260, m = { l: 62, r: 18, t: 16, b: 34 };
        const serie = r.serie, n = serie.length - 1;
        const min = Math.min(0, ...serie), max = Math.max(0, ...serie);
        const x = (i) => m.l + (i / n) * (W - m.l - m.r);
        const y = (v) => m.t + (1 - (v - min) / (max - min || 1)) * (H - m.t - m.b);
        const svg = nodo('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'h-auto w-full', role: 'img' });
        const desc = r.amort === null
          ? rellenar(G.descripcionNoRecupera, { anios: n })
          : rellenar(G.descripcion, { anios: n, amort: Math.ceil(r.amort) });
        svg.setAttribute('aria-label', desc);
        // zona por debajo de cero (aún sin recuperar) y línea del cero
        svg.appendChild(nodo('rect', { x: m.l, y: y(0), width: W - m.l - m.r, height: Math.max(0, H - m.b - y(0)), fill: '#a5611a', opacity: '0.08' }));
        svg.appendChild(nodo('line', { x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), stroke: '#575c42', 'stroke-width': 1, 'stroke-dasharray': '4 4' }));
        svg.appendChild(nodo('text', { x: m.l - 8, y: y(0) + 4, 'text-anchor': 'end', class: 'font-mono', 'font-size': 11, fill: '#575c42' }, G.ceroEtiqueta));
        // extremos del eje vertical
        for (const v of [min, max]) {
          if (v === 0) continue;
          svg.appendChild(nodo('text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'font-mono', 'font-size': 11, fill: '#575c42' }, miles(Math.round(v / 100) * 100) + ' €'));
        }
        // eje horizontal
        for (let i = 0; i <= n; i += 5) {
          svg.appendChild(nodo('line', { x1: x(i), x2: x(i), y1: H - m.b, y2: H - m.b + 4, stroke: '#b7b191' }));
          svg.appendChild(nodo('text', { x: x(i), y: H - m.b + 18, 'text-anchor': 'middle', class: 'font-mono', 'font-size': 11, fill: '#575c42' }, String(i)));
        }
        svg.appendChild(nodo('text', { x: W - m.r, y: H - 4, 'text-anchor': 'end', class: 'font-mono', 'font-size': 11, fill: '#575c42' }, G.ejeAnios));
        svg.appendChild(nodo('polyline', { points: serie.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' '), fill: 'none', stroke: '#a5611a', 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
        if (r.amort !== null) svg.appendChild(nodo('circle', { cx: x(r.amort), cy: y(0), r: 5, fill: '#2e3a26' }));
        const cont = $('grafico');
        cont.textContent = '';
        cont.appendChild(svg);
        $('grafico-pie').textContent = r.amort === null ? rellenar(C.resultados.noRecupera, { anios: n }) : rellenar(G.recupera, { anio: Math.ceil(r.amort) });
      }

      function tabla() {
        const dl = $('tabla');
        dl.textContent = '';
        const cab = document.createElement('div');
        cab.className = 'flex justify-between py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft';
        cab.innerHTML = '<span></span><span></span>';
        cab.children[0].textContent = I.tabla.anio;
        cab.children[1].textContent = I.tabla.acumulado + ' (' + I.tabla.unidad + ')';
        dl.appendChild(cab);
        for (const y of I.tabla.anios) {
          if (y >= r.serie.length) continue;
          const fila = document.createElement('div');
          fila.className = 'flex justify-between py-2.5';
          const a = document.createElement('dt'); a.className = 'text-ink-soft'; a.textContent = String(y);
          const v = r.serie[y];
          const b = document.createElement('dd'); b.className = 'font-mono ' + (v < 0 ? 'text-ochre-deep' : 'text-ink');
          b.textContent = (v < 0 ? '−' : '') + miles(Math.abs(Math.round(v / 100) * 100));
          fila.append(a, b);
          dl.appendChild(fila);
        }
      }

      function pintarInforme() {
        $('i-acum20').textContent = (r.acum20 < 0 ? '−' : '') + miles(Math.abs(r.acum20));
        $('i-litros').textContent = miles(r.litros);
        $('i-litros-bloque').hidden = state.fuente === 'red';
        $('i-co2').textContent = miles(r.co2);
        dibujar();
        tabla();
      }

      /* ── resultados ── */
      function render() {
        r = calcularAhorro(state, P);
        const fmt1 = (v) => decimal(v, 1);
        tween($('r-ahorro'), r.ahorro, (v) => miles(v));
        tween($('r-pct'), r.pct, (v) => String(Math.round(v)));
        if (r.amort === null) { $('r-amort').textContent = rellenar(C.resultados.noRecupera, { anios: P.anios }); $('r-amort').dataset.v = ''; }
        else tween($('r-amort'), r.amort, fmt1);
        tween($('r-acum10'), r.acum10, (v) => (v < 0 ? '−' : '') + miles(Math.abs(v)));
        tween($('r-kwp'), r.kWp, fmt1);
        tween($('r-paneles'), r.paneles, (v) => String(Math.round(v)));
        tween($('r-inv'), r.inversion, (v) => miles(v));
        $('r-bar').style.transform = 'scaleX(' + (r.pct / 100).toFixed(3) + ')';
        if (!$('informe-abierto').hidden) pintarInforme();
      }

      /* ── controles ── */
      function pintarFuente() {
        $('bloque-gasoil').hidden = state.fuente === 'red';
        $('bloque-red').hidden = state.fuente === 'gasoil';
      }
      function slider(id, salida, clave) {
        const el = $(id);
        el.addEventListener('input', () => { state[clave] = +el.value; $(salida).textContent = miles(state[clave]); render(); });
      }
      slider('gasto', 'gasto-out', 'gastoGasoil');
      slider('gasto-red', 'gasto-red-out', 'gastoRed');

      function wireGroup(id, key) {
        const grp = $(id);
        grp.querySelectorAll('button').forEach((b) => {
          b.addEventListener('click', () => {
            grp.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', 'false'));
            b.setAttribute('aria-pressed', 'true');
            state[key] = b.dataset[key];
            if (key === 'fuente') pintarFuente();
            render();
          });
        });
      }
      wireGroup('grp-fuente', 'fuente');
      wireGroup('grp-tipo', 'tipo');
      wireGroup('grp-captacion', 'captacion');

      // Si viene del pre-dimensionado, se ofrece usar esos kWp (no se aplican sin que la persona lo pida)
      if (dim) {
        const F = C.formulario.dimensionado;
        const pintarBanner = () => {
          $('banner-dim').hidden = false;
          $('banner-dim-texto').textContent = rellenar(F.texto, { kwp: decimal(dim.kwp, 1) });
          $('banner-dim-btn').textContent = state.kwpFijo ? F.quitar : F.usar;
        };
        $('banner-dim-btn').addEventListener('click', () => { state.kwpFijo = state.kwpFijo ? 0 : dim.kwp; pintarBanner(); render(); });
        pintarBanner();
      }

      /* ── informe completo a cambio del contacto ── */
      iniciarLead($('form'), {
        origen: 'calculadora', L,
        datos: () => {
          const nombreDe = (lista, id) => (lista.find((x) => x.id === id) || {}).texto || id;
          const gastoMes = (state.fuente === 'red' ? 0 : state.gastoGasoil) + (state.fuente === 'gasoil' ? 0 : state.gastoRed);
          return {
            fuente: nombreDe(P.fuentes, state.fuente), gastoMes, tipo: nombreDe(P.tipos, state.tipo), captacion: nombreDe(P.captaciones, state.captacion),
            kwp: r.kWp, inversion: r.inversion, ahorro: r.ahorro,
            amortizacion: r.amort === null ? rellenar(C.resultados.noRecupera, { anios: P.anios }) : Math.round(r.amort * 10) / 10,
            acum20: r.acum20,
          };
        },
        alExito: (respuesta, payload) => {
          $('informe-cerrado').hidden = true;
          $('informe-abierto').hidden = false;
          pintarInforme();
          mostrarExito(document.querySelector('[data-lead-ok]'), respuesta, payload, L);
        },
      });

      pintarFuente();
      render();
    })();
