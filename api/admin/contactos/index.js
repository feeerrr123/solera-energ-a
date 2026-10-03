// GET /api/admin/contactos → { contactos: [...] }  (panel, con sesión: los que han llegado por la web)
// GET /api/admin/contactos → { fichas, recordatorios, estancados }  (n8n, con "Authorization: Bearer <N8N_TOKEN>")
//     Lo que la automatización tiene pendiente (seguimientoPendiente), con los mensajes ya montados
//     (mensajesContacto + textos de `seguimiento` en la config). n8n solo manda y luego marca con PATCH.

import { responder, requerirAdmin, tokenBearer, esN8n } from '../../_lib/http.js'
import { seguimientoPendiente, mensajesContacto } from '../../../src/shared/logica.js'
import config from '../../../config/site.config.js'
import { depsReales } from '../../_lib/deps.js'

export function crear(d, { S = config.seguimiento, L = config.contactos } = {}) {
  return async function handler(req, res) {
    if (req.method !== 'GET') return responder(res, 405, { error: 'Método no permitido' })

    // n8n: entra con su clave, no con la sesión del panel.
    if (tokenBearer(req)) {
      if (d.modoDemo()) return responder(res, 200, { demo: true, fichas: [], recordatorios: [], estancados: [] })
      if (!esN8n(req, d)) {
        await d.esperar(600) // frena el ensayo-y-error
        return responder(res, 401, { error: 'Clave no válida.' })
      }
      try {
        const ahora = d.ahora()
        const p = seguimientoPendiente(await d.repo.listarContactos(), ahora, S)
        const m = (c) => mensajesContacto(c, S, L, ahora)
        return responder(res, 200, {
          fichas: p.fichas.map((c) => { const x = m(c); return { id: c.id, ficha: x.ficha, emailCliente: x.emailCliente } }),
          recordatorios: p.recordatorios.map((c) => ({ id: c.id, recordatorio: m(c).recordatorio })),
          estancados: p.estancados.map((c) => ({ id: c.id, estancado: m(c).estancado })),
        })
      } catch (e) {
        return responder(res, 500, { error: e.message })
      }
    }

    if (d.modoDemo()) return responder(res, 200, { demo: true, contactos: [] })
    if (!d.adminListo()) return responder(res, 503, { error: 'Falta configurar ADMIN_PASSWORD y ADMIN_SECRET.' })
    if (!requerirAdmin(req, res, { secret: d.secret(), ahora: d.ahora })) return
    try {
      return responder(res, 200, { contactos: await d.repo.listarContactos() })
    } catch (e) {
      return responder(res, 500, { error: e.message })
    }
  }
}

export default crear(depsReales)
