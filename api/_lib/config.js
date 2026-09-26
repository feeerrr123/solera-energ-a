// Lee las variables de entorno UNA vez y dice con claridad qué falta.
// Sin Supabase, las rutas de /api caen a "modo demo" (el panel guarda en el navegador y
// la web pública usa los casos de ejemplo de la config) en vez de romperse.

export const cfg = {
  supabaseUrl: (process.env.SUPABASE_URL || '').replace(/\/+$/, ''),
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  adminSecret: process.env.ADMIN_SECRET || '',
  bucket: 'casos',
}

export const supabaseListo = () => !!(cfg.supabaseUrl && cfg.supabaseServiceKey)
export const adminListo = () => !!(cfg.adminPassword && cfg.adminSecret.length >= 16)

// Modo demo = falta Supabase: no hay dónde guardar nada real.
export const modoDemo = () => !supabaseListo()

// Las fotos de los casos solo pueden ser de NUESTRO bucket público.
export const fotoPrefijo = () => `${cfg.supabaseUrl}/storage/v1/object/public/${cfg.bucket}/`
