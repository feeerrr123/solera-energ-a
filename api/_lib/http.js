// Utilidades comunes de los endpoints.

import { leerCookie, verificarToken, contrasenaCorrecta } from './sesion.js'

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

// "Authorization: Bearer <clave>" → la clave (o '' si no viene).
export function tokenBearer(req) {
  const h = String((req.headers && req.headers.authorization) || '')
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : ''
}

// ¿La petición la hace n8n con su clave? Comparación en tiempo constante.
export const esN8n = (req, d) => d.n8nListo() && contrasenaCorrecta(tokenBearer(req), d.tokenN8n())

export const esUUID = (s) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
