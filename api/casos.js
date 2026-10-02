// GET /api/casos → { casos: [...] }  (público)
// Solo salen los casos marcados como éxito Y autorizados por el cliente, y solo campos de la
// lista blanca `casoPublico`: nunca nombre ni teléfono. Sin Supabase: { demo: true, casos: [] }
// y la página se queda con los casos de ejemplo de la config.

import { casoPublico } from '../src/shared/logica.js'
import { depsReales } from './_lib/deps.js'

export function crear(d) {
  return async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' })
    if (d.modoDemo()) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ demo: true, casos: [] })
    }
    try {
      const filas = await d.repo.casosPublicos()
      // Sin caché: quitar la autorización o despublicar tiene que verse en la web en el acto.
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ casos: filas.map(casoPublico) })
    } catch (e) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(500).json({ error: e.message })
    }
  }
}

export default crear(depsReales)
