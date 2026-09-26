// POST /api/admin/foto  { dataUrl: "data:image/jpeg;base64,…" }  → { url }
// El panel reduce la foto a ~1200 px antes de mandarla; aquí se comprueba de verdad que es una
// imagen (no nos fiamos de lo que diga el navegador) y que pesa poco.

import { responder, esJSON, requerirAdmin } from '../_lib/http.js'
import { depsReales } from '../_lib/deps.js'

const MAX_BYTES = 1.5 * 1024 * 1024
const TIPOS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

// Los primeros bytes de un archivo dicen qué es, sea cual sea su extensión.
function esImagen(buf, mime) {
  if (mime === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  if (mime === 'image/png') return buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (mime === 'image/webp') return buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP'
  return false
}

export function crear(d) {
  return async function handler(req, res) {
    if (d.modoDemo()) return responder(res, 200, { demo: true })
    if (!d.adminListo()) return responder(res, 503, { error: 'Falta configurar ADMIN_PASSWORD y ADMIN_SECRET.' })
    if (!requerirAdmin(req, res, { secret: d.secret(), ahora: d.ahora })) return
    if (req.method !== 'POST') return responder(res, 405, { error: 'Método no permitido' })
    if (!esJSON(req)) return responder(res, 415, { error: 'Formato no válido.' })

    const m = String((req.body && req.body.dataUrl) || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/)
    if (!m) return responder(res, 400, { error: 'La foto tiene que ser JPG, PNG o WebP.' })
    const buffer = Buffer.from(m[2], 'base64')
    if (buffer.length > MAX_BYTES) return responder(res, 413, { error: 'La foto pesa demasiado (máximo 1,5 MB).' })
    if (!esImagen(buffer, m[1])) return responder(res, 400, { error: 'El archivo no es una imagen válida.' })

    try {
      const url = await d.repo.subirFoto({ buffer, mime: m[1], extension: TIPOS[m[1]] })
      return responder(res, 201, { url })
    } catch (e) {
      return responder(res, 500, { error: e.message })
    }
  }
}

export default crear(depsReales)
