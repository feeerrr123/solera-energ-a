import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  miles, decimal, rellenar, primerNombre, hoyISO, esFechaISO, sumarMeses, diasEntre,
  normalizarTelefono, waLink, proximaRevision, estadoRevision, revisionesPendientes,
  validarInstalacion, validarCaso, puedePublicar, casoPublico, datosTarjetaCaso,
} from '../src/shared/logica.js'

test('formato: miles con punto también en 4 cifras, decimales con coma', () => {
  assert.equal(miles(1410), '1.410')
  assert.equal(miles(999), '999')
  assert.equal(miles(1234567), '1.234.567')
  assert.equal(decimal(2.84), '2,8')
  assert.equal(decimal(9, 0), '9')
})

test('rellenar cambia {claves} y deja las que no conoce', () => {
  assert.equal(rellenar('Hola {nombre}, {enlace} {x}', { nombre: 'Ana', enlace: 'L' }), 'Hola Ana, L {x}')
  assert.equal(primerNombre('  María del Mar Ruiz '), 'María')
  assert.equal(primerNombre(''), '')
})

test('fechas: hoy en hora de Madrid, validez y suma de meses sin salirse de mes', () => {
  assert.equal(hoyISO(new Date('2026-03-01T23:30:00Z')), '2026-03-02') // ya es día 2 en Madrid
  assert.equal(hoyISO(new Date('2026-07-15T10:00:00Z')), '2026-07-15')
  assert.ok(esFechaISO('2024-02-29'))
  assert.ok(!esFechaISO('2025-02-29'))
  assert.ok(!esFechaISO('2025-13-01'))
  assert.ok(!esFechaISO('25-01-01'))
  assert.equal(sumarMeses('2025-01-31', 1), '2025-02-28')
  assert.equal(sumarMeses('2024-01-31', 1), '2024-02-29')
  assert.equal(sumarMeses('2025-11-15', 3), '2026-02-15')
  assert.equal(sumarMeses('2025-05-10', 12), '2026-05-10')
  assert.equal(diasEntre('2026-01-01', '2026-01-31'), 30)
  assert.equal(diasEntre('2026-03-01', '2026-02-01'), -28)
})

test('teléfonos: españoles con o sin prefijo, extranjeros solo con + o 00, basura fuera', () => {
  assert.equal(normalizarTelefono('600 11 22 33'), '34600112233')
  assert.equal(normalizarTelefono('+34 600-112-233'), '34600112233')
  assert.equal(normalizarTelefono('0034 953 37 98 79'), '34953379879')
  assert.equal(normalizarTelefono('34600112233'), '34600112233')
  assert.equal(normalizarTelefono('+44 7911 123456'), '447911123456')
  assert.equal(normalizarTelefono('123456789'), null) // 9 dígitos que no son de España y sin prefijo
  assert.equal(normalizarTelefono('60011'), null)
  assert.equal(normalizarTelefono('abc'), null)
  assert.equal(normalizarTelefono(null), null)
})

test('waLink codifica el mensaje y devuelve null si el teléfono no vale', () => {
  assert.equal(waLink('600112233', 'Hola, ¿qué tal?'), 'https://wa.me/34600112233?text=Hola%2C%20%C2%BFqu%C3%A9%20tal%3F')
  assert.equal(waLink('xx', 'Hola'), null)
})

test('revisión: desde la última revisión si la hay; si no, desde la instalación', () => {
  const inst = { fecha_instalacion: '2025-03-10', ultima_revision: null }
  assert.equal(proximaRevision(inst, 12), '2026-03-10')
  assert.equal(proximaRevision({ ...inst, ultima_revision: '2026-01-05' }, 12), '2027-01-05')
})

test('estado de revisión: vencida / próxima / ok según el aviso', () => {
  const o = { meses: 12, avisoDias: 30 }
  const inst = { fecha_instalacion: '2025-03-10' } // vence 2026-03-10
  assert.deepEqual(estadoRevision(inst, o, '2026-03-11'), { vence: '2026-03-10', dias: -1, estado: 'vencida' })
  assert.equal(estadoRevision(inst, o, '2026-03-10').estado, 'proxima') // hoy mismo: aún no vencida
  assert.equal(estadoRevision(inst, o, '2026-02-08').estado, 'proxima') // 30 días
  assert.equal(estadoRevision(inst, o, '2026-02-07').estado, 'ok') // 31 días
})

test('revisionesPendientes: solo las que tocan, las más urgentes primero', () => {
  const o = { meses: 12, avisoDias: 30 }
  const lista = [
    { id: 'a', fecha_instalacion: '2025-06-01' }, // vence 2026-06-01 → ok
    { id: 'b', fecha_instalacion: '2025-03-20' }, // vence 2026-03-20 → próxima
    { id: 'c', fecha_instalacion: '2024-12-01' }, // vence 2025-12-01 → vencida
    { id: 'd', fecha_instalacion: '2024-12-01', ultima_revision: '2026-02-20' }, // hecha hace poco → ok
  ]
  assert.deepEqual(revisionesPendientes(lista, o, '2026-03-01').map((i) => i.id), ['c', 'b'])
})

test('validarInstalacion: alta correcta limpia espacios y pone null en lo opcional', () => {
  const r = validarInstalacion(
    { cliente: '  Ana Ruiz ', telefono: '600 11 22 33', fecha_instalacion: '2026-01-10', hectareas: '12,5', potencia_kwp: '9', extra: 'no' },
    { hoy: '2026-03-01' }
  )
  assert.ok(r.ok)
  assert.deepEqual(r.datos, {
    cliente: 'Ana Ruiz', municipio: null, cultivo: null, hectareas: 12.5, potencia_kwp: 9,
    telefono: '600 11 22 33', fecha_instalacion: '2026-01-10',
  })
  assert.ok(!('extra' in r.datos)) // lo desconocido se descarta
})

test('validarInstalacion: errores por campo (obligatorios, teléfono, fecha futura, números)', () => {
  const r = validarInstalacion({ cliente: '', telefono: '12', fecha_instalacion: '2027-01-01', hectareas: 'mucho', potencia_kwp: -3 }, { hoy: '2026-03-01' })
  assert.ok(!r.ok)
  assert.deepEqual(Object.keys(r.errores).sort(), ['cliente', 'fecha_instalacion', 'hectareas', 'potencia_kwp', 'telefono'])
})

test('validarInstalacion parcial: solo valida lo que llega', () => {
  const r = validarInstalacion({ municipio: 'Úbeda' }, { parcial: true })
  assert.ok(r.ok)
  assert.deepEqual(r.datos, { municipio: 'Úbeda' })
  const mala = validarInstalacion({ ultima_revision: '2999-01-01' }, { parcial: true, hoy: '2026-03-01' })
  assert.ok(!mala.ok)
})

test('validarCaso: cifras, frase, y la foto solo puede ser de nuestro almacenamiento', () => {
  const pref = 'https://x.supabase.co/storage/v1/object/public/casos/'
  const ok = validarCaso({ es_caso_exito: true, autoriza_publicar: true, gasto_anual_antes: '4.000'.replace('.', ''), ahorro_anual: 3120, amortizacion_anios: '2,8', frase_cliente: ' Muy contento ', foto_url: pref + 'a.jpg', es_demo: true, id: 'no' }, { fotoPrefijo: pref })
  assert.ok(ok.ok)
  assert.deepEqual(ok.datos, { es_caso_exito: true, autoriza_publicar: true, gasto_anual_antes: 4000, ahorro_anual: 3120, amortizacion_anios: 2.8, frase_cliente: 'Muy contento', foto_url: pref + 'a.jpg' })
  assert.ok(!('es_demo' in ok.datos)) // es_demo no lo puede tocar nadie desde fuera
  assert.ok(!validarCaso({ foto_url: 'https://evil.com/a.jpg' }, { fotoPrefijo: pref }).ok)
  assert.ok(!validarCaso({ foto_url: pref + 'a.jpg' }).ok) // sin prefijo configurado, ninguna foto vale
  assert.ok(!validarCaso({ frase_cliente: 'x'.repeat(241) }).ok)
  assert.ok(!validarCaso({ amortizacion_anios: 80 }).ok)
})

test('puedePublicar exige autorización del cliente y cifras clave', () => {
  assert.ok(puedePublicar({ autoriza_publicar: true, ahorro_anual: 100, amortizacion_anios: 3 }))
  assert.ok(!puedePublicar({ autoriza_publicar: false, ahorro_anual: 100, amortizacion_anios: 3 }))
  assert.ok(!puedePublicar({ autoriza_publicar: true, ahorro_anual: 0, amortizacion_anios: 3 }))
  assert.ok(!puedePublicar({ autoriza_publicar: true, ahorro_anual: 100 }))
})

test('casoPublico NUNCA deja salir cliente ni teléfono', () => {
  const c = casoPublico({ id: '1', cliente: 'Ana Ruiz', telefono: '600112233', cultivo: 'olivar', municipio: 'Úbeda', ahorro_anual: 100, resena_pedida_en: 'x', autoriza_publicar: true })
  assert.deepEqual(Object.keys(c).sort(), ['ahorro_anual', 'amortizacion_anios', 'cultivo', 'es_demo', 'fecha_instalacion', 'foto_url', 'frase_cliente', 'gasto_anual_antes', 'hectareas', 'id', 'municipio', 'potencia_kwp'])
  assert.ok(!JSON.stringify(c).includes('Ana') && !JSON.stringify(c).includes('600112233'))
})

test('datosTarjetaCaso destaca los números y anonimiza la atribución', () => {
  const t = datosTarjetaCaso(
    { id: 'abcdef123456', cultivo: 'olivar', municipio: 'Úbeda', hectareas: 15, potencia_kwp: 9, gasto_anual_antes: 4000, ahorro_anual: 3120, amortizacion_anios: 2.8, frase_cliente: 'El pozo se paga solo.', es_demo: true },
    { atribucion: 'Titular de explotación de {cultivo}, {municipio}' }
  )
  assert.deepEqual(t, {
    id: 'caso-abcdef12', tipo: 'Olivar', lugar: 'Úbeda · 9 kWp', titular: 'Ahorra 3.120 €/año', texto: '',
    hectareas: '15 ha', amortizacion: '2,8 años', reduccion: '−78 %', frase: 'El pozo se paga solo.',
    atribucion: 'Titular de explotación de olivar, Úbeda', foto: '', ilustrativo: true,
  })
  const sin = datosTarjetaCaso({ id: 'z', ahorro_anual: 500, amortizacion_anios: 4 })
  assert.equal(sin.hectareas, '—')
  assert.equal(sin.reduccion, '—')
  assert.equal(sin.atribucion, '')
  assert.equal(sin.ilustrativo, false)
})

test('prepararCambios: marcar, autorización, despublicar y fusión con lo actual', async () => {
  const { prepararCambios } = await import('../src/shared/logica.js')
  const base = { id: 'x', fecha_instalacion: '2025-06-10', es_caso_exito: false, autoriza_publicar: false }
  const o = { hoy: '2026-03-01', ahoraISO: '2026-03-01T10:00:00.000Z', fotoPrefijo: 'https://f/' }

  assert.deepEqual(prepararCambios(base, { marcar: 'resena' }, o).cambios, { resena_pedida_en: '2026-03-01T10:00:00.000Z' })
  assert.deepEqual(prepararCambios(base, { marcar: 'revision_hecha' }, o).cambios, { ultima_revision: '2026-03-01' })
  assert.ok(prepararCambios(base, { marcar: 'otra' }, o).errores.marcar)
  assert.equal(prepararCambios(base, { nada: 1 }, o).mensaje, 'No hay nada que cambiar.')

  // publicar sin autorización: no; con autorización y cifras (aunque lleguen en pasos distintos): sí
  assert.ok(prepararCambios(base, { es_caso_exito: true, ahorro_anual: 100, amortizacion_anios: 3 }, o).errores.es_caso_exito)
  const conAut = { ...base, autoriza_publicar: true, ahorro_anual: 100, amortizacion_anios: 3 }
  assert.equal(prepararCambios(conAut, { es_caso_exito: true }, o).cambios.es_caso_exito, true)

  // retirar la autorización de un caso publicado lo despublica
  const publicado = { ...conAut, es_caso_exito: true }
  assert.deepEqual(prepararCambios(publicado, { autoriza_publicar: false }, o).cambios, { autoriza_publicar: false, es_caso_exito: false })

  // pedir publicar SIN autorización (aunque llegue autoriza_publicar:false en la misma petición) es un error, no un "guardado" silencioso
  const intento = prepararCambios(base, { es_caso_exito: true, autoriza_publicar: false, ahorro_anual: 100, amortizacion_anios: 3 }, o)
  assert.ok(intento.errores.es_caso_exito && !intento.cambios)

  // un caso publicado no puede quedarse sin sus cifras
  assert.ok(prepararCambios(publicado, { ahorro_anual: null }, o).errores.es_caso_exito)

  // foto: solo de nuestro almacenamiento (y el modo demo puede ampliar el largo máximo)
  assert.ok(prepararCambios(base, { foto_url: 'https://otro/x.jpg' }, o).errores.foto_url)
  assert.equal(prepararCambios(base, { foto_url: 'https://f/a.jpg' }, o).cambios.foto_url, 'https://f/a.jpg')
  const larga = 'data:image/jpeg;base64,' + 'A'.repeat(5000)
  assert.ok(prepararCambios(base, { foto_url: larga }, { ...o, fotoPrefijo: 'data:image/' }).errores.foto_url)
  assert.equal(prepararCambios(base, { foto_url: larga }, { ...o, fotoPrefijo: 'data:image/', fotoMax: 400000 }).cambios.foto_url, larga)
})
