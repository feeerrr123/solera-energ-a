    // ---- Widget diésel / sol ---- (datos: window.WIDGET y window.DEMO, vienen de la config)
    (function () {
      const W = window.WIDGET;
      const bd = document.getElementById('tg-diesel');
      const bs = document.getElementById('tg-sol');
      if (!W || !bd || !bs) return;
      const cifra = document.getElementById('tg-cifra');
      const nota = document.getElementById('tg-nota');
      const bar = document.getElementById('tg-bar');
      const iconD = document.getElementById('tg-icon-diesel');
      const iconS = document.getElementById('tg-icon-sol');
      const etiqueta = window.DEMO ? ' <span class="text-ochre-deep">' + W.etiquetaEjemplo + '</span>' : '';
      function set(mode) {
        const d = W[mode];
        cifra.textContent = d.valor;
        nota.innerHTML = d.nota + etiqueta;
        bar.style.width = Math.round((d.valor / W.diesel.valor) * 100) + '%';
        iconD.classList.toggle('hidden', mode !== 'diesel');
        iconS.classList.toggle('hidden', mode !== 'sol');
        bd.setAttribute('aria-pressed', String(mode === 'diesel'));
        bs.setAttribute('aria-pressed', String(mode === 'sol'));
      }
      bd.addEventListener('click', () => set('diesel'));
      bs.addEventListener('click', () => set('sol'));
    })();
