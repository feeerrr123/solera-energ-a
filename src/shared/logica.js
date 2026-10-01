// Lógica pura del panel y de la API. UNA sola copia: la importan el navegador
// (dist/shared/logica.js) y las funciones de api/ (mismo archivo, cero duplicación).
// Nada aquí toca la red, el DOM ni process.env — así se puede probar con `npm test`.

/* ───────────── formato ───────────── */

export const miles = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
export const decimal = (n, d = 1) => Number(n).toFixed(d).replace('.', ',')
export const rellenar = (plantilla, vars) =>
  String(plantilla).replace(/\{(\w+)\}/g, (m, k) => (k in vars && vars[k] !== undefined ? String(vars[k]) : m))
export const primerNombre = (cliente) => String(cliente || '').trim().split(/\s+/)[0] || ''
export const capitalizar = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

/* ───────────── fechas (siempre YYYY-MM-DD, hora de Madrid) ───────────── */

export function hoyISO(ahora = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(ahora)
}

export function esFechaISO(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const f = new Date(Date.UTC(y, m - 1, d))
  return f.getUTCFullYear() === y && f.getUTCMonth() === m - 1 && f.getUTCDate() === d
}

// Suma meses sin salirse de mes (31 ene + 1 mes = 28/29 feb).
export function sumarMeses(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12)
  const nm = total % 12
  const ultimo = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate()
  return `${ny}-${String(nm + 1).padStart(2, '0')}-${String(Math.min(d, ultimo)).padStart(2, '0')}`
}

export function diasEntre(desdeISO, hastaISO) {
  const t = (s) => Date.UTC(...s.split('-').map((v, i) => (i === 1 ? Number(v) - 1 : Number(v))))
  return Math.round((t(hastaISO) - t(desdeISO)) / 86400000)
}

/* ───────────── teléfono y WhatsApp ───────────── */

// Devuelve el número en formato internacional sin "+" (lo que quiere wa.me) o null.
// Sin prefijo, solo se aceptan móviles/fijos españoles (9 dígitos que empiezan por 6-9).
export function normalizarTelefono(t) {
  if (typeof t !== 'string') return null
  let d = t.trim().replace(/[^\d+]/g, '')
  let internacional = false
  if (d.startsWith('+')) { internacional = true; d = d.slice(1) }
  else if (d.startsWith('00')) { internacional = true; d = d.slice(2) }
  d = d.replace(/\D/g, '')
  if (!internacional && /^[6-9]\d{8}$/.test(d)) return `34${d}`
  if (/^34[6-9]\d{8}$/.test(d)) return d
  if (internacional && /^\d{8,15}$/.test(d)) return d
  return null
}

export function waLink(telefono, mensaje) {
  const n = normalizarTelefono(telefono)
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(mensaje)}` : null
}

/* ───────────── revisiones de mantenimiento ───────────── */

export const proximaRevision = (inst, meses) => sumarMeses(inst.ultima_revision || inst.fecha_instalacion, meses)

// estado: 'vencida' (ya pasó), 'proxima' (vence en ≤ avisoDias) u 'ok'
export function estadoRevision(inst, { meses, avisoDias }, hoy) {
  const vence = proximaRevision(inst, meses)
  const dias = diasEntre(hoy, vence)
  return { vence, dias, estado: dias < 0 ? 'vencida' : dias <= avisoDias ? 'proxima' : 'ok' }
}

export function revisionesPendientes(lista, opciones, hoy) {
  return lista
    .map((i) => ({ ...i, revision: estadoRevision(i, opciones, hoy) }))
    .filter((i) => i.revision.estado !== 'ok')
    .sort((a, b) => a.revision.dias - b.revision.dias)
}

/* ───────────── validación (la usa la API de verdad; el navegador solo para avisar antes) ───────────── */

const LIM = { cliente: 80, telefono: 30, municipio: 80, cultivo: 40, frase: 240, foto: 300 }

function numero(v) {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

// Valida y limpia. Devuelve { ok, errores: {campo: mensaje}, datos } — `datos` solo lleva
// campos conocidos (el resto se descarta: nadie puede colarnos columnas).
// `parcial: true` para PATCH: solo se validan los campos que vienen.
export function validarInstalacion(d, { parcial = false, hoy = hoyISO() } = {}) {
  const errores = {}
  const datos = {}
  const tiene = (k) => Object.prototype.hasOwnProperty.call(d, k)
  const texto = (k, max, { requerido = false } = {}) => {
    if (!tiene(k) && parcial) return
    const v = typeof d[k] === 'string' ? d[k].trim() : ''
    if (requerido && v.length < 2) errores[k] = 'obligatorio'
    else if (v.length > max) errores[k] = `máximo ${max} caracteres`
    else datos[k] = v || null
  }
  const cifra = (k, min, max) => {
    if (!tiene(k) && parcial) return
    const n = numero(d[k])
    if (n === null) datos[k] = null
    else if (Number.isNaN(n) || n <= min || n > max) errores[k] = `entre ${min} y ${max}`
    else datos[k] = n
  }

  texto('cliente', LIM.cliente, { requerido: true })
  texto('municipio', LIM.municipio)
  texto('cultivo', LIM.cultivo)
  cifra('hectareas', 0, 10000)
  cifra('potencia_kwp', 0, 1000)

  if (tiene('telefono') || !parcial) {
    const t = typeof d.telefono === 'string' ? d.telefono.trim() : ''
    if (!t) errores.telefono = 'obligatorio'
    else if (t.length > LIM.telefono || !normalizarTelefono(t)) errores.telefono = 'teléfono no válido'
    else datos.telefono = t
  }

  if (tiene('fecha_instalacion') || !parcial) {
    const f = d.fecha_instalacion
    if (!esFechaISO(f)) errores.fecha_instalacion = 'fecha no válida'
    else if (f < '2000-01-01' || f > hoy) errores.fecha_instalacion = 'no puede ser futura ni anterior al 2000'
    else datos.fecha_instalacion = f
  }

  if (tiene('ultima_revision')) {
    const f = d.ultima_revision
    if (f === null || f === '') datos.ultima_revision = null
    else if (!esFechaISO(f) || f > hoy) errores.ultima_revision = 'fecha no válida'
    else datos.ultima_revision = f
  }

  return { ok: Object.keys(errores).length === 0, errores, datos }
}

// Campos del caso de éxito. `fotoPrefijo`: la foto solo puede ser una de NUESTRO almacenamiento.
// `fotoMax`: largo máximo de la dirección (el modo demo del panel guarda la foto en el navegador).
export function validarCaso(d, { fotoPrefijo = '', fotoMax = LIM.foto } = {}) {
  const errores = {}
  const datos = {}
  const tiene = (k) => Object.prototype.hasOwnProperty.call(d, k)
  const bool = (k) => { if (tiene(k)) datos[k] = d[k] === true }
  const cifra = (k, min, max) => {
    if (!tiene(k)) return
    const n = numero(d[k])
    if (n === null) datos[k] = null
    else if (Number.isNaN(n) || n <= min || n > max) errores[k] = `entre ${min} y ${max}`
    else datos[k] = n
  }
  bool('es_caso_exito')
  bool('autoriza_publicar')
  cifra('gasto_anual_antes', 0, 1000000)
  cifra('ahorro_anual', 0, 1000000)
  cifra('amortizacion_anios', 0, 50)
  if (tiene('frase_cliente')) {
    const v = typeof d.frase_cliente === 'string' ? d.frase_cliente.trim() : ''
    if (v.length > LIM.frase) errores.frase_cliente = `máximo ${LIM.frase} caracteres`
    else datos.frase_cliente = v || null
  }
  if (tiene('foto_url')) {
    const v = d.foto_url
    if (v === null || v === '') datos.foto_url = null
    else if (typeof v !== 'string' || v.length > fotoMax || !fotoPrefijo || !v.startsWith(fotoPrefijo)) errores.foto_url = 'foto no válida'
    else datos.foto_url = v
  }
  return { ok: Object.keys(errores).length === 0, errores, datos }
}

// Para publicar un caso hace falta la autorización del cliente y las cifras clave.
export function puedePublicar(i) {
  return i.autoriza_publicar === true && Number(i.ahorro_anual) > 0 && Number(i.amortizacion_anios) > 0
}

export const MARCAS = ['resena', 'recordatorio', 'revision_hecha']

// Decide qué se cambia al editar una instalación (lo usan la API y el modo demo del panel, así
// las reglas son las mismas). `actual` = fila tal como está; `cuerpo` = lo que manda el usuario.
// Devuelve { cambios } o { errores, mensaje }.
export function prepararCambios(actual, cuerpo, { hoy = hoyISO(), ahoraISO = new Date().toISOString(), fotoPrefijo = '', fotoMax } = {}) {
  const inst = validarInstalacion(cuerpo, { parcial: true, hoy })
  const caso = validarCaso(cuerpo, { fotoPrefijo, fotoMax })
  const errores = { ...inst.errores, ...caso.errores }
  const cambios = { ...inst.datos, ...caso.datos }

  if (cuerpo.marcar !== undefined) {
    if (!MARCAS.includes(cuerpo.marcar)) errores.marcar = 'acción no válida'
    else if (cuerpo.marcar === 'resena') cambios.resena_pedida_en = ahoraISO
    else if (cuerpo.marcar === 'recordatorio') cambios.recordatorio_enviado_en = ahoraISO
    else cambios.ultima_revision = hoy
  }
  if (Object.keys(errores).length) return { errores, mensaje: 'Revisa los datos.' }
  if (!Object.keys(cambios).length) return { errores: {}, mensaje: 'No hay nada que cambiar.' }

  // Si el cliente retira su autorización, el caso deja de ser público en el acto. (Si en la MISMA
  // petición se pide publicar sin autorización, no se cancela en silencio: sale el error de abajo.)
  if (cambios.autoriza_publicar === false && cambios.es_caso_exito !== true) cambios.es_caso_exito = false

  const fusion = { ...actual, ...cambios }
  if (fusion.es_caso_exito && !puedePublicar(fusion)) {
    return {
      errores: { es_caso_exito: 'faltan datos o autorización' },
      mensaje: 'Para publicar un caso hace falta la autorización del cliente, el ahorro anual y los años de amortización.',
    }
  }
  return { cambios }
}

/* ───────────── lo que se ve en la web pública ───────────── */

// Lista blanca: NUNCA salen cliente ni teléfono.
export function casoPublico(i) {
  return {
    id: i.id,
    cultivo: i.cultivo ?? null,
    municipio: i.municipio ?? null,
    hectareas: i.hectareas ?? null,
    potencia_kwp: i.potencia_kwp ?? null,
    gasto_anual_antes: i.gasto_anual_antes ?? null,
    ahorro_anual: i.ahorro_anual ?? null,
    amortizacion_anios: i.amortizacion_anios ?? null,
    foto_url: i.foto_url ?? null,
    frase_cliente: i.frase_cliente ?? null,
    es_demo: i.es_demo === true,
    fecha_instalacion: i.fecha_instalacion ?? null,
  }
}

// Datos que rellenan el molde de tarjeta de caso (src/partials/caso-card.html).
export function datosTarjetaCaso(c, { atribucion = '' } = {}) {
  const ahorro = Number(c.ahorro_anual)
  const gasto = Number(c.gasto_anual_antes)
  return {
    id: `caso-${String(c.id).slice(0, 8)}`,
    tipo: capitalizar(c.cultivo || 'Explotación'),
    lugar: [c.municipio, c.potencia_kwp ? `${decimal(c.potencia_kwp, Number.isInteger(Number(c.potencia_kwp)) ? 0 : 1)} kWp` : null].filter(Boolean).join(' · '),
    titular: `Ahorra ${miles(ahorro)} €/año`,
    texto: '',
    hectareas: c.hectareas ? `${decimal(c.hectareas, Number.isInteger(Number(c.hectareas)) ? 0 : 1)} ha` : '—',
    amortizacion: `${decimal(c.amortizacion_anios)} años`,
    reduccion: gasto > 0 ? `−${Math.round((ahorro / gasto) * 100)} %` : '—',
    frase: c.frase_cliente || '',
    atribucion: c.frase_cliente ? rellenar(atribucion, { cultivo: c.cultivo || 'explotación', municipio: c.municipio || '' }).replace(/,\s*$/, '') : '',
    foto: c.foto_url || '',
    ilustrativo: c.es_demo === true,
  }
}

/* ───────────── FASE 2 · comprobador de ayudas ───────────── */

// `resp`: { titular, provincia, cultivo, concesion, instalacion } (ids del formulario).
// Cada línea de la config puede limitar por titulares / provincias / cultivos / concesion /
// instalacion; un campo ausente o vacío = "cualquiera". Devuelve las líneas que encajan.
// NO promete nada: solo decide qué líneas merece la pena revisar en ese caso.
export function ayudasPosibles(resp, lineas) {
  const encaja = (lista, valor) => !Array.isArray(lista) || lista.length === 0 || lista.includes(valor)
  return lineas.filter(
    (l) => encaja(l.titulares, resp.titular) && encaja(l.provincias, resp.provincia) && encaja(l.cultivos, resp.cultivo)
      && encaja(l.concesion, resp.concesion) && encaja(l.instalacion, resp.instalacion)
  )
}

/* ───────────── FASE 2 · pre-dimensionado orientativo ───────────── */

const redondearArriba = (n, paso) => Math.ceil(n / paso - 1e-9) * paso
const r1 = (n) => Math.round(n * 10) / 10
const r2 = (n) => Math.round(n * 100) / 100

// Potencia hidráulica (W) = 2,725 · Q (m³/h) · H (m)   [ρ·g/3600 con ρ = 1000 kg/m³, g = 9,81 m/s²]
// Potencia eléctrica de la bomba = hidráulica / rendimiento; kWp = eléctrica · sobredimensionado.
// `p` = parámetros de la config: rendimiento, sobredimensionado, paso, kwpMin, panelKwp, horasSolUtiles,
// redondeoPrecio, precioKwp [[hasta_kWp, €/kWp mín, €/kWp máx]] (último tramo: hasta = null),
// consumoCultivo { cultivo: m³/ha/día en la semana punta }.
// Siempre devuelve un RANGO de precio (mín < máx), nunca una cifra cerrada.
export function dimensionar(e, p) {
  const errores = {}
  const H = numero(e.alturaM)
  const horas = numero(e.horasRiego)
  if (!(H >= 1 && H <= 500)) errores.alturaM = 'entre 1 y 500 m'
  if (!(horas >= 1 && horas <= 24)) errores.horasRiego = 'entre 1 y 24 horas'

  let Q = null
  let estimado = false
  if (e.modoCaudal === 'estimar') {
    const ha = numero(e.hectareas)
    const consumo = p.consumoCultivo[e.cultivo]
    if (!(ha > 0 && ha <= 2000)) errores.hectareas = 'entre 0,1 y 2.000 ha'
    if (!consumo) errores.cultivo = 'elige un cultivo'
    if (!errores.hectareas && !errores.cultivo && !errores.horasRiego) Q = (ha * consumo) / horas
    estimado = true
  } else {
    Q = numero(e.caudalM3h)
    if (!(Q >= 0.5 && Q <= 500)) errores.caudalM3h = 'entre 0,5 y 500 m³/h'
  }
  if (Object.keys(errores).length || Q === null) return { ok: false, errores }

  const pHid = 2.725 * Q * H
  const pEl = pHid / p.rendimiento
  const kwp = Math.max(p.kwpMin, redondearArriba((pEl * p.sobredimensionado) / 1000, p.paso))
  const tramo = p.precioKwp.find(([hasta]) => hasta === null || kwp <= hasta)
  return {
    ok: true,
    errores: {},
    caudal: r1(Q),
    caudalEstimado: estimado,
    altura: H,
    horas,
    potHidraulicaKw: r2(pHid / 1000),
    potBombaKw: r1(pEl / 1000),
    kwp,
    paneles: Math.ceil(kwp / p.panelKwp - 1e-9),
    precioMin: Math.floor((kwp * tramo[1]) / p.redondeoPrecio) * p.redondeoPrecio,
    precioMax: Math.ceil((kwp * tramo[2]) / p.redondeoPrecio) * p.redondeoPrecio,
    avisoHoras: horas > p.horasSolUtiles,
  }
}

/* ───────────── FASE 2 · contactos (los que llegan de la web pública) ───────────── */

export const ESTADOS_CONTACTO = ['nuevo', 'contactado', 'descartado']
export const ORIGENES_CONTACTO = ['ayudas', 'dimensionado', 'calculadora', 'contacto']

// Lo que el usuario metió en la herramienta: solo textos cortos, números y sí/no, con nombres de
// campo simples. Todo lo demás se descarta (no se guarda nada que no esperemos).
function limpiarDatos(d) {
  const salida = {}
  if (!d || typeof d !== 'object' || Array.isArray(d)) return salida
  for (const [k, v] of Object.entries(d).slice(0, 15)) {
    if (!/^[a-z][a-zA-Z0-9_]{0,29}$/.test(k)) continue
    if (typeof v === 'string') salida[k] = v.trim().slice(0, 120)
    else if (typeof v === 'number' && Number.isFinite(v)) salida[k] = v
    else if (typeof v === 'boolean') salida[k] = v
  }
  return salida
}

// `b.web` es un campo trampa (oculto para las personas): si viene relleno es un robot.
export function validarContacto(b, { origenes = ORIGENES_CONTACTO } = {}) {
  if (!b || typeof b !== 'object') return { ok: false, spam: false, errores: { origen: 'petición no válida' }, datos: null }
  if (b.web) return { ok: false, spam: true, errores: {}, datos: null }
  const errores = {}
  const texto = (v, max) => (typeof v === 'string' ? v.trim() : '').slice(0, max + 1)

  const nombre = texto(b.nombre, 80)
  if (nombre.length < 2) errores.nombre = 'obligatorio'
  else if (nombre.length > 80) errores.nombre = 'máximo 80 caracteres'

  const telefono = texto(b.telefono, 30)
  if (!telefono) errores.telefono = 'obligatorio'
  else if (telefono.length > 30 || !normalizarTelefono(telefono)) errores.telefono = 'teléfono no válido'

  const municipio = texto(b.municipio, 80)
  if (municipio.length > 80) errores.municipio = 'máximo 80 caracteres'
  const mensaje = texto(b.mensaje, 500)
  if (mensaje.length > 500) errores.mensaje = 'máximo 500 caracteres'

  if (!origenes.includes(b.origen)) errores.origen = 'origen no válido'
  if (b.consentimiento !== true) errores.consentimiento = 'hace falta aceptar el aviso de privacidad'

  const datos = limpiarDatos(b.datos)
  if (JSON.stringify(datos).length > 2000) errores.datos = 'demasiado grande'

  const avisoVersion = texto(b.avisoVersion, 20).slice(0, 20)
  return {
    ok: Object.keys(errores).length === 0,
    spam: false,
    errores,
    datos: { origen: b.origen, nombre, telefono, municipio: municipio || null, mensaje: mensaje || null, datos, consentimiento: true, aviso_version: avisoVersion || null },
  }
}

// Cambios que el panel puede hacer sobre un contacto recibido.
export function validarCambioContacto(b) {
  const errores = {}
  const datos = {}
  const tiene = (k) => Object.prototype.hasOwnProperty.call(b || {}, k)
  if (tiene('estado')) {
    if (ESTADOS_CONTACTO.includes(b.estado)) datos.estado = b.estado
    else errores.estado = 'estado no válido'
  }
  if (tiene('nota_interna')) {
    const v = typeof b.nota_interna === 'string' ? b.nota_interna.trim() : ''
    if (v.length > 500) errores.nota_interna = 'máximo 500 caracteres'
    else datos.nota_interna = v || null
  }
  if (!Object.keys(errores).length && !Object.keys(datos).length) errores.estado = 'no hay nada que cambiar'
  return { ok: Object.keys(errores).length === 0, errores, datos }
}

// "Titular: Agricultor; Provincia: Jaén; …" — los campos conocidos de `campos`, en su orden, sin los vacíos.
export function resumenDatos(datos, campos) {
  return Object.entries(campos)
    .filter(([k]) => datos && datos[k] !== undefined && datos[k] !== null && datos[k] !== '')
    .map(([k, etiqueta]) => `${etiqueta}: ${typeof datos[k] === 'number' ? datos[k].toLocaleString('es-ES', { maximumFractionDigits: 2 }) : datos[k]}`)
    .join('; ')
}

/* ───────────── FASE 3 · calculadora de ahorro v2 ───────────── */

// Ahorro de pasar el bombeo a solar. Entrada: fuente ('gasoil' | 'red' | 'ambos'), gastoGasoil y gastoRed
// (€/mes; solo cuenta el que corresponde a la fuente), tipo, captacion (ids de `p`) y, opcional, kwpFijo
// (los kWp del pre-dimensionado). `p` = calculadora.parametros de la config.
// Cada kWh de bombeo se valora al precio de su fuente; el ahorro es la parte de ese gasto que cubre la
// instalación (limitada por `pctMax`). Serie a `p.anios` años: el ahorro sube con el precio de la energía
// (`subidaEnergia`), baja con la degradación de los paneles y resta el mantenimiento anual.
export function calcularAhorro(e, p) {
  const gGas = e.fuente === 'red' ? 0 : Number(e.gastoGasoil) || 0
  const gRed = e.fuente === 'gasoil' ? 0 : Number(e.gastoRed) || 0
  const tipo = p.tipos.find((t) => t.id === e.tipo) || p.tipos[0]
  const capt = p.captaciones.find((c) => c.id === e.captacion) || p.captaciones[0]
  const gastoAnual = (gGas + gRed) * 12
  if (!(gastoAnual > 0)) return { ok: false }

  const kwhGas = (gGas * 12) / p.precioKwh.gasoil
  const kwhRed = (gRed * 12) / p.precioKwh.red
  const consumo = kwhGas + kwhRed
  const prod = capt.produccionKwp
  const sugeridos = Math.round(((consumo * p.dimensionado) / prod) * 2) / 2
  const kWp = e.kwpFijo > 0 ? Number(e.kwpFijo) : Math.min(Math.max(sugeridos, p.kwpMin), p.kwpMax)
  const autoc = Math.min(kWp * prod * tipo.ratio, consumo)
  const cobertura = Math.min(p.pctMax, autoc / consumo)
  const ahorro = gastoAnual * cobertura
  const tramo = p.costeKwp.find(([hasta]) => hasta === null || kWp < hasta)
  const inversion = kWp * tramo[1]
  const mant = inversion * p.mantenimientoAnualPct
  const factor = (1 + p.subidaEnergia) * (1 - p.degradacion)

  let acum = -inversion
  let amort = null
  const serie = [acum]
  for (let y = 1; y <= p.anios; y++) {
    const neto = ahorro * factor ** (y - 1) - mant
    const antes = acum
    acum += neto
    serie.push(acum)
    if (amort === null && acum >= 0 && neto > 0) amort = y - 1 + -antes / neto
  }
  const parteGas = kwhGas / consumo
  const litros = autoc * parteGas * p.litrosPorKwh
  return {
    ok: true,
    fuente: e.fuente,
    gastoAnual,
    kWp,
    paneles: Math.max(p.panelesMin, Math.round(kWp / p.panelKwp)),
    ahorro: Math.round(ahorro / 10) * 10,
    pct: Math.round(cobertura * 100),
    amort, // años, o null si no se recupera dentro de la serie
    inversion: Math.round(inversion / 100) * 100,
    acum10: Math.round(serie[10] / 100) * 100,
    acum20: Math.round(serie[p.anios] / 100) * 100,
    serie, // acumulado (€, con signo) de 0 a `anios`
    litros: Math.round(litros),
    co2: Math.round((litros * p.co2PorLitroDiesel + autoc * (1 - parteGas) * p.co2Kwh) / 10) * 10,
  }
}

/* ───────────── FASE 4 · noticias (BOJA → n8n → borrador → panel → web) ───────────── */

export const ESTADOS_NOTICIA = ['borrador', 'publicada', 'descartada']
// De dónde pueden venir los enlaces de una noticia (boletines oficiales). Un enlace de otro sitio
// no entra aunque traiga la clave: así, si la clave se filtrara, no se podría colar un enlace malicioso.
export const DOMINIOS_NOTICIA = ['juntadeandalucia.es', 'boe.es']
const LIM_NOTICIA = { titulo: 400, resumen: 1200, enlace: 500, coincide: 200, fuente: 40 }

// Regla de la casa para ayudas: en la web nunca salen importes ("12.000 €", "30 %", "5 millones de euros").
export const contieneImporte = (t) => /\d[\d.,]*\s*(€|euros?\b|%|millones)/i.test(String(t || ''))

export function enlaceNoticiaValido(url, dominios = DOMINIOS_NOTICIA) {
  let u
  try { u = new URL(String(url)) } catch { return false }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
  const host = u.hostname.toLowerCase()
  return dominios.some((d) => host === d || host.endsWith(`.${d}`))
}

// Lo que manda n8n a POST /api/noticias. SIEMPRE entra como borrador: publicar es cosa del panel.
export function validarNoticiaEntrante(b, { dominios = DOMINIOS_NOTICIA } = {}) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { ok: false, errores: { titulo: 'petición no válida' }, datos: null }
  const errores = {}
  const texto = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '').slice(0, max + 1)

  const titulo = texto(b.titulo, LIM_NOTICIA.titulo)
  if (titulo.length < 5) errores.titulo = 'obligatorio'
  else if (titulo.length > LIM_NOTICIA.titulo) errores.titulo = `máximo ${LIM_NOTICIA.titulo} caracteres`

  const enlace = typeof b.enlace === 'string' ? b.enlace.trim() : ''
  if (!enlace) errores.enlace = 'obligatorio'
  else if (enlace.length > LIM_NOTICIA.enlace || !enlaceNoticiaValido(enlace, dominios)) errores.enlace = 'enlace no válido (solo boletines oficiales)'

  const resumen = typeof b.resumen === 'string' ? b.resumen.trim().slice(0, LIM_NOTICIA.resumen + 1) : ''
  if (resumen.length > LIM_NOTICIA.resumen) errores.resumen = `máximo ${LIM_NOTICIA.resumen} caracteres`

  // La fecha puede venir como "2026-09-28" o como "2026-09-28T00:00:00.000Z" (lo que da el RSS).
  const fecha = typeof b.fecha === 'string' ? b.fecha.trim().slice(0, 10) : ''
  if (fecha && !esFechaISO(fecha)) errores.fecha = 'fecha no válida'

  return {
    ok: Object.keys(errores).length === 0,
    errores,
    datos: {
      titulo,
      enlace,
      resumen: resumen || null,
      fecha_publicacion: fecha || null,
      coincide: texto(b.coincide, LIM_NOTICIA.coincide).slice(0, LIM_NOTICIA.coincide) || null,
      fuente: texto(b.fuente, LIM_NOTICIA.fuente).slice(0, LIM_NOTICIA.fuente) || 'BOJA',
      estado: 'borrador',
    },
  }
}

// Cambios que el panel puede hacer sobre una noticia. `actual` = la fila tal como está (para saber
// si al publicar ya tiene resumen). Publicar exige resumen y que no haya importes en él.
export function validarCambioNoticia(b, actual = {}, { ahoraISO = new Date().toISOString() } = {}) {
  const errores = {}
  const datos = {}
  const tiene = (k) => Object.prototype.hasOwnProperty.call(b || {}, k)
  if (tiene('titulo')) {
    const v = typeof b.titulo === 'string' ? b.titulo.replace(/\s+/g, ' ').trim() : ''
    if (v.length < 5) errores.titulo = 'obligatorio'
    else if (v.length > LIM_NOTICIA.titulo) errores.titulo = `máximo ${LIM_NOTICIA.titulo} caracteres`
    else datos.titulo = v
  }
  if (tiene('resumen')) {
    const v = typeof b.resumen === 'string' ? b.resumen.trim() : ''
    if (v.length > LIM_NOTICIA.resumen) errores.resumen = `máximo ${LIM_NOTICIA.resumen} caracteres`
    else datos.resumen = v || null
  }
  if (tiene('estado')) {
    if (ESTADOS_NOTICIA.includes(b.estado)) datos.estado = b.estado
    else errores.estado = 'estado no válido'
  }
  if (!Object.keys(errores).length && !Object.keys(datos).length) errores.estado = 'no hay nada que cambiar'

  const final = { ...actual, ...datos }
  if (final.estado === 'publicada' && !errores.resumen) {
    if (!final.resumen) errores.resumen = 'Escribe un resumen antes de publicar.'
    else if (contieneImporte(final.resumen)) errores.resumen = 'Quita los importes y porcentajes del resumen: en la web nunca se prometen cantidades.'
  }
  if (datos.estado === 'publicada' && actual.estado !== 'publicada') datos.publicada_en = ahoraISO
  if (datos.estado && datos.estado !== 'publicada') datos.publicada_en = null
  return { ok: Object.keys(errores).length === 0, errores, datos }
}

// Lista blanca de lo que sale en la web pública (ni estado, ni palabras clave, ni fechas internas).
export function noticiaPublica(n) {
  return {
    id: n.id,
    titulo: n.titulo,
    resumen: n.resumen ?? null,
    enlace: n.enlace,
    fuente: n.fuente || 'BOJA',
    fecha_publicacion: n.fecha_publicacion ?? null,
    es_demo: n.es_demo === true,
  }
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export function fechaLarga(iso) {
  if (!esFechaISO(String(iso || '').slice(0, 10))) return ''
  const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return `${d} de ${MESES[m - 1]} de ${a}`
}

// Datos que rellenan el molde de tarjeta de noticia (src/partials/noticia-card.html).
export function datosTarjetaNoticia(n) {
  return {
    id: `noticia-${String(n.id).slice(0, 8)}`,
    titulo: n.titulo || '',
    resumen: n.resumen || '',
    enlace: enlaceNoticiaValido(n.enlace) ? n.enlace : '',
    fuente: n.fuente || 'BOJA',
    fecha: fechaLarga(n.fecha_publicacion),
    ejemplo: n.es_demo === true,
  }
}
