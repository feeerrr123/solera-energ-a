import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { crear as crearPublico } from '../api/contactos.js'
import { crear as crearLista } from '../api/admin/contactos/index.js'
import { crear as crearUno } from '../api/admin/contactos/[id].js'
import { deps, repoMemoria, req, cookieValida, llamar } from './utilapi.mjs'

const cuerpo = (extra = {}) => ({
  origen: 'ayudas', nombre: 'Ana Ruiz', telefono: '600 11 22 33', consentimiento: true, avisoVersion: '2026-09',
  datos: { titular: 'agricultor', provincia: 'jaen' }, ...extra,
})

test('público: sin Supabase (demo) valida pero no guarda; con Supabase guarda con teléfono normalizado', async () => {
  const demo = await llamar(crearPublico(deps({ demo: true })), req('POST', { body: cuerpo() }))
  assert.deepEqual(demo.cuerpo, { ok: true, demo: true })

  const repo = repoMemoria()
  const r = await llamar(crearPublico(deps({ repo })), req('POST', { body: cuerpo({ municipio: 'Úbeda', mensaje: 'Hola' }) }))
  assert.equal(r.codigo, 201)
  const [c] = [...repo.contactos.values()]
  assert.equal(c.telefono_norm, '34600112233')
  assert.equal(c.telefono, '600 11 22 33')
  assert.equal(c.origen, 'ayudas')
  assert.equal(c.consentimiento, true)
  assert.equal(c.aviso_version, '2026-09')
  assert.deepEqual(c.datos, { titular: 'agricultor', provincia: 'jaen' })
})

test('público: sin consentimiento, con datos malos o formato no JSON, no entra nada', async () => {
  const repo = repoMemoria()
  const h = crearPublico(deps({ repo }))
  const sinCons = await llamar(h, req('POST', { body: cuerpo({ consentimiento: false }) }))
  assert.equal(sinCons.codigo, 400)
  assert.ok(sinCons.cuerpo.campos.consentimiento)
  assert.equal((await llamar(h, req('POST', { body: cuerpo({ telefono: 'abc', nombre: '' }) }))).codigo, 400)
  assert.equal((await llamar(h, req('POST', { body: cuerpo(), json: false }))).codigo, 415)
  assert.equal((await llamar(h, req('GET'))).codigo, 405)
  assert.equal(repo.contactos.size, 0)
})

test('público: los robots (campo trampa) reciben "ok" pero no se guarda nada', async () => {
  const repo = repoMemoria()
  const r = await llamar(crearPublico(deps({ repo })), req('POST', { body: cuerpo({ web: 'http://spam.example' }) }))
  assert.deepEqual([r.codigo, r.cuerpo], [200, { ok: true }])
  assert.equal(repo.contactos.size, 0)
})

test('público: freno anti-spam, máximo 3 por hora con el mismo teléfono (aunque lo escriban distinto)', async () => {
  const repo = repoMemoria()
  const h = crearPublico(deps({ repo }))
  for (const tel of ['600112233', '600 11 22 33', '+34 600-112-233']) {
    assert.equal((await llamar(h, req('POST', { body: cuerpo({ telefono: tel }) }))).codigo, 201)
  }
  const cuarta = await llamar(h, req('POST', { body: cuerpo({ telefono: '600.11.22.33'.replace(/\./g, ' ') }) }))
  assert.equal(cuarta.codigo, 429)
  assert.equal(repo.contactos.size, 3)
  // otro teléfono sí puede
  assert.equal((await llamar(h, req('POST', { body: cuerpo({ telefono: '611223344' }) }))).codigo, 201)
})

test('público: si la base de datos falla, error amable y sin detalles internos', async () => {
  const repo = repoMemoria()
  repo.crearContacto = async () => { throw new Error('connection refused a 10.0.0.5') }
  const r = await llamar(crearPublico(deps({ repo })), req('POST', { body: cuerpo() }))
  assert.equal(r.codigo, 500)
  assert.ok(!JSON.stringify(r.cuerpo).includes('10.0.0.5'))
})

test('panel: listar, cambiar estado/nota y borrar contactos exigen sesión', async () => {
  const repo = repoMemoria()
  const c = await repo.crearContacto({ origen: 'ayudas', nombre: 'Ana', telefono: '600112233', telefono_norm: '34600112233', datos: {}, consentimiento: true })
  const d = deps({ repo })
  assert.equal((await llamar(crearLista(d), req('GET'))).codigo, 401)
  assert.equal((await llamar(crearUno(d), req('PATCH', { query: { id: c.id }, body: { estado: 'contactado' } }))).codigo, 401)
  assert.equal((await llamar(crearUno(d), req('DELETE', { query: { id: c.id } }))).codigo, 401)
  assert.deepEqual((await llamar(crearLista(deps({ demo: true })), req('GET'))).cuerpo, { demo: true, contactos: [] })

  const cookie = cookieValida()
  assert.equal((await llamar(crearLista(d), req('GET', { cookie }))).cuerpo.contactos.length, 1)

  const ok = await llamar(crearUno(d), req('PATCH', { cookie, query: { id: c.id }, body: { estado: 'contactado', nota_interna: 'Llamar el lunes', nombre: 'Hackeado' } }))
  assert.equal(ok.codigo, 200)
  assert.equal(repo.contactos.get(c.id).estado, 'contactado')
  assert.equal(repo.contactos.get(c.id).nota_interna, 'Llamar el lunes')
  assert.equal(repo.contactos.get(c.id).nombre, 'Ana') // solo estado y nota se pueden tocar

  assert.equal((await llamar(crearUno(d), req('PATCH', { cookie, query: { id: c.id }, body: { estado: 'raro' } }))).codigo, 400)
  assert.equal((await llamar(crearUno(d), req('PATCH', { cookie, query: { id: 'no-uuid' }, body: { estado: 'nuevo' } }))).codigo, 400)
  assert.equal((await llamar(crearUno(d), req('PATCH', { cookie, query: { id: randomUUID() }, body: { estado: 'nuevo' } }))).codigo, 404)

  assert.equal((await llamar(crearUno(d), req('DELETE', { cookie, query: { id: c.id } }))).codigo, 200)
  assert.equal(repo.contactos.size, 0)
})
