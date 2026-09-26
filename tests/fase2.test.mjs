import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ayudasPosibles, dimensionar, validarContacto, validarCambioContacto, resumenDatos } from '../src/shared/logica.js'

test('resumenDatos: solo los campos conocidos, en orden, sin vacíos', () => {
  const campos = { titular: 'Titular', provincia: 'Provincia', cultivo: 'Cultivo' }
  assert.equal(resumenDatos({ cultivo: 'Olivar', titular: 'Agricultor', extra: 'x', provincia: '' }, campos), 'Titular: Agricultor; Cultivo: Olivar')
  assert.equal(resumenDatos({ kwp: 0 }, { kwp: 'kWp' }), 'kWp: 0') // el 0 es un dato, no un hueco
  assert.equal(resumenDatos({ kwp: 4.5, n: 12 }, { kwp: 'kWp', n: 'N' }), 'kWp: 4,5; N: 12') // decimales a la española
  assert.equal(resumenDatos(null, campos), '')
  assert.equal(resumenDatos({ a: 1 }, {}), '')
})

const PARAMS = {
  rendimiento: 0.5, sobredimensionado: 1.3, paso: 0.5, kwpMin: 1, panelKwp: 0.5, horasSolUtiles: 8, redondeoPrecio: 100,
  precioKwp: [[5, 1100, 1600], [15, 950, 1350], [null, 850, 1150]],
  consumoCultivo: { olivar: 25, almendro: 40 },
}

test('ayudasPosibles: una línea sin restricciones encaja siempre; las restringidas, solo si coinciden', () => {
  const lineas = [
    { id: 'todas' },
    { id: 'comunidades', titulares: ['comunidad'], provincias: ['jaen', 'granada'] },
    { id: 'sustituye', instalacion: ['sustituye_gasoil', 'sustituye_red'], concesion: ['si', 'tramite'] },
  ]
  const resp = { titular: 'agricultor', provincia: 'jaen', cultivo: 'olivar', concesion: 'si', instalacion: 'sustituye_gasoil' }
  assert.deepEqual(ayudasPosibles(resp, lineas).map((l) => l.id), ['todas', 'sustituye'])
  assert.deepEqual(ayudasPosibles({ ...resp, titular: 'comunidad', concesion: 'no', instalacion: 'nueva' }, lineas).map((l) => l.id), ['todas', 'comunidades'])
  assert.deepEqual(ayudasPosibles(resp, []), [])
})

test('dimensionar: la fórmula 2,725·Q·H y el rango de precio (ejemplo comprobado a mano)', () => {
  // H=60 m, Q=10 m³/h → P hidráulica = 2,725·10·60 = 1.635 W → /0,5 = 3.270 W (bomba) → ·1,3 = 4.251 W → 4,5 kWp
  const r = dimensionar({ modoCaudal: 'conocido', alturaM: '60', caudalM3h: '10', horasRiego: '8' }, PARAMS)
  assert.ok(r.ok)
  assert.equal(r.potHidraulicaKw, 1.64)
  assert.equal(r.potBombaKw, 3.3)
  assert.equal(r.kwp, 4.5)
  assert.equal(r.paneles, 9)
  assert.equal(r.precioMin, 4900) // 4,5 · 1.100 = 4.950 → 4.900
  assert.equal(r.precioMax, 7200) // 4,5 · 1.600 = 7.200
  assert.ok(r.precioMin < r.precioMax) // siempre un rango
  assert.equal(r.avisoHoras, false)
  assert.equal(r.caudalEstimado, false)
})

test('dimensionar: sin caudal, se estima con hectáreas · consumo del cultivo / horas', () => {
  // 12 ha de olivar · 25 m³/ha/día = 300 m³/día; en 10 h → 30 m³/h
  const r = dimensionar({ modoCaudal: 'estimar', alturaM: 50, hectareas: '12', cultivo: 'olivar', horasRiego: 10 }, PARAMS)
  assert.ok(r.ok && r.caudalEstimado)
  assert.equal(r.caudal, 30)
  // 2,725·30·50 = 4.087,5 W → /0,5 = 8.175 W → ·1,3 = 10.627,5 W → 11 kWp (tramo hasta 15: 950–1.350)
  assert.equal(r.kwp, 11)
  assert.equal(r.precioMin, 10400)
  assert.equal(r.precioMax, 14900)
  assert.equal(dimensionar({ modoCaudal: 'estimar', alturaM: 50, hectareas: '12', cultivo: 'olivar', horasRiego: 12 }, PARAMS).avisoHoras, true)
})

test('dimensionar: mínimo de kWp, redondeo hacia arriba y el último tramo sin tope', () => {
  const chica = dimensionar({ modoCaudal: 'conocido', alturaM: 5, caudalM3h: 1, horasRiego: 4 }, PARAMS)
  assert.equal(chica.kwp, 1) // nunca por debajo de kwpMin
  const grande = dimensionar({ modoCaudal: 'conocido', alturaM: 300, caudalM3h: 200, horasRiego: 8 }, PARAMS)
  assert.ok(grande.kwp > 15 && grande.precioMin === Math.floor((grande.kwp * 850) / 100) * 100)
})

test('dimensionar: valida entradas (altura, caudal, horas, hectáreas, cultivo)', () => {
  const mal = dimensionar({ modoCaudal: 'conocido', alturaM: '0', caudalM3h: 'mucho', horasRiego: '30' }, PARAMS)
  assert.ok(!mal.ok)
  assert.deepEqual(Object.keys(mal.errores).sort(), ['alturaM', 'caudalM3h', 'horasRiego'])
  const mal2 = dimensionar({ modoCaudal: 'estimar', alturaM: 40, hectareas: '', cultivo: 'nada', horasRiego: 8 }, PARAMS)
  assert.deepEqual(Object.keys(mal2.errores).sort(), ['cultivo', 'hectareas'])
  assert.ok(!dimensionar({ modoCaudal: 'conocido', alturaM: 40, caudalM3h: 600, horasRiego: 8 }, PARAMS).ok)
})

const contactoOk = () => ({ origen: 'ayudas', nombre: '  Ana Ruiz ', telefono: '600 11 22 33', consentimiento: true, avisoVersion: '2026-09', datos: { titular: 'agricultor', hectareas: 12, nuevo: true } })

test('validarContacto: alta correcta, limpia y guarda solo lo esperado', () => {
  const r = validarContacto({ ...contactoOk(), municipio: 'Úbeda', extra: 'no', datos: { titular: 'agricultor', hectareas: 12, nuevo: true, 'Mala clave': 1, obj: { x: 1 }, largo: 'x'.repeat(300) } })
  assert.ok(r.ok)
  assert.deepEqual(r.datos, {
    origen: 'ayudas', nombre: 'Ana Ruiz', telefono: '600 11 22 33', municipio: 'Úbeda', mensaje: null,
    datos: { titular: 'agricultor', hectareas: 12, nuevo: true, largo: 'x'.repeat(120) }, consentimiento: true, aviso_version: '2026-09',
  })
  assert.ok(!('extra' in r.datos))
})

test('validarContacto: consentimiento obligatorio, teléfono y origen válidos, robots detectados', () => {
  const sin = validarContacto({ ...contactoOk(), consentimiento: false })
  assert.ok(!sin.ok && sin.errores.consentimiento)
  assert.ok(!validarContacto({ ...contactoOk(), consentimiento: 'true' }).ok) // solo el booleano true vale
  assert.ok(validarContacto({ ...contactoOk(), telefono: '12' }).errores.telefono)
  assert.ok(validarContacto({ ...contactoOk(), nombre: '' }).errores.nombre)
  assert.ok(validarContacto({ ...contactoOk(), origen: 'otro' }).errores.origen)
  assert.ok(validarContacto({ ...contactoOk(), mensaje: 'x'.repeat(501) }).errores.mensaje)
  const robot = validarContacto({ ...contactoOk(), web: 'http://spam' })
  assert.ok(robot.spam && !robot.ok)
  assert.ok(!validarContacto(null).ok)
})

test('validarCambioContacto: solo estado válido y nota corta', () => {
  assert.deepEqual(validarCambioContacto({ estado: 'contactado' }).datos, { estado: 'contactado' })
  assert.deepEqual(validarCambioContacto({ nota_interna: '  Llamar el lunes ' }).datos, { nota_interna: 'Llamar el lunes' })
  assert.ok(!validarCambioContacto({ estado: 'borrado' }).ok)
  assert.ok(!validarCambioContacto({ nota_interna: 'x'.repeat(501) }).ok)
  assert.ok(!validarCambioContacto({}).ok)
  assert.ok(!('id' in validarCambioContacto({ estado: 'nuevo', id: 'x' }).datos))
})

/* ── Fase 3: calculadora v2 ── */
import { calcularAhorro } from '../src/shared/logica.js'

const CALC = {
  precioKwh: { gasoil: 0.3, red: 0.18 }, dimensionado: 0.9, kwpMin: 2, kwpMax: 150, panelKwp: 0.45, panelesMin: 5, pctMax: 0.95,
  co2Kwh: 0.2, co2PorLitroDiesel: 2.68, litrosPorKwh: 0.35, anios: 20, subidaEnergia: 0.03, degradacion: 0.005, mantenimientoAnualPct: 0.008,
  costeKwp: [[4, 1300], [10, 1050], [25, 900], [null, 820]],
  tipos: [{ id: 'particular', ratio: 0.75 }], captaciones: [{ id: 'pozo', produccionKwp: 1450 }, { id: 'balsa', produccionKwp: 1650 }],
}
const base = { fuente: 'gasoil', gastoGasoil: 180, gastoRed: 120, tipo: 'particular', captacion: 'pozo' }

test('calcularAhorro: gasóleo, ejemplo comprobado a mano', () => {
  // 180 €/mes → 2.160 €/año → 7.200 kWh a 0,30. kWp = 7.200·0,9/1.450 = 4,47 → 4,5. Generado 6.525 · 0,75 = 4.894 kWh útiles
  // → cubre 68 % → 1.468 €/año. Inversión 4,5 · 1.050 = 4.725 €.
  const r = calcularAhorro(base, CALC)
  assert.ok(r.ok)
  assert.equal(r.kWp, 4.5)
  assert.equal(r.ahorro, 1470)
  assert.equal(r.pct, 68)
  assert.equal(r.inversion, 4700)
  assert.equal(r.serie.length, 21)
  assert.equal(Math.round(r.serie[0]), -4725)
  assert.ok(r.amort > 3 && r.amort < 3.5)
  assert.ok(r.acum10 > 9000 && r.acum10 < 13000 && r.acum20 > r.acum10)
  // 4.894 kWh útiles · 0,35 L/kWh ≈ 1.713 L de gasóleo evitados al año
  assert.ok(Math.abs(r.litros - 1713) <= 2)
})

test('calcularAhorro: la fuente decide qué gasto cuenta (red, gasóleo o ambos)', () => {
  const g = calcularAhorro(base, CALC), red = calcularAhorro({ ...base, fuente: 'red' }, CALC), ambos = calcularAhorro({ ...base, fuente: 'ambos' }, CALC)
  assert.equal(red.gastoAnual, 120 * 12)
  assert.equal(red.litros, 0) // con red no hay gasóleo que evitar
  assert.equal(ambos.gastoAnual, (180 + 120) * 12)
  assert.ok(ambos.kWp > g.kWp && ambos.kWp > red.kWp)
  assert.ok(ambos.litros > 0 && ambos.litros < ambos.kWp * 1450 * 0.35)
  assert.ok(!calcularAhorro({ ...base, fuente: 'red', gastoRed: 0 }, CALC).ok)
})

test('calcularAhorro: kWp fijo del pre-dimensionado, tope de ahorro y proyección sin recuperación', () => {
  const fijo = calcularAhorro({ ...base, kwpFijo: 30 }, CALC)
  assert.equal(fijo.kWp, 30)
  assert.equal(fijo.pct, 95) // nunca más del 95 % del gasto
  assert.equal(fijo.inversion, 24600) // 30 kWp cae en el último tramo (sin tope): 30 · 820
  const poco = calcularAhorro({ ...base, gastoGasoil: 60, kwpFijo: 60 }, CALC) // instalación enorme para tan poco gasto
  assert.equal(poco.amort, null)
  assert.ok(poco.acum20 < 0)
})
