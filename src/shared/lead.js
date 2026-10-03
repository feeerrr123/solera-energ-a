// Envío de contactos desde los formularios de la web (ayudas, dimensionado, calculadora, contacto).
// Solo para el navegador. La configuración (textos, orígenes, número de WhatsApp) llega en window.LEAD.
import { validarContacto, rellenar, resumenDatos } from './logica.js'

export class ErrorContacto extends Error {
  constructor(mensaje, campos = {}, estado = 0) { super(mensaje); this.campos = campos; this.estado = estado }
}

const esLocal = () => ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)

// Manda el contacto a /api/contactos. En desarrollo local (sin API) devuelve { ok, demo } para poder
// probar el formulario; en cualquier otro sitio, un fallo de la API es un error de verdad (nunca se
// finge éxito con datos de una persona real).
export async function enviarContacto(payload, L) {
  let r
  try {
    r = await fetch('/api/contactos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  } catch { throw new ErrorContacto(L.formulario.sinConexion) }
  const json = (r.headers.get('content-type') || '').includes('application/json') ? await r.json().catch(() => ({})) : null
  if (!json) {
    if (esLocal()) return { ok: true, demo: true }
    throw new ErrorContacto(L.formulario.sinConexion, {}, r.status)
  }
  if (!r.ok) throw new ErrorContacto(json.error || L.formulario.sinConexion, json.campos || {}, r.status)
  return json
}

// Enlace de WhatsApp hacia la instaladora, con lo que la persona acaba de rellenar ya escrito.
export function enlaceWhatsAppInstaladora(L, payload) {
  const origen = L.origenes[payload.origen]
  const datos = resumenDatos({ ...payload.datos, municipio: payload.municipio, mensaje: payload.mensaje }, origen.campos)
  const texto = rellenar(L.mensajeWhatsApp, {
    nombre: payload.nombre, telefono: payload.telefono, herramienta: origen.nombre, empresa: L.empresaNombre, datos: datos || '—',
  })
  return `https://wa.me/${L.whatsappNumero}?text=${encodeURIComponent(texto)}`
}

const pintarError = (form, campo, texto) => {
  const el = form.querySelector(`[data-error="${campo}"]`)
  if (el) el.textContent = texto || ''
}

// Conecta un <form> con /api/contactos. El formulario debe llevar los campos de partials/lead-datos.html
// y partials/lead-cierre.html (nombre, teléfono, consentimiento, campo trampa `web` y [data-error]).
//   origen   → 'ayudas' | 'dimensionado' | 'calculadora' | 'contacto'
//   datos()  → lo que rellenó la persona en la herramienta (textos cortos y números)
//   extra()  → { municipio, mensaje } opcionales
//   alExito(respuesta, payload) → qué enseñar al terminar
export function iniciarLead(form, { origen, L, datos = () => ({}), extra = () => ({}), alExito }) {
  const boton = form.querySelector('[type="submit"]')
  const textoBoton = boton ? boton.textContent : ''

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    for (const el of form.querySelectorAll('[data-error]')) el.textContent = ''
    const f = form.elements
    const payload = {
      origen, nombre: f.nombre.value, telefono: f.telefono.value, email: f.email ? f.email.value : '', consentimiento: f.consentimiento.checked,
      web: f.web ? f.web.value : '', avisoVersion: L.avisoVersion, datos: datos(), ...extra(),
    }
    const v = validarContacto(payload)
    if (!v.ok && !v.spam) {
      for (const campo of Object.keys(v.errores)) pintarError(form, campo, L.formulario.errores[campo] || v.errores[campo])
      const primero = form.querySelector('[data-error]:not(:empty)')
      if (primero) primero.closest('label, div')?.querySelector('input')?.focus()
      return
    }
    if (boton) { boton.disabled = true; boton.textContent = L.formulario.enviando }
    try {
      const respuesta = await enviarContacto(payload, L)
      alExito(respuesta, payload)
    } catch (err) {
      if (err.campos) for (const [campo, msg] of Object.entries(err.campos)) pintarError(form, campo, L.formulario.errores[campo] || msg)
      pintarError(form, 'general', err.message)
    } finally {
      if (boton) { boton.disabled = false; boton.textContent = textoBoton }
    }
  })
}

// Enseña el panel de "recibido": rellena el enlace de WhatsApp y avisa si es una prueba (sin guardar).
export function mostrarExito(contenedor, respuesta, payload, L) {
  const wa = contenedor.querySelector('[data-whatsapp]')
  if (wa) wa.href = enlaceWhatsAppInstaladora(L, payload)
  const demo = contenedor.querySelector('[data-demo]')
  if (demo) demo.hidden = !respuesta.demo
  contenedor.hidden = false
  contenedor.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
