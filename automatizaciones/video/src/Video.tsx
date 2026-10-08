import React, { useEffect, useState } from 'react'
import {
  AbsoluteFill, Img, Sequence, continueRender, delayRender, interpolate, spring,
  staticFile, useCurrentFrame, useVideoConfig, Easing,
} from 'remotion'

// ---------- Paleta y fuentes de Solera ----------
const C = {
  paper: '#e9e7db', raised: '#f2f0e5', deep: '#dddbca', olive: '#2e3a26', olive7: '#3b4a30',
  ink: '#232a1c', soft: '#575c42', line: '#d2ceb7', ochre: '#a5611a', ochreDeep: '#834a12',
  onOlive: '#eae7d5', onOliveSoft: '#aeb397', bright: '#dc9142', wa: '#25d366',
}
const SERIF = '"Young Serif", Georgia, serif'
const SANS = '"Hanken Grotesk", system-ui, sans-serif'
const MONO = '"Spline Sans Mono", monospace'

const useFuentes = () => {
  const [h] = useState(() => delayRender('fuentes'))
  useEffect(() => {
    const f = [
      new FontFace('Young Serif', `url(${staticFile('young.woff2')})`),
      new FontFace('Hanken Grotesk', `url(${staticFile('hanken.woff2')})`, { weight: '100 900' }),
      new FontFace('Spline Sans Mono', `url(${staticFile('mono.woff2')})`, { weight: '300 700' }),
    ]
    Promise.all(f.map((x) => x.load())).then((l) => { l.forEach((x) => document.fonts.add(x)); continueRender(h) })
  }, [h])
}

// ---------- Utilidades de animación ----------
const useEntrada = (desde = 0, damping = 18) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig()
  return spring({ frame: f - desde, fps, config: { damping, mass: 0.8 } })
}
const fade = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

// Cada escena entra y sale con un fundido corto
const Escena: React.FC<{ dur: number; children: React.ReactNode; fondo?: string }> = ({ dur, children, fondo = C.paper }) => {
  const f = useCurrentFrame()
  const o = Math.min(fade(f, 0, 10), 1 - fade(f, dur - 10, dur))
  return <AbsoluteFill style={{ background: fondo, opacity: o }}>{children}</AbsoluteFill>
}

// Titular de cada paso
const Titulo: React.FC<{ n?: string; texto: string; sub?: string; desde?: number }> = ({ n, texto, sub, desde = 4 }) => {
  const e = useEntrada(desde); const e2 = useEntrada(desde + 10)
  return (
    <div style={{ position: 'absolute', top: 110, left: 80, right: 80 }}>
      {n && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, opacity: e, transform: `translateY(${(1 - e) * 20}px)` }}>
          <span style={{ width: 64, height: 64, borderRadius: 32, background: C.ochre, color: C.raised, fontFamily: MONO, fontWeight: 600, fontSize: 32, display: 'grid', placeItems: 'center' }}>{n}</span>
          <span style={{ fontFamily: MONO, fontSize: 26, letterSpacing: 6, color: C.soft, textTransform: 'uppercase' }}>Paso {n}</span>
        </div>
      )}
      <div style={{ fontFamily: SERIF, fontSize: 68, lineHeight: 1.08, color: C.ink, marginTop: 26, opacity: e, transform: `translateY(${(1 - e) * 30}px)` }}>{texto}</div>
      {sub && <div style={{ fontFamily: SANS, fontSize: 36, lineHeight: 1.35, color: C.soft, marginTop: 20, opacity: e2, transform: `translateY(${(1 - e2) * 20}px)` }}>{sub}</div>}
    </div>
  )
}

// Marco de móvil
const W = 600, H = 1240
const Movil: React.FC<{ children: React.ReactNode; top?: number; desde?: number }> = ({ children, top = 580, desde = 6 }) => {
  const e = useEntrada(desde, 20)
  return (
    <div style={{
      position: 'absolute', left: (1080 - W - 32) / 2, top: top + (1 - e) * 260, width: W + 32, height: H + 32,
      borderRadius: 78, background: '#14180f', padding: 16, opacity: e,
      boxShadow: '0 60px 120px -40px rgba(35,42,28,.55), 0 20px 40px -20px rgba(35,42,28,.4)',
    }}>
      <div style={{ position: 'relative', width: W, height: H, borderRadius: 62, overflow: 'hidden', background: C.raised }}>
        {children}
        <div style={{ position: 'absolute', top: 16, left: W / 2 - 70, width: 140, height: 38, borderRadius: 20, background: '#14180f' }} />
      </div>
    </div>
  )
}

// Captura a pantalla completa dentro del móvil
const Pantalla: React.FC<{ src: string; opacity?: number; y?: number }> = ({ src, opacity = 1, y = 0 }) => (
  <Img src={staticFile(src)} style={{ position: 'absolute', top: y, left: 0, width: W, opacity }} />
)

// Círculo de "toque" con el dedo
const Toque: React.FC<{ x: number; y: number; en: number }> = ({ x, y, en }) => {
  const f = useCurrentFrame()
  const t = interpolate(f, [en, en + 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  if (f < en || f > en + 20) return null
  return <div style={{ position: 'absolute', left: x - 50, top: y - 50, width: 100, height: 100, borderRadius: 50, border: `6px solid ${C.ochre}`, background: 'rgba(165,97,26,.25)', transform: `scale(${0.5 + t * 0.8})`, opacity: 1 - t }} />
}

const Pie: React.FC<{ texto: string }> = ({ texto }) => (
  <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center', fontFamily: SANS, fontSize: 24, color: C.soft, opacity: 0.8 }}>{texto}</div>
)

// ---------- Escena 1: portada ----------
const Portada: React.FC = () => {
  const e = useEntrada(4); const e2 = useEntrada(22); const e3 = useEntrada(40)
  return (
    <AbsoluteFill style={{ background: C.olive, padding: 90, justifyContent: 'center' }}>
      <div style={{ fontFamily: MONO, fontSize: 28, letterSpacing: 8, color: C.bright, opacity: e, textTransform: 'uppercase' }}>Para instaladoras solares</div>
      <div style={{ fontFamily: SERIF, fontSize: 104, lineHeight: 1.04, color: C.onOlive, marginTop: 40, opacity: e2, transform: `translateY(${(1 - e2) * 40}px)` }}>
        Cada cliente de vuestra web, <span style={{ color: C.bright }}>en vuestro móvil</span> al momento.
      </div>
      <div style={{ fontFamily: SANS, fontSize: 40, lineHeight: 1.4, color: C.onOliveSoft, marginTop: 50, opacity: e3 }}>
        Y las reseñas y las ayudas del BOJA, en automático. Os lo enseño en un minuto.
      </div>
    </AbsoluteFill>
  )
}

// ---------- Escena 2: el agricultor rellena el formulario ----------
const CAPS = ['dim-1-datos.png', 'dim-2-resultado.png', 'dim-3-contacto.png', 'dim-4-enviado.png']
const Formulario: React.FC = () => {
  const f = useCurrentFrame()
  const tramo = 72
  return (
    <>
      <Titulo n="1" texto="Un agricultor calcula su instalación en vuestra web" />
      <Movil>
        {CAPS.map((src, i) => {
          const a = 20 + i * tramo
          const o = i === 0 ? 1 - fade(f, a + tramo - 8, a + tramo + 4) : Math.min(fade(f, a - 8, a + 4), i === CAPS.length - 1 ? 1 : 1 - fade(f, a + tramo - 8, a + tramo + 4))
          const y = interpolate(f, [a - 8, a + tramo + 4], [0, -60], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          return <Pantalla key={src} src={src} opacity={o} y={y} />
        })}
        <Toque x={300} y={1080} en={20 + tramo - 14} />
        <Toque x={300} y={1150} en={20 + 3 * tramo - 14} />
      </Movil>
      <Pie texto="Web de demostración · Solera Energía es una marca ficticia" />
    </>
  )
}

// ---------- Vista de un email dentro del móvil ----------
const Email: React.FC<{ remite: string; asunto: string; children: React.ReactNode; desde?: number }> = ({ remite, asunto, children, desde = 0 }) => {
  const e = useEntrada(desde, 20)
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fff', transform: `translateX(${(1 - e) * W}px)`, fontFamily: SANS, color: '#1f1f1f' }}>
      <div style={{ height: 110 }} />
      <div style={{ padding: '0 34px' }}>
        <div style={{ fontSize: 22, color: '#5f6368' }}>← Recibidos</div>
        <div style={{ fontSize: 38, lineHeight: 1.2, fontWeight: 500, marginTop: 26 }}>{asunto}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 30 }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: C.ochre, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 30, fontWeight: 600 }}>{remite[0]}</div>
          <div><div style={{ fontSize: 26, fontWeight: 600 }}>{remite}</div><div style={{ fontSize: 22, color: '#5f6368' }}>para mí · ahora</div></div>
        </div>
        <div style={{ marginTop: 34, fontSize: 27, lineHeight: 1.5 }}>{children}</div>
      </div>
    </div>
  )
}
const Fila: React.FC<{ k: string; v: string; fuerte?: boolean }> = ({ k, v, fuerte }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: '1px solid #e6e6e6' }}>
    <span style={{ color: '#5f6368' }}>{k}</span><span style={{ fontWeight: fuerte ? 700 : 500, textAlign: 'right' }}>{v}</span>
  </div>
)
const BotonWA: React.FC<{ pulso: number; texto?: string }> = ({ pulso, texto = 'Contestar por WhatsApp' }) => {
  const f = useCurrentFrame()
  const s = f > pulso ? 1 + 0.05 * Math.sin((f - pulso) / 4) : 1
  const brillo = f > pulso ? `0 0 0 ${8 + 6 * Math.sin((f - pulso) / 4)}px rgba(37,211,102,.25)` : 'none'
  return <div style={{ marginTop: 30, background: C.wa, color: '#fff', borderRadius: 40, padding: '20px 0', textAlign: 'center', fontWeight: 700, fontSize: 28, transform: `scale(${s})`, boxShadow: brillo }}>{texto}</div>
}

// Pantalla de bloqueo con notificación
const Bloqueo: React.FC<{ app: string; titulo: string; texto: string; desde: number }> = ({ app, titulo, texto, desde }) => {
  const e = useEntrada(desde, 14)
  return (
    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${C.olive7}, ${C.olive} 55%, #1d2417)`, fontFamily: SANS }}>
      <div style={{ textAlign: 'center', color: C.onOlive, fontSize: 150, fontWeight: 300, lineHeight: 1, marginTop: 170 }}>9:41</div>
      <div style={{
        position: 'absolute', left: 22, right: 22, top: 420 + (1 - e) * -260, opacity: e,
        background: 'rgba(242,240,229,.93)', borderRadius: 36, padding: '24px 28px', boxShadow: '0 20px 40px rgba(0,0,0,.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, color: C.soft }}>
          <span style={{ fontWeight: 600, letterSpacing: 1 }}>{app}</span><span>ahora</span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: C.ink, marginTop: 8 }}>{titulo}</div>
        <div style={{ fontSize: 26, color: C.ink, marginTop: 4, lineHeight: 1.35 }}>{texto}</div>
      </div>
    </div>
  )
}

// ---------- Escena 3: la ficha llega al instalador ----------
const Ficha: React.FC = () => {
  const f = useCurrentFrame()
  const sub = f < 150 ? '' : 'Con todos sus datos y un botón para contestarle por WhatsApp con un clic.'
  return (
    <>
      <Titulo n="2" texto="Al momento, os llega su ficha" sub={sub} />
      <Movil desde={0}>
        <Bloqueo app="GMAIL" titulo="Nuevo contacto: Antonio López" texto="Dimensionado · 611 22 33 44 · 4,5 kWp · 4.900–7.200 €" desde={18} />
        {f > 88 && (
          <Email remite="Avisos de la web" asunto="Nuevo contacto: Antonio López (Dimensionado)" desde={90}>
            <Fila k="Teléfono" v="611 22 33 44" />
            <Fila k="Email" v="antonio@ejemplo.es" />
            <Fila k="Potencia orientativa" v="4,5 kWp" fuerte />
            <Fila k="Inversión orientativa" v="4.900–7.200 €" fuerte />
            <div style={{ color: '#777', fontSize: 24, marginTop: 18 }}>Altura (m): 60 · Caudal (m³/h): 10 · Horas de riego: 8</div>
            <BotonWA pulso={170} />
          </Email>
        )}
        <Toque x={300} y={805} en={250} />
      </Movil>
    </>
  )
}

// ---------- Escena 4: el agricultor recibe su estimación ----------
const Estimacion: React.FC = () => (
  <>
    <Titulo texto="Y el agricultor recibe su estimación al instante" sub="Queda profesional y se acuerda de vosotros." />
    <Movil desde={4}>
      <Email remite="Solera Energía" asunto="Tu estimación de bombeo solar" desde={14}>
        <p style={{ margin: 0 }}>Hola Antonio:</p>
        <p>Gracias por usar el pre-dimensionado. Este es el resumen de lo que has calculado:</p>
        <Fila k="Potencia orientativa" v="4,5 kWp" fuerte />
        <Fila k="Inversión orientativa" v="4.900–7.200 €" fuerte />
        <p>Un técnico te llamará en 24–48 h laborables para confirmar los datos de tu pozo.</p>
        <p style={{ color: '#888', fontSize: 21 }}>Estimación orientativa, no un presupuesto: el dimensionado real requiere visita técnica.</p>
      </Email>
    </Movil>
  </>
)

// ---------- Escena 5: aviso de contacto parado ----------
const Parado: React.FC = () => (
  <>
    <Titulo texto="Y si un cliente se queda sin respuesta, os avisa" sub="Ningún presupuesto se queda olvidado." />
    <Movil desde={4}>
      <Bloqueo app="GMAIL" titulo="Contacto parado: Antonio López" texto="Lleva 8 días sin moverse. Estado: Presupuestado · 611 22 33 44. ¿Le llamamos?" desde={24} />
    </Movil>
  </>
)

// ---------- Escena 6: reseñas ----------
const Resenas: React.FC = () => {
  const f = useCurrentFrame()
  const panelE = useEntrada(6, 20)
  const burbuja = useEntrada(110, 16)
  const estrellas = [0, 1, 2, 3, 4].map((i) => useEntrada(190 + i * 6, 12))
  const zoom = interpolate(f, [10, 80], [1, 1.04], { extrapolateRight: 'clamp' })
  return (
    <>
      <Titulo n="3" texto="Al acabar la obra, la reseña de Google con un clic" />
      {/* Fila del panel con el botón */}
      <div style={{ position: 'absolute', top: 640, left: 50, right: 50, height: 415, borderRadius: 34, overflow: 'hidden', background: C.raised, boxShadow: '0 30px 60px -30px rgba(35,42,28,.45)', opacity: panelE, transform: `translateY(${(1 - panelE) * 80}px) scale(${zoom})`, border: `2px solid ${C.line}` }}>
        <Img src={staticFile('panel-fila.png')} style={{ position: 'absolute', top: 0, left: 0, width: 980 }} />
        <div style={{ position: 'absolute', right: 30, top: 26, fontFamily: MONO, fontSize: 20, letterSpacing: 4, color: C.soft }}>VUESTRO PANEL</div>
      </div>
      <Toque x={50 + 160} y={640 + 337} en={78} />
      {/* Mensaje de WhatsApp ya escrito */}
      <div style={{ position: 'absolute', top: 1110, left: 70, right: 70, opacity: burbuja, transform: `translateY(${(1 - burbuja) * 60}px)` }}>
        <div style={{ fontFamily: SANS, fontSize: 26, color: C.soft, marginBottom: 14 }}>Se abre WhatsApp con el mensaje listo:</div>
        <div style={{ background: '#d9fdd3', borderRadius: '30px 30px 30px 8px', padding: '28px 32px', fontFamily: SANS, fontSize: 31, lineHeight: 1.45, color: '#111b21', boxShadow: '0 12px 30px -16px rgba(0,0,0,.35)' }}>
          Hola, soy de Solera Energía. Gracias por confiar en nosotros para tu bombeo solar. Si estás contento con el resultado, nos ayudaría mucho una reseña en Google (te lleva un minuto): <span style={{ color: '#027eb5' }}>g.page/r/…/review</span>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 1590, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 26 }}>
        {estrellas.map((s, i) => <span key={i} style={{ fontSize: 96, color: '#f4b400', transform: `scale(${s})`, display: 'inline-block' }}>★</span>)}
      </div>
      <div style={{ position: 'absolute', top: 1730, left: 80, right: 80, textAlign: 'center', fontFamily: SANS, fontSize: 34, color: C.soft, opacity: estrellas[4] }}>
        Las reseñas son lo primero que mira la gente antes de llamar.
      </div>
    </>
  )
}

// ---------- Escena 7: el BOJA cada mañana ----------
const Boja: React.FC = () => {
  const e = useEntrada(30, 18); const e2 = useEntrada(60, 18)
  const Noticia: React.FC<{ t: string; r: string; e: number }> = ({ t, r, e }) => (
    <div style={{ padding: '22px 0', borderTop: '1px solid #e6e6e6', opacity: e, transform: `translateY(${(1 - e) * 30}px)` }}>
      <div style={{ fontWeight: 700, fontSize: 28, lineHeight: 1.3 }}>{t}</div>
      <div style={{ color: '#555', fontSize: 25, lineHeight: 1.45, marginTop: 8 }}>{r}</div>
    </div>
  )
  return (
    <>
      <Titulo n="4" texto="Cada mañana, las ayudas del BOJA ya resumidas" sub="Os enteráis el mismo día, sin buscar." />
      <Movil desde={4} top={700}>
        <Email remite="Vigilante BOJA" asunto="☀️ BOJA de hoy: 2 novedades de riego y renovables" desde={10}>
          <Noticia e={e} t="Convocatoria de ayudas para la modernización de regadíos" r="Resumen: a quién va dirigida, qué se puede pedir y el plazo. Con el enlace a la publicación oficial." />
          <Noticia e={e2} t="Bases para autoconsumo en explotaciones agrarias" r="Resumen hecho con IA, listo para avisar a vuestros clientes o publicarlo en vuestra web." />
          <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 18, letterSpacing: 3, color: '#999' }}>EJEMPLO DEL FORMATO</div>
        </Email>
      </Movil>
    </>
  )
}

// ---------- Escena 8: precio ----------
const Precio: React.FC = () => {
  const a = useEntrada(4); const b = useEntrada(20); const c = useEntrada(40, 12); const d = useEntrada(60)
  const f = useCurrentFrame()
  const latido = 1 + 0.03 * Math.sin(Math.max(0, f - 70) / 5)
  return (
    <AbsoluteFill style={{ background: C.olive, padding: '0 90px', justifyContent: 'center' }}>
      <div style={{ fontFamily: SERIF, fontSize: 72, lineHeight: 1.1, color: C.onOlive, opacity: a, transform: `translateY(${(1 - a) * 30}px)` }}>
        Funciona con vuestra web, tal como está.
      </div>
      <div style={{ marginTop: 70, opacity: b, transform: `translateY(${(1 - b) * 30}px)` }}>
        <span style={{ fontFamily: SERIF, fontSize: 200, color: C.bright, lineHeight: 1 }}>59 €</span>
        <span style={{ fontFamily: SANS, fontSize: 52, color: C.onOlive }}> /mes</span>
        <div style={{ fontFamily: SANS, fontSize: 38, color: C.onOliveSoft, marginTop: 16 }}>Las tres cosas incluidas · sin permanencia</div>
      </div>
      <div style={{ marginTop: 70, alignSelf: 'flex-start', background: C.bright, color: C.olive, borderRadius: 60, padding: '26px 52px', fontFamily: SANS, fontWeight: 800, fontSize: 52, transform: `scale(${c * latido})` }}>
        Primer mes GRATIS
      </div>
      <div style={{ marginTop: 90, fontFamily: SANS, fontSize: 36, color: C.onOlive, opacity: d, lineHeight: 1.5 }}>
        Fernando<br /><span style={{ color: C.onOliveSoft }}>Webs y automatizaciones para instaladoras solares</span>
      </div>
    </AbsoluteFill>
  )
}

// ---------- Montaje ----------
const ESCENAS: [React.FC, number, string?][] = [
  [Portada, 120, C.olive],
  [Formulario, 330],
  [Ficha, 330],
  [Estimacion, 180],
  [Parado, 180],
  [Resenas, 300],
  [Boja, 240],
  [Precio, 240, C.olive],
]
export const DURACION = ESCENAS.reduce((s, [, d]) => s + d, 0)

export const Video: React.FC = () => {
  useFuentes()
  let t = 0
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      {ESCENAS.map(([Comp, dur, fondo], i) => {
        const desde = t; t += dur
        return (
          <Sequence key={i} from={desde} durationInFrames={dur}>
            <Escena dur={dur} fondo={fondo}><Comp /></Escena>
          </Sequence>
        )
      })}
    </AbsoluteFill>
  )
}
