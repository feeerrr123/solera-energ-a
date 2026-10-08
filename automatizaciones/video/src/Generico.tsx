import React, { useEffect, useState } from 'react'
import { AbsoluteFill, Sequence, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame } from 'remotion'

// ================= Estilo =================
const C = {
  bg: '#07100c', bg2: '#0c1813', card: '#111c17', card2: '#16241e', line: 'rgba(255,255,255,.09)',
  txt: '#eef5f0', soft: '#93a89e', verde: '#3ddc97', verde2: '#1fbf7a', naranja: '#ff9f43', rojo: '#ff6b6b',
  wa: '#25d366', azul: '#4da3ff', amarillo: '#ffcc33',
}
const SANS = 'Inter, system-ui, sans-serif'
const TIT = '"Space Grotesk", Inter, sans-serif'
const MONO = '"JetBrains Mono", monospace'
const FPS = 30

const useFuentes = () => {
  const [h] = useState(() => delayRender('fuentes'))
  useEffect(() => {
    const f = [
      new FontFace('Inter', `url(${staticFile('inter.woff2')})`, { weight: '400 800' }),
      new FontFace('Space Grotesk', `url(${staticFile('grotesk.woff2')})`, { weight: '500 700' }),
      new FontFace('JetBrains Mono', `url(${staticFile('jbmono.woff2')})`, { weight: '400 600' }),
    ]
    Promise.all(f.map((x) => x.load())).then((l) => { l.forEach((x) => document.fonts.add(x)); continueRender(h) })
  }, [h])
}

// ================= Utilidades =================
const sp = (f: number, d = 0, damping = 14, mass = 0.7) => spring({ frame: f - d, fps: FPS, config: { damping, mass } })
const lin = (f: number, a: number, b: number, x = 0, y = 1) => interpolate(f, [a, b], [x, y], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
const escribe = (t: string, f: number, desde: number, cps = 2) => t.slice(0, Math.max(0, Math.floor((f - desde) * cps)))

// Fondo vivo: rejilla + manchas de luz que se mueven
const Fondo: React.FC = () => {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 1100, height: 1100, borderRadius: '50%', left: -380 + Math.sin(f / 90) * 120, top: -300 + Math.cos(f / 110) * 100, background: 'radial-gradient(circle, rgba(61,220,151,.20), transparent 65%)' }} />
      <div style={{ position: 'absolute', width: 1000, height: 1000, borderRadius: '50%', right: -420 + Math.cos(f / 80) * 120, bottom: -260 + Math.sin(f / 100) * 120, background: 'radial-gradient(circle, rgba(255,159,67,.14), transparent 65%)' }} />
      <AbsoluteFill style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)', backgroundSize: '60px 60px', transform: `translateY(${(f * 0.6) % 60}px)` }} />
    </AbsoluteFill>
  )
}

// Escena: entra con zoom rápido y sale con un "látigo" hacia arriba
const Escena: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const f = useCurrentFrame()
  const e = sp(f, 0, 16, 0.6)
  const s = lin(f, dur - 8, dur)
  return (
    <AbsoluteFill style={{
      opacity: Math.min(lin(f, 0, 5), 1 - s), filter: `blur(${s * 14}px)`,
      transform: `scale(${1.12 - 0.12 * e}) translateY(${-s * 160}px)`,
    }}>{children}</AbsoluteFill>
  )
}

// Titular palabra a palabra. *palabra* = verde, _palabra_ = naranja
const Titulo: React.FC<{ kicker?: string; texto: string; desde?: number; top?: number; size?: number }> = ({ kicker, texto, desde = 3, top = 150, size = 82 }) => {
  const f = useCurrentFrame()
  const palabras = texto.split(' ')
  return (
    <div style={{ position: 'absolute', top, left: 70, right: 70 }}>
      {kicker && <div style={{ fontFamily: MONO, fontSize: 28, letterSpacing: 5, color: C.verde, opacity: lin(f, desde, desde + 6), textTransform: 'uppercase', marginBottom: 22 }}>{kicker}</div>}
      <div style={{ fontFamily: TIT, fontWeight: 700, fontSize: size, lineHeight: 1.06, color: C.txt, letterSpacing: -1.5 }}>
        {palabras.map((p, i) => {
          const e = sp(f, desde + 3 + i * 2.5, 11, 0.5)
          const verde = p.startsWith('*'), nar = p.startsWith('_')
          const limpio = p.replace(/[*_]/g, '')
          return (
            <span key={i} style={{ display: 'inline-block', marginRight: '0.24em', opacity: Math.min(1, e * 1.4), transform: `translateY(${(1 - e) * 50}px) scale(${0.7 + 0.3 * e})`, color: verde ? C.verde : nar ? C.naranja : C.txt }}>{limpio}</span>
          )
        })}
      </div>
    </div>
  )
}

const Tarjeta: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => (
  <div style={{ position: 'absolute', background: C.card, border: `1.5px solid ${C.line}`, borderRadius: 34, boxShadow: '0 40px 80px -30px rgba(0,0,0,.7)', overflow: 'hidden', ...style }}>{children}</div>
)

// Dedo que toca
const Toque: React.FC<{ x: number; y: number; en: number }> = ({ x, y, en }) => {
  const f = useCurrentFrame()
  if (f < en - 10 || f > en + 22) return null
  const llega = lin(f, en - 10, en)
  const t = lin(f, en, en + 20)
  return (
    <>
      <div style={{ position: 'absolute', left: x - 34, top: y - 34 + (1 - llega) * 120, width: 68, height: 68, borderRadius: 34, background: 'rgba(255,255,255,.85)', opacity: llega * (1 - t), transform: `scale(${1 - 0.2 * Math.sin(Math.min(1, t * 3) * Math.PI)})`, boxShadow: '0 8px 20px rgba(0,0,0,.4)' }} />
      <div style={{ position: 'absolute', left: x - 60, top: y - 60, width: 120, height: 120, borderRadius: 60, border: `5px solid ${C.verde}`, opacity: f >= en ? 1 - t : 0, transform: `scale(${0.4 + t})` }} />
    </>
  )
}

// Móvil
const Movil: React.FC<{ children: React.ReactNode; top?: number; escala?: number; desde?: number }> = ({ children, top = 560, escala = 1, desde = 0 }) => {
  const f = useCurrentFrame()
  const e = sp(f, desde, 15, 0.7)
  const W = 560, H = 1160
  return (
    <div style={{ position: 'absolute', left: 540 - (W + 28) / 2, top, width: W + 28, height: H + 28, borderRadius: 72, background: '#050806', border: '2px solid #2a3a32', padding: 14, transform: `translateY(${(1 - e) * 400}px) scale(${escala})`, transformOrigin: 'top center', opacity: e, boxShadow: '0 50px 100px -30px rgba(0,0,0,.8), 0 0 80px -20px rgba(61,220,151,.25)' }}>
      <div style={{ position: 'relative', width: W, height: H, borderRadius: 58, overflow: 'hidden', background: '#0e1512' }}>
        {children}
        <div style={{ position: 'absolute', top: 14, left: W / 2 - 66, width: 132, height: 36, borderRadius: 20, background: '#050806' }} />
      </div>
    </div>
  )
}

// ================= 1. Gancho =================
const Gancho: React.FC = () => {
  const f = useCurrentFrame()
  const n = Math.round(lin(f, 30, 75, 0, 37))
  return (
    <>
      <Titulo kicker="Para instaladoras solares" texto="¿Cuántos clientes se os _escapan_ por contestar *tarde?*" top={520} size={96} />
      <div style={{ position: 'absolute', top: 1180, left: 0, right: 0, textAlign: 'center', opacity: lin(f, 28, 36) }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 22, background: C.card, border: `1.5px solid ${C.line}`, borderRadius: 30, padding: '26px 40px' }}>
          <span style={{ fontSize: 60 }}>📩</span>
          <span style={{ fontFamily: TIT, fontSize: 64, color: C.rojo, fontWeight: 700 }}>{n}</span>
          <span style={{ fontFamily: SANS, fontSize: 34, color: C.soft }}>mensajes sin contestar</span>
        </div>
      </div>
    </>
  )
}

// ================= 2. La web inventada =================
const CAMPOS = [
  ['Nombre', 'Antonio García'],
  ['Teléfono', '611 22 33 44'],
  ['Pueblo', 'Úbeda'],
  ['Mensaje', 'Hola, tengo un pozo de 70 m y quiero quitar el motor de gasoil. ¿Me dais precio?'],
] as const
const Web: React.FC = () => {
  const f = useCurrentFrame()
  const inicio = [30, 62, 88, 108]
  const enviado = f > 215
  const pulsa = f > 205 && f < 215
  return (
    <>
      <Titulo kicker="Funciona con vuestra web" texto="Un cliente rellena el *formulario*" />
      <Tarjeta style={{ top: 520, left: 60, width: 960, height: 1220, background: '#f5f6f4', border: 'none' }}>
        {/* barra del navegador */}
        <div style={{ height: 70, background: '#e3e6e3', display: 'flex', alignItems: 'center', gap: 12, padding: '0 26px' }}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} style={{ width: 18, height: 18, borderRadius: 9, background: c }} />)}
          <div style={{ marginLeft: 20, flex: 1, background: '#fff', borderRadius: 14, padding: '10px 20px', fontFamily: SANS, fontSize: 24, color: '#555' }}>🔒 www.tuinstaladora.es/contacto</div>
        </div>
        {/* cabecera de la web */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '26px 40px', background: '#fff', borderBottom: '1px solid #e5e5e5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: SANS, fontWeight: 800, fontSize: 32, color: '#1d4e89' }}>
            <span style={{ fontSize: 40 }}>☀️</span>Tu Instaladora Solar
          </div>
          <div style={{ display: 'flex', gap: 22, fontFamily: SANS, fontSize: 22, color: '#777' }}><span>Inicio</span><span>Servicios</span><span style={{ color: '#1d4e89', fontWeight: 700 }}>Contacto</span></div>
        </div>
        <div style={{ background: 'linear-gradient(120deg,#1d4e89,#2f7dd1)', color: '#fff', padding: '34px 40px', fontFamily: SANS }}>
          <div style={{ fontSize: 40, fontWeight: 800 }}>Pide tu presupuesto sin compromiso</div>
          <div style={{ fontSize: 24, opacity: 0.85, marginTop: 8 }}>Placas solares · bombeo para riego · autoconsumo</div>
        </div>
        {/* formulario */}
        <div style={{ padding: '30px 40px', fontFamily: SANS }}>
          {CAMPOS.map(([k, v], i) => {
            const txt = escribe(v, f, inicio[i], i === 3 ? 2.6 : 1.6)
            const activo = f >= inicio[i] && txt.length < v.length
            return (
              <div key={k} style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 24, color: '#444', fontWeight: 600, marginBottom: 8 }}>{k}</div>
                <div style={{ minHeight: i === 3 ? 150 : 62, border: `2px solid ${activo ? '#2f7dd1' : '#d5d9d5'}`, borderRadius: 12, background: '#fff', padding: '14px 18px', fontSize: 27, color: '#222', lineHeight: 1.35 }}>
                  {txt}{activo && Math.floor(f / 8) % 2 === 0 ? <span style={{ color: '#2f7dd1' }}>|</span> : null}
                </div>
              </div>
            )
          })}
          <div style={{ marginTop: 10, display: 'inline-block', background: enviado ? '#28a745' : '#1d4e89', color: '#fff', fontWeight: 800, fontSize: 30, borderRadius: 14, padding: '18px 48px', transform: `scale(${pulsa ? 0.93 : 1})` }}>
            {enviado ? '✓ Enviado' : 'Enviar'}
          </div>
        </div>
      </Tarjeta>
      <Toque x={60 + 40 + 120} y={1590} en={208} />
      <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, textAlign: 'center', fontFamily: SANS, fontSize: 22, color: C.soft, opacity: 0.7 }}>Web y datos de ejemplo</div>
    </>
  )
}

// ================= 3. El email desordenado =================
const CRUDO = [
  ['--- Formulario: Contacto ---', ''],
  ['your-name: ', 'Antonio García', 'nombre'],
  ['your-tel: ', '611223344', 'tel'],
  ['campo_3: ', 'Úbeda', 'pueblo'],
  ['your-message: ', 'Hola, tengo un pozo de 70 m y quiero quitar el motor de gasoil. ¿Me dais precio?', 'msg'],
  ['----', ''],
  ['Enviado desde https://www.tuinstaladora.es', ''],
  ['IP: 83.45.xx.xx · Agente: Mozilla/5.0 (Linux; Android 14)', ''],
] as const
const EmailCrudo: React.FC<{ resalta?: number; escaneo?: number }> = ({ resalta = -1, escaneo = -1 }) => (
  <div style={{ fontFamily: SANS }}>
    <div style={{ padding: '28px 36px', borderBottom: `1px solid ${C.line}` }}>
      <div style={{ fontSize: 24, color: C.soft }}>De: web@tuinstaladora.es</div>
      <div style={{ fontSize: 34, color: C.txt, fontWeight: 700, marginTop: 8 }}>Nuevo mensaje del formulario de contacto</div>
    </div>
    <div style={{ position: 'relative', padding: '26px 36px', fontFamily: MONO, fontSize: 25, lineHeight: 1.65, color: '#9fb3a9' }}>
      {CRUDO.map((l, i) => (
        <div key={i}>
          {l[0]}
          {l[1] && <span style={{ color: resalta >= i ? C.txt : '#9fb3a9', background: resalta >= i ? 'rgba(61,220,151,.22)' : 'transparent', borderRadius: 6, padding: '0 4px', boxShadow: resalta >= i ? `0 0 0 2px ${C.verde}` : 'none' }}>{l[1]}</span>}
        </div>
      ))}
      {escaneo >= 0 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: escaneo, height: 6, background: C.verde, boxShadow: `0 0 30px 12px rgba(61,220,151,.55)` }} />
      )}
    </div>
  </div>
)
const Desorden: React.FC = () => {
  const f = useCurrentFrame()
  const e = sp(f, 8, 13)
  return (
    <>
      <Titulo kicker="Lo que os llega hoy" texto="Un email _desordenado_ entre otros 50" />
      {[0, 1, 2].map((k) => (
        <Tarjeta key={k} style={{ top: 640 + k * 26, left: 90 + k * 14, width: 900 - k * 28, height: 760, opacity: 0.4 - k * 0.12, transform: `rotate(${(k + 1) * 1.6}deg)` }}><div /></Tarjeta>
      ))}
      <Tarjeta style={{ top: 600, left: 60, width: 960, transform: `translateY(${(1 - e) * 300}px) rotate(${(1 - e) * -6}deg)`, opacity: e }}>
        <EmailCrudo />
      </Tarjeta>
    </>
  )
}

// ================= 4. La IA lo lee: los datos vuelan =================
const CHIPS = [
  { k: 'Nombre', v: 'Antonio García', fila: 1, icono: '👤' },
  { k: 'Teléfono', v: '611 22 33 44', fila: 2, icono: '📞' },
  { k: 'Pueblo', v: 'Úbeda', fila: 3, icono: '📍' },
  { k: 'Qué pide', v: 'Bombeo solar · pozo de 70 m', fila: 4, icono: '💧', deduce: true },
]
const IA: React.FC = () => {
  const f = useCurrentFrame()
  const esc = lin(f, 18, 70, 0, 330)
  const resalta = Math.floor(lin(f, 18, 70, 0, 5))
  return (
    <>
      <Titulo kicker="Aquí entra la IA" texto="Lo *lee* y lo *ordena* sola" />
      <Tarjeta style={{ top: 470, left: 60, width: 960, transform: 'scale(.92)', transformOrigin: 'top center' }}>
        <EmailCrudo resalta={resalta - 1} escaneo={f < 72 ? esc : -1} />
      </Tarjeta>
      {/* insignia IA */}
      <div style={{ position: 'absolute', top: 455, right: 70, background: C.verde, color: C.bg, fontFamily: TIT, fontWeight: 700, fontSize: 30, padding: '10px 22px', borderRadius: 20, transform: `scale(${1 + 0.06 * Math.sin(f / 4)})`, boxShadow: `0 0 40px rgba(61,220,151,.6)` }}>✦ IA</div>
      {/* ficha que se va llenando */}
      <Tarjeta style={{ top: 1260, left: 60, width: 960, padding: '30px 36px', background: C.card2, border: `2px solid ${C.verde}` }}>
        <div style={{ fontFamily: MONO, fontSize: 24, color: C.verde, letterSpacing: 4 }}>FICHA DEL CLIENTE</div>
        {CHIPS.map((c, i) => {
          const llega = sp(f, 80 + i * 22, 13, 0.6)
          return (
            <div key={c.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < 3 ? `1px solid ${C.line}` : 'none', fontFamily: SANS, fontSize: 32 }}>
              <span style={{ color: C.soft }}>{c.icono} {c.k}</span>
              <span style={{ color: C.txt, fontWeight: 700, opacity: llega, transform: `translate(${(1 - llega) * -80}px, ${(1 - llega) * -420}px) scale(${0.6 + 0.4 * llega})`, display: 'inline-block' }}>
                {c.v}{c.deduce && llega > 0.9 && <span style={{ marginLeft: 12, fontSize: 22, color: C.naranja, fontWeight: 600 }}>✨ lo deduce</span>}
              </span>
            </div>
          )
        })}
      </Tarjeta>
    </>
  )
}

// ================= 5. Al móvil + WhatsApp =================
const Notificacion: React.FC<{ desde: number; titulo: string; texto: string; app?: string; top?: number }> = ({ desde, titulo, texto, app = 'AVISOS', top = 300 }) => {
  const f = useCurrentFrame()
  const e = sp(f, desde, 12, 0.6)
  return (
    <div style={{ position: 'absolute', left: 18, right: 18, top: top + (1 - e) * -340, opacity: e, background: 'rgba(30,42,36,.96)', border: `1px solid ${C.line}`, borderRadius: 30, padding: '20px 24px', fontFamily: SANS, boxShadow: '0 20px 40px rgba(0,0,0,.5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 19, color: C.soft }}><span style={{ fontWeight: 700, letterSpacing: 1 }}>{app}</span><span>ahora</span></div>
      <div style={{ fontSize: 26, fontWeight: 700, color: C.txt, marginTop: 6 }}>{titulo}</div>
      <div style={{ fontSize: 23, color: '#c9d6cf', marginTop: 4, lineHeight: 1.35 }}>{texto}</div>
    </div>
  )
}
const Bloqueo: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(170deg,#173326,#0a1410 60%)', fontFamily: SANS }}>
    <div style={{ textAlign: 'center', color: C.txt, fontSize: 130, fontWeight: 300, marginTop: 110, letterSpacing: -4 }}>9:41</div>
    {children}
  </div>
)
const Movil1: React.FC = () => {
  const f = useCurrentFrame()
  const abre = sp(f, 70, 15)
  const wa = sp(f, 160, 15)
  const titulo = f < 150 ? 'Os salta al *móvil* al momento' : 'Un toque y le contestáis por *WhatsApp*'
  return (
    <>
      <Sequence durationInFrames={150}><Titulo kicker="En segundos" texto="Os salta al *móvil* al momento" /></Sequence>
      <Sequence from={150}><Titulo kicker="Sin copiar nada" texto="Un toque y le contestáis por *WhatsApp*" /></Sequence>
      <Movil top={560}>
        <Bloqueo>
          <Notificacion desde={14} titulo="🔔 Nuevo contacto: Antonio García" texto="Úbeda · 611 22 33 44 · Bombeo solar, pozo de 70 m" />
        </Bloqueo>
        {/* ficha abierta */}
        <div style={{ position: 'absolute', inset: 0, background: '#0e1512', transform: `translateY(${(1 - abre) * 1200}px)`, fontFamily: SANS, padding: '90px 30px' }}>
          <div style={{ fontSize: 22, color: C.soft }}>Avisos · ahora</div>
          <div style={{ marginTop: 18, background: C.card2, borderRadius: 26, padding: 26, border: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: C.txt }}>Nuevo contacto: Antonio García</div>
            {[['📞', '611 22 33 44'], ['📍', 'Úbeda'], ['💧', 'Bombeo solar · pozo de 70 m']].map(([i, t]) => (
              <div key={t} style={{ fontSize: 27, color: '#d3e0d9', marginTop: 14 }}>{i} {t}</div>
            ))}
            <div style={{ fontSize: 23, color: C.soft, marginTop: 16, fontStyle: 'italic', lineHeight: 1.4 }}>“Quiere quitar el motor de gasoil y pide precio.”</div>
            <div style={{ marginTop: 26, background: C.wa, color: '#fff', textAlign: 'center', borderRadius: 40, padding: '20px 0', fontSize: 28, fontWeight: 800, transform: `scale(${f > 120 && f < 158 ? 1 + 0.05 * Math.sin((f - 120) / 3) : 1})`, boxShadow: f > 120 ? `0 0 0 ${10 + 6 * Math.sin(f / 4)}px rgba(37,211,102,.22)` : 'none' }}>Contestar por WhatsApp</div>
          </div>
        </div>
        {/* WhatsApp con el mensaje escrito */}
        <div style={{ position: 'absolute', inset: 0, background: '#0b141a', transform: `translateX(${(1 - wa) * 600}px)`, fontFamily: SANS }}>
          <div style={{ background: '#1f2c34', padding: '70px 26px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 60, height: 60, borderRadius: 30, background: '#6b7c85', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 28 }}>A</div>
            <div style={{ color: '#e9edef', fontSize: 28, fontWeight: 600 }}>Antonio García</div>
          </div>
          <div style={{ position: 'absolute', left: 20, right: 20, bottom: 30, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, background: '#2a3942', borderRadius: 30, padding: '20px 24px', color: '#e9edef', fontSize: 25, lineHeight: 1.4 }}>
              {escribe('Hola Antonio, soy de Tu Instaladora Solar. Hemos recibido tu consulta. ¿Cuándo te viene bien que hablemos?', f, 175, 4)}
            </div>
            <div style={{ width: 76, height: 76, borderRadius: 38, background: C.wa, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 34 }}>➤</div>
          </div>
        </div>
      </Movil>
      <Toque x={540} y={955} en={60} />
      <Toque x={540} y={1098} en={152} />
      <div style={{ position: 'absolute', top: 1770, left: 0, right: 0, textAlign: 'center', opacity: lin(f, 30, 40) }}>
        <span style={{ fontFamily: MONO, fontSize: 30, color: C.verde, background: 'rgba(61,220,151,.12)', border: `1.5px solid ${C.verde}`, borderRadius: 30, padding: '12px 28px' }}>⏱ menos de 1 minuto</span>
      </div>
    </>
  )
}

// ================= 6. La hoja =================
const ESTADOS: Record<string, string> = { nuevo: C.azul, contactado: C.amarillo, presupuestado: C.naranja, cerrado: C.verde }
const Hoja: React.FC = () => {
  const f = useCurrentFrame()
  const nueva = sp(f, 25, 13)
  const abre = f > 95 && f < 150
  const estado = f < 150 ? 'nuevo' : 'presupuestado'
  const filas = [
    ['02/10', 'María Ruiz', 'Baeza', 'Placas para casa', 'cerrado'],
    ['05/10', 'José Martín', 'Linares', 'Bombeo · balsa', 'contactado'],
    ['06/10', 'Lucía Gómez', 'Jódar', 'Riego por goteo', 'presupuestado'],
  ]
  const Celda: React.FC<{ w: number; children: React.ReactNode; b?: boolean }> = ({ w, children, b }) => (
    <div style={{ width: w, padding: '22px 14px', borderRight: '1px solid #e2e2e2', fontWeight: b ? 700 : 400, whiteSpace: 'nowrap', overflow: 'hidden' }}>{children}</div>
  )
  const Chip: React.FC<{ e: string }> = ({ e }) => <span style={{ background: ESTADOS[e] + '33', color: '#222', border: `2px solid ${ESTADOS[e]}`, borderRadius: 14, padding: '4px 12px', fontSize: 24, fontWeight: 700 }}>{e} ▾</span>
  const W = [120, 230, 140, 260, 270]
  return (
    <>
      <Titulo kicker="Todo apuntado" texto="Cada contacto, en vuestra *hoja* de seguimiento" />
      <Tarjeta style={{ top: 640, left: 30, width: 1020, background: '#fff', border: 'none', fontFamily: SANS, fontSize: 27, color: '#222' }}>
        <div style={{ background: '#0f9d58', color: '#fff', padding: '18px 26px', fontWeight: 700, fontSize: 26 }}>📊 Contactos · Tu Instaladora Solar</div>
        <div style={{ display: 'flex', background: '#f1f3f4', color: '#555' }}>
          {['Fecha', 'Nombre', 'Pueblo', 'Qué pide', 'Estado'].map((h, i) => <Celda key={h} w={W[i]} b>{h}</Celda>)}
        </div>
        {filas.map((r) => (
          <div key={r[1]} style={{ display: 'flex', borderTop: '1px solid #e2e2e2', opacity: 0.55 }}>
            {r.slice(0, 4).map((c, i) => <Celda key={i} w={W[i]}>{c}</Celda>)}
            <Celda w={W[4]}><Chip e={r[4]} /></Celda>
          </div>
        ))}
        <div style={{ display: 'flex', borderTop: '1px solid #e2e2e2', background: `rgba(61,220,151,${0.25 * (1 - lin(f, 60, 120))})`, transform: `translateX(${(1 - nueva) * 1000}px)` }}>
          {['08/10', 'Antonio García', 'Úbeda', 'Bombeo · pozo 70 m'].map((c, i) => <Celda key={i} w={W[i]} b>{c}</Celda>)}
          <Celda w={W[4]}><Chip e={estado} /></Celda>
        </div>
      </Tarjeta>
      {abre && (
        <div style={{ position: 'absolute', top: 1110, left: 790, width: 260, background: '#fff', borderRadius: 18, boxShadow: '0 20px 50px rgba(0,0,0,.5)', fontFamily: SANS, fontSize: 25, overflow: 'hidden', transform: `scale(${sp(f, 95, 14)})`, transformOrigin: 'top' }}>
          {Object.keys(ESTADOS).map((e) => (
            <div key={e} style={{ padding: '16px 22px', background: e === 'presupuestado' && f > 125 ? '#e8f5e9' : '#fff', color: '#222', borderLeft: `6px solid ${ESTADOS[e]}` }}>{e}</div>
          ))}
        </div>
      )}
      <Toque x={900} y={1062} en={92} />
      <Toque x={900} y={1270} en={132} />
      <div style={{ position: 'absolute', top: 1540, left: 70, right: 70, fontFamily: SANS, fontSize: 36, color: C.soft, textAlign: 'center', opacity: lin(f, 150, 160) }}>
        Cambiáis el estado con <b style={{ color: C.txt }}>un clic</b>. El resto lo vigila el sistema.
      </div>
    </>
  )
}

// ================= 7. Seguimiento: pasan los días =================
const Seguimiento: React.FC = () => {
  const f = useCurrentFrame()
  const dia = Math.min(7, Math.floor(lin(f, 20, 150, 1, 7.99)))
  return (
    <>
      <Titulo kicker="Seguimiento automático" texto="Si no hay respuesta, el sistema *no se olvida*" />
      {/* calendario de días */}
      <div style={{ position: 'absolute', top: 680, left: 60, right: 60, display: 'flex', justifyContent: 'space-between' }}>
        {[1, 2, 3, 4, 5, 6, 7].map((d) => {
          const on = dia >= d
          const col = d === 3 ? C.azul : d === 7 ? C.naranja : C.verde
          return (
            <div key={d} style={{ width: 118, height: 150, borderRadius: 24, background: on ? col : C.card, border: `2px solid ${on ? col : C.line}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: `scale(${dia === d ? 1.12 : 1})`, transition: 'none', color: on ? C.bg : C.soft }}>
              <div style={{ fontFamily: MONO, fontSize: 20 }}>DÍA</div>
              <div style={{ fontFamily: TIT, fontSize: 60, fontWeight: 700 }}>{d}</div>
            </div>
          )
        })}
      </div>
      {/* día 3: recordatorio al cliente */}
      <Tarjeta style={{ top: 920, left: 60, width: 960, padding: '30px 34px', border: `2px solid ${C.azul}`, opacity: sp(f, 62, 13), transform: `translateX(${(1 - sp(f, 62, 13)) * -700}px)` }}>
        <div style={{ fontFamily: MONO, fontSize: 24, color: C.azul, letterSpacing: 3 }}>DÍA 3 · AL CLIENTE ✉️</div>
        <div style={{ fontFamily: SANS, fontSize: 31, color: C.txt, marginTop: 14, lineHeight: 1.4 }}>“Hola Antonio: hace unos días te enviamos el presupuesto. ¿Tienes alguna duda?”</div>
      </Tarjeta>
      {/* día 7: aviso a la instaladora */}
      <Tarjeta style={{ top: 1240, left: 60, width: 960, padding: '30px 34px', border: `2px solid ${C.naranja}`, opacity: sp(f, 152, 12), transform: `translateX(${(1 - sp(f, 152, 12)) * 700}px) rotate(${f > 152 && f < 175 ? Math.sin(f) * 1.2 : 0}deg)` }}>
        <div style={{ fontFamily: MONO, fontSize: 24, color: C.naranja, letterSpacing: 3 }}>DÍA 7 · A VOSOTROS ⚠️</div>
        <div style={{ fontFamily: SANS, fontSize: 34, color: C.txt, fontWeight: 800, marginTop: 14 }}>Antonio lleva 7 días sin respuesta</div>
        <div style={{ fontFamily: SANS, fontSize: 28, color: C.soft, marginTop: 8 }}>¿Le llamamos? <span style={{ color: C.wa, fontWeight: 700 }}>Escribirle por WhatsApp →</span></div>
      </Tarjeta>
      <div style={{ position: 'absolute', top: 1600, left: 70, right: 70, textAlign: 'center', fontFamily: TIT, fontSize: 44, color: C.txt, fontWeight: 700, opacity: lin(f, 185, 195) }}>
        Ningún presupuesto se <span style={{ color: C.verde }}>enfría</span>.
      </div>
    </>
  )
}

// ================= 8. Reseñas =================
const Resenas: React.FC = () => {
  const f = useCurrentFrame()
  const fila = sp(f, 10, 13)
  return (
    <>
      <Titulo kicker="Al acabar la obra" texto="La reseña de Google, con *un toque*" />
      <Tarjeta style={{ top: 600, left: 60, width: 960, background: '#fff', border: 'none', fontFamily: SANS, color: '#222', opacity: fila, transform: `translateY(${(1 - fila) * 200}px)` }}>
        <div style={{ background: '#0f9d58', color: '#fff', padding: '16px 26px', fontWeight: 700, fontSize: 25 }}>📊 Obras terminadas</div>
        <div style={{ padding: '22px 26px', fontSize: 30, display: 'flex', justifyContent: 'space-between' }}><b>Antonio García</b><span style={{ color: '#0f9d58', fontWeight: 700 }}>✓ terminada</span></div>
      </Tarjeta>
      <div style={{ position: 'absolute', top: 820, left: 0, right: 0 }}>
        <div style={{ position: 'relative', height: 1, margin: '0 60px' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>
            {/* aviso al móvil */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: 30 + (1 - sp(f, 45, 12)) * -80, opacity: sp(f, 45, 12), background: 'rgba(30,42,36,.96)', border: `1.5px solid ${C.line}`, borderRadius: 30, padding: '24px 30px', fontFamily: SANS }}>
              <div style={{ fontSize: 22, color: C.soft, fontWeight: 700 }}>AVISOS · ahora</div>
              <div style={{ fontSize: 32, color: C.txt, fontWeight: 800, marginTop: 6 }}>⭐ Pedir reseña a Antonio</div>
              <div style={{ marginTop: 18, background: C.wa, color: '#fff', textAlign: 'center', borderRadius: 36, padding: '16px 0', fontSize: 27, fontWeight: 800 }}>Abrir WhatsApp con el mensaje</div>
            </div>
            {/* burbuja */}
            <div style={{ position: 'absolute', left: 60, right: 0, top: 330, opacity: sp(f, 92, 13), transform: `translateY(${(1 - sp(f, 92, 13)) * 60}px)`, background: '#005c4b', color: '#e9edef', borderRadius: '30px 30px 8px 30px', padding: '24px 30px', fontFamily: SANS, fontSize: 28, lineHeight: 1.45 }}>
              Hola Antonio, gracias por confiar en nosotros. Si estás contento con la instalación, ¿nos dejas una reseña en Google? Te lleva un minuto: <span style={{ color: '#53bdeb' }}>g.page/r/…/review</span>
            </div>
          </div>
        </div>
      </div>
      <Toque x={540} y={820 + 30 + 160} en={84} />
      <div style={{ position: 'absolute', top: 1470, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 22 }}>
        {[0, 1, 2, 3, 4].map((i) => {
          const s = sp(f, 140 + i * 6, 9, 0.5)
          return <span key={i} style={{ fontSize: 120, color: C.amarillo, display: 'inline-block', transform: `scale(${s}) rotate(${(1 - s) * 90}deg)`, textShadow: '0 0 40px rgba(255,204,51,.6)' }}>★</span>
        })}
      </div>
      <div style={{ position: 'absolute', top: 1660, left: 70, right: 70, textAlign: 'center', fontFamily: TIT, fontSize: 44, fontWeight: 700, color: C.txt, opacity: lin(f, 175, 185) }}>
        Más reseñas = <span style={{ color: C.verde }}>más llamadas</span>
      </div>
    </>
  )
}

// ================= 9. Cierre =================
const Cierre: React.FC = () => {
  const f = useCurrentFrame()
  const items = ['Contactos al móvil al momento', 'Todo apuntado y ordenado', 'Ningún cliente olvidado', 'Más reseñas en Google']
  const badge = sp(f, 110, 9, 0.6)
  return (
    <>
      <Titulo texto="Con vuestra web. *Sin* *tocar* *nada.*" top={300} size={100} />
      <div style={{ position: 'absolute', top: 760, left: 90, right: 70 }}>
        {items.map((t, i) => {
          const e = sp(f, 30 + i * 12, 12)
          return (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 26, marginBottom: 34, opacity: e, transform: `translateX(${(1 - e) * -200}px)` }}>
              <span style={{ width: 62, height: 62, borderRadius: 31, background: C.verde, color: C.bg, display: 'grid', placeItems: 'center', fontSize: 38, fontWeight: 800 }}>✓</span>
              <span style={{ fontFamily: SANS, fontSize: 42, color: C.txt, fontWeight: 600 }}>{t}</span>
            </div>
          )
        })}
      </div>
      <div style={{ position: 'absolute', top: 1330, left: 0, right: 0, textAlign: 'center' }}>
        <span style={{ display: 'inline-block', background: C.naranja, color: C.bg, fontFamily: TIT, fontWeight: 700, fontSize: 70, padding: '26px 60px', borderRadius: 70, transform: `scale(${badge * (1 + 0.03 * Math.sin(f / 5))})`, boxShadow: '0 0 80px rgba(255,159,67,.45)' }}>Primer mes GRATIS</span>
      </div>
      <div style={{ position: 'absolute', top: 1560, left: 0, right: 0, textAlign: 'center', fontFamily: SANS, opacity: lin(f, 135, 150) }}>
        <div style={{ fontSize: 46, color: C.txt, fontWeight: 800 }}>Fernando</div>
        <div style={{ fontSize: 32, color: C.soft, marginTop: 8 }}>Automatizaciones para instaladoras solares</div>
      </div>
    </>
  )
}

// ================= Montaje =================
const ESCENAS: [React.FC, number][] = [
  [Gancho, 95],
  [Web, 250],
  [Desorden, 110],
  [IA, 200],
  [Movil1, 290],
  [Hoja, 230],
  [Seguimiento, 230],
  [Resenas, 220],
  [Cierre, 210],
]
export const DURACION_G = ESCENAS.reduce((s, [, d]) => s + d, 0)

export const Generico: React.FC = () => {
  useFuentes()
  let t = 0
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Fondo />
      {ESCENAS.map(([Comp, dur], i) => {
        const desde = t; t += dur
        return (
          <Sequence key={i} from={desde} durationInFrames={dur}>
            <Escena dur={dur}><Comp /></Escena>
          </Sequence>
        )
      })}
      {/* barra de progreso tipo stories */}
      <ProgresoBarra />
    </AbsoluteFill>
  )
}
const ProgresoBarra: React.FC = () => {
  const f = useCurrentFrame()
  return <div style={{ position: 'absolute', top: 40, left: 60, right: 60, height: 6, borderRadius: 3, background: 'rgba(255,255,255,.12)' }}>
    <div style={{ width: `${(f / DURACION_G) * 100}%`, height: '100%', borderRadius: 3, background: C.verde }} />
  </div>
}
