// Panel interno. Dos "almacenes" con la misma forma: Api (Supabase, tras iniciar sesión) y Local
// (modo demo: datos de ejemplo en este navegador, para poder probar el panel sin cuentas).
// Los textos vienen de la config (window.PANEL); las reglas, de shared/logica.js (las mismas que usa el servidor).
import {
  hoyISO, sumarMeses, rellenar, primerNombre, capitalizar, waLink, revisionesPendientes,
  validarInstalacion, prepararCambios, datosTarjetaCaso, validarCambioContacto, resumenDatos,
} from './shared/logica.js'
import { crearTarjeta } from './shared/tarjeta.js'

const P = window.PANEL
const T = P.textos
const L = window.LEAD // textos y orígenes de los formularios públicos (contactos)
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const num = (n) => Number(n).toLocaleString('es-ES', { maximumFractionDigits: 2 })
const fechaES = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '')
const opcionesRev = () => ({ meses: P.mantenimientoMeses, avisoDias: P.avisoDias })

let modo = 'api' // 'api' | 'local'
let datos = null
let instalaciones = []
let contactos = []
let idEdicion = null // instalación que se edita (null = alta nueva)
let idCaso = null // instalación cuyo caso se edita
let fotoActual = null

/* ───────────── avisos y vistas ───────────── */

function aviso(texto, error = false) {
  const el = document.createElement('div')
  el.className = `pointer-events-auto mb-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-field-lift ${error ? 'bg-ochre-deep text-paper-raised' : 'bg-olive text-[#f1efe3]'}`
  el.textContent = texto
  $('#aviso').appendChild(el)
  setTimeout(() => el.remove(), 3800)
}

function mostrar(vista) {
  for (const v of ['carga', 'login', 'panel']) $(`#vista-${v}`).hidden = v !== vista
}

/* ───────────── almacén 1: API (Supabase) ───────────── */

class ErrorPanel extends Error {
  constructor(mensaje, campos = {}, estado = 0) { super(mensaje); this.campos = campos; this.estado = estado }
}

async function pedir(ruta, metodo = 'GET', cuerpo) {
  const r = await fetch(ruta, {
    method: metodo,
    credentials: 'same-origin',
    headers: cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  })
  const json = (r.headers.get('content-type') || '').includes('application/json') ? await r.json().catch(() => ({})) : null
  return { ok: r.ok, estado: r.status, json }
}

function comprobar(r) {
  if (r.estado === 401) throw new ErrorPanel('SESION', {}, 401)
  if (!r.ok) throw new ErrorPanel((r.json && r.json.error) || T.avisos.error, (r.json && r.json.campos) || {}, r.estado)
  return r.json
}

const Api = {
  async listar() { return comprobar(await pedir('/api/admin/instalaciones')).instalaciones },
  async crear(d) { return comprobar(await pedir('/api/admin/instalaciones', 'POST', d)).instalacion },
  async actualizar(id, d) { return comprobar(await pedir(`/api/admin/instalaciones/${id}`, 'PATCH', d)).instalacion },
  async borrar(id) { comprobar(await pedir(`/api/admin/instalaciones/${id}`, 'DELETE')) },
  async subirFoto(dataUrl) { return comprobar(await pedir('/api/admin/foto', 'POST', { dataUrl })).url },
  async listarContactos() { return comprobar(await pedir('/api/admin/contactos')).contactos },
  async cambiarContacto(id, d) { return comprobar(await pedir(`/api/admin/contactos/${id}`, 'PATCH', d)).contacto },
  async borrarContacto(id) { comprobar(await pedir(`/api/admin/contactos/${id}`, 'DELETE')) },
}

/* ───────────── almacén 2: Local (modo demo) ───────────── */

const CLAVE = 'solera.panel.demo.v1'
const CLAVE_CONTACTOS = 'solera.panel.demo.contactos.v1'
const VACIA = {
  resena_pedida_en: null, ultima_revision: null, recordatorio_enviado_en: null, es_caso_exito: false, autoriza_publicar: false,
  gasto_anual_antes: null, ahorro_anual: null, amortizacion_anios: null, foto_url: null, frase_cliente: null,
}

function semilla() {
  const hoy = hoyISO()
  return P.demoSemilla.map(({ mesesAtras, caso, ...resto }) => ({
    id: crypto.randomUUID(), creado_en: new Date().toISOString(), ...VACIA, es_demo: true,
    fecha_instalacion: sumarMeses(hoy, -mesesAtras), ...resto, ...(caso || {}),
  }))
}

const Local = {
  leer() {
    try { const t = localStorage.getItem(CLAVE); if (t) return JSON.parse(t) } catch { /* se regenera */ }
    const s = semilla()
    this.guardar(s)
    return s
  },
  guardar(lista) {
    try { localStorage.setItem(CLAVE, JSON.stringify(lista)) } catch { throw new ErrorPanel(T.avisos.sinEspacio) }
  },
  async listar() { return this.leer().sort((a, b) => (a.fecha_instalacion < b.fecha_instalacion ? 1 : -1)) },
  async crear(d) {
    const v = validarInstalacion(d, { hoy: hoyISO() })
    if (!v.ok) throw new ErrorPanel(T.avisos.revisa, v.errores)
    const fila = { id: crypto.randomUUID(), creado_en: new Date().toISOString(), ...VACIA, es_demo: false, ...v.datos }
    this.guardar([...this.leer(), fila])
    return fila
  },
  async actualizar(id, d) {
    const lista = this.leer()
    const i = lista.findIndex((x) => x.id === id)
    if (i < 0) throw new ErrorPanel(T.avisos.error)
    const r = prepararCambios(lista[i], d, { fotoPrefijo: 'data:image/', fotoMax: 700000 })
    if (!r.cambios) throw new ErrorPanel(r.mensaje, r.errores)
    lista[i] = { ...lista[i], ...r.cambios }
    this.guardar(lista)
    return lista[i]
  },
  async borrar(id) { this.guardar(this.leer().filter((x) => x.id !== id)) },
  async subirFoto(dataUrl) { return dataUrl },
  restablecer() { localStorage.removeItem(CLAVE); localStorage.removeItem(CLAVE_CONTACTOS) },

  leerContactos() {
    try { const t = localStorage.getItem(CLAVE_CONTACTOS); if (t) return JSON.parse(t) } catch { /* se regenera */ }
    const ahora = Date.now()
    const s = P.demoContactos.map(({ diasAtras, ...c }) => ({
      id: crypto.randomUUID(), creado_en: new Date(ahora - diasAtras * 86400000).toISOString(), estado: 'nuevo', nota_interna: null,
      municipio: null, mensaje: null, consentimiento: true, aviso_version: L.avisoVersion, ...c,
    }))
    this.guardarContactos(s)
    return s
  },
  guardarContactos(lista) {
    try { localStorage.setItem(CLAVE_CONTACTOS, JSON.stringify(lista)) } catch { throw new ErrorPanel(T.avisos.sinEspacio) }
  },
  async listarContactos() { return this.leerContactos().sort((a, b) => (a.creado_en < b.creado_en ? 1 : -1)) },
  async cambiarContacto(id, d) {
    const lista = this.leerContactos()
    const i = lista.findIndex((x) => x.id === id)
    const v = validarCambioContacto(d)
    if (i < 0 || !v.ok) throw new ErrorPanel(T.avisos.error)
    lista[i] = { ...lista[i], ...v.datos }
    this.guardarContactos(lista)
    return lista[i]
  },
  async borrarContacto(id) { this.guardarContactos(this.leerContactos().filter((x) => x.id !== id)) },
}

/* ───────────── arranque, entrada y salida ───────────── */

async function arrancar() {
  mostrar('carga')
  let r
  try { r = await pedir('/api/admin/login') } catch { r = { ok: false, json: null } }
  // Sin API (npm run dev) o sin Supabase: demo en este navegador.
  if (!r.json || r.json.demo) { modo = 'local'; return entrarPanel() }
  if (!r.ok) { mostrar('login'); return errorLogin(r.json.error || T.avisos.error) }
  if (r.json.autenticado) { modo = 'api'; return entrarPanel() }
  mostrar('login')
  $('#login-password').focus()
}

function errorLogin(texto) {
  const el = $('#login-error')
  el.textContent = texto || ''
  el.hidden = !texto
}

async function entrarPanel() {
  datos = modo === 'local' ? Local : Api
  const estado = $('#estado')
  estado.hidden = false
  estado.textContent = modo === 'local' ? T.estadoDemo : T.estadoConectado
  $('#aviso-demo').hidden = modo !== 'local'
  $('#btn-salir').hidden = modo === 'local'
  try { instalaciones = await datos.listar() } catch (e) {
    if (e.estado === 401) return sesionCaducada()
    aviso(e.message, true)
    instalaciones = []
  }
  try { contactos = await datos.listarContactos() } catch (e) {
    if (e.estado === 401) return sesionCaducada()
    aviso(e.message, true)
    contactos = []
  }
  mostrar('panel')
  pintar()
}

function sesionCaducada() {
  mostrar('login')
  errorLogin(T.avisos.sesionCaducada)
}

$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault()
  errorLogin('')
  const boton = $('#login-boton')
  boton.disabled = true
  boton.textContent = T.login.entrando
  try {
    const r = await pedir('/api/admin/login', 'POST', { password: $('#login-password').value })
    if (r.ok) { $('#login-password').value = ''; return await arrancar() }
    errorLogin(r.estado === 401 ? T.login.incorrecta : (r.json && r.json.error) || T.avisos.error)
  } catch { errorLogin(T.avisos.sinConexion) }
  finally { boton.disabled = false; boton.textContent = T.login.boton }
})

$('#btn-salir').addEventListener('click', async () => {
  try { await pedir('/api/admin/login', 'DELETE') } catch { /* da igual: se vuelve a la entrada */ }
  arrancar()
})

$('#btn-restablecer').addEventListener('click', async () => {
  if (!confirm(T.demoRestablecerConfirma)) return
  Local.restablecer()
  instalaciones = await Local.listar()
  contactos = await Local.listarContactos()
  cerrarFormInst(); cerrarFormCaso()
  pintar()
  aviso(T.avisos.restablecido)
})

/* ───────────── pintar ───────────── */

const mensajeResena = (i) => rellenar(P.mensajeResena, { nombre: primerNombre(i.cliente), empresa: P.empresaNombre, enlace: P.googleReviewUrl })
const mensajeRecordatorio = (i, vence) => rellenar(P.mensajeRecordatorio, {
  nombre: primerNombre(i.cliente), empresa: P.empresaNombre, lugar: i.municipio ? ` en ${i.municipio}` : '', fecha: fechaES(vence),
})
const etiqueta = (texto) => `<span class="ml-1.5 rounded-full border border-line-strong px-2 py-0.5 align-middle font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">${esc(texto)}</span>`
const BTN = 'glass rounded-full px-4 py-1.5 text-[13px] font-semibold text-ink u-curve transition'

function pintar() {
  const pend = revisionesPendientes(instalaciones, opcionesRev(), hoyISO())
  $('#r-inst').textContent = instalaciones.length
  $('#r-rev').textContent = pend.length
  $('#r-casos').textContent = instalaciones.filter((i) => i.es_caso_exito && i.autoriza_publicar).length
  $('#enlace-resena').textContent = P.googleReviewUrl.includes('PLACEHOLDER')
    ? T.inst.enlaceResenaFalta
    : `${T.inst.enlaceResena}: ${P.googleReviewUrl}`
  $('#r-cont').textContent = contactos.filter((c) => c.estado === 'nuevo').length
  pintarInstalaciones(new Map(pend.map((i) => [i.id, i.revision])))
  pintarRevisiones(pend)
  pintarCasos()
  pintarContactos()
}

const fechaHoraES = (iso) => (iso ? new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '')
const CLASE_ESTADO = { nuevo: 'bg-ochre-deep text-paper-raised', contactado: 'bg-olive text-[#f1efe3]', descartado: 'border border-line-strong text-ink-soft' }

function pintarContactos() {
  const ul = $('#lista-contactos')
  if (!contactos.length) { ul.innerHTML = `<li class="py-8 text-[15px] text-ink-soft">${esc(T.contactos.vacio)}</li>`; return }
  ul.innerHTML = contactos.map((c) => {
    const origen = L.origenes[c.origen] || { etiqueta: c.origen, nombre: c.origen, campos: {} }
    const resumen = resumenDatos({ ...c.datos, municipio: c.municipio, mensaje: c.mensaje }, origen.campos)
    const enlace = waLink(c.telefono, rellenar(L.mensajeRespuesta, { nombre: primerNombre(c.nombre), empresa: L.empresaNombre, etiqueta: origen.nombre }))
    const estado = c.estado || 'nuevo'
    return `<li class="py-5" data-id="${esc(c.id)}">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0 max-w-2xl">
          <p class="font-display text-lg text-ink">${esc(c.nombre)}${etiqueta(origen.etiqueta)}</p>
          <p class="mt-0.5 font-mono text-[13px] text-ink-soft">${esc(c.telefono)}</p>
          <p class="mt-1 text-[14px] leading-relaxed text-ink-soft">${esc(resumen || T.contactos.sinDatos)}</p>
          <p class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1"><span class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${CLASE_ESTADO[estado] || CLASE_ESTADO.nuevo}">${esc(L.estados[estado] || estado)}</span>
            <span class="text-xs text-ink-soft">${esc(rellenar(T.contactos.recibido, { fecha: fechaHoraES(c.creado_en) }))}${c.consentimiento ? ` · ${esc(rellenar(T.contactos.consentimiento, { version: c.aviso_version || '—' }))}` : ''}</span></p>
          ${c.nota_interna ? `<p class="mt-1 text-[13px] text-ink"><span class="font-semibold">${esc(T.contactos.notaPuesta)}</span> ${esc(c.nota_interna)}</p>` : ''}
        </div>
        <div class="flex flex-wrap items-center gap-2">
          ${enlace
            ? `<a href="${esc(enlace)}" target="_blank" rel="noopener" data-accion="responder" class="${BTN}">${esc(T.contactos.whatsapp)}</a>`
            : `<span class="text-xs text-ink-soft">${esc(T.contactos.sinTelefono)}</span>`}
          ${estado === 'nuevo' ? `<button type="button" data-accion="contactado" class="${BTN}">${esc(T.contactos.contactado)}</button>
            <button type="button" data-accion="descartado" class="text-[13px] font-semibold text-ink-soft ul-grow">${esc(T.contactos.descartar)}</button>`
            : `<button type="button" data-accion="nuevo" class="text-[13px] font-semibold text-ink-soft ul-grow">${esc(T.contactos.reabrir)}</button>`}
          <button type="button" data-accion="nota" class="text-[13px] font-semibold text-ink-soft ul-grow">${esc(T.contactos.nota)}</button>
          <button type="button" data-accion="borrar" class="text-[13px] font-semibold text-ochre-deep ul-grow">${esc(T.contactos.borrar)}</button>
        </div>
      </div></li>`
  }).join('')
}

function badgeRevision(rev) {
  const vencida = rev.estado === 'vencida'
  const texto = vencida ? T.inst.revisionVencida : T.inst.revisionProxima
  return `<span class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${vencida ? 'bg-ochre-deep text-paper-raised' : 'border border-ochre text-ochre-deep'}">${esc(texto)}</span>`
}

function pintarInstalaciones(revs) {
  const ul = $('#lista-inst')
  if (!instalaciones.length) { ul.innerHTML = `<li class="py-8 text-[15px] text-ink-soft">${esc(T.inst.vacio)}</li>`; return }
  ul.innerHTML = instalaciones.map((i) => {
    const enlace = waLink(i.telefono, mensajeResena(i))
    const detalle = [i.municipio, i.cultivo && capitalizar(i.cultivo), i.hectareas && `${num(i.hectareas)} ${T.inst.ha}`, i.potencia_kwp && `${num(i.potencia_kwp)} ${T.inst.kwp}`].filter(Boolean).join(' · ')
    const rev = revs.get(i.id)
    return `<li class="py-5" data-id="${esc(i.id)}">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="font-display text-lg text-ink">${esc(i.cliente)}${i.es_demo ? etiqueta(T.caso.ejemplo) : ''}</p>
          <p class="mt-0.5 font-mono text-[13px] text-ink-soft">${esc(i.telefono)}${detalle ? ` · ${esc(detalle)}` : ''}</p>
          <p class="mt-0.5 text-[13px] text-ink-soft">${esc(rellenar(T.inst.instaladaEl, { fecha: fechaES(i.fecha_instalacion) }))}${i.resena_pedida_en ? ` · ${esc(rellenar(T.inst.resenaPedida, { fecha: fechaES(i.resena_pedida_en) }))}` : ''}</p>
          ${rev ? `<p class="mt-2">${badgeRevision(rev)}</p>` : ''}
        </div>
        <div class="flex flex-wrap items-center gap-2">
          ${enlace
            ? `<a href="${esc(enlace)}" target="_blank" rel="noopener" data-accion="resena" class="${BTN}">${esc(T.inst.resena)}</a>`
            : `<span class="text-xs text-ink-soft">${esc(T.inst.sinTelefono)}</span>`}
          <button type="button" data-accion="editar" class="${BTN}">${esc(T.inst.editar)}</button>
          <button type="button" data-accion="borrar" class="text-[13px] font-semibold text-ochre-deep ul-grow">${esc(T.inst.borrar)}</button>
        </div>
      </div></li>`
  }).join('')
}

function pintarRevisiones(pend) {
  $('#rev-intro').textContent = rellenar(T.rev.intro, { meses: P.mantenimientoMeses, dias: P.avisoDias })
  const ul = $('#lista-rev')
  if (!pend.length) { ul.innerHTML = `<li class="py-8 text-[15px] text-ink-soft">${esc(T.rev.vacio)}</li>`; return }
  ul.innerHTML = pend.map((i) => {
    const r = i.revision
    const cuando = r.dias < 0 ? rellenar(T.rev.vencida, { fecha: fechaES(r.vence), dias: -r.dias })
      : r.dias === 0 ? T.rev.venceHoy : rellenar(T.rev.vencePronto, { fecha: fechaES(r.vence), dias: r.dias })
    const enlace = waLink(i.telefono, mensajeRecordatorio(i, r.vence))
    return `<li class="py-5" data-id="${esc(i.id)}">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="font-display text-lg text-ink">${esc(i.cliente)}${i.es_demo ? etiqueta(T.caso.ejemplo) : ''}</p>
          <p class="mt-0.5 text-[13px] text-ink-soft">${esc([i.municipio, i.potencia_kwp && `${num(i.potencia_kwp)} ${T.inst.kwp}`].filter(Boolean).join(' · '))}</p>
          <p class="mt-2">${badgeRevision(r)} <span class="ml-1 text-[13px] text-ink-soft">${esc(cuando)}</span></p>
          ${i.recordatorio_enviado_en ? `<p class="mt-1 text-xs text-ink-soft">${esc(rellenar(T.rev.recordatorioEnviado, { fecha: fechaES(i.recordatorio_enviado_en) }))}</p>` : ''}
        </div>
        <div class="flex flex-wrap items-center gap-2">
          ${enlace
            ? `<a href="${esc(enlace)}" target="_blank" rel="noopener" data-accion="recordar" class="${BTN}">${esc(T.rev.recordar)}</a>`
            : `<span class="text-xs text-ink-soft">${esc(T.inst.sinTelefono)}</span>`}
          <button type="button" data-accion="revisado" class="${BTN}">${esc(T.rev.hecha)}</button>
        </div>
      </div></li>`
  }).join('')
}

function pintarCasos() {
  const ul = $('#lista-casos')
  if (!instalaciones.length) { ul.innerHTML = `<li class="py-8 text-[15px] text-ink-soft">${esc(T.inst.vacio)}</li>`; return }
  ul.innerHTML = instalaciones.map((i) => {
    const publicado = i.es_caso_exito && i.autoriza_publicar
    const resumen = i.ahorro_anual ? `${num(i.ahorro_anual)} €/año${i.amortizacion_anios ? ` · ${num(i.amortizacion_anios)} ${T.caso.anios}` : ''}` : ''
    return `<li class="py-5" data-id="${esc(i.id)}">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="font-display text-lg text-ink">${esc(i.cliente)}${i.es_demo ? etiqueta(T.caso.ejemplo) : ''}</p>
          <p class="mt-0.5 text-[13px] text-ink-soft">${esc([i.municipio, i.cultivo && capitalizar(i.cultivo), resumen].filter(Boolean).join(' · '))}</p>
          <p class="mt-2"><span class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${publicado ? 'bg-olive text-[#f1efe3]' : 'border border-line-strong text-ink-soft'}">${esc(publicado ? T.caso.publicado : T.caso.sinPublicar)}</span></p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" data-accion="editar-caso" class="${BTN}">${esc(T.caso.editar)}</button>
          ${publicado ? `<button type="button" data-accion="despublicar" class="text-[13px] font-semibold text-ochre-deep ul-grow">${esc(T.caso.despublicar)}</button>` : ''}
        </div>
      </div></li>`
  }).join('')
}

/* ───────────── acciones ───────────── */

function reemplazar(fila) {
  const i = instalaciones.findIndex((x) => x.id === fila.id)
  if (i >= 0) instalaciones[i] = fila; else instalaciones.unshift(fila)
  instalaciones.sort((a, b) => (a.fecha_instalacion < b.fecha_instalacion ? 1 : -1))
}

function manejarError(err, form) {
  if (err.estado === 401) return sesionCaducada()
  if (form && err.campos) pintarErrores(form, err.campos)
  aviso(err.message || T.avisos.error, true)
}

async function marcar(id, marca) {
  try { reemplazar(await datos.actualizar(id, { marcar: marca })); pintar(); aviso(T.avisos.marcado) } catch (e) { manejarError(e) }
}

function alClic(selector, fn) {
  $(selector).addEventListener('click', (e) => {
    const b = e.target.closest('[data-accion]')
    const li = e.target.closest('li[data-id]')
    if (b && li) fn(b.dataset.accion, li.dataset.id, e)
  })
}

alClic('#lista-inst', async (accion, id) => {
  const i = instalaciones.find((x) => x.id === id)
  if (accion === 'resena') setTimeout(() => marcar(id, 'resena'), 300) // el enlace de WhatsApp se abre solo
  if (accion === 'editar') abrirFormInst(i)
  if (accion === 'borrar') {
    if (!confirm(rellenar(T.inst.borrarConfirma, { cliente: i.cliente }))) return
    try { await datos.borrar(id); instalaciones = instalaciones.filter((x) => x.id !== id); pintar(); aviso(T.avisos.borrado) } catch (e) { manejarError(e) }
  }
})

alClic('#lista-rev', (accion, id) => {
  const i = instalaciones.find((x) => x.id === id)
  if (accion === 'recordar') setTimeout(() => marcar(id, 'recordatorio'), 300)
  if (accion === 'revisado' && confirm(rellenar(T.rev.hechaConfirma, { cliente: i.cliente }))) marcar(id, 'revision_hecha')
})

alClic('#lista-casos', async (accion, id) => {
  const i = instalaciones.find((x) => x.id === id)
  if (accion === 'editar-caso') abrirFormCaso(i)
  if (accion === 'despublicar') {
    try { reemplazar(await datos.actualizar(id, { es_caso_exito: false })); pintar(); aviso(T.avisos.guardado) } catch (e) { manejarError(e) }
  }
})

function reemplazarContacto(fila) {
  const i = contactos.findIndex((x) => x.id === fila.id)
  if (i >= 0) contactos[i] = fila; else contactos.unshift(fila)
}

alClic('#lista-contactos', async (accion, id) => {
  const c = contactos.find((x) => x.id === id)
  if (!c || accion === 'responder') {
    // El enlace de WhatsApp se abre solo; si estaba "nuevo", pasa a "contactado" (se ve al volver).
    if (c && c.estado === 'nuevo') setTimeout(() => cambiarContacto(id, { estado: 'contactado' }), 300)
    return
  }
  if (accion === 'contactado' || accion === 'descartado' || accion === 'nuevo') return cambiarContacto(id, { estado: accion })
  if (accion === 'nota') {
    const texto = prompt(T.contactos.notaPrompt, c.nota_interna || '')
    if (texto === null) return
    return cambiarContacto(id, { nota_interna: texto })
  }
  if (accion === 'borrar') {
    if (!confirm(rellenar(T.contactos.borrarConfirma, { nombre: c.nombre }))) return
    try { await datos.borrarContacto(id); contactos = contactos.filter((x) => x.id !== id); pintar(); aviso(T.avisos.borrado) } catch (e) { manejarError(e) }
  }
})

async function cambiarContacto(id, cambio) {
  try { reemplazarContacto(await datos.cambiarContacto(id, cambio)); pintar(); aviso(T.avisos.marcado) } catch (e) { manejarError(e) }
}

/* ───────────── pestañas ───────────── */

$$('[role="tab"]').forEach((b) => b.addEventListener('click', () => {
  $$('[role="tab"]').forEach((x) => x.setAttribute('aria-selected', String(x === b)))
  for (const t of ['instalaciones', 'revisiones', 'casos', 'contactos']) $(`#tab-${t}`).hidden = t !== b.dataset.tab
}))

/* ───────────── formulario de instalación ───────────── */

const limpiarErrores = (form) => $$('[data-error]', form).forEach((e) => { e.textContent = '' })
const pintarErrores = (form, errores) => {
  for (const [campo, msg] of Object.entries(errores)) {
    const el = form.querySelector(`[data-error="${campo}"]`)
    if (el) el.textContent = msg
  }
}

const formInst = $('#form-inst')
const CAMPOS_INST = ['cliente', 'telefono', 'municipio', 'cultivo', 'hectareas', 'potencia_kwp', 'fecha_instalacion']

function abrirFormInst(inst) {
  idEdicion = inst ? inst.id : null
  $('#form-inst-titulo').textContent = inst ? T.inst.tituloEditar : T.inst.tituloNueva
  formInst.reset()
  limpiarErrores(formInst)
  for (const k of CAMPOS_INST) formInst.elements[k].value = inst ? (inst[k] ?? '') : ''
  if (!inst) formInst.elements.fecha_instalacion.value = hoyISO()
  formInst.hidden = false
  formInst.elements.cliente.focus()
}
function cerrarFormInst() { formInst.hidden = true; idEdicion = null }

$('#btn-nueva').addEventListener('click', () => abrirFormInst(null))
$('#btn-cancelar-inst').addEventListener('click', cerrarFormInst)

formInst.addEventListener('submit', async (e) => {
  e.preventDefault()
  limpiarErrores(formInst)
  const cuerpo = Object.fromEntries(CAMPOS_INST.map((k) => [k, formInst.elements[k].value]))
  const v = validarInstalacion(cuerpo, { parcial: !!idEdicion, hoy: hoyISO() }) // aviso rápido; la validación de verdad es la del servidor
  if (!v.ok) return pintarErrores(formInst, v.errores)
  try {
    reemplazar(idEdicion ? await datos.actualizar(idEdicion, cuerpo) : await datos.crear(cuerpo))
    cerrarFormInst()
    pintar()
    aviso(T.avisos.guardado)
  } catch (err) { manejarError(err, formInst) }
})

/* ───────────── formulario de caso de éxito ───────────── */

const formCaso = $('#form-caso')

function valoresCaso() {
  const f = formCaso.elements
  return {
    autoriza_publicar: f.autoriza_publicar.checked,
    es_caso_exito: f.es_caso_exito.checked,
    gasto_anual_antes: f.gasto_anual_antes.value,
    ahorro_anual: f.ahorro_anual.value,
    amortizacion_anios: f.amortizacion_anios.value,
    frase_cliente: f.frase_cliente.value,
    foto_url: fotoActual,
  }
}

const aNumero = (v) => Number(String(v).replace(',', '.'))

function pintarVista() {
  const i = instalaciones.find((x) => x.id === idCaso)
  const v = valoresCaso()
  const destino = $('#caso-vista')
  if (!i || !(aNumero(v.ahorro_anual) > 0) || !(aNumero(v.amortizacion_anios) > 0)) {
    destino.innerHTML = `<p class="rounded-xl border border-dashed border-line-strong px-5 py-8 text-sm text-ink-soft">${esc(T.caso.vistaPreviaVacia)}</p>`
    return
  }
  destino.replaceChildren(crearTarjeta($('#tpl-caso'), datosTarjetaCaso({
    ...i, gasto_anual_antes: aNumero(v.gasto_anual_antes) || null, ahorro_anual: aNumero(v.ahorro_anual),
    amortizacion_anios: aNumero(v.amortizacion_anios), frase_cliente: v.frase_cliente.trim(), foto_url: fotoActual,
  }, { atribucion: P.atribucion })))
}

function estadoFoto() {
  $('#btn-quitar-foto').hidden = !fotoActual
  $('#foto-estado').textContent = fotoActual ? T.caso.fotoLista : ''
}

function abrirFormCaso(i) {
  idCaso = i.id
  fotoActual = i.foto_url || null
  formCaso.reset()
  limpiarErrores(formCaso)
  const f = formCaso.elements
  $('#form-caso-titulo').textContent = rellenar(T.caso.formTitulo, { cliente: i.cliente })
  f.autoriza_publicar.checked = !!i.autoriza_publicar
  f.es_caso_exito.checked = !!i.es_caso_exito
  f.gasto_anual_antes.value = i.gasto_anual_antes ?? ''
  f.ahorro_anual.value = i.ahorro_anual ?? ''
  f.amortizacion_anios.value = i.amortizacion_anios ?? ''
  f.frase_cliente.value = i.frase_cliente ?? ''
  estadoFoto()
  pintarVista()
  formCaso.hidden = false
  formCaso.scrollIntoView({ block: 'nearest' })
}
function cerrarFormCaso() { formCaso.hidden = true; idCaso = null }

formCaso.addEventListener('input', pintarVista)
// Sin autorización del cliente no se puede publicar: al quitarla, se desmarca también "Publicar".
formCaso.addEventListener('change', (e) => {
  if (e.target.name === 'autoriza_publicar' && !e.target.checked) formCaso.elements.es_caso_exito.checked = false
})
$('#btn-cancelar-caso').addEventListener('click', cerrarFormCaso)
$('#btn-quitar-foto').addEventListener('click', () => { fotoActual = null; estadoFoto(); pintarVista() })

async function reducirImagen(archivo, maxLado) {
  const bmp = await createImageBitmap(archivo)
  const k = Math.min(1, maxLado / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k)
  c.height = Math.round(bmp.height * k)
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.82)
}

$('#caso-foto').addEventListener('change', async (e) => {
  const archivo = e.target.files[0]
  e.target.value = ''
  if (!archivo) return
  if (!/^image\/(jpeg|png|webp)$/.test(archivo.type)) return aviso(T.caso.fotoTipo, true)
  $('#foto-estado').textContent = T.caso.fotoSubiendo
  try {
    fotoActual = await datos.subirFoto(await reducirImagen(archivo, 1200))
  } catch (err) { manejarError(err, formCaso) }
  estadoFoto()
  pintarVista()
})

formCaso.addEventListener('submit', async (e) => {
  e.preventDefault()
  limpiarErrores(formCaso)
  try {
    reemplazar(await datos.actualizar(idCaso, valoresCaso()))
    cerrarFormCaso()
    pintar()
    aviso(T.avisos.guardado)
  } catch (err) { manejarError(err, formCaso) }
})

arrancar()
