// Casos de éxito de verdad: si la web está conectada a Supabase y hay casos publicados,
// sustituyen a los de la config (que se quedan como respaldo, también sin JavaScript).
// La tarjeta sale del MISMO trozo de plantilla (partials/caso-card.html) vía <template id="tpl-caso">.
import { datosTarjetaCaso } from './shared/logica.js'
import { crearTarjeta } from './shared/tarjeta.js'

const C = window.CASOS
const lista = document.getElementById('casos-lista')
const molde = document.getElementById('tpl-caso')

async function cargar() {
  const r = await fetch('/api/casos')
  if (!r.ok || !(r.headers.get('content-type') || '').includes('application/json')) return
  const { casos } = await r.json()
  if (!Array.isArray(casos) || !casos.length) return
  lista.replaceChildren(...casos.map((c) => crearTarjeta(molde, datosTarjetaCaso(c, { atribucion: C.atribucion }))))
}

if (lista && molde) cargar().catch(() => { /* sin API o sin red: se quedan los de la config */ })
