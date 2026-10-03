import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import config from '../config/site.config.js'
import { seguimientoPendiente, mensajesContacto, ESTADOS_CONTACTO, MARCAS_SEGUIMIENTO } from '../src/shared/logica.js'
import { crear as crearLista } from '../api/admin/contactos/index.js'
import { crear as crearUno } from '../api/admin/contactos/[id].js'
import { deps, repoMemoria, req, cookieValida, llamar, TOKEN_NOTICIAS } from './utilapi.mjs'

const S = config.seguimiento
const L = config.contactos
const DIA = 86400000
// Martes 6/10/2026 a las 11:00 en Madrid (09:00 UTC): dentro del horario de avisos
const AHORA = Date.parse('2026-10-06T09:00:00Z')
const hace = (dias, desde = AHORA) => new Date(desde - dias * DIA).toISOString()

// Para meterlo en el repositorio en memoria (él pone su propio id)
const sinId = (c) => { const { id, ...resto } = c; return resto }
const contacto = (extra = {}) => ({
  id: randomUUID(), creado_en: hace(0.01), origen: 'dimensionado', nombre: 'Ana Ruiz', telefono: '600 11 22 33', email: 'ana@correo.es',
  municipio: 'Úbeda', mensaje: null, estado: 'nuevo', estado_en: hace(0.01), ficha_enviada_en: null, presupuestado_en: null,
  recordatorio_cliente_en: null, aviso_instalador_en: null,
  datos: { alturaM: 60, caudalM3h: 10, kwp: 4.5, precioMin: 4900, precioMax: 7200 }, ...extra,
})

/* ── qué tiene pendiente la automatización ── */

test('fichas: solo contactos recientes (≤ 2 días) sin ficha enviada', () => {
  const nuevo = contacto()
  const yaEnviada = contacto({ ficha_enviada_en: hace(0) })
  const viejo = contacto({ creado_en: hace(5) }) // la primera vez que se enciende no manda fichas viejas
  const p = seguimientoPendiente([nuevo, yaEnviada, viejo], AHORA, S)
  assert.deepEqual(p.fichas.map((c) => c.id), [nuevo.id])
})

test('recordatorio al cliente: presupuestado hace ≥ 3 días, con email, una sola vez', () => {
  const toca = contacto({ estado: 'presupuestado', presupuestado_en: hace(3), estado_en: hace(3), ficha_enviada_en: hace(9), creado_en: hace(9) })
  const pronto = contacto({ estado: 'presupuestado', presupuestado_en: hace(2), estado_en: hace(2), ficha_enviada_en: hace(9) })
  const sinEmail = { ...toca, id: randomUUID(), email: null }
  const yaRecordado = { ...toca, id: randomUUID(), recordatorio_cliente_en: hace(1) }
  const cerrado = { ...toca, id: randomUUID(), estado: 'cerrado' } // contestó y se cerró: no se le escribe
  const p = seguimientoPendiente([toca, pronto, sinEmail, yaRecordado, cerrado], AHORA, S)
  assert.deepEqual(p.recordatorios.map((c) => c.id), [toca.id])
})

test('aviso al instalador: abierto y sin moverse ≥ 7 días, una vez por cada parón', () => {
  const parado = contacto({ estado: 'contactado', estado_en: hace(8), ficha_enviada_en: hace(10), creado_en: hace(10) })
  const reciente = contacto({ estado: 'contactado', estado_en: hace(3), ficha_enviada_en: hace(10) })
  const avisado = { ...parado, id: randomUUID(), aviso_instalador_en: hace(1) }
  // avisado ANTES de su último cambio de estado → es un parón nuevo y vuelve a avisar
  const parónNuevo = { ...parado, id: randomUUID(), aviso_instalador_en: hace(9) }
  const cerrado = { ...parado, id: randomUUID(), estado: 'cerrado' }
  const descartado = { ...parado, id: randomUUID(), estado: 'descartado' }
  const p = seguimientoPendiente([parado, reciente, avisado, parónNuevo, cerrado, descartado], AHORA, S)
  assert.deepEqual(p.estancados.map((c) => c.id).sort(), [parado.id, parónNuevo.id].sort())
})

test('fuera del horario (de noche) no hay recordatorios ni avisos; las fichas sí', () => {
  const noche = Date.parse('2026-10-06T01:00:00Z') // 3:00 en Madrid
  const c1 = contacto({ creado_en: hace(0.01, noche) })
  const c2 = contacto({ estado: 'presupuestado', presupuestado_en: hace(4, noche), estado_en: hace(8, noche), ficha_enviada_en: hace(9, noche) })
  const p = seguimientoPendiente([c1, c2], noche, S)
  assert.equal(p.fichas.length, 1)
  assert.equal(p.recordatorios.length + p.estancados.length, 0)
})

/* ── mensajes ── */

test('mensajes: ficha con las cifras, email orientativo al cliente, y nada sin email', () => {
  const m = mensajesContacto(contacto(), S, L, AHORA)
  assert.match(m.ficha.telegram, /4,5 kWp/)
  assert.match(m.ficha.telegram, /4\.900–7\.200 €/)
  assert.match(m.ficha.telegram, /wa\.me\/34600112233/)
  assert.equal(m.emailCliente.para, 'ana@correo.es')
  assert.match(m.emailCliente.html, /orientativa/)
  // la estimación nunca se presenta como presupuesto: solo aparece en "no un presupuesto"
  assert.equal((m.emailCliente.html.match(/presupuesto/gi) || []).length, 1)
  assert.match(m.emailCliente.html, /no un presupuesto/)
  assert.ok(!/Precio m[ií]n|desde \(€\)/.test(m.ficha.telegram)) // las cifras no se repiten en el resumen
  const sin = mensajesContacto(contacto({ email: null }), S, L, AHORA)
  assert.equal(sin.emailCliente, null)
  assert.equal(sin.recordatorio, null)
})

test('mensajes: lo que escribe la persona se escapa (Telegram y email van en HTML)', () => {
  const m = mensajesContacto(contacto({ nombre: '<a href="http://malo">Pepe</a>', municipio: '<b>x</b>' }), S, L, AHORA)
  for (const html of [m.ficha.telegram, m.ficha.html, m.emailCliente.html, m.estancado.telegram]) {
    assert.ok(!html.includes('<a href="http://malo">'), html)
    assert.ok(!html.includes('<b>x</b>'), html)
  }
  // Telegram solo admite unas pocas etiquetas: no se cuela ninguna otra
  const etiquetas = [...m.ficha.telegram.matchAll(/<\/?([a-z]+)/g)].map((x) => x[1])
  assert.ok(etiquetas.every((t) => ['b', 'i', 'a'].includes(t)), etiquetas.join(','))
})

test('config: hay etiqueta para cada estado y las plantillas solo usan variables conocidas', () => {
  for (const e of ESTADOS_CONTACTO) assert.ok(L.estados[e], `falta la etiqueta del estado ${e}`)
  const conocidas = new Set(['nombre', 'primerNombre', 'telefono', 'email', 'municipio', 'origen', 'herramienta', 'empresa', 'kwp', 'precio', 'ahorro', 'amortizacion', 'estado', 'dias'])
  const textos = JSON.stringify(S)
  for (const [, v] of textos.matchAll(/\{(\w+)\}/g)) assert.ok(conocidas.has(v), `variable desconocida {${v}}`)
  assert.match(S.cliente.aviso, /orientativa/)
})

/* ── API: la puerta de n8n ── */

test('n8n: con su clave lee lo pendiente; con clave mala 401; sin clave sigue pidiendo sesión', async () => {
  const repo = repoMemoria()
  const c = await repo.crearContacto(sinId(contacto({ creado_en: new Date(AHORA).toISOString() })))
  const d = { ...deps({ repo }), ahora: () => AHORA }
  const ok = await llamar(crearLista(d), req('GET', { token: TOKEN_NOTICIAS }))
  assert.equal(ok.codigo, 200)
  assert.deepEqual(ok.cuerpo.fichas.map((f) => f.id), [c.id])
  assert.match(ok.cuerpo.fichas[0].ficha.telegram, /Ana Ruiz/)
  assert.equal(ok.cuerpo.fichas[0].emailCliente.para, 'ana@correo.es')
  assert.ok(!('contactos' in ok.cuerpo)) // n8n no recibe la lista entera
  assert.equal((await llamar(crearLista(d), req('GET', { token: 'otra' }))).codigo, 401)
  assert.equal((await llamar(crearLista(d), req('GET'))).codigo, 401) // sin clave ni cookie
  assert.equal((await llamar(crearLista({ ...d, n8nListo: () => false }), req('GET', { token: TOKEN_NOTICIAS }))).codigo, 401)
})

test('n8n: solo puede marcar (ficha/recordatorio/aviso); ni estados, ni notas, ni borrar', async () => {
  const repo = repoMemoria()
  const c = await repo.crearContacto(sinId(contacto()))
  const d = { ...deps({ repo }), ahora: () => AHORA }
  const marcar = (body, extra = {}) => llamar(crearUno(d), req('PATCH', { token: TOKEN_NOTICIAS, query: { id: c.id }, body, ...extra }))
  assert.equal((await marcar({ marcar: 'ficha' })).codigo, 200)
  assert.equal(repo.contactos.get(c.id).ficha_enviada_en, new Date(AHORA).toISOString())
  for (const m of Object.keys(MARCAS_SEGUIMIENTO)) assert.equal((await marcar({ marcar: m })).codigo, 200)
  assert.equal((await marcar({ estado: 'cerrado' })).codigo, 400)
  assert.equal((await marcar({ marcar: 'estado' })).codigo, 400)
  assert.equal(repo.contactos.get(c.id).estado, 'nuevo')
  assert.equal((await llamar(crearUno(d), req('DELETE', { token: TOKEN_NOTICIAS, query: { id: c.id } }))).codigo, 405)
  assert.equal(repo.contactos.size, 1)
  assert.equal((await marcar({ marcar: 'ficha' }, { json: false })).codigo, 415)
  assert.equal((await llamar(crearUno(d), req('PATCH', { token: 'mala', query: { id: c.id }, body: { marcar: 'ficha' } }))).codigo, 401)
  assert.equal((await llamar(crearUno(d), req('PATCH', { token: TOKEN_NOTICIAS, query: { id: randomUUID() }, body: { marcar: 'ficha' } }))).codigo, 404)
})

test('panel: pasar a presupuestado apunta la fecha que usa el recordatorio', async () => {
  const repo = repoMemoria()
  const c = await repo.crearContacto(sinId(contacto({ estado: 'contactado' })))
  const d = deps({ repo }) // la cookie de prueba es de la fecha de deps()
  const r = await llamar(crearUno(d), req('PATCH', { cookie: cookieValida(), query: { id: c.id }, body: { estado: 'presupuestado' } }))
  assert.equal(r.codigo, 200)
  const cuando = new Date(d.ahora()).toISOString()
  assert.equal(r.cuerpo.contacto.presupuestado_en, cuando)
  assert.equal(r.cuerpo.contacto.estado_en, cuando)
})
