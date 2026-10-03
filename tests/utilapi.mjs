// Utilidades comunes de las pruebas de la API: repositorio en memoria, dependencias falsas y
// peticiones/respuestas de mentira. (No termina en .test.mjs, así que `npm test` no lo ejecuta.)
import { randomUUID } from 'node:crypto'
import { crearToken } from '../api/_lib/sesion.js'

export const SECRET = 'un-secreto-de-prueba-largo-123456'
export const PASS = 'clave-correcta'
export const PREFIJO = 'https://x.supabase.co/storage/v1/object/public/casos/'
export const AHORA = Date.parse('2026-03-01T10:00:00Z')
export const TOKEN_NOTICIAS = 'token-de-n8n-para-pruebas-1234567890'

export function repoMemoria() {
  const filas = new Map()
  const contactos = new Map()
  const noticias = new Map()
  return {
    filas,
    contactos,
    noticias,
    async listar() { return [...filas.values()] },
    async obtener(id) { return filas.get(id) ?? null },
    async crear(d) { const f = { id: randomUUID(), es_caso_exito: false, autoriza_publicar: false, es_demo: false, ...d }; filas.set(f.id, f); return f },
    async actualizar(id, d) { if (!filas.has(id)) return null; const f = { ...filas.get(id), ...d }; filas.set(id, f); return f },
    async borrar(id) { filas.delete(id) },
    async casosPublicos() { return [...filas.values()].filter((f) => f.es_caso_exito && f.autoriza_publicar) },
    async subirFoto({ extension }) { return `${PREFIJO}${randomUUID()}.${extension}` },
    // contactos (Fase 2)
    async crearContacto(d) { const c = { id: randomUUID(), creado_en: new Date(AHORA).toISOString(), estado: 'nuevo', nota_interna: null, ...d }; contactos.set(c.id, c); return c },
    async contarRecientes(tel, desdeISO) { return [...contactos.values()].filter((c) => c.telefono_norm === tel && c.creado_en >= desdeISO).length },
    async listarContactos() { return [...contactos.values()] },
    async obtenerContacto(id) { return contactos.get(id) ?? null },
    async actualizarContacto(id, d) { if (!contactos.has(id)) return null; const c = { ...contactos.get(id), ...d }; contactos.set(id, c); return c },
    async borrarContacto(id) { contactos.delete(id) },
    // noticias (Fase 4)
    async crearNoticia(d) {
      if ([...noticias.values()].some((n) => n.enlace === d.enlace)) return null
      const n = { id: randomUUID(), creado_en: new Date(AHORA).toISOString(), publicada_en: null, es_demo: false, ...d }
      noticias.set(n.id, n)
      return n
    },
    async noticiasPublicas() { return [...noticias.values()].filter((n) => n.estado === 'publicada') },
    async listarNoticias() { return [...noticias.values()] },
    async obtenerNoticia(id) { return noticias.get(id) ?? null },
    async actualizarNoticia(id, d) { if (!noticias.has(id)) return null; const n = { ...noticias.get(id), ...d }; noticias.set(id, n); return n },
    async borrarNoticia(id) { noticias.delete(id) },
  }
}

export function deps({ demo = false, adminOk = true, noticiasOk = true, repo = repoMemoria(), esperas = [] } = {}) {
  return {
    modoDemo: () => demo,
    adminListo: () => adminOk,
    noticiasListo: () => noticiasOk,
    tokenNoticias: () => TOKEN_NOTICIAS,
    n8nListo: () => noticiasOk,
    tokenN8n: () => TOKEN_NOTICIAS,
    secret: () => SECRET,
    password: () => PASS,
    fotoPrefijo: () => PREFIJO,
    repo,
    ahora: () => AHORA,
    esperar: async (ms) => { esperas.push(ms) },
  }
}

export function res() {
  const r = { headers: {}, codigo: 200, cuerpo: undefined }
  r.status = (c) => { r.codigo = c; return r }
  r.json = (o) => { r.cuerpo = o; return r }
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v }
  return r
}

export const req = (method, { body, cookie, query, json = true, token } = {}) => ({
  method, body, query,
  headers: {
    ...(cookie ? { cookie } : {}),
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...(json && body !== undefined ? { 'content-type': 'application/json' } : {}),
  },
})

export const cookieValida = () => `solera_admin=${encodeURIComponent(crearToken(SECRET, AHORA))}`

export async function llamar(handler, peticion) {
  const r = res()
  await handler(peticion, r)
  return r
}

export const alta = (extra = {}) => ({ cliente: 'Ana Ruiz', telefono: '600 11 22 33', fecha_instalacion: '2025-06-10', municipio: 'Úbeda', cultivo: 'olivar', hectareas: 12, potencia_kwp: 9, ...extra })
