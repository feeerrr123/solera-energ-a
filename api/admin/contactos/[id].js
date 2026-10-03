// PATCH  /api/admin/contactos/:id → { estado?: nuevo|contactado|presupuestado|cerrado|descartado, nota_interna? }  (panel)
// PATCH  /api/admin/contactos/:id → { marcar: 'ficha'|'recordatorio'|'aviso' }  (n8n, con su clave: SOLO eso)
// DELETE /api/admin/contactos/:id → borrar (panel; por ejemplo, si el contacto pide que borremos sus datos)

import { responder, esJSON, requerirAdmin, esUUID, tokenBearer, esN8n } from '../../_lib/http.js'
import { validarCambioContacto, MARCAS_SEGUIMIENTO } from '../../../src/shared/logica.js'
import { depsReales } from '../../_lib/deps.js'

export function crear(d) {
  return async function handler(req, res) {
    const id = req.query && req.query.id

    // n8n: solo puede apuntar que ya ha mandado algo. Ni estados, ni notas, ni borrar.
    if (tokenBearer(req)) {
      if (d.modoDemo()) return responder(res, 200, { demo: true })
      if (!esN8n(req, d)) {
        await d.esperar(600)
        return responder(res, 401, { error: 'Clave no válida.' })
      }
      if (req.method !== 'PATCH') return responder(res, 405, { error: 'Método no permitido' })
      if (!esJSON(req)) return responder(res, 415, { error: 'Formato no válido.' })
      if (!esUUID(id)) return responder(res, 400, { error: 'Identificador no válido.' })
      const campo = MARCAS_SEGUIMIENTO[req.body && req.body.marcar]
      if (!campo) return responder(res, 400, { error: 'Marca no válida.' })
      try {
        const fila = await d.repo.actualizarContacto(id, { [campo]: new Date(d.ahora()).toISOString() })
        if (!fila) return responder(res, 404, { error: 'No existe ese contacto.' })
        return responder(res, 200, { ok: true })
      } catch (e) {
        return responder(res, 500, { error: e.message })
      }
    }

    if (d.modoDemo()) return responder(res, 200, { demo: true })
    if (!d.adminListo()) return responder(res, 503, { error: 'Falta configurar ADMIN_PASSWORD y ADMIN_SECRET.' })
    if (!requerirAdmin(req, res, { secret: d.secret(), ahora: d.ahora })) return
    if (!esUUID(id)) return responder(res, 400, { error: 'Identificador no válido.' })

    try {
      if (req.method === 'DELETE') {
        await d.repo.borrarContacto(id)
        return responder(res, 200, { ok: true })
      }
      if (req.method === 'PATCH') {
        if (!esJSON(req)) return responder(res, 415, { error: 'Formato no válido.' })
        const actual = await d.repo.obtenerContacto(id)
        if (!actual) return responder(res, 404, { error: 'No existe ese contacto.' })
        const v = validarCambioContacto(req.body || {}, actual, { ahoraISO: new Date(d.ahora()).toISOString() })
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
