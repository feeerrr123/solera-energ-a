# Solera Energía — guía para Claude Code

Web **demo** (marca ficticia) de una instaladora **especializada en bombeo solar
agrícola** (riego) en Jaén, Granada, Almería y Córdoba, con foco en olivar de
regadío y comunidades de regantes. Sirve como **paquete para vender a instaladoras
reales** de ese nicho (no autoconsumo generalista): todo lo que cambia de una
instaladora a otra vive en un único archivo de configuración. Ver `PRODUCT.md`
(negocio, incluye por qué se estrechó el nicho) y `DESIGN.md` (sistema visual).

## Cómo está montado

Sin framework. Un script de Node sin dependencias (`build.mjs`) junta plantillas
+ configuración y genera HTML estático en `dist/`. La API (`api/`) son funciones
de Vercel; Supabase es la base de datos.

```
config/site.config.js   ← ÚNICO archivo de configuración: empresa, textos, cifras,
                          parámetros de la calculadora, zona, casos, FAQ, panel…
src/
  pages/*.html          plantillas de las páginas (estructura; sin texto propio)
  partials/             head · cabecera · pie · whatsapp · caso-card · fig-bombeo · fig-dia
  partials/iconos/      pozo · balsa · diesel · comunidad  (*.svg.html)
  css/site.css          estilos compartidos (se incrustan en cada página)
  js/                   scripts de página (menu, widget, calculadora, formulario, panel, casos-remotos)
  shared/               módulos que usan a la vez el NAVEGADOR y api/ (una sola copia):
                        logica.js (reglas puras) · tarjeta.js (rellena tarjetas; solo navegador)
public/                 se copia tal cual a dist/ (favicon.svg…)
api/                    funciones de Vercel (ver "Panel y API")
supabase/schema.sql     tabla + bucket + 3 casos de ejemplo (se pega UNA vez en Supabase)
tools/motor.mjs         el motor de plantillas (sintaxis explicada en su cabecera)
tests/                  `npm test` — motor, lógica, API y config
build.mjs · vercel.json · package.json · .env.example
dist/                   SALIDA (en .gitignore). Nunca se edita a mano.
```

Páginas: `index` · `como-funciona` · `instalaciones` (incluye Proceso) · `casos`
(incluye Por qué nosotros) · `calculadora` · `contacto` (incluye Zona y Preguntas) ·
`admin` (panel interno, `noindex`, fuera del menú).

**Cambiar algo:** un texto, cifra, dato de empresa o parámetro → `config/site.config.js`.
Estructura o estilo → la plantilla o el parcial. Cada página tiene su plantilla en
`src/pages/<archivo>` y está dada de alta en `paginas` de la config.

```bash
npm run build     # genera dist/
npm run dev       # genera, vigila cambios y sirve dist/ en http://localhost:4177
npm test          # 50 pruebas (motor, lógica, API con repositorio en memoria, config)
```

Un dato que falta en la config **rompe el build** con el archivo y la ruta — a propósito:
mejor eso que una web con huecos. `demo: true` en la config enseña los avisos de "marca
ficticia / dato de ejemplo / caso ilustrativo"; para una instaladora real: `demo: false`.

**`npm run dev` no ejecuta `/api`** (solo sirve `dist/`). La web lo tolera: el panel entra en
modo demo local y Casos se queda con los de la config. Para probar la API de verdad hace
falta `vercel dev` (necesita `vercel login`) o la web ya desplegada. Alternativa sin
cuenta usada al construir la Fase 1: un arnés de Node que sirve `dist/` y enchufa los
endpoints reales con un repositorio en memoria (los tests de `tests/api.test.mjs` hacen lo
mismo sin servidor).

## Panel interno y casos de éxito (Fase 1, 2026-09-26)

**`/admin.html`** — instalaciones, reseñas, revisiones de mantenimiento y casos de éxito.

- **Instalaciones:** alta/edición/borrado (cliente, teléfono, municipio, cultivo, hectáreas,
  potencia kWp, fecha). **"Pedir reseña"** abre WhatsApp (`wa.me`) con el mensaje ya escrito
  (`panel.mensajeResena`, con `empresa.googleReviewUrl`) y anota la fecha.
- **Revisiones:** intervalo `panel.mantenimientoMeses` (12) y aviso `panel.avisoDias` (45). Lista
  las vencidas/próximas con botón de WhatsApp ("Recordar") y "Marcar revisión hecha". **No se
  envía nada solo**: sin API de WhatsApp, un clic abre el mensaje y la instaladora pulsa enviar.
- **Casos de éxito:** por instalación: autorización del cliente, gasto anual antes, ahorro/año,
  amortización, frase, foto (se reduce a 1200 px en el navegador). Vista previa de la tarjeta
  real. Solo se publica con **autorización + ahorro + amortización**; quitar la autorización
  despublica en el acto.
- **Modo demo (sin Supabase, o con `npm run dev`):** el panel funciona con 4 instalaciones de
  ejemplo en el `localStorage` del navegador ("Restablecer datos de ejemplo"). Nada llega a la
  web pública. Con la API de verdad, el chip dice "Conectado".

**API (`api/`, 5 funciones; el límite de Vercel Hobby es 12):**

| ruta | qué hace |
|---|---|
| `admin/login.js` | GET ¿hay sesión? · POST entrar · DELETE salir |
| `admin/instalaciones/index.js` | GET listar · POST alta |
| `admin/instalaciones/[id].js` | PATCH (datos, caso, `marcar`) · DELETE |
| `admin/foto.js` | POST foto (dataURL) → sube al bucket `casos` → URL |
| `casos.js` | GET público: casos publicados y autorizados |

Cada endpoint es una **fábrica** (`crear(deps)`) para poder probarlo con un repositorio en
memoria; `export default` la enchufa a Supabase (`api/_lib/deps.js`). Lo que decide qué cambios
se aceptan (`prepararCambios`) vive en `src/shared/logica.js` y lo usan **la API y el modo demo
del panel**: las reglas no se pueden desincronizar.

**Seguridad (reglas duras):**
- Contraseña **comprobada en el servidor** (`ADMIN_PASSWORD`), cookie de sesión firmada con
  HMAC (`ADMIN_SECRET`, 16+ caracteres), `HttpOnly; Secure; SameSite=Strict`, 8 h. Mal
  contraseña = espera 600 ms + 401. Sin límite de intentos por IP (limitación conocida).
- Con Supabase configurado pero sin `ADMIN_*`, el panel **no se abre** (503), nunca queda abierto.
- Clave `service_role` solo en `api/`; la tabla `instalaciones` tiene RLS activado **sin
  políticas**: el navegador con la clave anon no puede leer ni escribir nada.
- `/api/casos` devuelve por **lista blanca** (`casoPublico`): nunca `cliente` ni `telefono`.
  Hay un test que lo comprueba. La frase sale sin nombre (`casos.atribucion`).
- La foto solo puede ser de nuestro bucket; se comprueba que el archivo es una imagen de verdad
  (cabecera del archivo) y que pesa ≤ 1,5 MB. `es_demo` no lo puede tocar nadie desde fuera.
- Las mutaciones exigen `Content-Type: application/json` (415 si no).

**Casos en la web pública:** `casos.html` se genera con los de la config (respaldo, también sin
JavaScript). En el navegador, `casos-remotos.js` pide `/api/casos` y, si hay casos publicados,
**los sustituye**. La tarjeta es un solo trozo de plantilla (`partials/caso-card.html`) que sirve
para tres cosas: la versión estática, el `<template id="tpl-caso">` (`{{@molde caso-card}}`) con el
que se rellenan las de la API, y la vista previa del panel. Cambiar la tarjeta = cambiar ese parcial.

**Puesta en marcha (la hace el usuario; nunca pegar claves en el chat):**
1. Supabase: proyecto nuevo → SQL Editor → pegar `supabase/schema.sql` → Run.
2. Project Settings → API: copiar **Project URL** y la clave **`service_role`** (no la anon).
3. Vercel → Environment Variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`
   (larga), `ADMIN_SECRET` (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
4. Poner `googleReviewUrl` real en la config. Push a GitHub → Vercel redespliega.
5. Entrar en `/admin.html`, contraseña, y comprobar: alta, reseña, marcar un caso.

**Límites de los planes gratuitos (verificados 2026-09-26):** Supabase Free pausa el proyecto tras
7 días sin actividad (hay que reanudarlo a mano), 2 proyectos gratuitos activos (Óptica ya usa
uno), 500 MB de base de datos y 1 GB de archivos. Vercel Hobby es de **uso no comercial**: la
propia definición incluye "anunciar un producto o servicio" y "cobrar por crear o alojar el
sitio". Para una instaladora real que paga, el despliegue debe ir en su cuenta o en un plan Pro.

## Stack

- **Tailwind por CDN** (`cdn.tailwindcss.com?plugins=forms`), config en `src/js/tailwind-config.js`.
  Los colores son de diseño, no de cliente: no están en `site.config.js`.
- Fuentes Google: **Young Serif** (display), **Hanken Grotesk** (texto), **Spline Sans Mono**.
- Única dependencia: `@supabase/supabase-js` (solo la usa `api/_lib/repo.js`).
- Deploy: **Vercel vía GitHub** (`feeerrr123/solera-energ-a`).
- Todos los formularios públicos (ayudas, dimensionado, contacto; calculadora en la Fase 3) mandan a
  `POST /api/contactos` (tabla `contactos`). Ver "Captación de contactos (Fase 2)".

## Captación de contactos, ayudas y dimensionado (Fase 2, 2026-09-26)

- **Páginas nuevas:** `ayudas`, `dimensionado`, `privacidad` (+ "Ayudas" y "Dimensionado" en el menú, que
  pasa a `xl:` porque ya son 7 enlaces). Todo el texto en `ayudas`, `dimensionado`, `privacidad` y
  `contactos` de la config. **Los coeficientes de `dimensionado.parametros` y las líneas de
  `ayudas.lineas` son de ejemplo**: la instaladora real los cambia.
- **Ayudas** (`src/js/ayudas.js`, `ayudasPosibles` en `logica.js`): 5 preguntas → "es posible que puedas
  optar…" + líneas a revisar. **Nunca importes ni promesas** (hay un test que lo vigila). Sin concesión
  del pozo → aviso extra. Pide nombre y teléfono para "confirmártelo gratis".
- **Dimensionado** (`dimensionar` en `logica.js`): P hidráulica = 2,725·Q·H → /rendimiento →
  ·sobredimensionado → kWp (redondeo por `paso`); precio = **siempre un rango** por tramos €/kWp.
  Ejemplo comprobado a mano: H=60, Q=10 → 4,5 kWp, 4.900–7.200 €. El desglose completo solo se
  muestra tras enviar el contacto. Guarda `solera.dimensionado` en `sessionStorage` (lo usará la Fase 3).
- **Contactos:** `src/shared/lead.js` (navegador) + partials `lead-cierre` (nombre, teléfono, casilla de
  consentimiento, campo trampa `web`) y `lead-ok` (recibido + botón wa.me a la instaladora con los datos).
  `window.LEAD = contactos` de la config. En `datos` se guardan **etiquetas legibles**, no ids;
  `contactos.origenes[origen].campos` decide qué se ve en el WhatsApp y en el panel.
  Sin consentimiento no entra nada; freno de 3/hora por teléfono; sin Supabase = modo demo (valida, no guarda).
  En local (`npm run dev`, sin `/api`) se finge éxito solo en localhost; en cualquier otro host es error.
- **Panel:** pestaña Contactos (estado nuevo/contactado/descartado, nota, contestar por WhatsApp, borrar).
  En demo usa `localStorage` con contactos ficticios. Endpoints: `api/contactos.js`,
  `api/admin/contactos/{index,[id]}.js` (8 funciones de 12 posibles en Hobby).
- **Supabase:** hay que **volver a pegar `supabase/schema.sql`** (añade la tabla `contactos`; es idempotente).
- Probado: 67 pruebas; en navegador (demo local): las 4 herramientas + panel + sin desbordes en móvil.
  **Sin probar contra Supabase real**; menú de 7 enlaces sin mirar en pantalla ancha.

## Vidrio esmerilado (glass) e interactividad

- `.glass` / `.glass-dark` (`src/css/site.css`): blur + saturate, borde translúcido. Header sticky,
  menú móvil, botones secundarios, WhatsApp y paneles flotantes. **Nunca** en el botón primario
  (ochre sólido) ni donde hay texto de formulario.
- `.lift`: eleva 3px + sombra al hover en tarjetas/chips clicables (respeta `prefers-reduced-motion`).
- Widget "diésel vs. sol" en `index` (datos en `inicio.widget`, pasados al script con `{{@json}}`).
- Listas de "N cosas" = lista con filete (`divide-y border-y`), no tarjeta con caja y sombra.
  Excepción deliberada: las tarjetas de caso (`glass lift`), que son piezas de prueba social.

## Calculadora de ahorro v2 (Fase 3, 2026-09-26; lo más delicado)

- Página `calculadora`; fórmula **pura** en `calcularAhorro` (`src/shared/logica.js`, con tests); UI en
  `src/js/calculadora.js`. **Todos los números y textos** en `calculadora.*` de la config → `window.CALC`.
- Inputs: qué se usa hoy (**gasóleo / red / las dos**), gasto mensual de cada una, tipo de explotación
  y captación. Cada kWh se valora al precio de su fuente (`precioKwh.gasoil` / `.red`). **No** hay
  excedentes a red: autoconsumo directo.
- Proyección a `anios` (20): el ahorro sube con `subidaEnergia`, baja con `degradacion` y resta
  `mantenimientoAnualPct`. Da amortización (de la serie), acumulado a 10 y 20 años. Son **hipótesis
  editables**; el aviso de la página las enseña, derivadas de la config.
- Si la persona viene de `/dimensionado` (`sessionStorage 'solera.dimensionado'`), sale un banner para
  **usar esos kWp** (solo si lo pide). Con kWp fijos muy grandes puede no recuperarse: se dice "más de 20".
- **Informe completo** (gráfico SVG hecho a mano + tabla por años + gasóleo y CO₂ evitados) se ve solo
  tras dejar el contacto (origen `calculadora`, con los datos y resultados en `datos`). La hoja de
  resultados con lo esencial es pública. El valor "sin JavaScript" (`marcador`) sale de la misma fórmula.
- `tween()` tiene una **red de seguridad `setTimeout`** (el valor exacto siempre acaba en
  pantalla). No quitar. Resultados = **estimación orientativa**, nunca "presupuesto".
- Litros de gasóleo = kWh útiles del bombeo con diésel · `litrosPorKwh`; el CO₂ suma gasóleo y red.
  (La v1 calculaba los litros a partir del CO₂ de la red: era incoherente, ya corregido.)

## Dos diagramas

- **Fig. 1** (`partials/fig-bombeo.html`): paneles → controlador → bomba → depósito → riego.
- **Fig. 2** (`partials/fig-dia.html`): por qué **depósito y no batería** (sol vs. nivel del depósito).
- Trazos fijos; los **textos** salen de `figuras` en la config. Revisar a ojo tras cambiar una
  etiqueta (SVG a mano). Estáticos a propósito (un único momento de movimiento).

## Reglas de contenido

- **Nada de datos reales** mientras `demo: true`.
- **Sin reseñas ni testimonios con nombre. Sin logos de fabricantes o acuerdos.** Los casos de
  demo son **ilustrativos**, marcados como tal, sin nombre de cliente; las frases van anónimas.
  Con clientes reales, la publicación exige su autorización expresa (campo `autoriza_publicar`).
- Ayudas y subvenciones: "según convocatoria vigente", nunca importes garantizados.

## Estado

- 2026-09-14: pivote a bombeo solar agrícola; multipágina, vidrio, widget diésel/sol, Casos.
- 2026-09-25 — **Fase 0**: plantillas + config única (contra las páginas anteriores: idéntico
  salvo cambios deliberados; Córdoba añadida a la zona; pie "Site" → "Sitio").
- 2026-09-26 — **Fase 1 hecha y probada** (sin commit ni push aún): panel, reseñas por WhatsApp,
  revisiones, casos de éxito y página pública leyendo de Supabase. 50 pruebas en verde. Probado
  en navegador en modo demo local **y** contra los endpoints reales con repositorio en memoria
  (login, cookie, CRUD, foto, publicar, rechazo sin autorización, casos públicos, salir).
  **Sin probar contra Supabase de verdad** (falta el proyecto y las variables: lo hace el usuario).
  Cambios de diseño de la fase: tarjetas de caso rediseñadas para destacar los números
  (superficie, amortización, % menos gasto); etiqueta "Caso ilustrativo".

## Plan de ampliación (las 3 fases hechas)

Se para al terminar cada fase y no se empieza la siguiente hasta que lo diga el usuario. No
hacer commit/push hasta que lo pida. Claves las pega él en Vercel, nunca en el chat.

- **Fase 2 (HECHA):** comprobador de ayudas (en config, sin cantidades, siempre orientativo) +
  pre-dimensionado (P hidráulica = 2,725·Q·H, coeficientes en config, siempre un **rango** de
  precio) + tabla `contactos` (origen, datos, consentimiento) + sección Contactos en el panel +
  botón wa.me con los datos + aviso de privacidad y casilla de consentimiento en cada formulario.
- **Fase 3 (HECHA):** calculadora v2 (gasóil/red/ambos, acumulado a 10 y 20 años, gráfico SVG) que
  reutiliza los datos del pre-dimensionado; informe completo a cambio del contacto.
- Matices acordados: precios = rangos de ejemplo editables; el texto legal definitivo lo pone la
  instaladora real (RGPD).

## Pendiente

- [ ] **Usuario:** crear el proyecto de Supabase y pegar las 4 variables en Vercel (ver "Puesta en marcha").
- [ ] Poner el enlace real de reseñas de Google (`googleReviewUrl` en la config).
- [ ] Sustituir `[TU ESTUDIO]` (`empresa.estudioWeb`) cuando haya nombre.
- [ ] Teléfono/WhatsApp reales, o dejar `demo: true`.
- [ ] Probar el panel contra Supabase real (alta, reseña, caso con foto, casos públicos).
- [ ] Sin límite de intentos de contraseña por IP: valorar si hace falta antes de un cliente real.
- [ ] Al borrar o cambiar la foto de un caso, la antigua queda en el bucket (no se limpia).
- [ ] Texto de privacidad: lo revisa la instaladora real (RGPD). `og:image`; aviso legal; JSON-LD `LocalBusiness` solo con datos reales.
- [ ] Confirmar en Vercel que `node build.mjs` + `dist` se aplican la primera vez.
