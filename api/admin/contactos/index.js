// GET /api/admin/contactos → { contactos: [...] }  (los que han llegado por la web, más nuevos primero)

import { responder, requerirAdmin } from '../../_lib/http.js'
import { depsReales } from '../../_lib/deps.js'

export function crear(d) {
  return async function handler(req, res) {
    if (d.modoDemo()) return responder(res, 200, { demo: true, contactos: [] })
    if (!d.adminListo()) return responder(res, 503, { error: 'Falta configurar ADMIN_PASSWORD y ADMIN_SECRET.' })
    if (!requerirAdmin(req, res, { secret: d.secret(), ahora: d.ahora })) return
    if (req.method !== 'GET') return responder(res, 405, { error: 'Método no permitido' })
    try {
      return responder(res, 200, { contactos: await d.repo.listarContactos() })
    } catch (e) {
      return responder(res, 500, { error: e.message })
    }
  }
}

export default crear(depsReales)
