# Solera Energía — guía para Claude Code

Web **demo** (marca ficticia) de una instaladora **especializada en bombeo solar
agrícola** (riego) en Andalucía oriental — Jaén, Granada, Almería, con foco en
olivar de regadío y comunidades de regantes. Sirve como muestra de trabajo para
captar clientes reales de ese nicho concreto (no autoconsumo generalista). Ver
`PRODUCT.md` (negocio, incluye por qué se estrechó el nicho) y `DESIGN.md`
(sistema visual).

## Qué es

- **Una sola página**: `index.html` (monolito ~1.100 líneas). Al editar una sección,
  comprueba que no rompes otra. El `tailwind.config` y el `<style>` van en el `<head>`.
- Sin build. Sin `node_modules`. Sin tests.
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

## Calculadora de ahorro frente al diésel (lo más delicado)

- Lógica en el IIFE `// ---- Calculadora de ahorro ----` al final del `<body>`.
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
- Sin reseñas ni testimonios con nombre. Sin logos de fabricantes o acuerdos.

## Estado

Pivotada de "autoconsumo solar generalista" a **bombeo solar agrícola**
(2026-09-14), tras validar el nicho con investigación real (demanda,
subvenciones activas, competencia local floja en web). Contenido, calculadora,
tarjetas de instalaciones, FAQ y ambos diagramas rehechos para el nuevo enfoque.

## Pendiente

- [ ] Sustituir `[TU ESTUDIO]` en el footer.
- [ ] Poner un número de WhatsApp/teléfono real (o dejar claro que es demo).
- [ ] Pase de revisión visual completo (idealmente con la web ya en Vercel) y
      `impeccable-finish-reviewer`.
- [ ] Revisar a ojo la Fig. 1 y la Fig. 2 en el navegador tras cualquier cambio
      de contenido — son SVG a mano, un texto más largo puede descuadrar una llamada.
- [ ] `og:image` (ahora no hay). Aviso legal / privacidad (enlaces placeholder).
- [ ] Si se despliega de verdad: añadir JSON-LD `LocalBusiness` **solo** con datos
      reales, no ficticios.

## Verificación en local

```bash
npx serve . -l 4177
```

Revisar `index.html` en móvil (375 px) y escritorio. Comprobar la calculadora con
varios valores y la confirmación del formulario.
