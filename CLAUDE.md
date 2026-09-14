# Solera Energía — guía para Claude Code

Web **demo** (marca ficticia) de una instaladora **especializada en bombeo solar
agrícola** (riego) en Andalucía oriental — Jaén, Granada, Almería, con foco en
olivar de regadío y comunidades de regantes. Sirve como muestra de trabajo para
captar clientes reales de ese nicho concreto (no autoconsumo generalista). Ver
`PRODUCT.md` (negocio, incluye por qué se estrechó el nicho) y `DESIGN.md`
(sistema visual).

## Qué es

- **Multipágina, 6 archivos HTML planos**: `index.html` · `como-funciona.html` ·
  `instalaciones.html` (incluye Proceso) · `casos.html` (incluye Por qué Solera)
  · `calculadora.html` · `contacto.html` (incluye Zona y Preguntas).
- **Sin build, sin `node_modules`, sin includes/partials** — es la contrapartida de
  no meter un framework. El `<head>` (Tailwind config + `<style>`) y el
  header/footer/botón de WhatsApp/script del menú móvil están **duplicados en
  los 6 archivos, byte a byte**. Si tocas cualquiera de esas piezas compartidas,
  cámbialo en los 6 — no hay un solo sitio de verdad. Es la razón por la que este
  proyecto sigue sin backend/build: si la duplicación se vuelve un problema real
  (más páginas, más cambios de header), ese es el momento de reconsiderar pasar
  a algo con partials o a React como Óptica, no antes.
- Sin tests.
- Dirección visual **fijada por el cliente**: "Cuaderno de campo" (manual agronómico).

## Stack

- **Tailwind por CDN** (`cdn.tailwindcss.com?plugins=forms`), config inline en
  `<script id="tailwind-config">`.
- Fuentes Google: **Young Serif** (display), **Hanken Grotesk** (texto), **Spline
  Sans Mono** (cifras y etiquetas).
- **Sin backend.** El formulario de `#contacto` hace `preventDefault` y muestra una
  confirmación. Para un cliente real: conectar Supabase (tabla `leads`, insert vía
  `fetch`) como en Óptica Nazareth, o Formspree.
- Deploy previsto: **Vercel**.

## Vidrio esmerilado (glass) e interactividad (2026-09-14)

- `.glass` / `.glass-dark`: `backdrop-filter: blur + saturate`, borde translúcido,
  sombra interior sutil. Se usa en el header sticky, el menú móvil, botones
  secundarios, el botón de WhatsApp y paneles flotantes (tarjetas de Casos,
  panel de Fig. 2). **Nunca** en el botón primario (sigue siendo ochre sólido)
  ni en superficies donde hay texto de formulario — ahí prima la legibilidad.
- `.lift`: eleva 3px + sombra al hover, en tarjetas/chips clicables. Respeta
  `prefers-reduced-motion`.
- Widget "diésel vs. sol" en `index.html`: toggle de dos botones que cambia una
  cifra, una nota y un icono SVG (mostrar/ocultar, no redibujar). Es el ejemplo
  de "interactividad + dibujo" que pidió el cliente sin tocar la paleta.
- Las tarjetas de Instalaciones y Proceso **ya no son cajas con sombra** — son
  listas con filete (`divide-y border-y`), igual que "Cómo funciona". Si añades
  una sección nueva de tipo "N cosas en grid", entra por aquí, no por una tarjeta
  con `rounded-xl shadow`: eso es justo el patrón que se pidió quitar por
  parecer genérico/IA.

## Calculadora de ahorro frente al diésel (lo más delicado)

- Vive en `calculadora.html`; lógica en el IIFE al final del `<body>` de ese archivo.
- Constantes en el objeto `C` (precio €/kWh equivalente, producción por kWp
  según dificultad de captación, ratio de aprovechamiento por tipo de
  explotación, factor CO₂, litros de diésel por kg de CO₂). Si cambian los
  supuestos, se cambian ahí.
- Inputs: gasto mensual en bombeo (diésel o luz), tipo de explotación
  (particular / comunidad de regantes / otro cultivo), tipo de captación
  (pozo-sondeo / balsa-canal / no lo sé). **No** hay compensación de
  excedentes a red — se asume autoconsumo directo para bombeo, no venta.
- `tween()` anima las cifras con una **red de seguridad `setTimeout`**: el valor
  exacto siempre acaba en pantalla aunque `requestAnimationFrame` esté ralentizado.
  No quitar esa red.
- Todos los resultados son **estimación orientativa**, nunca "presupuesto". El
  descargo está bajo la calculadora; no suavizarlo.

## Dos diagramas (el usuario pidió dibujos explícitamente)

- **Fig. 1** (hero): sección de un sistema de bombeo solar — paneles → controlador
  → bomba sumergible en el pozo → depósito de acumulación → riego. SVG de un
  solo trazo, mismo lenguaje que el resto (grid de fondo, ocre para el sol,
  llamadas numeradas 1–5 en círculo oliva).
- **Fig. 2** ("Cómo funciona"): gráfica de campo que explica por qué hace falta
  **depósito y no batería** — curva ocre de sol/bombeo durante el día,
  curva/escalón oliva del nivel del depósito, que sube con el bombeo diurno y
  baja con el riego nocturno. Es contenido, no decoración: resuelve la duda más
  común del cliente real ("¿y si necesito regar de noche o en un día nublado?").
- Los atributos `data-draw`/`data-fade`/`--len`/`--d` de la versión anterior
  **no tenían CSS ni JS que los consumiera** (código muerto de una animación de
  trazado nunca implementada) — no se han reintroducido; los SVG nuevos son
  estáticos, coherente con la regla de `DESIGN.md` de "un único momento de
  movimiento" (la barra y el conteo de la calculadora).

## Reglas de contenido

- **Nada de datos reales.** Teléfono, dirección y email son de ejemplo y van
  marcados como tal en la propia página.
- Cualquier cifra de negocio (nº de instalaciones, año) lleva "· dato de ejemplo".
- El footer dice "marca ficticia · proyecto de demostración · diseño de [TU ESTUDIO]".
  Sustituir `[TU ESTUDIO]`.
- **Sin reseñas ni testimonios con nombre. Sin logos de fabricantes o acuerdos.**
  `casos.html` existe precisamente para dar prueba social sin romper esta regla:
  son "casos ilustrativos" explícitamente marcados como ejemplo, sin nombre de
  cliente. Si algún día hay clientes reales, sus casos sustituyen a estos — no
  se añaden reseñas inventadas encima.

## Estado

Pivotada de "autoconsumo solar generalista" a **bombeo solar agrícola**
(2026-09-14), tras validar el nicho con investigación real (demanda,
subvenciones activas, competencia local floja en web). Misma sesión: pasada de
página única a **multipágina** (6 archivos), añadido vidrio esmerilado,
interactividad (widget diésel/sol) y la página `casos.html`, a petición
explícita del cliente tras ver la v1 de página única y encontrarla "con partes
que parecen hechas con IA".

## Pendiente

- [ ] Sustituir `[TU ESTUDIO]` en el footer (los 6 archivos).
- [ ] Poner un número de WhatsApp/teléfono real (o dejar claro que es demo).
- [ ] Pase de revisión visual completo (idealmente con la web ya en Vercel) y
      `impeccable-finish-reviewer`.
- [ ] Revisar a ojo la Fig. 1 y la Fig. 2 en el navegador tras cualquier cambio
      de contenido — son SVG a mano, un texto más largo puede descuadrar una llamada.
- [ ] `og:image` (ahora no hay). Aviso legal / privacidad (enlaces placeholder).
- [ ] Si se despliega de verdad: añadir JSON-LD `LocalBusiness` **solo** con datos
      reales, no ficticios.
- [ ] Si el proyecto crece más allá de 6 páginas, reconsiderar la duplicación de
      header/footer (ver "Qué es" arriba).

## Verificación en local

```bash
npx serve . -l 4177
```

Revisar en móvil (375 px) y escritorio. Comprobar la calculadora con varios
valores, la confirmación del formulario en `contacto.html`, el widget diésel/sol
en `index.html`, y que los enlaces entre las 6 páginas y sus anclas (p. ej.
`instalaciones.html#pozo`) funcionan.
