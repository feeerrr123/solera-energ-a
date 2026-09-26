// GET    /api/admin/login  → { autenticado, demo }   (¿hay sesión?)
// POST   /api/admin/login  → { password }            (iniciar sesión)
// DELETE /api/admin/login                            (cerrar sesión)
//
// Modo demo (falta Supabase): no hay nada real que proteger — el panel guarda en el navegador —,
// así que se entra sin contraseña y se avisa. Con Supabase pero sin ADMIN_PASSWORD/ADMIN_SECRET:
// error claro, NUNCA se deja el panel abierto sobre datos reales.

import { crearToken, contrasenaCorrecta, leerCookie, verificarToken, cookieSesion, cookieBorrada } from '../_lib/sesion.js'
import { responder, esJSON } from '../_lib/http.js'
import { depsReales } from '../_lib/deps.js'

export function crear(d) {
  return async function handler(req, res) {
    if (d.modoDemo()) {
      if (req.method === 'GET') return responder(res, 200, { autenticado: true, demo: true })
      if (req.method === 'POST' || req.method === 'DELETE') return responder(res, 200, { ok: true, demo: true })
      return responder(res, 405, { error: 'Método no permitido' })
    }

    if (!d.adminListo()) {
      return responder(res, 503, {
        error: 'Falta configurar ADMIN_PASSWORD y ADMIN_SECRET (mínimo 16 caracteres) en Vercel.',
      })
    }

    if (req.method === 'GET') {
      const ok = verificarToken(leerCookie(req), d.secret(), d.ahora())
      return responder(res, 200, { autenticado: ok, demo: false })
    }

    if (req.method === 'DELETE') {
      res.setHeader('Set-Cookie', cookieBorrada())
      return responder(res, 200, { ok: true })
    }

    if (req.method === 'POST') {
      if (!esJSON(req)) return responder(res, 415, { error: 'Formato no válido.' })
      const dada = req.body && req.body.password
      if (!contrasenaCorrecta(dada, d.password())) {
        await d.esperar(600) // frena el ensayo-y-error
        return responder(res, 401, { error: 'Contraseña incorrecta.' })
      }
      res.setHeader('Set-Cookie', cookieSesion(crearToken(d.secret(), d.ahora())))
      return responder(res, 200, { ok: true })
    }

    return responder(res, 405, { error: 'Método no permitido' })
  }
}

export default crear(depsReales)
