// Sesión del panel: cookie firmada con HMAC. Sin librerías, solo node:crypto.
// La cookie es HttpOnly (el JavaScript de la página no puede leerla), Secure y
// SameSite=Strict (otros sitios no pueden mandarla). Caduca a las 8 horas.

import { createHmac, createHash, timingSafeEqual } from 'node:crypto'

export const NOMBRE_COOKIE = 'solera_admin'
export const DURACION_SEG = 8 * 60 * 60

const firmar = (secret, exp) => createHmac('sha256', secret).update(`admin:${exp}`).digest('hex')

export function crearToken(secret, ahoraMs = Date.now(), duracionSeg = DURACION_SEG) {
  const exp = Math.floor(ahoraMs / 1000) + duracionSeg
  return `${exp}.${firmar(secret, exp)}`
}

export function verificarToken(token, secret, ahoraMs = Date.now()) {
  if (typeof token !== 'string' || !secret) return false
  const [exp, firma] = token.split('.')
  if (!/^\d+$/.test(exp || '') || !/^[0-9a-f]{64}$/.test(firma || '')) return false
  if (Number(exp) < Math.floor(ahoraMs / 1000)) return false
  return timingSafeEqual(Buffer.from(firma, 'hex'), Buffer.from(firmar(secret, exp), 'hex'))
}

// Compara contraseñas (y la clave de n8n) en tiempo constante (se comparan sus hash para que no importe la longitud).
export function contrasenaCorrecta(dada, esperada) {
  if (typeof dada !== 'string' || !esperada) return false
  const h = (s) => createHash('sha256').update(s).digest()
  return timingSafeEqual(h(dada), h(esperada))
}

export function leerCookie(req, nombre = NOMBRE_COOKIE) {
  const c = String((req.headers && req.headers.cookie) || '')
  for (const parte of c.split(';')) {
    const i = parte.indexOf('=')
    if (i > 0 && parte.slice(0, i).trim() === nombre) return decodeURIComponent(parte.slice(i + 1).trim())
  }
  return null
}

export const cookieSesion = (token, maxAge = DURACION_SEG) =>
  `${NOMBRE_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`

export const cookieBorrada = () => `${NOMBRE_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
