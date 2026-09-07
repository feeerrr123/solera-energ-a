# Solera Energía (demo)

Web de demostración de una instaladora ficticia de autoconsumo solar en Andalucía
oriental. Se usa como muestra de trabajo para captar clientes reales del nicho
fotovoltaico.

**Marca ficticia. Ningún dato representa a una empresa real.**

## Ver en local

```bash
npx serve . -l 4177
```

Abre <http://localhost:4177>.

## Archivos

| archivo | qué es |
|---|---|
| `index.html` | toda la web (una página, sin build) |
| `favicon.svg` | marca: sol sobre horizonte |
| `PRODUCT.md` | el negocio ficticio y qué no inventar |
| `DESIGN.md` | el sistema visual ("Cuaderno de campo") |
| `CLAUDE.md` | guía operativa para editar |

## Qué incluye

- Portada con figura técnica anotada del autoconsumo (Fig. 1).
- Explicación de los 5 componentes.
- **Calculadora de ahorro** interactiva (estimación orientativa).
- 4 tipos de instalación: vivienda, empresa/nave, bombeo agrícola, baterías.
- Proceso en 4 fases, motivos, zona de trabajo, FAQ.
- Formulario de contacto (demo, sin backend) + WhatsApp flotante.

## Antes de enseñarla a un cliente

Ver la lista "Pendiente" de `CLAUDE.md`. Lo mínimo: cambiar `[TU ESTUDIO]` del
footer y desplegar en Vercel para tener un enlace real.
