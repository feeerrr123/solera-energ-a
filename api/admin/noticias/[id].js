// PATCH  /api/admin/noticias/:id → { titulo?, resumen?, estado?: 'borrador'|'publicada'|'descartada' }
//        Publicar exige resumen y que no lleve importes (validarCambioNoticia).
// DELETE /api/admin/noticias/:id → borrar

import { responder, esJSON, requerirAdmin, esUUID } from '../../_lib/http.js'
import { validarCambioNoticia } from '../../../src/shared/logica.js'
import { depsReales } from '../../_lib/deps.js'

export function crear(d) {
  return async function handler(req, res) {
    if (d.modoDemo()) return responder(res, 200, { demo: true })
    if (!d.adminListo()) return responder(res, 503, { error: 'Falta configurar ADMIN_PASSWORD y ADMIN_SECRET.' })
    if (!requerirAdmin(req, res, { secret: d.secret(), ahora: d.ahora })) return

    const id = req.query && req.query.id
    if (!esUUID(id)) return responder(res, 400, { error: 'Identificador no válido.' })

    try {
      if (req.method === 'DELETE') {
        await d.repo.borrarNoticia(id)
        return responder(res, 200, { ok: true })
      }
      if (req.method === 'PATCH') {
        if (!esJSON(req)) return responder(res, 415, { error: 'Formato no válido.' })
        const actual = await d.repo.obtenerNoticia(id)
        if (!actual) return responder(res, 404, { error: 'No existe esa noticia.' })
        const v = validarCambioNoticia(req.body || {}, actual, { ahoraISO: new Date(d.ahora()).toISOString() })
        if (!v.ok) return responder(res, 400, { error: Object.values(v.errores)[0] || 'Revisa los datos.', campos: v.errores })
        return responder(res, 200, { noticia: await d.repo.actualizarNoticia(id, v.datos) })
      }
      return responder(res, 405, { error: 'Método no permitido' })
    } catch (e) {
      return responder(res, 500, { error: e.message })
    }
  }
}

export default crear(depsReales)
