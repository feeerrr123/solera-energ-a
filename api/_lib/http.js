// Utilidades comunes de los endpoints.

import { leerCookie, verificarToken } from './sesion.js'

export function responder(res, estado, cuerpo) {
  res.setHeader('Cache-Control', 'no-store')
  return res.status(estado).json(cuerpo)
}

// Las peticiones que cambian datos tienen que venir como JSON: un formulario de otra web
// no puede mandar application/json sin permiso del navegador (y además la cookie es SameSite=Strict).
export function esJSON(req) {
  return String((req.headers && req.headers['content-type']) || '').toLowerCase().startsWith('application/json')
}

// Devuelve true si hay sesión válida; si no, ya ha respondido 401 y devuelve false.
export function requerirAdmin(req, res, { secret, ahora = Date.now }) {
  if (verificarToken(leerCookie(req), secret, ahora())) return true
  responder(res, 401, { error: 'No has iniciado sesión.' })
  return false
}

export const esUUID = (s) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
