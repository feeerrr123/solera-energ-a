import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { crear as crearPublico } from '../api/noticias.js'
import { crear as crearLista } from '../api/admin/noticias/index.js'
import { crear as crearUna } from '../api/admin/noticias/[id].js'
import {
  validarNoticiaEntrante, validarCambioNoticia, noticiaPublica, datosTarjetaNoticia, contieneImporte, enlaceNoticiaValido,
} from '../src/shared/logica.js'
import { deps, repoMemoria, req, cookieValida, llamar, TOKEN_NOTICIAS } from './utilapi.mjs'

// Lo que manda el flujo de n8n (nodo "Preparar noticias").
const deN8n = (extra = {}) => ({
  titulo: 'Orden de 22 de septiembre de 2026, por la que se convocan ayudas a la modernización de regadíos',
  enlace: 'http://www.juntadeandalucia.es/boja/2026/188/2.html',
  fecha: '2026-09-28T00:00:00.000Z',
  resumen: 'La Junta abre ayudas para modernizar regadíos. Consulta los requisitos en la convocatoria oficial.',
  coincide: 'regadio, modernizacion de regadios',
  fuente: 'BOJA',
  ...extra,
})

/* ── reglas ── */

test('contieneImporte: detecta euros, porcentajes y millones; no confunde fechas ni números de orden', () => {
  for (const t of ['hasta 12.000 €', '30 %', 'un 40% de la inversión', '5 millones', '3.000 euros']) assert.ok(contieneImporte(t), t)
  for (const t of ['Orden de 22 de septiembre de 2026', 'BOJA nº 188', 'Decreto 45/2026', '', null]) assert.ok(!contieneImporte(t), String(t))
})

test('enlaceNoticiaValido: solo boletines oficiales por http(s); nada de trucos con el dominio', () => {
  assert.ok(enlaceNoticiaValido('http://www.juntadeandalucia.es/boja/2026/188/1.html'))
  assert.ok(enlaceNoticiaValido('https://www.boe.es/diario_boe/txt.php?id=X'))
  for (const u of ['https://evil.example/juntadeandalucia.es', 'https://juntadeandalucia.es.evil.example/', 'javascript:alert(1)', 'ftp://boe.es/x', 'no es un enlace', '']) {
    assert.ok(!enlaceNoticiaValido(u), u)
  }
})

test('validarNoticiaEntrante: siempre entra como borrador, recorta la fecha del RSS y exige título y enlace oficial', () => {
  const v = validarNoticiaEntrante({ ...deN8n(), estado: 'publicada', es_demo: true, id: 'x' })
  assert.ok(v.ok)
  assert.equal(v.datos.estado, 'borrador') // aunque n8n (o alguien con la clave) diga otra cosa
  assert.equal(v.datos.fecha_publicacion, '2026-09-28')
  assert.ok(!('es_demo' in v.datos) && !('id' in v.datos))
  assert.deepEqual(Object.keys(validarNoticiaEntrante({ titulo: '', enlace: 'https://evil.example/' }).errores).sort(), ['enlace', 'titulo'])
  assert.ok(validarNoticiaEntrante({ ...deN8n(), fecha: 'ayer' }).errores.fecha)
  assert.equal(validarNoticiaEntrante({ ...deN8n(), resumen: '', fuente: '' }).datos.fuente, 'BOJA')
  assert.equal(validarNoticiaEntrante([1, 2]).ok, false)
})

test('validarCambioNoticia: publicar exige resumen sin importes; despublicar borra la fecha de publicación', () => {
  const borrador = { estado: 'borrador', resumen: null }
  assert.ok(validarCambioNoticia({ estado: 'publicada' }, borrador).errores.resumen)
  assert.ok(validarCambioNoticia({ estado: 'publicada', resumen: 'Ayudas de hasta 12.000 € por explotación.' }, borrador).errores.resumen)
  const ok = validarCambioNoticia({ estado: 'publicada', resumen: 'Ayudas para regadío.' }, borrador, { ahoraISO: '2026-09-30T08:00:00.000Z' })
  assert.ok(ok.ok)
  assert.equal(ok.datos.publicada_en, '2026-09-30T08:00:00.000Z')
  // Editar el resumen de una publicada para meter un importe tampoco vale
  assert.ok(validarCambioNoticia({ resumen: 'Ahora con un 40 % de ayuda' }, { estado: 'publicada', resumen: 'x' }).errores.resumen)
  assert.equal(validarCambioNoticia({ estado: 'borrador' }, { estado: 'publicada', resumen: 'x' }).datos.publicada_en, null)
  assert.ok(validarCambioNoticia({ estado: 'rara' }).errores.estado)
  assert.ok(validarCambioNoticia({}).errores.estado)
})

test('noticiaPublica (lista blanca) y tarjeta: sin estado ni palabras clave; enlace raro → vacío', () => {
  const fila = { id: randomUUID(), ...validarNoticiaEntrante(deN8n()).datos, estado: 'publicada', publicada_en: 'x', creado_en: 'y' }
  assert.deepEqual(Object.keys(noticiaPublica(fila)).sort(), ['enlace', 'es_demo', 'fecha_publicacion', 'fuente', 'id', 'resumen', 'titulo'])
  const t = datosTarjetaNoticia({ ...fila, enlace: 'javascript:alert(1)' })
  assert.equal(t.enlace, '')
  assert.equal(datosTarjetaNoticia(fila).fecha, '28 de septiembre de 2026')
})

/* ── API pública: POST (n8n) ── */

test('POST: sin clave o con clave mala → 401 (y espera); sin NOTICIAS_TOKEN configurado → 503', async () => {
  const esperas = []
  const repo = repoMemoria()
  const h = crearPublico(deps({ repo, esperas }))
  assert.equal((await llamar(h, req('POST', { body: deN8n() }))).codigo, 401)
  assert.equal((await llamar(h, req('POST', { body: deN8n(), token: 'otra-clave' }))).codigo, 401)
  assert.deepEqual(esperas, [600, 600])
  assert.equal((await llamar(crearPublico(deps({ noticiasOk: false })), req('POST', { body: deN8n(), token: TOKEN_NOTICIAS }))).codigo, 503)
  assert.equal(repo.noticias.size, 0)
})

test('POST: con la clave entra como borrador; el mismo enlace otra vez no se duplica ni pisa lo editado', async () => {
  const repo = repoMemoria()
  const h = crearPublico(deps({ repo }))
  const r1 = await llamar(h, req('POST', { body: deN8n(), token: TOKEN_NOTICIAS }))
  assert.deepEqual([r1.codigo, r1.cuerpo], [201, { ok: true, nueva: true }])
  const [n] = repo.noticias.values()
  assert.equal(n.estado, 'borrador')
  await repo.actualizarNoticia(n.id, { resumen: 'Editado a mano' })
  const r2 = await llamar(h, req('POST', { body: deN8n({ resumen: 'otro' }), token: TOKEN_NOTICIAS }))
  assert.deepEqual([r2.codigo, r2.cuerpo], [200, { ok: true, nueva: false }])
  assert.equal(repo.noticias.size, 1)
  assert.equal(repo.noticias.get(n.id).resumen, 'Editado a mano')
})

test('POST: datos malos → 400; no JSON → 415; otros métodos → 405; en demo valida pero no guarda', async () => {
  const repo = repoMemoria()
  const h = crearPublico(deps({ repo }))
  const malo = await llamar(h, req('POST', { body: deN8n({ enlace: 'https://evil.example/x' }), token: TOKEN_NOTICIAS }))
  assert.equal(malo.codigo, 400)
  assert.ok(malo.cuerpo.campos.enlace)
  assert.equal((await llamar(h, req('POST', { body: deN8n(), token: TOKEN_NOTICIAS, json: false }))).codigo, 415)
  assert.equal((await llamar(h, req('PUT', { body: deN8n(), token: TOKEN_NOTICIAS }))).codigo, 405)
  const demo = await llamar(crearPublico(deps({ demo: true, repo })), req('POST', { body: deN8n() }))
  assert.deepEqual(demo.cuerpo, { ok: true, demo: true })
  assert.equal(repo.noticias.size, 0)
})

/* ── API pública: GET ── */

test('GET público: solo publicadas, por lista blanca (nunca borradores, descartadas ni palabras clave)', async () => {
  const repo = repoMemoria()
  const b = await repo.crearNoticia(validarNoticiaEntrante(deN8n()).datos)
  const p = await repo.crearNoticia({ ...validarNoticiaEntrante(deN8n({ enlace: 'https://www.boe.es/a' })).datos, estado: 'publicada' })
  await repo.crearNoticia({ ...validarNoticiaEntrante(deN8n({ enlace: 'https://www.boe.es/b' })).datos, estado: 'descartada' })
  const r = await llamar(crearPublico(deps({ repo })), req('GET'))
  assert.equal(r.codigo, 200)
  assert.deepEqual(r.cuerpo.noticias.map((n) => n.id), [p.id])
  assert.ok(!JSON.stringify(r.cuerpo).includes(b.id))
  assert.ok(!('coincide' in r.cuerpo.noticias[0]) && !('estado' in r.cuerpo.noticias[0]))
  assert.equal(r.headers['cache-control'], 'no-store') // quitar de la web se ve en el acto
  assert.deepEqual((await llamar(crearPublico(deps({ demo: true })), req('GET'))).cuerpo, { demo: true, noticias: [] })
})

/* ── panel ── */

test('panel: sin sesión → 401; con sesión lista todo, publica (con reglas), descarta y borra', async () => {
  const repo = repoMemoria()
  const n = await repo.crearNoticia(validarNoticiaEntrante(deN8n({ resumen: '' })).datos)
  const lista = crearLista(deps({ repo }))
  const una = crearUna(deps({ repo }))
  const cookie = cookieValida()

  assert.equal((await llamar(lista, req('GET'))).codigo, 401)
  assert.equal((await llamar(una, req('PATCH', { body: { estado: 'publicada' }, query: { id: n.id } }))).codigo, 401)
  assert.equal((await llamar(lista, req('GET', { cookie }))).cuerpo.noticias.length, 1)

  // Sin resumen no se publica (y el mensaje de error se entiende)
  const sinResumen = await llamar(una, req('PATCH', { body: { estado: 'publicada' }, cookie, query: { id: n.id } }))
  assert.equal(sinResumen.codigo, 400)
  assert.match(sinResumen.cuerpo.error, /resumen/i)
  // Con importe tampoco
  assert.equal((await llamar(una, req('PATCH', { body: { estado: 'publicada', resumen: 'Hasta 12.000 €' }, cookie, query: { id: n.id } }))).codigo, 400)
  // Bien
  const ok = await llamar(una, req('PATCH', { body: { estado: 'publicada', resumen: 'Ayudas para modernizar regadíos.' }, cookie, query: { id: n.id } }))
  assert.equal(ok.codigo, 200)
  assert.equal(ok.cuerpo.noticia.estado, 'publicada')
  assert.ok(ok.cuerpo.noticia.publicada_en)

  assert.equal((await llamar(una, req('PATCH', { body: { estado: 'descartada' }, cookie, query: { id: n.id } }))).cuerpo.noticia.publicada_en, null)
  assert.equal((await llamar(una, req('PATCH', { body: { estado: 'publicada' }, cookie, query: { id: randomUUID() } }))).codigo, 404)
  assert.equal((await llamar(una, req('PATCH', { body: { estado: 'publicada' }, cookie, query: { id: 'no-uuid' } }))).codigo, 400)
  assert.equal((await llamar(una, req('PATCH', { body: { estado: 'publicada' }, cookie, query: { id: n.id }, json: false }))).codigo, 415)
  assert.equal((await llamar(una, req('DELETE', { cookie, query: { id: n.id } }))).codigo, 200)
  assert.equal(repo.noticias.size, 0)
})
