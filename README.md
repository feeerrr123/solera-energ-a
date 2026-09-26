# Solera Energía (demo)

Web de demostración de una instaladora ficticia de **bombeo solar agrícola** (riego)
en Jaén, Granada, Almería y Córdoba. Se usa como muestra de trabajo — y como paquete
adaptable — para instaladoras reales de ese nicho.

**Marca ficticia. Ningún dato representa a una empresa real.**

## Ver en local

```bash
npm run dev
```

Genera la web, vigila los cambios y la sirve en <http://localhost:4177>.
(`npm run build` solo genera `dist/`; `npm test` pasa las pruebas.) Hace falta Node y un
`npm install` la primera vez. En local el panel (`/admin.html`) funciona en modo demo con datos
de ejemplo en el navegador; la conexión real con Supabase está explicada en `CLAUDE.md`.

## Archivos

| ruta | qué es |
|---|---|
| `config/site.config.js` | **todo lo que cambia entre clientes**: empresa, textos, cifras, calculadora |
| `src/pages/` | las páginas (plantillas), incluido el panel interno `admin.html` |
| `src/partials/` | cabecera, pie, WhatsApp, tarjeta de caso, dibujos e iconos |
| `src/css/`, `src/js/` | estilos y scripts |
| `src/shared/` | lógica que comparten el navegador y la API |
| `api/` | funciones de Vercel: login, instalaciones, fotos, casos públicos |
| `supabase/schema.sql` | base de datos: se pega una vez en Supabase |
| `.env.example` | las variables que hay que poner en Vercel |
| `tests/` · `npm test` | pruebas automáticas |
| `public/` | archivos que se copian tal cual (favicon) |
| `build.mjs`, `tools/` | el generador (sin dependencias) |
| `dist/` | la web generada — no se edita ni se sube a git |
| `PRODUCT.md` · `DESIGN.md` · `CLAUDE.md` | negocio · sistema visual · guía para editar |

## Adaptarla a otra instaladora

1. Editar `config/site.config.js` (datos de empresa, textos, casos, parámetros).
2. `demo: false` para quitar los avisos de "ejemplo" cuando los datos sean reales.
3. Subir a GitHub: Vercel ejecuta `node build.mjs` y publica `dist/`.

## Antes de enseñarla a un cliente

Ver la lista "Pendiente" de `CLAUDE.md`.
