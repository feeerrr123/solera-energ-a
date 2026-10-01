// Noticias de verdad: si la web está conectada a Supabase y hay noticias publicadas desde el panel,
// sustituyen a las de ejemplo de la config. La tarjeta sale del MISMO parcial (partials/noticia-card.html)
// vía <template id="tpl-noticia">.
import { datosTarjetaNoticia } from './shared/logica.js'
import { crearTarjeta } from './shared/tarjeta.js'

const lista = document.getElementById('noticias-lista')
const vacio = document.getElementById('noticias-vacio')
const molde = document.getElementById('tpl-noticia')

async function cargar() {
  const r = await fetch('/api/noticias')
  if (!r.ok || !(r.headers.get('content-type') || '').includes('application/json')) return
  const { noticias } = await r.json()
  if (!Array.isArray(noticias) || !noticias.length) return
  lista.replaceChildren(...noticias.map((n) => crearTarjeta(molde, datosTarjetaNoticia(n))))
  vacio.hidden = true
}

if (lista && molde) cargar().catch(() => { /* sin API o sin red: se quedan las de la config */ })
