# Solera Energía — DESIGN.md

Sistema visual construido, no intención. Dirección **fijada por el cliente**:
"Cuaderno de campo" — una página de manual agronómico: figura anotada + hoja de
cálculo. Modo **Persuade**.

## Idea rectora

El bombeo solar agrícola explicado como una lámina técnica: la **Fig. 1**
(sección de un sistema de bombeo — paneles, controlador, bomba, depósito, riego
— con llamadas numeradas 1–5) demuestra el mecanismo en el primer viewport; las
llamadas reaparecen en "Cómo funciona". La **Fig. 2**, más pequeña, es una
gráfica de campo (sol vs. nivel del depósito a lo largo del día) que resuelve
la duda real más frecuente: por qué el sistema no lleva batería, sino depósito.
La **calculadora** es una hoja cuadriculada de campo, y calcula frente al coste
del diésel, no frente a una factura de luz genérica. Rechaza: hero centrado con
tres tarjetas, cian solar, foto de familia feliz con placas, degradados.

## Color

Estrategia: **neutros cálidos + un acento**, con el verde oliva ocupando regiones
enteras (proceso, footer, tarjeta de resultados) para que no sea solo un acento.

| token | hex | uso |
|---|---|---|
| `paper` | `#e9e7db` | fondo de página (papel manila frío, con grano SVG) |
| `paper-raised` | `#f2f0e5` | tarjetas y superficies |
| `paper-deep` | `#dddbca` | secciones alternas |
| `olive` | `#2e3a26` | secciones oscuras, tarjeta de resultados |
| `olive-700` | `#3b4a30` | hover sobre oliva |
| `ink` | `#232a1c` | texto (nunca gris neutro) |
| `ink-soft` | `#575c42` | texto secundario, tintado del verde |
| `line` | `#d2ceb7` | filetes de 1px |
| `line-strong` | `#b7b191` | bordes de tarjeta, cuadrícula |
| `ochre` | `#a5611a` | acento único: sol, cifras clave, enlaces, CTA |
| `ochre-deep` | `#834a12` | hover del acento |
| sobre oliva | `#eae7d5` texto · `#aeb397` suave · `#dc9142` ocre brillante | |

`::selection` ocre suave `#e6d3b1`. Foco `2px solid #a5611a`. Scrollbar `#b7b191`.

## Tipografía

- **Display**: Young Serif (carácter de lámina botánica, un solo peso). H1 hasta
  ~3.9rem. Titulares de sección ~2.6rem.
- **Texto**: Hanken Grotesk (400/500/600/700). Cuerpo 15–17px, medida ~66ch.
- **Datos**: Spline Sans Mono — cifras de la calculadora, etiquetas en versalitas
  con `tracking` amplio, numeración de figuras y fases. Mono **solo** para
  medida/dato, no como disfraz "técnico".

## Forma, profundidad, movimiento

- Filetes de 1px oliva; nada de border-left de color grueso.
- Sombras con offset + blur (`shadow-field`, `shadow-field-lift`), suaves.
- Radios: `rounded-xl` en tarjetas, `rounded-full` en botones y píldoras.
- Cuadrícula: solo en superficies de medida (sección calculadora, fondo de la
  Fig. 1). Es lenguaje de cuaderno técnico, no decoración.
- Ilustración: SVG de un solo trazo (Fig. 1, iconos de instalación, iconos de
  contacto). Sin fotos de stock.
- Movimiento: un único momento — la barra "% de tu factura" (transición CSS
  `transform: scaleX`) y el conteo de las cifras al recalcular. Respeta
  `prefers-reduced-motion`. Sin reveals por sección.
- `cubic-bezier(0.16, 1, 0.3, 1)` como curva del proyecto.

## Composición

- Ancho máximo `max-w-shell` (72rem).
- Ritmo de lección: cada bloque numerado (01–05, A–D, Fase 1–4) con más aire
  encima del titular que debajo.
- Header sticky translúcido (paper/70 + backdrop-blur), filete inferior oliva.
- WhatsApp flotante abajo a la derecha, oliva, icono en móvil / con texto en ≥sm.
