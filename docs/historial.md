# Historial de Solera Energía

Lo que se fue haciendo, fase a fase (sacado de `CLAUDE.md` para que la guía sea corta).

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


## Pruebas y puestas en producción


**Noticias del BOJA (Fase 4, 2026-09-30)**
- Probado: 80 pruebas; en navegador (Tailwind compilado en local porque el CDN no se alcanza desde el contenedor): demo
  local (panel: bloquea publicar con importe, editar y publicar) y arnés con los endpoints reales (POST de n8n 201/200/401,
  login, publicar, la noticia sale en la web).
- **2026-10-02 — en producción y probado de punta a punta** (https://solera-energ-a.vercel.app, PR #1 fusionada en `main`):
  Supabase real conectado (`/api/noticias` y `/api/admin/login` responden sin `demo`), n8n → Gemini Lite → Telegram +
  Gmail (OAuth2) + "Guardar en la web" → borradores en el panel → publicar. Lo ha comprobado el usuario.

**Captación y seguimiento de contactos (Fase 5, 2026-10-03)**
- Probado: 90 pruebas; navegador con arnés (formularios con email sin desbordes en móvil, alta → n8n lee la ficha → marca →
  ya no está pendiente; n8n no puede cambiar estados; panel: desplegable → "Presupuesto enviado el…"; demo en móvil).
  Pestañas del panel en una línea en móvil.
- **2026-10-04 — en producción y probado de punta a punta** (PR #3 en `main`, `schema.sql` pegado): formulario de
  dimensionado con email → n8n "Leer pendientes" → ficha por Telegram y Gmail + estimación al agricultor por Gmail →
  marcado (no se repite) → en el panel "Ficha enviada el…". Lo ha comprobado el usuario. Recordatorio (3 días) y aviso
  (7 días) pendientes de verse en real.

**Captación de contactos, ayudas y dimensionado (Fase 2, 2026-09-26)**
- Probado: 67 pruebas; en navegador (demo local): las 4 herramientas + panel + sin desbordes en móvil.
  **Sin probar contra Supabase real**; menú de 7 enlaces sin mirar en pantalla ancha.

**Pendiente**
- [x] Noticias en producción: `schema.sql`, `NOTICIAS_TOKEN` en Vercel y n8n, "Guardar en la web" y Gmail (OAuth2) activos.
- [x] Fase 5 en producción: `schema.sql`, PR #3, flujo `captacion-seguimiento.json` en n8n con sus credenciales.
