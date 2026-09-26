// Rellena una tarjeta de caso a partir del molde <template> que genera build.mjs (vía {{@molde caso-card}}).
// Solo para el navegador (usa el DOM). La usan casos-remotos.js (web pública) y panel.js (vista previa).

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

export function crearTarjeta(molde, datos) {
  const caja = document.createElement('div')
  caja.innerHTML = molde.innerHTML.replace(/\{(\w+)\}/g, (m, k) => (k in datos ? esc(datos[k]) : m))
  // Bloques condicionales del molde: data-si="x" se queda si hay dato; data-no="x" si no lo hay.
  caja.querySelectorAll('[data-si]').forEach((n) => { if (!datos[n.dataset.si]) n.remove() })
  caja.querySelectorAll('[data-no]').forEach((n) => { if (datos[n.dataset.no]) n.remove() })
  return caja.firstElementChild
}
