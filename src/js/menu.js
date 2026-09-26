    // ---- Menú móvil ----
    (function () {
      const btn = document.getElementById('menu-btn');
      const panel = document.getElementById('menu-panel');
      if (!btn || !panel) return;
      const set = (open) => { panel.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
      btn.addEventListener('click', () => set(panel.hidden));
      panel.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => set(false)));
    })();
