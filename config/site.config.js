// ─────────────────────────────────────────────────────────────────────────────
//  CONFIGURACIÓN ÚNICA — lo ÚNICO que hay que tocar para adaptar la web a otra
//  instaladora: datos de la empresa, textos, cifras, parámetros de la calculadora.
//  Después: `node build.mjs` (o subir a GitHub: Vercel lo construye solo).
//
//  Cómo leerlo:
//   · Las comillas '...' son texto normal. Los párrafos largos van dentro de p(`...`)
//     para poder partirlos en varias líneas sin que se note en la web.
//   · Se puede escribir HTML dentro de un texto (<strong>, <a>, <span>) si hace falta.
//   · `demo: true` enseña los avisos de "marca ficticia / dato de ejemplo".
//     Para una instaladora real: `demo: false`, y sustituye los casos y cifras de ejemplo.
// ─────────────────────────────────────────────────────────────────────────────

import { calcularAhorro } from '../src/shared/logica.js'

const p = (s) => s.replace(/\s+/g, ' ').trim()
const miles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const dec = (n, d = 2) => n.toFixed(d).replace('.', ',')

/* ─── 1. Empresa ───────────────────────────────────────────────────────────── */

const demo = true // true = avisos de "marca ficticia / dato de ejemplo / caso ilustrativo". Real: false.
const nombre = 'Solera Energía'
const anio = 2026
const estudio = '[TU ESTUDIO]' // quién ha diseñado la web (solo se ve con demo: true)
const zonaTexto = 'Jaén, Granada, Almería y Córdoba'
// Enlace de reseñas de Google de la empresa (Perfil de Empresa → "Pedir reseñas" → copiar enlace).
const googleReviewUrl = 'https://g.page/r/PLACEHOLDER/review'
// Cómo se firma la frase de un cliente en la web pública: NUNCA con su nombre.
const atribucionCaso = 'Titular de explotación de {cultivo}, {municipio}'
// Versión del aviso de privacidad (se guarda con cada contacto: qué texto aceptó la persona).
const avisoVersion = '2026-09'
const email = 'hola@soleraenergia.example'
const whatsappNumero = '34600000000' // solo dígitos, con prefijo de país y sin "+"
// Cultivos que se ofrecen en los formularios (los ids los usa la lógica; los textos son libres).
const cultivos = [
  { id: 'olivar', texto: 'Olivar' },
  { id: 'almendro', texto: 'Almendro' },
  { id: 'frutales', texto: 'Frutales' },
  { id: 'horticolas', texto: 'Hortícolas' },
  { id: 'vinedo', texto: 'Viñedo' },
  { id: 'cereal', texto: 'Cereal' },
  { id: 'otro', texto: 'Otro' },
]

const archivos = {
  inicio: 'index.html',
  comoFunciona: 'como-funciona.html',
  instalaciones: 'instalaciones.html',
  casos: 'casos.html',
  ayudas: 'ayudas.html',
  dimensionado: 'dimensionado.html',
  calculadora: 'calculadora.html',
  contacto: 'contacto.html',
  privacidad: 'privacidad.html',
}

/* ─── 2. Parámetros de la calculadora (todo lo que es "número" va aquí) ───── */

const calc = {
  gasto: { min: 60, max: 1200, paso: 10, valor: 180, etiquetaMin: '60 €', etiquetaMax: '1.200 €' }, // grupo diésel
  gastoRed: { min: 60, max: 1200, paso: 10, valor: 120, etiquetaMin: '60 €', etiquetaMax: '1.200 €' }, // red eléctrica
  // €/kWh útil de bombeo según con qué se bombee hoy (diésel: incluye rendimiento del grupo y mantenimiento)
  precioKwh: { gasoil: 0.3, red: 0.18 },
  dimensionado: 0.9, // fracción del consumo que cubre la instalación
  kwpMin: 2,
  kwpMax: 150,
  panelKwp: 0.45, // kWp por panel
  panelesMin: 5,
  pctMax: 0.95, // el ahorro nunca se enseña por encima de este % del gasto
  co2Kwh: 0.2, // kg de CO₂ evitados por kWh de red que se deja de usar
  co2PorLitroDiesel: 2.68, // kg de CO₂ por litro de gasóleo quemado
  litrosPorKwh: 0.35, // litros de gasóleo por kWh útil de bombeo con grupo diésel
  anios: 20, // años de la proyección
  subidaEnergia: 0.03, // subida anual del precio de la energía que se deja de comprar
  degradacion: 0.005, // pérdida anual de producción de los paneles
  mantenimientoAnualPct: 0.008, // mantenimiento de la instalación solar, por año, sobre la inversión
  // coste de instalación: [hasta kWp, €/kWp]; el último tramo (null) no tiene tope
  costeKwp: [[4, 1300], [10, 1050], [25, 900], [null, 820]],
  fuentes: [
    { id: 'gasoil', texto: 'Grupo diésel' },
    { id: 'red', texto: 'Red eléctrica' },
    { id: 'ambos', texto: 'Las dos' },
  ],
  // ratio = qué parte de lo generado se aprovecha en el bombeo
  tipos: [
    { id: 'particular', texto: 'Olivar particular, con pozo propio', ratio: 0.75 },
    { id: 'comunidad', texto: 'Comunidad de regantes', ratio: 0.85 },
    { id: 'otro', texto: 'Otro cultivo de regadío', ratio: 0.7 },
  ],
  // produccionKwp = kWh que da cada kWp al año según lo difícil que sea la captación
  captaciones: [
    { id: 'pozo', texto: 'Pozo o sondeo — bombeo profundo', produccionKwp: 1450 },
    { id: 'balsa', texto: 'Balsa o canal — bombeo superficial', produccionKwp: 1650 },
    { id: 'nose', texto: 'No lo sé todavía', produccionKwp: 1550 },
  ],
}
const prodMin = Math.min(...calc.captaciones.map((c) => c.produccionKwp))
const prodMax = Math.max(...calc.captaciones.map((c) => c.produccionKwp))

/* ─── 3. Todo lo demás ─────────────────────────────────────────────────────── */

export default {
  demo,

  sitio: { url: 'https://solera-energia.example', idioma: 'es', locale: 'es_ES', anio, colorTema: '#2e3a26' },

  empresa: {
    nombre,
    logoParte1: 'Solera',
    logoParte2: 'Energía',
    telefono: '600 00 00 00',
    telefonoHref: '+34600000000',
    whatsappNumero,
    whatsappMensaje: 'Hola, me interesa un estudio de bombeo solar',
    email,
    direccion: 'Polígono San Nicasio, Úbeda (Jaén)',
    ciudadBase: 'Úbeda (Jaén)',
    horario: 'L–V · 9:00–14:00 y 16:30–19:30',
    googleReviewUrl,
    estudioWeb: estudio,
  },

  // Páginas que se generan. `archivo` = nombre del .html (y de su plantilla en src/pages/).
  paginas: {
    inicio: {
      archivo: archivos.inicio,
      ruta: '',
      titulo: `Solera Energía · Bombeo solar agrícola en ${zonaTexto}`,
      descripcion: p(`Solera Energía diseña e instala bombeo solar para riego en ${zonaTexto}.
        Sustituye tu grupo diésel, dimensionado a tu pozo y tu caudal real, con subvenciones y papeleo incluidos.`),
      ogTitulo: `Solera Energía · Bombeo solar agrícola en ${zonaTexto}`,
      ogDescripcion: p(`Bombeo solar para riego, calculado al detalle. Estudio gratuito para pozo, balsa y
        comunidades de regantes en ${zonaTexto}.`),
    },
    comoFunciona: {
      archivo: archivos.comoFunciona,
      titulo: 'Cómo funciona · Solera Energía',
      descripcion: p(`Cómo funciona el bombeo solar para riego, paso a paso: paneles, controlador, bomba
        sumergible, depósito y riego. Por qué hace falta depósito y no batería.`),
      ogTitulo: 'Cómo funciona el bombeo solar agrícola',
    },
    instalaciones: {
      archivo: archivos.instalaciones,
      titulo: 'Instalaciones y proceso · Solera Energía',
      descripcion: p(`Pozo o sondeo, balsa o canal, sustitución de grupo diésel, comunidades de regantes.
        Cuatro formas de instalar bombeo solar agrícola, y el proceso completo en cuatro fases.`),
      ogTitulo: 'Instalaciones de bombeo solar agrícola',
    },
    casos: {
      archivo: archivos.casos,
      titulo: 'Casos · Solera Energía',
      descripcion: p(`Ejemplos ilustrativos de proyectos de bombeo solar agrícola: olivar particular,
        comunidad de regantes y balsa de riego. Y por qué elegir Solera Energía.`),
      ogTitulo: 'Casos de bombeo solar agrícola',
    },
    ayudas: {
      archivo: archivos.ayudas,
      titulo: '¿Puedo optar a ayudas? · Solera Energía',
      descripcion: p(`Comprueba en un minuto si tu bombeo solar para riego puede optar a ayudas. Orientativo: te lo
        confirmamos gratis.`),
      ogTitulo: '¿Puedo optar a ayudas para bombeo solar?',
    },
    dimensionado: {
      archivo: archivos.dimensionado,
      titulo: 'Pre-dimensionado de bombeo solar · Solera Energía',
      descripcion: p(`Calcula la potencia fotovoltaica orientativa y un rango de inversión para el bombeo solar de tu
        pozo o balsa. Estimación orientativa: el dimensionado real requiere visita técnica.`),
      ogTitulo: 'Pre-dimensionado de bombeo solar',
    },
    privacidad: {
      archivo: archivos.privacidad,
      titulo: 'Aviso de privacidad · Solera Energía',
      descripcion: 'Cómo tratamos los datos que nos dejas en los formularios de la web.',
    },
    calculadora: {
      archivo: archivos.calculadora,
      titulo: 'Calcula tu ahorro · Solera Energía',
      descripcion: p(`Calculadora orientativa de ahorro frente al diésel para bombeo solar agrícola en
        ${zonaTexto}. Introduce tu gasto y tu tipo de captación.`),
      ogTitulo: 'Calcula tu ahorro frente al diésel',
    },
    contacto: {
      archivo: archivos.contacto,
      titulo: 'Contacto · Solera Energía',
      descripcion: p(`Pide tu estudio gratuito de bombeo solar agrícola en ${zonaTexto}. Zona de trabajo,
        preguntas frecuentes y formulario de contacto.`),
      ogTitulo: 'Contacto — Solera Energía',
      ctaMovilHref: '#lead-form', // en esta página, el botón del menú móvil baja al formulario
    },
    // Panel interno: no sale en el menú ni en buscadores.
    admin: {
      archivo: 'admin.html',
      titulo: 'Panel interno · Solera Energía',
      descripcion: 'Panel interno de la instaladora.',
      noindex: true,
    },
  },

  // Menú principal (el orden es el orden en la web)
  nav: [
    { pagina: 'comoFunciona', texto: 'Cómo funciona' },
    { pagina: 'instalaciones', texto: 'Instalaciones' },
    { pagina: 'casos', texto: 'Casos' },
    { pagina: 'ayudas', texto: 'Ayudas' },
    { pagina: 'dimensionado', texto: 'Dimensionado' },
    { pagina: 'calculadora', texto: 'Calculadora' },
    { pagina: 'contacto', texto: 'Contacto' },
  ],
  cabecera: { cta: { pagina: 'contacto', texto: 'Pedir estudio', textoMovil: 'Pedir estudio gratuito' } },

  textos: {
    saltarContenido: 'Saltar al contenido',
    navPrincipal: 'Principal',
    navMovil: 'Móvil',
    menuAbrir: 'Abrir menú',
    whatsappAria: 'Escríbenos por WhatsApp',
    whatsappTexto: 'WhatsApp',
    etiquetaEjemplo: '· dato de ejemplo',
    etiquetaNumeroEjemplo: '· número de ejemplo',
    etiquetaDireccionEjemplo: '· dirección de ejemplo',
    etiquetaCasoEjemplo: 'Caso ilustrativo',
  },

  pie: {
    descripcion: `Bombeo solar agrícola calculado al detalle. ${zonaTexto}.`,
    tituloSitio: 'Sitio',
    tituloZona: 'Zona',
    tituloContacto: 'Contacto',
    enlaces: ['comoFunciona', 'instalaciones', 'casos', 'ayudas', 'dimensionado', 'calculadora'],
    zona: ['Provincia de Jaén', 'Granada y Costa Tropical', 'Almería — Almanzora y Poniente', 'Córdoba — Subbética y campiña'],
    legalDemo: `© ${anio} ${nombre} — <span class="text-[#c7c9b2]">marca ficticia</span>. Proyecto de demostración · diseño de <span class="text-[#c7c9b2]">${estudio}</span>.`,
    legalReal: `© ${anio} ${nombre}.`,
    legales: [
      { texto: 'Aviso legal', href: '#' },
      { texto: 'Privacidad', href: archivos.privacidad },
    ],
  },

  /* ─── Dibujos (los trazos están en src/partials/fig-*.html; aquí, sus textos) ─── */
  figuras: {
    bombeo: {
      titulo: 'Figura 1: sistema de bombeo solar para riego',
      descripcion: p(`Sección de un sistema de bombeo: los paneles en el suelo (1) alimentan un controlador (2)
        que gobierna una bomba sumergible en el pozo (3); el agua sube a un depósito de acumulación (4) y de
        ahí, por gravedad, riega el olivar (5).`),
      etiquetas: { paneles: 'Paneles', controlador: 'Controlador', bomba: 'Bomba', deposito: 'Depósito', riego: 'Riego' },
      pie: 'Fig. 1 — Sistema de bombeo solar para riego, de pozo a olivar',
    },
    dia: {
      titulo: 'Figura 2: curva de sol y nivel del depósito a lo largo del día',
      descripcion: p(`La bomba trabaja con el sol, entre las 7 y las 19 h, y llena el depósito. El nivel del depósito
        baja de madrugada, entre las 4 y las 7 h, cuando se usa para el riego nocturno.`),
      horas: { h0: '0h', h6: '6h', h12: '12h', h18: '18h', h24: '24h' },
      sol: 'sol / bombeo',
      deposito: 'depósito',
      riegoNoche1: 'riego de madrugada,',
      riegoNoche2: 'con el agua ya guardada',
    },
  },

  /* ─── PÁGINA: Instalaciones (+ Proceso). Los `tipos` también salen en Inicio. ─── */
  instalaciones: {
    eyebrow: 'Instalaciones',
    titular: 'Lo que instalamos',
    texto: p(`Cuatro formas de llegar al mismo sitio: menos gasto de bombeo. Las cifras son rangos habituales
      en la zona; tu estudio lleva las tuyas.`),
    etiquetas: { potencia: 'Potencia', amortizacion: 'Amortización' },
    tipos: [
      {
        id: 'pozo', icono: 'pozo', titulo: 'Pozo o sondeo', chip: 'Pozo o sondeo',
        texto: p(`Bombeo profundo, el caso más habitual en olivar. Dimensionamos la bomba a tu nivel de agua y a tu
          caudal real, no a un número redondo.`),
        potencia: '5–30 kWp', amortizacion: '3–5 años',
      },
      {
        id: 'balsa', icono: 'balsa', titulo: 'Balsa o canal', chip: 'Balsa o canal',
        texto: p(`Captación superficial: bombeo más sencillo, menos altura que salvar. Suele ser la instalación más
          rápida de rentabilizar.`),
        potencia: '3–20 kWp', amortizacion: '3–4 años',
      },
      {
        id: 'diesel', icono: 'diesel', titulo: 'Sustitución de grupo diésel', chip: 'Sustitución de diésel',
        texto: p(`Si ya bombeas con un motor diésel, es la instalación que más rápido se paga: partes de un coste de
          combustible alto y conocido.`),
        potencia: 'según tu equipo', amortizacion: '2–4 años',
      },
      {
        id: 'comunidad', icono: 'comunidad', titulo: 'Comunidades de regantes', chip: 'Comunidades de regantes',
        texto: p(`Proyectos colectivos para muchas hectáreas a la vez. Ayudamos también con la tramitación de
          subvenciones específicas para infraestructura de regadío.`),
        potencia: '30–150 kWp', amortizacion: '4–7 años',
      },
    ],
    proceso: {
      titulo: 'El proceso, de principio a fin',
      texto: p(`Cuatro fases. Nosotros llevamos la ingeniería, los permisos y la tramitación de subvenciones;
        tú apruebas y firmas.`),
      fases: [
        { etiqueta: 'Fase 1', titulo: 'Estudio del pozo y el caudal', texto: 'Analizamos tu gasto actual, tu pozo o balsa y tu curva de riego. Sin coste y sin compromiso.' },
        { etiqueta: 'Fase 2', titulo: 'Proyecto y subvención', texto: 'Ingeniería, presupuesto cerrado y tramitación de ayudas PEPAC/FEADER y de la Junta de Andalucía para regadío.' },
        { etiqueta: 'Fase 3', titulo: 'Instalación en campo', texto: 'Paneles, controlador, bomba y depósito. Con equipo propio; 2–4 días según el terreno.' },
        { etiqueta: 'Fase 4', titulo: 'Puesta en marcha y seguimiento', texto: 'Legalización si aplica, ajuste del caudal y revisión anual. Un teléfono que responde.' },
      ],
    },
    boton: 'Calcula tu ahorro',
  },

  /* ─── PÁGINA: Casos (+ Por qué nosotros). Ilustrativos mientras demo: true. La lista también sale en Inicio. ─── */
  casos: {
    eyebrow: 'Casos',
    titular: 'Proyectos parecidos al tuyo',
    texto: p(`Todavía no tenemos clientes reales que enseñar en esta demo, así que estos son
      <strong class="text-ink">ejemplos ilustrativos</strong> —números de referencia sobre casos típicos de la
      zona, no proyectos ni personas reales. Cuando cerremos los primeros, sus casos de verdad
      sustituyen a estos, con su nombre si lo autorizan.`),
    // Nombres de las tres cifras grandes de cada tarjeta
    etiquetas: { hectareas: 'Superficie', amortizacion: 'Amortización', reduccion: 'Menos gasto' },
    atribucion: atribucionCaso,
    // Estos casos salen si la web no está conectada a Supabase (o no hay ninguno publicado allí).
    // Con Supabase, los casos que marques en el panel sustituyen a estos.
    // `ilustrativo: demo` → con demo: true llevan la etiqueta "Caso ilustrativo · cifras de ejemplo".
    lista: [
      {
        id: 'olivar', icono: 'pozo', tipo: 'Olivar particular', lugar: 'Úbeda · 9 kWp',
        titular: 'De 340 a 80 €/mes',
        resumen: '12 ha, pozo propio, sustitución de diésel.',
        texto: p(`12 ha de olivar en regadío, pozo propio a 60 m de profundidad. Bombeaba con un grupo diésel en
          temporada de riego. Sustituimos el grupo por 9 kWp en panel y bomba sumergible; el depósito ya
          existente se reaprovechó.`),
        hectareas: '12 ha', amortizacion: '2,8 años', reduccion: '−76 %', ilustrativo: demo,
      },
      {
        id: 'comunidad', icono: 'comunidad', tipo: 'Comunidad de regantes', lugar: 'Baeza · 85 kWp',
        titular: '210 ha compartidas',
        resumen: 'Proyecto colectivo con subvención FEADER.',
        texto: p(`Proyecto colectivo para una comunidad de regantes con más de 150 socios. Tramitamos la subvención
          FEADER para infraestructura de regadío, que cubrió buena parte de la inversión inicial. La instalación
          bombea a un depósito central que reparte por gravedad.`),
        hectareas: '210 ha', amortizacion: '5,1 años', reduccion: '−62 %', ilustrativo: demo,
      },
      {
        id: 'balsa', icono: 'balsa', tipo: 'Balsa de riego', lugar: 'Linares · 6 kWp',
        titular: 'Amortizado en 3,2 años',
        resumen: 'Captación superficial, la más rápida de rentabilizar.',
        texto: p(`Finca de almendros con balsa propia alimentada por canal. Al ser captación superficial, la bomba
          necesita mucha menos potencia que en un pozo profundo — la instalación más barata y rápida de
          rentabilizar de los tres casos.`),
        hectareas: '8 ha', amortizacion: '3,2 años', reduccion: '−70 %', ilustrativo: demo,
      },
    ],
    porQue: {
      titulo: `Por qué ${nombre}`,
      razones: [
        { letra: 'A', titulo: 'Ingeniería, no comerciales', texto: 'Cada proyecto lo firma un técnico y se dimensiona a tu pozo, tu profundidad y tu caudal real. Números honestos, sin promesas redondas.' },
        { letra: 'B', titulo: 'El papeleo, incluido', texto: 'Tramitación de subvenciones PEPAC/FEADER y de la Junta de Andalucía para regadío, también para comunidades de regantes. Tú no persigues a nadie.' },
        { letra: 'C', titulo: 'Equipos con garantía larga', texto: 'Paneles con 25–30 años de garantía de producción, bombas y controladores con 5–10, ampliables. Nada de marca blanca sin respaldo.' },
        { letra: 'D', titulo: 'Después de la instalación', texto: 'Monitorización del caudal y la producción en el móvil, revisión anual y aviso si el pozo o la bomba rinden por debajo de lo previsto.' },
      ],
      cifras: [
        { valor: '+45', texto: 'sistemas de bombeo instalados', ejemplo: true },
        { valor: '2014', texto: 'desde', ejemplo: true },
        { valor: 'RC', texto: 'seguro de responsabilidad civil e instalador autorizado', ejemplo: false },
      ],
    },
    boton: 'Pide tu estudio gratuito',
  },

  /* ─── CONTACTOS: lo común a todos los formularios (ayudas, dimensionado, calculadora, contacto) ─── */
  contactos: {
    avisoVersion,
    empresaNombre: nombre,
    whatsappNumero,
    formulario: {
      nombre: 'Nombre',
      telefono: 'Teléfono',
      consentimiento: `He leído el <a href="${archivos.privacidad}" target="_blank" rel="noopener" class="ul-grow text-ochre-deep">aviso de privacidad</a> y acepto que ${nombre} use estos datos para contestarme.`,
      errores: {
        nombre: 'Escribe tu nombre',
        telefono: 'Escribe un teléfono válido',
        consentimiento: 'Hace falta aceptar el aviso de privacidad para poder enviarlo',
      },
      enviando: 'Enviando…',
      sinConexion: 'No hay conexión. Prueba otra vez o escríbenos por WhatsApp.',
      exito: {
        titulo: 'Recibido',
        texto: 'Te llamamos en 24–48 h laborables. Si tienes prisa, escríbenos ahora por WhatsApp con tus datos ya puestos.',
        whatsapp: 'Escribir por WhatsApp',
        demo: '(Demo: no se ha guardado nada.)',
      },
    },
    // WhatsApp que se abre al terminar un formulario (hacia la instaladora). {datos} = lo que rellenó la persona.
    mensajeWhatsApp: p(`Hola, soy {nombre} ({telefono}). He usado {herramienta} de la web de {empresa}.
      Mis datos: {datos}. ¿Podéis contactar conmigo?`),
    // WhatsApp de respuesta que se abre desde el panel (hacia la persona que escribió).
    mensajeRespuesta: p(`Hola {nombre}, soy de {empresa}. Hemos recibido tu consulta en {etiqueta}.
      ¿Cuándo te viene bien que hablemos?`),
    estados: { nuevo: 'Nuevo', contactado: 'Contactado', descartado: 'Descartado' },
    // `campos`: qué se muestra de lo que rellenó la persona (en el WhatsApp y en el panel), en este orden.
    origenes: {
      ayudas: {
        nombre: 'el comprobador de ayudas',
        etiqueta: 'Ayudas',
        campos: { titular: 'Titular', provincia: 'Provincia', cultivo: 'Cultivo', concesion: 'Concesión del pozo', instalacion: 'Instalación' },
      },
      dimensionado: {
        nombre: 'el pre-dimensionado',
        etiqueta: 'Dimensionado',
        campos: {
          alturaM: 'Altura (m)', caudalM3h: 'Caudal (m³/h)', hectareas: 'Hectáreas', cultivo: 'Cultivo', horasRiego: 'Horas de riego',
          kwp: 'Potencia orientativa (kWp)', precioMin: 'Inversión desde (€)', precioMax: 'hasta (€)',
        },
      },
      calculadora: {
        nombre: 'la calculadora de ahorro',
        etiqueta: 'Calculadora',
        campos: {
          fuente: 'Bombea con', gastoMes: 'Gasto al mes (€)', tipo: 'Explotación', captacion: 'Captación',
          kwp: 'Potencia orientativa (kWp)', inversion: 'Inversión aprox. (€)', ahorro: 'Ahorro primer año (€)',
          amortizacion: 'Amortización (años)', acum20: 'Ahorro acumulado a 20 años (€)',
        },
      },
      contacto: {
        nombre: 'el formulario de contacto',
        etiqueta: 'Contacto',
        campos: { tipo: 'Quiere', municipio: 'Municipio', mensaje: 'Mensaje' },
      },
    },
  },

  /* ─── PÁGINA: Ayudas (comprobador orientativo) ─── */
  // IMPORTANTE: nunca se promete una ayuda ni un importe. Las líneas de abajo son categorías
  // que "merece la pena revisar" según las respuestas; conviene repasarlas en cada convocatoria.
  ayudas: {
    eyebrow: 'Ayudas',
    titular: '¿Puedo optar a ayudas?',
    texto: p(`Cuéntanos cinco cosas de tu explotación y te decimos qué líneas de ayuda merece la pena revisar.
      No prometemos importes: las convocatorias cambian, y lo confirmamos contigo, sin coste.`),
    formulario: {
      elige: 'Elige…',
      falta: 'Elige una opción',
      boton: 'Comprobar',
      etiquetas: {
        titular: '¿Quién solicita?',
        provincia: 'Provincia de la explotación',
        cultivo: 'Cultivo principal',
        concesion: '¿Tiene el pozo concesión o inscripción de agua?',
        instalacion: '¿Qué quieres hacer?',
      },
      titulares: [
        { id: 'agricultor', texto: 'Agricultor/a (persona física)' },
        { id: 'sociedad', texto: 'Sociedad o empresa agraria' },
        { id: 'comunidad', texto: 'Comunidad de regantes' },
        { id: 'otro', texto: 'Otro' },
      ],
      provincias: [
        { id: 'jaen', texto: 'Jaén' },
        { id: 'granada', texto: 'Granada' },
        { id: 'almeria', texto: 'Almería' },
        { id: 'cordoba', texto: 'Córdoba' },
        { id: 'otra', texto: 'Otra provincia' },
      ],
      cultivos,
      concesiones: [
        { id: 'si', texto: 'Sí, la tiene' },
        { id: 'tramite', texto: 'La estoy tramitando' },
        { id: 'no', texto: 'No, o no lo sé' },
      ],
      instalaciones: [
        { id: 'nueva', texto: 'Instalar un bombeo nuevo' },
        { id: 'sustituye_gasoil', texto: 'Sustituir un grupo de gasóleo' },
        { id: 'sustituye_red', texto: 'Sustituir el bombeo con red eléctrica' },
      ],
    },
    resultado: {
      conLineas: {
        titulo: 'Es posible que puedas optar a ayudas',
        texto: 'Te lo confirmamos gratis: revisamos las convocatorias abiertas y tu caso concreto.',
      },
      sinLineas: {
        titulo: 'Ahora mismo no vemos una línea clara para tu caso',
        texto: p(`Las convocatorias cambian a menudo y a veces hay opciones que no salen en un formulario.
          Te lo miramos igualmente, sin coste.`),
      },
      lineasTitulo: 'Líneas que revisaremos en tu caso',
      avisoSinConcesion: p(`Ojo: casi todas las ayudas piden el pozo legalizado. Si aún no tiene concesión o inscripción,
        ese es el primer paso — y también te ayudamos con él.`),
      contactoTitulo: 'Te lo confirmamos gratis',
      contactoTexto: 'Déjanos tu nombre y tu teléfono y te llamamos para confirmártelo.',
      contactoBoton: 'Quiero que me lo confirméis',
      rehacer: 'Cambiar mis respuestas',
    },
    // Categorías de ayuda a revisar. Sin importes. Campos opcionales (vacío = cualquiera):
    // titulares · provincias · cultivos · concesion · instalacion  (ids de las listas de arriba)
    lineas: [
      {
        id: 'regadio_comunidades',
        nombre: 'Infraestructuras de regadío para comunidades de regantes (PEPAC / FEADER y Junta de Andalucía)',
        titulares: ['comunidad'],
        provincias: ['jaen', 'granada', 'almeria', 'cordoba'],
        nota: 'Suelen dar prioridad a quien use energía renovable en el bombeo. Convocatorias con plazo.',
      },
      {
        id: 'modernizacion_explotaciones',
        nombre: 'Modernización de explotaciones agrarias (PEPAC / FEADER)',
        titulares: ['agricultor', 'sociedad'],
        nota: 'Depende de cada convocatoria: quién puede pedirla, qué inversión cubre y hasta cuándo.',
      },
      {
        id: 'bonificaciones_municipales',
        nombre: 'Bonificaciones municipales (IBI e ICIO) para instalaciones de energía solar',
        nota: 'Las decide cada ayuntamiento en su ordenanza.',
      },
    ],
    aviso: p(`Orientativo. Esto no es una resolución ni una promesa de ayuda: las convocatorias, los plazos y los requisitos
      los fija cada administración y cambian con frecuencia. Lista revisada por última vez en septiembre de 2026.`),
  },

  /* ─── PÁGINA: Dimensionado (pre-dimensionado orientativo) ─── */
  // Los coeficientes de `parametros` son de EJEMPLO: la instaladora los sustituye por los que use de verdad.
  dimensionado: {
    eyebrow: 'Dimensionado',
    titular: '¿Qué instalación necesita tu pozo?',
    texto: p(`Con la altura del agua, el caudal y las horas de riego te damos la potencia solar aproximada y un rango de
      inversión. Es una primera idea: el estudio real requiere visitar el pozo.`),
    formulario: {
      alturaM: {
        etiqueta: 'Altura manométrica total (m)',
        ayuda: p(`Profundidad del agua + altura hasta el depósito + presión de riego. Si solo sabes la profundidad, pon esa:
          lo revisamos en la visita.`),
      },
      modoLeyenda: '¿Sabes el caudal que necesitas?',
      modoConocido: 'Sí, lo sé',
      modoEstimar: 'No, calcúlalo con hectáreas y cultivo',
      caudalM3h: { etiqueta: 'Caudal necesario (m³/h)', ayuda: 'Lo que da tu bomba actual o lo que necesitas regar por hora.' },
      hectareas: { etiqueta: 'Hectáreas a regar' },
      cultivo: { etiqueta: 'Cultivo', elige: 'Elige…' },
      horasRiego: { etiqueta: 'Horas de riego al día', ayuda: 'En la semana de más calor.' },
      boton: 'Calcular',
    },
    resultado: {
      titulo: 'Tu instalación, a grandes rasgos',
      potencia: 'Potencia fotovoltaica orientativa',
      kwp: 'kWp',
      precio: 'Inversión orientativa',
      precioRango: 'De {min} a {max} €',
      precioNota: 'Rango, sin IVA ni ayudas. Cambia con la profundidad, las distancias, el depósito y los equipos.',
      detalleTitulo: 'Detalle del cálculo',
      detalleBloqueado: p(`Déjanos tu contacto y te enseñamos el desglose completo (caudal, potencia de la bomba, número
        de paneles…) y te preparamos el estudio.`),
      detalle: {
        caudal: 'Caudal',
        caudalEstimado: 'Caudal estimado con tus hectáreas y cultivo',
        altura: 'Altura manométrica',
        potHidraulica: 'Potencia hidráulica',
        potBomba: 'Potencia eléctrica de la bomba',
        paneles: 'Paneles aproximados',
        m3h: 'm³/h',
        m: 'm',
        kw: 'kW',
      },
      avisoHoras: p(`Riegas más horas al día de las que hay sol útil. Se soluciona con un depósito, y lo dimensionamos
        en el estudio.`),
      aviso: 'Estimación orientativa. El dimensionado real requiere visita técnica.',
      contactoTitulo: 'Te preparamos el estudio detallado',
      contactoTexto: 'Déjanos tu nombre y tu teléfono y te enseñamos el desglose completo.',
      contactoBoton: 'Quiero el estudio detallado',
      rehacer: 'Cambiar los datos',
    },
    parametros: {
      rendimiento: 0.5, // bomba + motor + variador, todo junto
      sobredimensionado: 1.3, // margen sobre la potencia de la bomba (nubes, suciedad, temperatura)
      paso: 0.5, // los kWp se redondean hacia arriba de 0,5 en 0,5
      kwpMin: 1,
      panelKwp: 0.5, // kWp por panel
      horasSolUtiles: 8, // por encima de estas horas de riego se avisa del depósito
      redondeoPrecio: 100, // el rango de precio se redondea a cientos de euros
      // €/kWp instalado, sin IVA: [hasta kWp, mínimo, máximo]; el último tramo (null) no tiene tope
      precioKwp: [[5, 1100, 1600], [15, 950, 1350], [40, 850, 1150], [null, 750, 1000]],
      // m³ por hectárea y día en la semana de más demanda (ejemplo; revisar con un agrónomo)
      consumoCultivo: { olivar: 25, almendro: 40, frutales: 45, horticolas: 50, vinedo: 15, cereal: 35, otro: 30 },
      cultivos,
    },
  },

  /* ─── PÁGINA: Privacidad ─── */
  privacidad: {
    version: avisoVersion,
    eyebrow: 'Privacidad',
    titular: 'Aviso de privacidad',
    intro: p(`Qué hacemos con los datos que nos dejas en los formularios de esta web (comprobador de ayudas,
      pre-dimensionado, calculadora y contacto).`),
    secciones: [
      { titulo: 'Quién es el responsable', texto: `${nombre}. Contacto para todo lo relativo a tus datos: <a href="mailto:${email}" class="ul-grow text-ochre-deep">${email}</a>.` },
      { titulo: 'Qué datos recogemos', texto: p(`Tu nombre y tu teléfono, y lo que rellenes en la herramienta que uses (por ejemplo, cultivo, provincia o caudal).
        En el formulario de contacto, también tu municipio y el mensaje si los escribes. No pedimos datos que no necesitemos.`) },
      { titulo: 'Para qué los usamos', texto: p(`Solo para contestar a tu consulta y, si tú quieres, preparar un estudio o un presupuesto.
        No los usamos para publicidad ni los vendemos.`) },
      { titulo: 'Por qué podemos usarlos', texto: 'Porque tú lo aceptas al marcar la casilla del formulario (consentimiento). Puedes retirarlo cuando quieras.' },
      { titulo: 'Cuánto tiempo los guardamos', texto: p(`Mientras sea necesario para atender tu consulta y, como máximo, 24 meses si no llega a haber un contrato.
        Después se borran.`) },
      { titulo: 'Quién más los ve', texto: p(`Nadie, salvo los proveedores que nos prestan el servicio técnico (alojamiento de la web y base de datos),
        que solo los tratan por encargo nuestro, y las autoridades cuando la ley lo exige.`) },
      { titulo: 'Tus derechos', texto: p(`Puedes pedirnos acceso, rectificación, supresión, oposición, limitación o portabilidad escribiendo a
        ${email}. Si crees que no tratamos bien tus datos, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).`) },
    ],
    avisoDemo: p(`Texto orientativo de demostración. En una web real lo redacta o revisa la propia instaladora o su gestoría,
      con sus datos de empresa (razón social, CIF y domicilio).`),
    actualizado: 'Versión del aviso:',
  },

  /* ─── PANEL INTERNO (admin.html) ─── */
  panel: {
    titulo: 'Panel interno',
    empresaNombre: nombre,
    googleReviewUrl,
    atribucion: atribucionCaso,
    mantenimientoMeses: 12, // cada cuántos meses toca revisión de mantenimiento
    avisoDias: 45, // cuántos días antes del vencimiento aparece en "Revisiones"
    cultivos: ['olivar', 'almendro', 'frutales', 'hortícolas', 'viñedo', 'cereal'],
    // Mensajes de WhatsApp ya escritos. Se rellenan: {nombre} {empresa} {enlace} {lugar} {fecha}
    mensajeResena: p(`Hola {nombre}, soy de {empresa}. Gracias por confiar en nosotros para tu bombeo solar.
      Si estás contento con el resultado, nos ayudaría mucho una reseña en Google (te lleva un minuto): {enlace}`),
    mensajeRecordatorio: p(`Hola {nombre}, soy de {empresa}. Se acerca la revisión anual de tu instalación de
      bombeo solar{lugar} (toca sobre el {fecha}). ¿Te viene bien que pasemos a revisarla en las próximas semanas?`),
    // Datos de ejemplo del modo demo (sin base de datos). Ficticios. `mesesAtras` = cuándo se instaló.
    demoSemilla: [
      { cliente: 'Cliente de ejemplo A', telefono: '600000011', municipio: 'Úbeda', cultivo: 'olivar', hectareas: 12, potencia_kwp: 9, mesesAtras: 13 },
      { cliente: 'Cliente de ejemplo B', telefono: '600000012', municipio: 'Baeza', cultivo: 'olivar', hectareas: 25, potencia_kwp: 18, mesesAtras: 11 },
      { cliente: 'Cliente de ejemplo C', telefono: '600000013', municipio: 'Linares', cultivo: 'almendro', hectareas: 8, potencia_kwp: 6, mesesAtras: 4 },
      {
        cliente: 'Cliente de ejemplo D', telefono: '600000014', municipio: 'Jaén', cultivo: 'olivar', hectareas: 15, potencia_kwp: 12, mesesAtras: 8,
        caso: { autoriza_publicar: true, es_caso_exito: true, gasto_anual_antes: 5200, ahorro_anual: 3900, amortizacion_anios: 3.1, frase_cliente: 'Ejemplo de frase de un cliente satisfecho.' },
      },
    ],
    // Contactos de ejemplo del modo demo (ficticios). `diasAtras` = cuándo llegaron.
    demoContactos: [
      {
        origen: 'ayudas', nombre: 'Persona de ejemplo 1', telefono: '600000021', diasAtras: 1,
        datos: { titular: 'Agricultor/a (persona física)', provincia: 'Jaén', cultivo: 'Olivar', concesion: 'Sí, la tiene', instalacion: 'Sustituir un grupo de gasóleo' },
      },
      {
        origen: 'dimensionado', nombre: 'Persona de ejemplo 2', telefono: '600000022', diasAtras: 3,
        datos: { alturaM: 60, caudalM3h: 10, horasRiego: 8, kwp: 4.5, precioMin: 4900, precioMax: 7200 },
      },
      {
        origen: 'contacto', nombre: 'Persona de ejemplo 3', telefono: '600000023', municipio: 'Baeza', diasAtras: 6, estado: 'contactado',
        mensaje: 'Somos una comunidad de unos 80 socios.', datos: { tipo: 'Somos una comunidad de regantes' },
      },
    ],
    textos: {
      cargando: 'Cargando…',
      verWeb: 'Ver la web',
      salir: 'Salir',
      estadoDemo: 'Modo demo',
      estadoConectado: 'Conectado',
      login: {
        titulo: 'Entrar al panel',
        ayuda: 'Solo para el equipo de la instaladora.',
        password: 'Contraseña',
        boton: 'Entrar',
        entrando: 'Entrando…',
        incorrecta: 'Contraseña incorrecta.',
      },
      demoAviso: p(`Modo demo: no hay base de datos conectada, así que lo que escribas aquí se guarda solo en este navegador
        y no lo ve nadie más. Sirve para probar el panel. Los casos que marques no aparecen en la web pública.`),
      demoRestablecer: 'Restablecer datos de ejemplo',
      demoRestablecerConfirma: '¿Borrar lo que hayas añadido y volver a los datos de ejemplo?',
      resumen: { instalaciones: 'Instalaciones', revisiones: 'Revisiones pendientes', casos: 'Casos publicados', contactos: 'Contactos nuevos' },
      pestanas: { instalaciones: 'Instalaciones', revisiones: 'Revisiones', casos: 'Casos de éxito', contactos: 'Contactos' },
      inst: {
        nueva: 'Nueva instalación',
        tituloNueva: 'Nueva instalación',
        tituloEditar: 'Editar instalación',
        guardar: 'Guardar',
        cancelar: 'Cancelar',
        vacio: 'Todavía no hay instalaciones. Añade la primera.',
        editar: 'Editar',
        borrar: 'Borrar',
        borrarConfirma: '¿Borrar la instalación de {cliente}? No se puede deshacer.',
        resena: 'Pedir reseña',
        resenaPedida: 'Reseña pedida el {fecha}',
        sinTelefono: 'Teléfono no válido para WhatsApp',
        instaladaEl: 'Instalada el {fecha}',
        enlaceResena: 'Enlace de reseñas de Google',
        enlaceResenaFalta: 'Falta el enlace de reseñas de Google: ponlo en la config (googleReviewUrl).',
        revisionVencida: 'Revisión vencida',
        revisionProxima: 'Revisión próxima',
        ha: 'ha',
        kwp: 'kWp',
        campos: {
          cliente: 'Cliente',
          telefono: 'Teléfono (WhatsApp)',
          municipio: 'Municipio',
          cultivo: 'Cultivo',
          hectareas: 'Hectáreas',
          potencia: 'Potencia instalada (kWp)',
          fecha: 'Fecha de instalación',
        },
      },
      rev: {
        titulo: 'Revisiones de mantenimiento',
        intro: 'Instalaciones a las que les toca revisión: cada {meses} meses, avisando con {dias} días de antelación. El recordatorio se envía por WhatsApp: se abre el mensaje ya escrito y solo tienes que pulsar enviar.',
        vacio: 'No hay revisiones pendientes por ahora.',
        vencePronto: 'Vence el {fecha} · en {dias} días',
        venceHoy: 'Vence hoy',
        vencida: 'Venció el {fecha} · hace {dias} días',
        recordar: 'Recordar por WhatsApp',
        recordatorioEnviado: 'Recordatorio enviado el {fecha}',
        hecha: 'Marcar revisión hecha',
        hechaConfirma: '¿Marcar la revisión de {cliente} como hecha hoy?',
      },
      caso: {
        titulo: 'Casos de éxito',
        intro: 'Los casos publicados salen en la página pública de Casos con los números bien grandes. Nunca se muestran el nombre ni el teléfono del cliente: solo el cultivo, el municipio y la frase, sin firma.',
        publicado: 'Publicado',
        sinPublicar: 'Sin publicar',
        editar: 'Editar caso',
        despublicar: 'Quitar de la web',
        formTitulo: 'Caso de éxito de {cliente}',
        autoriza: 'El cliente autoriza publicar este caso',
        autorizaAyuda: 'Obligatorio. Pídeselo por escrito o por WhatsApp antes de publicar (sobre todo si añades foto o frase).',
        publicar: 'Publicar en la web',
        publicarAyuda: 'Solo se puede con la autorización, el ahorro anual y los años de amortización.',
        gasto: 'Gasto anual antes (€)',
        ahorro: 'Ahorro estimado al año (€)',
        amort: 'Amortización (años)',
        frase: 'Frase del cliente (opcional)',
        fraseAyuda: 'Sale sin nombre, firmada con el cultivo y el municipio. Máximo 240 caracteres.',
        foto: 'Foto (opcional)',
        fotoQuitar: 'Quitar foto',
        fotoLista: 'Foto lista',
        fotoSubiendo: 'Subiendo…',
        fotoTipo: 'La foto tiene que ser JPG, PNG o WebP.',
        vistaPrevia: 'Así se verá en la web',
        vistaPreviaVacia: 'Rellena el ahorro anual y los años de amortización para ver la tarjeta.',
        guardar: 'Guardar caso',
        cancelar: 'Cancelar',
        ejemplo: 'Ejemplo',
        anios: 'años',
      },
      contactos: {
        titulo: 'Contactos recibidos',
        intro: p(`Lo que llega por los formularios de la web: comprobador de ayudas, dimensionado, calculadora y contacto.
          Solo entran si la persona ha aceptado el aviso de privacidad. Los nuevos salen arriba.`),
        vacio: 'Todavía no ha llegado ningún contacto.',
        recibido: 'Recibido el {fecha}',
        consentimiento: 'Aceptó el aviso de privacidad (versión {version})',
        whatsapp: 'Contestar por WhatsApp',
        contactado: 'Marcar contactado',
        descartar: 'Descartar',
        reabrir: 'Volver a «nuevo»',
        nota: 'Nota',
        notaPrompt: 'Nota interna (solo la ves tú):',
        notaPuesta: 'Nota:',
        borrar: 'Borrar',
        borrarConfirma: '¿Borrar el contacto de {nombre}? Se elimina también de la base de datos.',
        sinTelefono: 'Teléfono no válido para WhatsApp',
        sinDatos: 'Sin datos de la herramienta',
      },
      avisos: {
        guardado: 'Guardado.',
        borrado: 'Borrado.',
        marcado: 'Anotado.',
        restablecido: 'Datos de ejemplo restablecidos.',
        revisa: 'Revisa los datos.',
        error: 'No se pudo completar. Prueba otra vez.',
        sinConexion: 'No hay conexión. Prueba otra vez.',
        sinEspacio: 'El navegador no tiene espacio para guardar (prueba con una foto más pequeña).',
        sesionCaducada: 'La sesión ha caducado. Vuelve a entrar.',
      },
    },
  },

  /* ─── PÁGINA: Inicio ─── */
  inicio: {
    hero: {
      eyebrow: `Bombeo solar agrícola · ${zonaTexto}`,
      titular: 'Ponemos el sol de Jaén a regar tu olivar.',
      texto: p(`Solera Energía diseña e instala bombeo solar para riego en ${zonaTexto}.
        Sustituye tu grupo diésel, dimensionado a tu pozo y tu caudal real —no a ojo—,
        con las subvenciones y el papeleo incluidos.`),
      boton1: 'Calcula tu ahorro',
      boton2: 'Cómo funciona',
      cifras: [
        { etiqueta: 'Amortización típica', valor: '3–5 años' },
        { etiqueta: 'Obra en campo', valor: '2–4 días' },
        { etiqueta: 'Radiación de la zona', valor: '~1.650 h' },
      ],
    },
    widget: {
      eyebrow: 'Toca el interruptor',
      titulo: 'Mismo pozo, dos formas de bombear',
      texto: p(`Un olivar de 8 ha con pozo propio, gasto medio de riego en temporada alta. Mira lo que cambia cada
        mes según con qué lo bombees.`),
      ariaGrupo: 'Comparar diésel y sol',
      botonDiesel: 'Con diésel',
      botonSol: 'Con sol',
      etiquetaGasto: 'Gasto de bombeo al mes',
      unidad: '€',
      enlace: 'Calcula el tuyo con tus datos →',
      etiquetaEjemplo: '· dato de ejemplo',
      diesel: { valor: 380, nota: 'Motor diésel, precio de gasóleo agrícola actual.' },
      sol: { valor: 90, nota: 'Bombeo solar, mismo pozo y mismo caudal.' },
    },
    teaserFunciona: {
      titulo: 'Cómo funciona el bombeo solar',
      texto: 'De los paneles al goteo, en cinco pasos — y por qué el sistema lleva depósito, no batería.',
      enlace: 'Ver los cinco pasos →',
      pasos: [
        'Paneles en el suelo, junto al pozo',
        'Controlador ajusta la bomba a la luz',
        'Bomba sumergible sustituye al diésel',
        'Depósito guarda el agua, no la batería',
        'Riega por gravedad, de día o de noche',
      ],
    },
    teaserInstalaciones: {
      titulo: 'Lo que instalamos',
      texto: 'Cuatro formas de llegar al mismo sitio: menos gasto de bombeo.',
      enlace: 'Ver el detalle y el proceso →',
    },
    teaserCasos: {
      titulo: 'Casos parecidos al tuyo',
      texto: 'Ejemplos ilustrativos de proyectos tipo, para hacerte una idea de números reales.',
      aviso: `Ejemplos ilustrativos con cifras de referencia, no proyectos reales — <a href="${archivos.casos}" class="ul-grow text-ochre-deep">ver por qué</a>.`,
    },
    cierre: {
      titulo: '¿Cuánto te está costando bombear hoy?',
      texto: 'Calcula tu ahorro en dos minutos, o pide directamente el estudio del pozo. Es gratis y no compromete a nada.',
      boton1: 'Calcula tu ahorro',
      boton2: 'Pide tu estudio',
    },
  },

  /* ─── PÁGINA: Cómo funciona ─── */
  comoFunciona: {
    eyebrow: 'Cómo funciona',
    titular: 'De los paneles al goteo, en cinco pasos',
    texto: p(`Los cinco elementos de la Fig. 1. Cuando pidas el estudio, cada uno lleva su marca, su modelo
      y su garantía en el proyecto que firmamos.`),
    pasos: [
      {
        titulo: 'Los paneles',
        texto: p(`En el suelo, sobre una estructura orientada al sur. Sin partes móviles y sin ocupar cubierta:
          se colocan junto al pozo o la balsa, donde ya tienes el espacio.`),
      },
      {
        titulo: 'El controlador',
        texto: p(`Convierte la corriente de los paneles en la que necesita la bomba y ajusta la velocidad según
          la luz disponible. Con poco sol, bombea más despacio; no se para hasta que no hay luz de verdad.`),
      },
      {
        titulo: 'La bomba sumergible',
        texto: p(`Va dentro del pozo o el sondeo, al nivel del agua. Es la pieza que sustituye a tu grupo diésel
          o al enganche de red; se elige según la profundidad y el caudal que necesitas.`),
      },
      {
        titulo: 'El depósito', nota: '(no batería)',
        texto: p(`Aquí no se acumula electricidad, se acumula agua: el depósito se llena mientras hay sol y
          riega cuando haga falta, aunque sea de noche. Ver Fig. 2 más abajo.`),
      },
      {
        titulo: 'El riego',
        texto: p(`Desde el depósito, por gravedad o con un pequeño impulso, el agua llega al goteo del olivar.
          Nosotros dimensionamos también esa presión, no solo el bombeo.`),
      },
    ],
    figura2: {
      eyebrow: 'Fig. 2 — un día del sistema',
      titulo: '¿Y si necesito regar de noche?',
      texto: p(`No hace falta batería. El controlador bombea mientras hay sol y llena el depósito; muchos
        cultivos —el olivar entre ellos— riegan mejor de madrugada, cuando se evapora menos agua.
        El depósito guarda durante el día lo que vas a regar esa noche.`),
    },
    enlaceFinal: 'Ver qué instalamos →',
  },

  /* ─── PÁGINA: Calculadora ─── */
  calculadora: {
    eyebrow: 'Calculadora',
    titular: 'Calcula tu ahorro frente al gasóleo o a la luz',
    texto: 'Una primera estimación con las medias de radiación de Andalucía oriental. Mueve los datos y la hoja se recalcula.',
    formulario: {
      tituloFuente: '¿Con qué bombeas hoy?',
      tituloGasto: 'Tu gasto en bombeo',
      etiquetaGastoGasoil: 'Gasto medio al mes en gasóleo para regar',
      etiquetaGastoRed: 'Gasto medio al mes en luz para regar',
      unidadGasto: '€/mes',
      tituloTipo: 'Tipo de explotación',
      tituloCaptacion: 'Tu captación',
      dimensionado: {
        texto: 'Tienes un pre-dimensionado de {kwp} kWp.',
        usar: 'Usar esos kWp',
        quitar: 'Calcular sin ellos',
      },
    },
    resultados: {
      cabecera: `Hoja de estimación — ${nombre}`,
      ahorro: 'Ahorro estimado el primer año',
      ahorroUnidad: '€/año',
      porcentaje: 'De tu gasto actual',
      amortizacion: 'Amortización aprox.',
      amortizacionUnidad: 'años',
      acumulado10: 'Ahorro acumulado a 10 años',
      acumuladoUnidad: '€, ya descontada la inversión',
      instalacion: 'Instalación estimada',
      instalacionUnidad: 'kWp',
      paneles: 'paneles · inversión aprox.',
      inversionDespues: '€ antes de subvención',
      noRecupera: 'más de {anios}',
      boton: 'Ver el informe completo',
      // Solo se ven sin JavaScript; con JavaScript se recalculan al cargar (salen de la misma fórmula)
      marcador: (() => {
        const r = calcularAhorro({ fuente: 'gasoil', gastoGasoil: calc.gasto.valor, gastoRed: calc.gastoRed.valor, tipo: calc.tipos[0].id, captacion: calc.captaciones[0].id }, calc)
        return { ahorro: miles(r.ahorro), pct: r.pct, amort: dec(r.amort, 1), kwp: dec(r.kWp, 1), paneles: r.paneles, inversion: miles(r.inversion), acum10: miles(r.acum10) }
      })(),
    },
    informe: {
      titulo: 'Informe completo de tu instalación',
      texto: p(`Con el detalle año a año, el gráfico de lo que acumulas y lo que evitas de gasóleo y CO₂.
        Déjanos tu nombre y tu teléfono y lo ves aquí mismo; si quieres, te lo repasamos en una llamada.`),
      contactoBoton: 'Ver el informe completo',
      tituloResultado: 'Tu informe',
      grafico: {
        titulo: 'Dinero acumulado, año a año',
        descripcion: 'Gráfico del dinero acumulado (ahorro menos inversión) durante {anios} años. Cruza el cero en el año {amort}.',
        descripcionNoRecupera: 'Gráfico del dinero acumulado durante {anios} años. No llega a cruzar el cero.',
        ejeAnios: 'años',
        recupera: 'Recuperas la inversión en el año {anio}',
        ceroEtiqueta: '0 €',
      },
      tabla: {
        anio: 'Año',
        acumulado: 'Acumulado',
        anios: [1, 5, 10, 15, 20],
        unidad: '€',
      },
      resumen20: 'Ahorro acumulado a {anios} años',
      litros: 'Gasóleo que dejas de quemar al año',
      litrosUnidad: 'L',
      co2: 'CO₂ que no emites al año',
      co2Unidad: 'kg',
      solo: 'Solo se cuenta el gasóleo de la parte de tu bombeo que lo usa hoy.',
      cta: 'Escribirnos por WhatsApp',
      contactoTitulo: 'Te lo enviamos y lo repasamos contigo',
    },
    aviso: p(`<strong class="text-ink">Estimación orientativa, no es un presupuesto.</strong> Usa medias de producción de
      Andalucía oriental (${miles(prodMin)}–${miles(prodMax)} kWh por kWp al año) y un coste del bombeo de
      ${dec(calc.precioKwh.gasoil)} €/kWh con gasóleo o ${dec(calc.precioKwh.red)} €/kWh con red, sin contar venta de excedentes
      —se asume autoconsumo directo para riego, no vertido a red. La proyección a ${calc.anios} años supone que el precio de
      la energía sube un ${miles(calc.subidaEnergia * 100)} % al año, que los paneles pierden un ${dec(calc.degradacion * 100, 1)} % de producción
      al año y un mantenimiento del ${dec(calc.mantenimientoAnualPct * 100, 1)} % de la inversión al año. Son hipótesis: el precio
      real de la energía puede subir o bajar. El CO₂ del gasóleo se calcula con ${dec(calc.co2PorLitroDiesel)} kg CO₂/L y el de la red
      con ${dec(calc.co2Kwh)} kg CO₂/kWh. El estudio real analiza tu pozo, tu caudal y las subvenciones vigentes en tu municipio.`),
    parametros: calc,
  },

  /* ─── PÁGINA: Contacto (+ Zona + Preguntas) ─── */
  contacto: {
    eyebrow: 'Contacto',
    titular: 'Pide tu estudio gratuito',
    texto: p(`Cuéntanos tu pozo, tu balsa o tu comunidad de regantes, y para qué riegas. Te llamamos en 24–48 h
      laborables, miramos tu gasto actual y, si encaja, subimos a ver la parcela. Sin coste y sin compromiso.`),
    zona: {
      titulo: 'Dónde trabajamos',
      texto: p(`Andalucía oriental y Córdoba. Base en Úbeda (Jaén) —el olivar de regadío más grande de España—, y
        desplazamiento por toda la provincia, la Vega de Granada, el valle del Almanzora y el Poniente de Almería,
        y la Subbética y la campiña de Córdoba.`),
      municipios: ['Úbeda', 'Baeza', 'Jaén', 'Linares', 'Andújar', 'Cazorla', 'Granada', 'Guadix', 'Motril', 'Almuñécar', 'Baza', 'Huércal-Overa', 'Córdoba', 'Baena', 'Priego de Córdoba', 'Montoro'],
      masComarcas: 'y comarcas',
    },
    formulario: {
      nombre: 'Nombre',
      telefono: 'Teléfono',
      municipio: 'Municipio',
      queInstalar: '¿Qué quieres instalar?',
      opciones: [
        'Bombeo para pozo o sondeo',
        'Bombeo para balsa o canal',
        'Sustituir mi grupo diésel',
        'Somos una comunidad de regantes',
        'Aún no lo sé',
      ],
      mensaje: 'Cuéntanos un poco más',
      opcional: '(opcional)',
      boton: 'Enviar solicitud',
    },
    faqTitulo: 'Preguntas frecuentes',
    faq: [
      { pregunta: '¿Qué subvenciones hay ahora mismo?', respuesta: p(`Hay líneas activas de fondos europeos (PEPAC/FEADER) y convocatorias de la Junta de Andalucía para infraestructuras de regadío, con prioridad para quien use energía renovable en el bombeo —especialmente para comunidades de regantes. Cambian cada convocatoria y tienen plazo; lo revisamos contigo antes de firmar nada.`) },
      { pregunta: '¿Necesito batería para regar de noche?', respuesta: p(`No. El depósito hace ese trabajo: se llena mientras hay sol y riega cuando toque, de día o de noche, por gravedad. Es más barato y más simple que una batería, y es lo estándar en bombeo solar agrícola.`) },
      { pregunta: '¿Sustituye del todo a mi grupo diésel?', respuesta: p(`En la mayoría de explotaciones sí, dimensionando bien el depósito para los días de poco sol. Si tu caudal necesario es muy alto y constante, a veces dejamos el grupo diésel como respaldo puntual; te lo decimos claro en el estudio, no después.`) },
      { pregunta: '¿Sirve para una comunidad de regantes, o solo para un particular?', respuesta: p(`Los dos. Con una comunidad trabajamos el proyecto colectivo desde el principio —reparto de costes, subvención específica y la asamblea que hay que convencer—; con un particular es un proyecto más simple, centrado en tu pozo y tu parcela.`) },
      { pregunta: '¿Cuánto se tarda?', respuesta: p(`La obra en campo son 2–4 días, según haya que preparar la estructura de los paneles y la torre del depósito. El plazo total —estudio, permisos si hacen falta, instalación— suele ir de 4 a 8 semanas.`) },
      { pregunta: '¿Qué pasa en un día muy nublado?', respuesta: p(`Bombea más despacio, pero bombea —el controlador se ajusta a la luz disponible. Dimensionamos el depósito con margen para varios días seguidos de poco sol, así que un nublado no te deja sin riego.`) },
      { pregunta: '¿Y el mantenimiento?', respuesta: p(`Los paneles casi no piden nada: revisión anual y una limpieza cuando toca. La bomba sumergible es la pieza con más desgaste, igual que con diésel o red; la monitorización avisa si el caudal baja antes de que sea un problema.`) },
    ],
  },
}
