import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { crearMotor } from '../tools/motor.mjs'

function proyecto(archivos) {
  const src = mkdtempSync(join(tmpdir(), 'solera-motor-'))
  for (const [rel, texto] of Object.entries(archivos)) {
    const f = join(src, rel)
    mkdirSync(join(f, '..'), { recursive: true })
    writeFileSync(f, texto)
  }
  return crearMotor(src)
}

test('variables, rutas anidadas y HTML sin escapar', () => {
  const m = proyecto({ 'p.html': '<h1>{{ a.b }}</h1>{{ html }}' })
  assert.equal(m.renderizar('p.html', { a: { b: 'Hola' }, html: '<b>x</b>' }), '<h1>Hola</h1><b>x</b>')
})

test('un dato que falta rompe el build con archivo y ruta', () => {
  const m = proyecto({ 'p.html': '{{ no.existe }}' })
  assert.throws(() => m.renderizar('p.html', {}), /src\/p\.html: en la config no existe "no\.existe"/)
})

test('each con this, @nn, @first y acceso a datos de fuera', () => {
  const m = proyecto({ 'p.html': '{{#each l}}[{{ @nn }}{{#if @first}}*{{/if}} {{ this.t }} {{ g }}]{{/each}}' })
  assert.equal(m.renderizar('p.html', { g: 'G', l: [{ t: 'a' }, { t: 'b' }] }), '[01* a G][02 b G]')
})

test('each sobre textos sueltos', () => {
  const m = proyecto({ 'p.html': '{{#each l}}<{{ this }}>{{/each}}' })
  assert.equal(m.renderizar('p.html', { l: ['x', 'y'] }), '<x><y>')
})

test('if / else / negación; un campo opcional que falta es falso, no error', () => {
  const m = proyecto({ 'p.html': '{{#if a}}A{{else}}B{{/if}}{{#if !a}}C{{/if}}{{#if nada}}D{{else}}E{{/if}}' })
  assert.equal(m.renderizar('p.html', { a: true }), 'AE')
  assert.equal(m.renderizar('p.html', { a: false }), 'BCE')
})

test('una lista vacía cuenta como falsa', () => {
  const m = proyecto({ 'p.html': '{{#if l}}hay{{else}}vacía{{/if}}' })
  assert.equal(m.renderizar('p.html', { l: [] }), 'vacía')
})

test('parciales comparten contexto', () => {
  const m = proyecto({ 'p.html': '<{{> cab}}>', 'partials/cab.html': '{{ x }}!' })
  assert.equal(m.renderizar('p.html', { x: 'hola' }), '<hola!>')
})

test('@json escapa "<" para poder ir dentro de un <script>', () => {
  const m = proyecto({ 'p.html': '{{@json d}}' })
  assert.equal(m.renderizar('p.html', { d: { t: '</script>' } }), '{"t":"\\u003c/script>"}')
})

test('@include mete el archivo sin procesar (aunque lleve llaves) y no sale de src/', () => {
  const m = proyecto({ 'p.html': '{{@include js/a.js}}', 'js/a.js': 'const x = {{a}};\n' })
  assert.equal(m.renderizar('p.html', {}), 'const x = {{a}};')
  const m2 = proyecto({ 'p.html': '{{@include ../fuera.txt}}' })
  assert.throws(() => m2.renderizar('p.html', {}), /sale de src/)
})

test('@icono aplica las clases; si el icono no existe, error claro', () => {
  const m = proyecto({
    'p.html': '{{@icono this.i "h-4 w-4"}}',
    'partials/iconos/pozo.svg.html': '<svg class="__CLASES__ text-olive"></svg>\n',
  })
  assert.equal(m.renderizar('p.html', { i: 'pozo' }), '<svg class="h-4 w-4 text-olive"></svg>')
  assert.throws(() => m.renderizar('p.html', { i: 'nada' }), /no existe el icono "nada"/)
})

test('@molde: {{ this.x }} sale como {x}, {{#if this.x}} como <span data-si>, lo global sigue siendo real', () => {
  const m = proyecto({
    'p.html': '<template>{{@molde card}}</template>',
    'partials/card.html': '<a id="{{ this.id }}">{{ this.t }} {{ marca }}{{#if this.demo}}[D]{{else}}[R]{{/if}}</a>',
    'partials/iconos/pozo.svg.html': '<svg/>',
  })
  assert.equal(
    m.renderizar('p.html', { marca: 'M' }),
    '<template><a id="{id}">{t} M<span data-si="demo" style="display:contents">[D]</span><span data-no="demo" style="display:contents">[R]</span></a></template>'
  )
})

test('@molde: el icono del molde es fijo (pozo) y each no se admite', () => {
  const m = proyecto({
    'p.html': '{{@molde a}}',
    'partials/a.html': '{{@icono this.icono "c"}}',
    'partials/iconos/pozo.svg.html': '<svg class="__CLASES__"/>',
  })
  assert.equal(m.renderizar('p.html', {}), '<svg class="c"/>')
  const m2 = proyecto({ 'p.html': '{{@molde a}}', 'partials/a.html': '{{#each x}}y{{/each}}' })
  assert.throws(() => m2.renderizar('p.html', {}), /no se puede usar dentro de un molde/)
})

test('bloques mal cerrados dan error con el archivo', () => {
  const m = proyecto({ 'p.html': '{{#if a}}sin cerrar' })
  assert.throws(() => m.renderizar('p.html', {}), /falta \{\{\/if\}\}/)
  const m2 = proyecto({ 'p.html': 'x{{/each}}' })
  assert.throws(() => m2.renderizar('p.html', {}), /sin su apertura/)
})
