import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

import { crearToken, verificarToken, contrasenaCorrecta, leerCookie, cookieSesion, cookieBorrada } from '../api/_lib/sesion.js'
import { crear as crearLogin } from '../api/admin/login.js'
import { crear as crearLista } from '../api/admin/instalaciones/index.js'
import { crear as crearUna } from '../api/admin/instalaciones/[id].js'
import { crear as crearFoto } from '../api/admin/foto.js'
import { crear as crearCasos } from '../api/casos.js'

import { SECRET, PASS, PREFIJO, AHORA, repoMemoria, deps, req, cookieValida, llamar, alta } from './utilapi.mjs'

/* ───────────── sesión ───────────── */

test('token: ida y vuelta, manipulado, caducado y con otro secreto', () => {
  const t = crearToken(SECRET, AHORA)
  assert.ok(verificarToken(t, SECRET, AHORA))
  assert.ok(!verificarToken(t, 'otro-secreto-distinto-123456', AHORA))
  assert.ok(!verificarToken(t.replace(/.$/, (c) => (c === '0' ? '1' : '0')), SECRET, AHORA))
  assert.ok(!verificarToken(t, SECRET, AHORA + 9 * 3600 * 1000)) // 9 h después: caducado (dura 8)
  assert.ok(verificarToken(t, SECRET, AHORA + 7 * 3600 * 1000))
  const [exp, firma] = t.split('.')
  assert.ok(!verificarToken(`${Number(exp) + 99999}.${firma}`, SECRET, AHORA)) // alargar la caducidad invalida la firma
  assert.ok(!verificarToken(undefined, SECRET, AHORA))
  assert.ok(!verificarToken('basura', SECRET, AHORA))
})

test('contraseña en tiempo constante y lectura/creación de cookies', () => {
  assert.ok(contrasenaCorrecta('abc', 'abc'))
  assert.ok(!contrasenaCorrecta('abd', 'abc'))
  assert.ok(!contrasenaCorrecta('', 'abc'))
  assert.ok(!contrasenaCorrecta('abc', ''))
  assert.equal(leerCookie({ headers: { cookie: 'a=1; solera_admin=xyz%2E1; b=2' } }), 'xyz.1')
  assert.equal(leerCookie({ headers: {} }), null)
  assert.match(cookieSesion('t'), /HttpOnly; Secure; SameSite=Strict/)
  assert.match(cookieBorrada(), /Max-Age=0/)
})

/* ───────────── login ───────────── */

test('login en modo demo: entra sin contraseña y lo avisa', async () => {
  const h = crearLogin(deps({ demo: true }))
  assert.deepEqual((await llamar(h, req('GET'))).cuerpo, { autenticado: true, demo: true })
  assert.deepEqual((await llamar(h, req('POST', { body: {} }))).cuerpo, { ok: true, demo: true })
})

test('login con Supabase pero sin ADMIN_PASSWORD/ADMIN_SECRET: 503, nunca abierto', async () => {
  const r = await llamar(crearLogin(deps({ adminOk: false })), req('POST', { body: { password: PASS } }))
  assert.equal(r.codigo, 503)
  assert.match(r.cuerpo.error, /ADMIN_PASSWORD/)
})

test('login: contraseña mala = 401 con espera; buena = cookie segura; la sesión se comprueba y se cierra', async () => {
  const esperas = []
  const h = crearLogin(deps({ esperas }))
  const mala = await llamar(h, req('POST', { body: { password: 'nope' } }))
  assert.equal(mala.codigo, 401)
  assert.deepEqual(esperas, [600])
  assert.ok(!mala.headers['set-cookie'])

  const buena = await llamar(h, req('POST', { body: { password: PASS } }))
  assert.equal(buena.codigo, 200)
  const cookie = buena.headers['set-cookie']
  assert.match(cookie, /solera_admin=/)
  assert.match(cookie, /HttpOnly/)

  const conSesion = await llamar(h, req('GET', { cookie: cookie.split(';')[0] }))
  assert.deepEqual(conSesion.cuerpo, { autenticado: true, demo: false })
  assert.deepEqual((await llamar(h, req('GET'))).cuerpo, { autenticado: false, demo: false })
  assert.deepEqual((await llamar(h, req('GET', { cookie: 'solera_admin=1.' + 'a'.repeat(64) }))).cuerpo, { autenticado: false, demo: false })

  const fuera = await llamar(h, req('DELETE'))
  assert.match(fuera.headers['set-cookie'], /Max-Age=0/)
})

test('login: sin Content-Type JSON se rechaza (415) y otros métodos, 405', async () => {
  const h = crearLogin(deps())
  assert.equal((await llamar(h, req('POST', { body: { password: PASS }, json: false }))).codigo, 415)
  assert.equal((await llamar(h, req('PUT'))).codigo, 405)
})

/* ───────────── instalaciones ───────────── */

test('todo el panel exige sesión (401) y en modo demo responde {demo:true} sin tocar nada', async () => {
  const d = deps()
  assert.equal((await llamar(crearLista(d), req('GET'))).codigo, 401)
  assert.equal((await llamar(crearLista(d), req('POST', { body: alta() }))).codigo, 401)
  assert.equal((await llamar(crearUna(d), req('DELETE', { query: { id: randomUUID() } }))).codigo, 401)
  assert.equal((await llamar(crearFoto(d), req('POST', { body: {} }))).codigo, 401)
  const demo = deps({ demo: true })
  assert.deepEqual((await llamar(crearLista(demo), req('GET'))).cuerpo, { demo: true, instalaciones: [] })
})

test('alta: valida (400 con los campos malos), guarda y lista', async () => {
  const repo = repoMemoria()
  const h = crearLista(deps({ repo }))
  const mal = await llamar(h, req('POST', { cookie: cookieValida(), body: alta({ cliente: '', telefono: '12' }) }))
  assert.equal(mal.codigo, 400)
  assert.deepEqual(Object.keys(mal.cuerpo.campos).sort(), ['cliente', 'telefono'])
  assert.equal(repo.filas.size, 0)

  const ok = await llamar(h, req('POST', { cookie: cookieValida(), body: alta({ es_demo: true, es_caso_exito: true }) }))
  assert.equal(ok.codigo, 201)
  assert.equal(repo.filas.size, 1)
  const guardada = [...repo.filas.values()][0]
  assert.equal(guardada.es_demo, false) // no se puede crear "de ejemplo" desde fuera
  assert.equal(guardada.es_caso_exito, false) // ni publicar de golpe

  const lista = await llamar(h, req('GET', { cookie: cookieValida() }))
  assert.equal(lista.cuerpo.instalaciones.length, 1)
})

test('PATCH marcar: reseña y recordatorio ponen la hora del servidor; revisión hecha pone la fecha de hoy', async () => {
  const repo = repoMemoria()
  const f = await repo.crear(alta())
  const h = crearUna(deps({ repo }))
  const c = cookieValida()
  const a = await llamar(h, req('PATCH', { cookie: c, query: { id: f.id }, body: { marcar: 'resena' } }))
  assert.equal(a.cuerpo.instalacion.resena_pedida_en, '2026-03-01T10:00:00.000Z')
  const b = await llamar(h, req('PATCH', { cookie: c, query: { id: f.id }, body: { marcar: 'recordatorio' } }))
  assert.equal(b.cuerpo.instalacion.recordatorio_enviado_en, '2026-03-01T10:00:00.000Z')
  const r = await llamar(h, req('PATCH', { cookie: c, query: { id: f.id }, body: { marcar: 'revision_hecha' } }))
  assert.equal(r.cuerpo.instalacion.ultima_revision, '2026-03-01')
  assert.equal((await llamar(h, req('PATCH', { cookie: c, query: { id: f.id }, body: { marcar: 'borrar_todo' } }))).codigo, 400)
})

test('PATCH: id inválido 400, inexistente 404, sin cambios 400, y no se cuelan campos (es_demo)', async () => {
  const repo = repoMemoria()
  const f = await repo.crear(alta())
  const h = crearUna(deps({ repo }))
  const c = cookieValida()
  assert.equal((await llamar(h, req('PATCH', { cookie: c, query: { id: 'no-uuid' }, body: { municipio: 'X' } }))).codigo, 400)
  assert.equal((await llamar(h, req('PATCH', { cookie: c, query: { id: randomUUID() }, body: { municipio: 'X' } }))).codigo, 404)
  assert.equal((await llamar(h, req('PATCH', { cookie: c, query: { id: f.id }, body: { cosa: 1 } }))).codigo, 400)
  await llamar(h, req('PATCH', { cookie: c, query: { id: f.id }, body: { municipio: 'Baeza', es_demo: true } }))
  assert.equal(repo.filas.get(f.id).municipio, 'Baeza')
  assert.equal(repo.filas.get(f.id).es_demo, false)
})

test('publicar un caso: exige autorización del cliente y cifras; revocarla lo despublica; la foto solo de nuestro bucket', async () => {
  const repo = repoMemoria()
  const f = await repo.crear(alta())
  const h = crearUna(deps({ repo }))
  const c = cookieValida()
  const patch = (body) => llamar(h, req('PATCH', { cookie: c, query: { id: f.id }, body }))

  const sinAut = await patch({ es_caso_exito: true, ahorro_anual: 3000, amortizacion_anios: 3 })
  assert.equal(sinAut.codigo, 400)
  assert.ok(sinAut.cuerpo.campos.es_caso_exito)
  assert.equal(repo.filas.get(f.id).es_caso_exito, false)

  const foto = await patch({ foto_url: 'https://evil.example/x.jpg' })
  assert.equal(foto.codigo, 400)

  const ok = await patch({ es_caso_exito: true, autoriza_publicar: true, ahorro_anual: 3000, gasto_anual_antes: 4000, amortizacion_anios: 3, frase_cliente: 'Se paga solo', foto_url: `${PREFIJO}a.jpg` })
  assert.equal(ok.codigo, 200)
  assert.equal(repo.filas.get(f.id).es_caso_exito, true)

  await patch({ autoriza_publicar: false }) // el cliente retira el permiso
  assert.equal(repo.filas.get(f.id).es_caso_exito, false)
})

test('borrar', async () => {
  const repo = repoMemoria()
  const f = await repo.crear(alta())
  const r = await llamar(crearUna(deps({ repo })), req('DELETE', { cookie: cookieValida(), query: { id: f.id } }))
  assert.equal(r.codigo, 200)
  assert.equal(repo.filas.size, 0)
})

/* ───────────── foto ───────────── */

const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

test('foto: acepta una imagen real; rechaza tipos raros, contenido falso y pesos excesivos', async () => {
  const h = crearFoto(deps())
  const c = cookieValida()
  const subir = (dataUrl) => llamar(h, req('POST', { cookie: c, body: { dataUrl } }))

  const ok = await subir(`data:image/png;base64,${PNG_1PX}`)
  assert.equal(ok.codigo, 201)
  assert.match(ok.cuerpo.url, /^https:\/\/x\.supabase\.co\/storage\/v1\/object\/public\/casos\/.+\.png$/)

  assert.equal((await subir('data:text/html;base64,PGgxPg==')).codigo, 400) // no es imagen
  assert.equal((await subir('data:image/jpeg;base64,' + Buffer.from('<script>alert(1)</script>').toString('base64'))).codigo, 400) // dice jpeg, no lo es
  assert.equal((await subir('nada')).codigo, 400)
  const grande = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(2 * 1024 * 1024)])
  assert.equal((await subir(`data:image/jpeg;base64,${grande.toString('base64')}`)).codigo, 413)
})

/* ───────────── casos públicos ───────────── */

test('/api/casos: sin Supabase, {demo:true}; con Supabase, solo publicados y sin datos personales', async () => {
  assert.deepEqual((await llamar(crearCasos(deps({ demo: true })), req('GET'))).cuerpo, { demo: true, casos: [] })

  const repo = repoMemoria()
  await repo.crear(alta({ cliente: 'Secreto Uno', telefono: '600000001' })) // no publicado
  await repo.crear(alta({ cliente: 'Secreto Dos', telefono: '600000002', es_caso_exito: true, autoriza_publicar: false })) // sin autorización
  await repo.crear(alta({ cliente: 'Secreto Tres', telefono: '600000003', es_caso_exito: true, autoriza_publicar: true, ahorro_anual: 3000, amortizacion_anios: 3, es_demo: true }))
  const r = await llamar(crearCasos(deps({ repo })), req('GET'))
  assert.equal(r.cuerpo.casos.length, 1)
  assert.equal(r.cuerpo.casos[0].es_demo, true)
  const texto = JSON.stringify(r.cuerpo)
  assert.ok(!texto.includes('Secreto') && !texto.includes('6000000'))
  assert.equal(r.headers['cache-control'], 'no-store') // despublicar se ve en el acto
  assert.equal((await llamar(crearCasos(deps()), req('POST'))).codigo, 405)
})
