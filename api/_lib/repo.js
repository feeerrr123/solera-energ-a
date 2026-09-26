// Acceso a Supabase. Cliente con la clave de SERVICIO: solo vive aquí, en el servidor. Salta las
// políticas de RLS a propósito — la tabla `instalaciones` no tiene ninguna política pública, así
// que /api es la única puerta de entrada (y ahí se comprueba la sesión y se valida todo).

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { cfg } from './config.js'

let cliente = null
const db = () => {
  if (!cliente) cliente = createClient(cfg.supabaseUrl, cfg.supabaseServiceKey, { auth: { persistSession: false } })
  return cliente
}

const fallo = (contexto, error) => {
  console.error(`[repo:${contexto}]`, error.message)
  throw new Error(`No se pudo ${contexto}.`)
}

// Lo que necesita "casos públicos": solo filas publicadas Y autorizadas por el cliente.
const CAMPOS_PUBLICOS = 'id,cultivo,municipio,hectareas,potencia_kwp,gasto_anual_antes,ahorro_anual,amortizacion_anios,foto_url,frase_cliente,es_demo,fecha_instalacion'

export const repoSupabase = {
  async listar() {
    const { data, error } = await db().from('instalaciones').select('*').order('fecha_instalacion', { ascending: false })
    if (error) fallo('listar las instalaciones', error)
    return data
  },
  async obtener(id) {
    const { data, error } = await db().from('instalaciones').select('*').eq('id', id).maybeSingle()
    if (error) fallo('leer la instalación', error)
    return data
  },
  async crear(datos) {
    const { data, error } = await db().from('instalaciones').insert(datos).select().single()
    if (error) fallo('guardar la instalación', error)
    return data
  },
  async actualizar(id, datos) {
    const { data, error } = await db().from('instalaciones').update(datos).eq('id', id).select().maybeSingle()
    if (error) fallo('actualizar la instalación', error)
    return data
  },
  async borrar(id) {
    const { error } = await db().from('instalaciones').delete().eq('id', id)
    if (error) fallo('borrar la instalación', error)
  },
  async casosPublicos() {
    const { data, error } = await db()
      .from('instalaciones')
      .select(CAMPOS_PUBLICOS)
      .eq('es_caso_exito', true)
      .eq('autoriza_publicar', true)
      .order('es_demo', { ascending: true }) // primero los reales, luego los de ejemplo
      .order('fecha_instalacion', { ascending: false })
      .limit(12)
    if (error) fallo('leer los casos', error)
    return data
  },
  // ── contactos (Fase 2) ──
  async crearContacto(datos) {
    const { error } = await db().from('contactos').insert(datos)
    if (error) fallo('guardar el contacto', error)
  },
  // Cuántos contactos con ese teléfono (ya normalizado) han llegado desde `desdeISO` (freno anti-spam).
  async contarRecientes(telefonoNorm, desdeISO) {
    const { count, error } = await db().from('contactos').select('id', { count: 'exact', head: true }).eq('telefono_norm', telefonoNorm).gte('creado_en', desdeISO)
    if (error) fallo('comprobar los contactos recientes', error)
    return count || 0
  },
  async listarContactos() {
    const { data, error } = await db().from('contactos').select('*').order('creado_en', { ascending: false }).limit(500)
    if (error) fallo('listar los contactos', error)
    return data
  },
  async actualizarContacto(id, datos) {
    const { data, error } = await db().from('contactos').update(datos).eq('id', id).select().maybeSingle()
    if (error) fallo('actualizar el contacto', error)
    return data
  },
  async borrarContacto(id) {
    const { error } = await db().from('contactos').delete().eq('id', id)
    if (error) fallo('borrar el contacto', error)
  },
  async subirFoto({ buffer, mime, extension }) {
    const nombre = `${randomUUID()}.${extension}`
    const { error } = await db().storage.from(cfg.bucket).upload(nombre, buffer, { contentType: mime, upsert: false })
    if (error) fallo('subir la foto', error)
    return `${cfg.supabaseUrl}/storage/v1/object/public/${cfg.bucket}/${nombre}`
  },
}
