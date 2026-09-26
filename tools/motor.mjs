// Motor de plantillas de Solera Energía. Lo usa build.mjs; aparte para poder probarlo.
//
// Sintaxis (src/pages/*.html y src/partials/*.html):
//   {{ ruta.al.dato }}              valor de la config (HTML tal cual, sin escapar)
//   {{#each lista}} … {{/each}}     repite; dentro: {{ this }} {{ this.campo }} {{ @index }} {{ @n }} (1, 2, 3…)
//                                   {{ @nn }} (01, 02, 03…) {{ @first }} {{ @last }}
//   {{#if ruta}} … {{else}} … {{/if}}   (también {{#if !ruta}})
//   {{> nombre}}                    incluye src/partials/nombre.html (se procesa)
//   {{@include js/x.js}}            incluye src/js/x.js tal cual (sin procesar)
//   {{@json ruta}}                  el dato como JSON (para pasárselo a un <script>)
//   {{@icono ruta "clases"}}        incluye src/partials/iconos/<valor>.svg.html con las clases dadas
//   {{@molde nombre}}               el parcial como MOLDE para el navegador: cada {{ this.x }} sale como {x}
//                                   y cada {{#if this.x}} como <span data-si="x"> (y <span data-no="x"> el else),
//                                   para que un script rellene la misma tarjeta con datos que llegan después.
// Un dato que no existe hace fallar el build con el nombre del archivo y la ruta.

import { readFileSync, existsSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'

const TAG = /\{\{\s*([\s\S]*?)\s*\}\}/g

function tokenizar(texto) {
  const partes = []
  let ultimo = 0
  for (const m of texto.matchAll(TAG)) {
    if (m.index > ultimo) partes.push({ t: 'texto', v: texto.slice(ultimo, m.index) })
    partes.push({ t: 'tag', v: m[1] })
    ultimo = m.index + m[0].length
  }
  if (ultimo < texto.length) partes.push({ t: 'texto', v: texto.slice(ultimo) })
  return partes
}

export function parsear(texto, archivo) {
  const partes = tokenizar(texto)
  let i = 0

  function bloque(cierres) {
    const nodos = []
    while (i < partes.length) {
      const p = partes[i]
      if (p.t === 'texto') { nodos.push({ tipo: 'texto', v: p.v }); i++; continue }
      const e = p.v
      if (e === '/each' || e === '/if' || e === 'else') {
        if (cierres.includes(e)) return { nodos, cierre: e }
        throw new Error(`${archivo}: {{${e}}} sin su apertura`)
      }
      i++
      if (e.startsWith('#each ')) {
        const c = bloque(['/each'])
        if (c.cierre !== '/each') throw new Error(`${archivo}: falta {{/each}} para "${e}"`)
        i++
        nodos.push({ tipo: 'each', ruta: e.slice(6).trim(), hijos: c.nodos })
      } else if (e.startsWith('#if ')) {
        let ruta = e.slice(4).trim()
        const neg = ruta.startsWith('!')
        if (neg) ruta = ruta.slice(1).trim()
        const a = bloque(['else', '/if'])
        let no = []
        if (a.cierre === 'else') {
          i++
          const b = bloque(['/if'])
          if (b.cierre !== '/if') throw new Error(`${archivo}: falta {{/if}} para "${e}"`)
          no = b.nodos
        } else if (a.cierre !== '/if') {
          throw new Error(`${archivo}: falta {{/if}} para "${e}"`)
        }
        i++
        nodos.push({ tipo: 'if', ruta, neg, si: a.nodos, no })
      } else if (e.startsWith('> ')) {
        nodos.push({ tipo: 'parcial', nombre: e.slice(2).trim() })
      } else if (e.startsWith('@include ')) {
        nodos.push({ tipo: 'incluir', ruta: e.slice(9).trim() })
      } else if (e.startsWith('@json ')) {
        nodos.push({ tipo: 'json', ruta: e.slice(6).trim() })
      } else if (e.startsWith('@molde ')) {
        nodos.push({ tipo: 'molde', nombre: e.slice(7).trim() })
      } else if (e.startsWith('@icono ')) {
        const m = e.match(/^@icono\s+(\S+)\s+"([^"]*)"$/)
        if (!m) throw new Error(`${archivo}: {{${e}}} — usa {{@icono ruta "clases"}}`)
        nodos.push({ tipo: 'icono', ruta: m[1], clases: m[2] })
      } else {
        nodos.push({ tipo: 'var', ruta: e })
      }
    }
    if (cierres.length) return { nodos, cierre: undefined }
    return { nodos, cierre: 'fin' }
  }

  return bloque([]).nodos
}

const verdadero = (v) => (Array.isArray(v) ? v.length > 0 : !!v)
const ICONO_MOLDE = 'pozo'
// Objeto que responde "{campo}" a cualquier propiedad: es el "dato" de un molde.
const TOKENS = new Proxy({}, { get: (_, k) => (typeof k === 'string' ? `{${k}}` : undefined) })

function obtener(obj, camino) {
  let v = obj
  for (const k of camino) {
    if (v === null || v === undefined) return undefined
    v = v[k]
  }
  return v
}

export function crearMotor(SRC) {
  const cache = new Map()

  function plantilla(rel) {
    const ruta = join(SRC, rel)
    if (!cache.has(ruta)) {
      if (!existsSync(ruta)) throw new Error(`No existe la plantilla src/${rel.replace(/\\/g, '/')}`)
      cache.set(ruta, parsear(readFileSync(ruta, 'utf8'), `src/${rel.replace(/\\/g, '/')}`))
    }
    return cache.get(ruta)
  }

  function leerSrc(rel) {
    const f = resolve(SRC, rel)
    if (!f.startsWith(resolve(SRC) + sep)) throw new Error(`{{@include ${rel}}} sale de src/`)
    return readFileSync(f, 'utf8').replace(/\r?\n$/, '')
  }

  // Busca la ruta en la pila de contextos (el más interno primero).
  function resolver(ruta, pila, archivo, { opcional = false } = {}) {
    const tope = pila[pila.length - 1]
    const raiz = pila[0].valor
    let valor
    if (ruta === 'this') valor = tope.valor
    else if (ruta.startsWith('this.')) valor = obtener(tope.valor, ruta.slice(5).split('.'))
    else if (ruta === '@index') valor = tope.index
    else if (ruta === '@n') valor = tope.index + 1
    else if (ruta === '@nn') valor = String(tope.index + 1).padStart(2, '0')
    else if (ruta === '@first') valor = tope.index === 0
    else if (ruta === '@last') valor = tope.index === tope.total - 1
    else if (ruta.startsWith('@root.')) valor = obtener(raiz, ruta.slice(6).split('.'))
    else {
      const camino = ruta.split('.')
      for (let n = pila.length - 1; n >= 0; n--) {
        if (pila[n].molde) continue
        const f = pila[n].valor
        if (f !== null && typeof f === 'object' && camino[0] in f) { valor = obtener(f, camino); break }
      }
    }
    if (valor === undefined && !opcional) throw new Error(`${archivo}: en la config no existe "${ruta}"`)
    return valor
  }

  function icono(nombre, clases, archivo) {
    const f = join(SRC, 'partials', 'iconos', `${nombre}.svg.html`)
    if (!existsSync(f)) throw new Error(`${archivo}: no existe el icono "${nombre}" (src/partials/iconos/${nombre}.svg.html)`)
    return readFileSync(f, 'utf8').replace(/\r?\n$/, '').replaceAll('__CLASES__', clases)
  }

  function render(nodos, pila, archivo) {
    let out = ''
    for (const n of nodos) {
      const tope = pila[pila.length - 1]
      switch (n.tipo) {
        case 'texto': out += n.v; break
        case 'var': {
          const v = resolver(n.ruta, pila, archivo)
          out += v === null ? '' : String(v)
          break
        }
        case 'each': {
          if (tope.molde) throw new Error(`${archivo}: {{#each}} no se puede usar dentro de un molde`)
          const lista = resolver(n.ruta, pila, archivo)
          if (!Array.isArray(lista)) throw new Error(`${archivo}: "${n.ruta}" no es una lista`)
          lista.forEach((valor, index) => {
            out += render(n.hijos, [...pila, { valor, index, total: lista.length }], archivo)
          })
          break
        }
        case 'if': {
          if (tope.molde && n.ruta.startsWith('this.')) {
            const campo = n.ruta.slice(5)
            const siVerdad = n.neg ? n.no : n.si
            const siFalso = n.neg ? n.si : n.no
            out += `<span data-si="${campo}" style="display:contents">${render(siVerdad, pila, archivo)}</span>`
            if (siFalso.length) out += `<span data-no="${campo}" style="display:contents">${render(siFalso, pila, archivo)}</span>`
            break
          }
          const v = verdadero(resolver(n.ruta, pila, archivo, { opcional: true }))
          out += render(v !== n.neg ? n.si : n.no, pila, archivo)
          break
        }
        case 'parcial': out += render(plantilla(join('partials', `${n.nombre}.html`)), pila, archivo); break
        case 'incluir': out += leerSrc(n.ruta); break
        case 'json': out += JSON.stringify(resolver(n.ruta, pila, archivo)).replace(/</g, '\\u003c'); break
        case 'molde':
          out += render(plantilla(join('partials', `${n.nombre}.html`)), [...pila, { valor: TOKENS, molde: true, index: 0, total: 1 }], archivo)
          break
        case 'icono': {
          const nombre = tope.molde && n.ruta.startsWith('this.') ? ICONO_MOLDE : resolver(n.ruta, pila, archivo)
          out += icono(nombre, n.clases, archivo)
          break
        }
      }
    }
    return out
  }

  return {
    limpiar: () => cache.clear(),
    // Renderiza src/<rel> con un contexto (objeto) como raíz.
    renderizar: (rel, contexto) => render(plantilla(rel), [{ valor: contexto }], `src/${rel.replace(/\\/g, '/')}`),
  }
}
