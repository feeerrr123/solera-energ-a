// GET  /api/noticias → { noticias: [...] }  (PÚBLICO: solo las publicadas, por lista blanca)
// POST /api/noticias → { ok, nueva }        (SOLO n8n, con "Authorization: Bearer <NOTICIAS_TOKEN>")
//
// n8n entrega aquí cada anuncio del BOJA que encuentra, con el resumen de Gemini. Entra SIEMPRE como
// borrador: nadie ve nada en la web hasta que se revisa y se publica en el panel. Si el mismo enlace
// llega dos veces, no se duplica. Solo se aceptan enlaces de boletines oficiales (DOMINIOS_NOTICIA).
// Sin Supabase (modo demo): el GET devuelve la lista vacía y la página se queda con los ejemplos de la
// config; el POST valida pero no guarda nada.

import { responder, esJSON } from './_lib/http.js'
import { contrasenaCorrecta } from './_lib/sesion.js'
import { validarNoticiaEntrante, noticiaPublica } from '../src/shared/logica.js'
import { depsReales } from './_lib/deps.js'

const tokenDe = (req) => {
  const h = String((req.headers && req.headers.authorization) || '')
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : ''
}

export function crear(d) {
  return async function handler(req, res) {
    if (req.method === 'GET') {
      if (d.modoDemo()) return responder(res, 200, { demo: true, noticias: [] })
      try {
        const filas = await d.repo.noticiasPublicas()
        // Sin caché: lo que se quita en el panel tiene que desaparecer de la web en el acto.
        return responder(res, 200, { noticias: filas.map(noticiaPublica) })
      } catch (e) {
        return responder(res, 500, { error: e.message })
      }
    }

    if (req.method !== 'POST') return responder(res, 405, { error: 'Método no permitido' })
    if (!esJSON(req)) return responder(res, 415, { error: 'Formato no válido.' })

    if (!d.modoDemo()) {
      if (!d.noticiasListo()) return responder(res, 503, { error: 'Falta configurar NOTICIAS_TOKEN (mínimo 24 caracteres) en Vercel.' })
      if (!contrasenaCorrecta(tokenDe(req), d.tokenNoticias())) {
        await d.esperar(600) // frena el ensayo-y-error
        return responder(res, 401, { error: 'Clave no válida.' })
      }
    }

    const v = validarNoticiaEntrante(req.body)
    if (!v.ok) return responder(res, 400, { error: 'Revisa los datos.', campos: v.errores })
    if (d.modoDemo()) return responder(res, 200, { ok: true, demo: true })

    try {
      const fila = await d.repo.crearNoticia(v.datos)
      return responder(res, fila ? 201 : 200, { ok: true, nueva: !!fila })
    } catch (e) {
      return responder(res, 500, { error: e.message })
    }
  }
}

export default crear(depsReales)
