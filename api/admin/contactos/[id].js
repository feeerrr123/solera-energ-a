// PATCH  /api/admin/contactos/:id → { estado?: 'nuevo'|'contactado'|'descartado', nota_interna? }
// DELETE /api/admin/contactos/:id → borrar (por ejemplo, si el contacto pide que borremos sus datos)

import { responder, esJSON, requerirAdmin, esUUID } from '../../_lib/http.js'
import { validarCambioContacto } from '../../../src/shared/logica.js'
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
        await d.repo.borrarContacto(id)
        return responder(res, 200, { ok: true })
      }
      if (req.method === 'PATCH') {
        if (!esJSON(req)) return responder(res, 415, { error: 'Formato no válido.' })
        const v = validarCambioContacto(req.body || {})
        if (!v.ok) return responder(res, 400, { error: 'Revisa los datos.', campos: v.errores })
        const fila = await d.repo.actualizarContacto(id, v.datos)
        if (!fila) return responder(res, 404, { error: 'No existe ese contacto.' })
        return responder(res, 200, { contacto: fila })
      }
      return responder(res, 405, { error: 'Método no permitido' })
    } catch (e) {
      return responder(res, 500, { error: e.message })
    }
  }
}

export default crear(depsReales)
