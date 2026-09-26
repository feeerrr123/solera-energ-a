import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import config from '../config/site.config.js'

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8')
const obtener = (obj, camino) => camino.split('.').reduce((v, k) => (v == null ? undefined : v[k]), obj)

test('todos los textos T.x.y que usa el panel existen en la config (si no, saldría "undefined" en pantalla)', () => {
  const js = leer('../src/js/panel.js')
  const usados = [...new Set([...js.matchAll(/\bT\.([a-zA-Z]+(?:\.[a-zA-Z]+)*)/g)].map((m) => m[1]))]
  assert.ok(usados.length > 40, 'debería encontrar muchos textos')
  const faltan = usados.filter((k) => typeof obtener(config.panel.textos, k) !== 'string')
  assert.deepEqual(faltan, [])
})

test('los parámetros del panel que lee panel.js existen (P.x)', () => {
  const js = leer('../src/js/panel.js')
  const usados = [...new Set([...js.matchAll(/\bP\.([a-zA-Z]+)/g)].map((m) => m[1]))].filter((k) => k !== 'textos')
  assert.deepEqual(usados.filter((k) => config.panel[k] === undefined), [])
})

test('los mensajes de WhatsApp usan solo variables que el panel sabe rellenar', () => {
  const conocidas = new Set(['nombre', 'empresa', 'enlace', 'lugar', 'fecha'])
  for (const m of [config.panel.mensajeResena, config.panel.mensajeRecordatorio]) {
    for (const [, v] of m.matchAll(/\{(\w+)\}/g)) assert.ok(conocidas.has(v), `variable desconocida {${v}}`)
  }
})

test('la semilla del modo demo es ficticia y variada (vencida, próxima, al día, caso publicado)', () => {
  const s = config.panel.demoSemilla
  assert.ok(s.every((x) => /ejemplo/i.test(x.cliente) && /^6000000\d\d$/.test(x.telefono)))
  assert.ok(s.some((x) => x.mesesAtras > 12) && s.some((x) => x.mesesAtras < 12 && x.mesesAtras >= 11) && s.some((x) => x.mesesAtras <= 6))
  assert.ok(s.some((x) => x.caso && x.caso.es_caso_exito && x.caso.autoriza_publicar))
})

test('los casos de la config no llevan nombre de cliente y con demo:true van marcados como ilustrativos', () => {
  for (const c of config.casos.lista) {
    assert.ok(!('cliente' in c) && !('telefono' in c))
    assert.equal(c.ilustrativo, config.demo)
    for (const k of ['id', 'icono', 'tipo', 'lugar', 'titular', 'hectareas', 'amortizacion', 'reduccion']) assert.ok(c[k], `falta ${k} en ${c.id}`)
  }
})

test('la atribución de la frase nunca pide el nombre del cliente', () => {
  assert.ok(!/\{(cliente|nombre|telefono)\}/.test(config.casos.atribucion))
})

test('la página admin no sale en el menú ni en el pie, y va con noindex', () => {
  assert.equal(config.paginas.admin.noindex, true)
  assert.ok(!config.nav.some((n) => n.pagina === 'admin'))
  assert.ok(!config.pie.enlaces.includes('admin'))
})

test('ayudas: las líneas solo usan ids que existen en los desplegables; sin importes ni promesas', () => {
  const f = config.ayudas.formulario
  const ids = { titulares: f.titulares, provincias: f.provincias, cultivos: f.cultivos, concesion: f.concesiones, instalacion: f.instalaciones }
  for (const l of config.ayudas.lineas) {
    for (const [campo, lista] of Object.entries(ids)) {
      for (const id of l[campo] || []) assert.ok(lista.some((x) => x.id === id), `${l.id}: "${id}" no existe en ${campo}`)
    }
    assert.ok(!/\d[\d.,]*\s*(€|euros|%)/.test(`${l.nombre} ${l.nota || ''}`), `${l.id}: no se prometen importes`)
  }
  assert.ok(!/\d[\d.,]*\s*(€|euros)/.test(JSON.stringify(config.ayudas.resultado)))
})

test('contactos: hay texto y campos para cada origen que acepta la API, y la fórmula usa cultivos conocidos', () => {
  for (const o of ['ayudas', 'dimensionado', 'calculadora', 'contacto']) {
    assert.ok(config.contactos.origenes[o]?.nombre && config.contactos.origenes[o]?.etiqueta, o)
  }
  const cultivos = config.dimensionado.parametros.cultivos.map((c) => c.id)
  for (const c of cultivos) assert.ok(config.dimensionado.parametros.consumoCultivo[c], `falta consumo de ${c}`)
  assert.match(config.contactos.mensajeWhatsApp, /\{datos\}/)
  assert.ok(config.dimensionado.resultado.aviso.includes('visita técnica'))
})
