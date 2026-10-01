-- ─────────────────────────────────────────────────────────────────────────────
--  Solera Energía — instalaciones, casos de éxito, contactos (Fases 1–2) y noticias (Fase 4)
--  Pégalo ENTERO una sola vez en Supabase → SQL Editor → New query → Run.
--  Se puede volver a ejecutar sin romper nada (todo lleva "if not exists").
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

create table if not exists public.instalaciones (
  id                       uuid primary key default gen_random_uuid(),
  creado_en                timestamptz not null default now(),

  -- Alta de la instalación
  cliente                  text not null,
  telefono                 text not null,
  municipio                text,
  cultivo                  text,
  hectareas                numeric(8,2),
  potencia_kwp             numeric(8,2),
  fecha_instalacion        date not null,

  -- Reseñas y mantenimiento
  resena_pedida_en         timestamptz,   -- última vez que se pulsó "Pedir reseña"
  ultima_revision          date,          -- última revisión hecha (si no hay, cuenta la fecha de instalación)
  recordatorio_enviado_en  timestamptz,   -- última vez que se pulsó "Recordar revisión"

  -- Caso de éxito (página pública)
  es_caso_exito            boolean not null default false,
  autoriza_publicar        boolean not null default false, -- el cliente ha dado permiso para publicar
  gasto_anual_antes        numeric(10,2),
  ahorro_anual             numeric(10,2),
  amortizacion_anios       numeric(4,1),
  foto_url                 text,
  frase_cliente            text,
  es_demo                  boolean not null default false  -- true = dato de ejemplo (sale con etiqueta "ilustrativo")
);

create index if not exists instalaciones_fecha_idx on public.instalaciones (fecha_instalacion desc);
create index if not exists instalaciones_caso_idx  on public.instalaciones (es_caso_exito, autoriza_publicar);

-- Seguridad: RLS activado y SIN ninguna política. Nadie puede leer ni escribir esta tabla desde
-- el navegador con la clave "anon"; solo el servidor (api/, con la clave service_role).
alter table public.instalaciones enable row level security;

-- Bucket público para las fotos de los casos. Solo se puede LEER públicamente; subir lo hace el
-- servidor con la clave de servicio (que no necesita política).
insert into storage.buckets (id, name, public)
values ('casos', 'casos', true)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
--  FASE 2 — contactos que llegan por la web (ayudas, dimensionado, calculadora, contacto)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.contactos (
  id                 uuid primary key default gen_random_uuid(),
  creado_en          timestamptz not null default now(),

  origen             text not null check (origen in ('ayudas', 'dimensionado', 'calculadora', 'contacto')),
  nombre             text not null,
  telefono           text not null,           -- tal como lo escribió la persona
  telefono_norm      text not null,           -- solo dígitos con prefijo (freno anti-spam: 3 por hora)
  municipio          text,
  mensaje            text,
  datos              jsonb not null default '{}'::jsonb,   -- lo que metió en la herramienta

  consentimiento     boolean not null check (consentimiento),  -- sin consentimiento no entra
  consentimiento_en  timestamptz not null default now(),
  aviso_version      text,                    -- versión del aviso de privacidad que aceptó

  estado             text not null default 'nuevo' check (estado in ('nuevo', 'contactado', 'descartado')),
  nota_interna       text
);

create index if not exists contactos_creado_idx on public.contactos (creado_en desc);
create index if not exists contactos_tel_idx    on public.contactos (telefono_norm, creado_en desc);

-- Igual que `instalaciones`: RLS activado y SIN políticas. Solo el servidor (api/) toca esta tabla.
alter table public.contactos enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
--  FASE 4 — noticias (BOJA → n8n → borrador → se revisa en el panel → web)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.noticias (
  id                 uuid primary key default gen_random_uuid(),
  creado_en          timestamptz not null default now(),

  titulo             text not null,
  resumen            text,                    -- lo propone Gemini; se revisa (y se puede reescribir) en el panel
  enlace             text not null unique,    -- anuncio oficial; único: si n8n lo manda dos veces, no se duplica
  fuente             text not null default 'BOJA',
  fecha_publicacion  date,                    -- fecha del boletín
  coincide           text,                    -- palabras que hicieron saltar el filtro (solo se ven en el panel)

  estado             text not null default 'borrador' check (estado in ('borrador', 'publicada', 'descartada')),
  publicada_en       timestamptz,
  es_demo            boolean not null default false
);

create index if not exists noticias_estado_idx on public.noticias (estado, fecha_publicacion desc);

-- Igual que las demás: RLS activado y SIN políticas. Solo el servidor (api/) toca esta tabla.
alter table public.noticias enable row level security;

-- ─── 3 casos de EJEMPLO para la demo (datos ficticios, sin nombres reales) ───
-- Se pueden borrar desde el panel o con:  delete from public.instalaciones where es_demo;
insert into public.instalaciones
  (cliente, telefono, municipio, cultivo, hectareas, potencia_kwp, fecha_instalacion,
   es_caso_exito, autoriza_publicar, gasto_anual_antes, ahorro_anual, amortizacion_anios, frase_cliente, es_demo)
select * from (values
  ('Cliente de ejemplo 1', '600000001', 'Úbeda',   'olivar',  12,  9,   date '2025-05-14', true, true, 4080,  3120,  2.8, 'Con el gasóleo se me iba media cosecha en riego. Ahora el pozo se paga solo.', true),
  ('Cliente de ejemplo 2', '600000002', 'Baeza',   'olivar',  210, 85,  date '2025-03-03', true, true, 61000, 38400, 5.1, 'Lo difícil era ponernos de acuerdo en la asamblea; el proyecto lo dejó todo claro.', true),
  ('Cliente de ejemplo 3', '600000003', 'Linares', 'almendro', 8,  6,   date '2025-07-21', true, true, 3900,  2700,  3.2, 'La balsa ya estaba hecha, solo faltaba bombear con sol. Se nota en la factura.', true)
) as v(cliente, telefono, municipio, cultivo, hectareas, potencia_kwp, fecha_instalacion,
       es_caso_exito, autoriza_publicar, gasto_anual_antes, ahorro_anual, amortizacion_anios, frase_cliente, es_demo)
where not exists (select 1 from public.instalaciones where es_demo);
