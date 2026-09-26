// GET  /api/admin/instalaciones → { instalaciones: [...] }
// POST /api/admin/instalaciones → alta de una instalación

import { responder, esJSON, requerirAdmin } from '../../_lib/http.js'
import { validarInstalacion, hoyISO } from '../../../src/shared/logica.js'
import { depsReales } from '../../_lib/deps.js'

export function crear(d) {
  return async function handler(req, res) {
    if (d.modoDemo()) return responder(res, 200, { demo: true, instalaciones: [] })
    if (!d.adminListo()) return responder(res, 503, { error: 'Falta configurar ADMIN_PASSWORD y ADMIN_SECRET.' })
    if (!requerirAdmin(req, res, { secret: d.secret(), ahora: d.ahora })) return

    try {
      if (req.method === 'GET') {
        return responder(res, 200, { instalaciones: await d.repo.listar() })
      }

      if (req.method === 'POST') {
        if (!esJSON(req)) return responder(res, 415, { error: 'Formato no válido.' })
        const v = validarInstalacion(req.body || {}, { hoy: hoyISO(new Date(d.ahora())) })
        if (!v.ok) return responder(res, 400, { error: 'Revisa los datos.', campos: v.errores })
        return responder(res, 201, { instalacion: await d.repo.crear(v.datos) })
      }

      return responder(res, 405, { error: 'Método no permitido' })
    } catch (e) {
      return responder(res, 500, { error: e.message })
    }
  }
}

export default crear(depsReales)
