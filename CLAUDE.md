# Solera Energía — guía para Claude Code

Web **demo** (marca ficticia) de una instaladora de autoconsumo solar en Andalucía
oriental. Sirve como muestra de trabajo para captar clientes reales del nicho
fotovoltaico. Ver `PRODUCT.md` (negocio) y `DESIGN.md` (sistema visual).

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

## Calculadora de ahorro (lo más delicado)

- Lógica en el IIFE `// ---- Calculadora de ahorro ----` al final del `<body>`.
- Constantes en el objeto `C` (precio kWh, producción por kWp, ratio de autoconsumo,
  factor CO₂). Si cambian los supuestos, se cambian ahí.
- `tween()` anima las cifras con una **red de seguridad `setTimeout`**: el valor
  exacto siempre acaba en pantalla aunque `requestAnimationFrame` esté ralentizado.
  No quitar esa red.
- Todos los resultados son **estimación orientativa**, nunca "presupuesto". El
  descargo está bajo la calculadora; no suavizarlo.

## Reglas de contenido

- **Nada de datos reales.** Teléfono, dirección y email son de ejemplo y van
  marcados como tal en la propia página.
- Cualquier cifra de negocio (nº de instalaciones, año) lleva "· dato de ejemplo".
- El footer dice "marca ficticia · proyecto de demostración · diseño de [TU ESTUDIO]".
  Sustituir `[TU ESTUDIO]`.
- Sin reseñas ni testimonios con nombre. Sin logos de fabricantes o acuerdos.

## Pendiente

- [ ] Sustituir `[TU ESTUDIO]` en el footer.
- [ ] Poner un número de WhatsApp/teléfono real (o dejar claro que es demo).
- [ ] Pase de revisión visual completo (idealmente con la web ya en Vercel) y
      `impeccable-finish-reviewer`.
- [ ] Afinar espaciado de etiquetas en el diagrama Fig. 1.
- [ ] `og:image` (ahora no hay). Aviso legal / privacidad (enlaces placeholder).
- [ ] Si se despliega de verdad: añadir JSON-LD `LocalBusiness` **solo** con datos
      reales, no ficticios.

## Verificación en local

```bash
npx serve . -l 4177
```

Revisar `index.html` en móvil (375 px) y escritorio. Comprobar la calculadora con
varios valores y la confirmación del formulario.
