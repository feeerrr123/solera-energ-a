// POST /api/contactos  (PÚBLICO)  → { ok: true }
// Lo llaman los formularios de la web (ayudas, dimensionado, calculadora, contacto). Como
// cualquiera puede llamarlo, se defiende solo: valida todo, exige el consentimiento, ignora a los
// robots (campo trampa `web`) sin avisarles, y frena a quien mande muchas solicitudes con el mismo
// teléfono. Sin Supabase: { ok: true, demo: true } y no se guarda nada.

import { responder, esJSON } from './_lib/http.js'
import { validarContacto, normalizarTelefono } from '../src/shared/logica.js'
import { depsReales } from './_lib/deps.js'

const MAX_POR_HORA = 3

export function crear(d) {
  return async function handler(req, res) {
    if (req.method !== 'POST') return responder(res, 405, { error: 'Método no permitido' })
    if (!esJSON(req)) return responder(res, 415, { error: 'Formato no válido.' })

    const v = validarContacto(req.body)
    if (v.spam) return responder(res, 200, { ok: true }) // el robot cree que ha funcionado
    if (!v.ok) return responder(res, 400, { error: 'Revisa los datos.', campos: v.errores })
    if (d.modoDemo()) return responder(res, 200, { ok: true, demo: true })

    try {
      const telefonoNorm = normalizarTelefono(v.datos.telefono)
      const desde = new Date(d.ahora() - 60 * 60 * 1000).toISOString()
      if ((await d.repo.contarRecientes(telefonoNorm, desde)) >= MAX_POR_HORA) {
        return responder(res, 429, { error: 'Ya hemos recibido varias solicitudes con este teléfono. Te llamamos en cuanto podamos.' })
      }
      await d.repo.crearContacto({ ...v.datos, telefono_norm: telefonoNorm })
      return responder(res, 201, { ok: true })
    } catch (e) {
      return responder(res, 500, { error: 'No se pudo guardar tu solicitud. Prueba otra vez o escríbenos por WhatsApp.' })
    }
  }
}

export default crear(depsReales)
