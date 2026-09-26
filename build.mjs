// Genera dist/ (HTML estático) a partir de src/ + config/site.config.js.
// Sin dependencias: solo Node. Uso:
//   node build.mjs            → construye una vez
//   node build.mjs --watch    → reconstruye al guardar y sirve dist/ en :4177
// La sintaxis de las plantillas está explicada en tools/motor.mjs.

import { writeFileSync, mkdirSync, rmSync, cpSync, readFileSync, existsSync, statSync, watch } from 'node:fs'
import { join, dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createServer } from 'node:http'
import { crearMotor } from './tools/motor.mjs'

const RAIZ = dirname(fileURLToPath(import.meta.url))
const SRC = join(RAIZ, 'src')
const DIST = join(RAIZ, 'dist')
const PUBLIC = join(RAIZ, 'public')
const SHARED = join(SRC, 'shared') // módulos que también importa api/ (una sola copia)
const CONFIG = join(RAIZ, 'config', 'site.config.js')

const motor = crearMotor(SRC)

/* ───────────── construcción ───────────── */

function contextoPagina(config, id) {
  const pag = config.paginas[id]
  const e = config.empresa
  const href = (pid) => config.paginas[pid].archivo
  return {
    ...config,
    // Si una página no define su título/descripción para redes sociales, usa los normales
    pagina: { ogTitulo: pag.titulo, ogDescripcion: pag.descripcion, ...pag },
    paginaId: id,
    canonical: `${config.sitio.url}/${pag.ruta ?? pag.archivo}`,
    nav: config.nav.map((n) => ({ texto: n.texto, href: href(n.pagina), activo: n.pagina === id })),
    pieEnlaces: config.pie.enlaces.map((pid) => ({
      texto: config.nav.find((n) => n.pagina === pid).texto,
      href: href(pid),
    })),
    ctaHref: href(config.cabecera.cta.pagina),
    ctaMovilHref: pag.ctaMovilHref ?? href(config.cabecera.cta.pagina),
    whatsappHref: `https://wa.me/${e.whatsappNumero}?text=${encodeURIComponent(e.whatsappMensaje)}`,
    telHref: `tel:${e.telefonoHref}`,
    mailHref: `mailto:${e.email}`,
  }
}

async function construir() {
  motor.limpiar()
  const config = (await import(pathToFileURL(CONFIG).href + `?v=${Date.now()}`)).default
  rmSync(DIST, { recursive: true, force: true })
  mkdirSync(DIST, { recursive: true })
  if (existsSync(PUBLIC)) cpSync(PUBLIC, DIST, { recursive: true })
  if (existsSync(SHARED)) cpSync(SHARED, join(DIST, 'shared'), { recursive: true })

  const generadas = []
  for (const [id, pag] of Object.entries(config.paginas)) {
    const html = motor.renderizar(join('pages', pag.archivo), contextoPagina(config, id))
    writeFileSync(join(DIST, pag.archivo), html)
    generadas.push(`${pag.archivo} (${(html.length / 1024).toFixed(1)} KB)`)
  }
  console.log(`✔ dist/ → ${generadas.join(' · ')}`)
}

/* ───────────── servidor de desarrollo (solo --watch) ───────────── */

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
}

function servir(puerto) {
  createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (p.endsWith('/')) p += 'index.html'
    const f = resolve(join(DIST, p))
    if (!f.startsWith(DIST + sep) || !existsSync(f) || statSync(f).isDirectory()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      return res.end('404 — no existe')
    }
    res.writeHead(200, { 'content-type': TIPOS[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' })
    res.end(readFileSync(f))
  }).listen(puerto, () => console.log(`  sirviendo dist/ en http://localhost:${puerto}  (Ctrl+C para parar)`))
}

/* ───────────── arranque ───────────── */

const vigilar = process.argv.includes('--watch')
try {
  await construir()
} catch (err) {
  console.error(`✖ ${err.message}`)
  if (!vigilar) process.exit(1)
}

if (vigilar) {
  let t
  const reconstruir = () => {
    clearTimeout(t)
    t = setTimeout(() => construir().catch((err) => console.error(`✖ ${err.message}`)), 150)
  }
  for (const d of [SRC, join(RAIZ, 'config'), PUBLIC]) if (existsSync(d)) watch(d, { recursive: true }, reconstruir)
  servir(4177)
}
