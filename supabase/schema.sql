-- ============================================================
-- ESQUEMA: App de seguimiento de entrenamientos de running
-- Multiusuario abierto: cada usuario ve solo sus propios datos
-- ============================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------
-- META (ej. "Media maratón" con fecha objetivo)
-- --------------------------------------------------------------
create table metas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references profiles(id) on delete cascade,
  nombre text not null,
  fecha_objetivo date not null,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------
-- SESIONES (lo que el usuario introduce cada día)
-- --------------------------------------------------------------
create table sesiones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references profiles(id) on delete cascade,
  meta_id uuid references metas(id) on delete set null,
  fecha date not null,
  tipo_tirada text not null check (tipo_tirada in ('easy', 'calidad', 'long', 'regenerativo')),

  -- datos en bruto que introduce el usuario:
  km_totales numeric(5,2) not null check (km_totales > 0),
  km_z2 numeric(5,2) not null default 0 check (km_z2 >= 0),
  tiempo_total_segundos int not null check (tiempo_total_segundos > 0),
  ppm_medio int,  -- pulsaciones medias de la sesión

  created_at timestamptz not null default now()
);

create index idx_sesiones_usuario_fecha on sesiones(usuario_id, fecha);

-- --------------------------------------------------------------
-- SERIES DE CALIDAD (hijas de una sesión tipo "calidad")
-- Cada serie puede tener su propia distancia y ritmo
-- --------------------------------------------------------------
create table series_calidad (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references sesiones(id) on delete cascade,
  numero_serie int not null check (numero_serie > 0),
  distancia_metros int not null check (distancia_metros > 0),
  ritmo_segundos_km int not null check (ritmo_segundos_km > 0),  -- ritmo en segundos/km, más fácil de promediar que "mm:ss"
  unique (sesion_id, numero_serie)
);

-- ============================================================
-- VISTA: métricas calculadas por sesión
-- (km de calidad, ritmo medio, ritmo de calidad ponderado)
-- ============================================================
create view v_sesion_calculada as
select
  s.id,
  s.usuario_id,
  s.meta_id,
  s.fecha,
  s.tipo_tirada,
  s.km_totales,
  s.km_z2,
  s.tiempo_total_segundos,
  s.ppm_medio,
  -- ritmo medio de la sesión completa, en segundos/km
  round(s.tiempo_total_segundos / nullif(s.km_totales, 0)) as ritmo_medio_seg_km,
  -- km de calidad = suma de distancias de sus series (0 si no es sesión de calidad)
  coalesce(sc.km_calidad, 0) as km_calidad,
  -- ritmo de calidad ponderado por distancia de cada serie
  sc.ritmo_calidad_seg_km
from sesiones s
left join (
  select
    sesion_id,
    sum(distancia_metros) / 1000.0 as km_calidad,
    round(sum(distancia_metros::numeric * ritmo_segundos_km) / nullif(sum(distancia_metros), 0)) as ritmo_calidad_seg_km
  from series_calidad
  group by sesion_id
) sc on sc.sesion_id = s.id;

-- ============================================================
-- VISTA: totales y porcentajes semanales por usuario
-- ============================================================
create view v_semana_calculada as
select
  usuario_id,
  meta_id,
  date_trunc('week', fecha)::date as semana_inicio,
  sum(km_totales) as km_totales_semana,
  sum(km_z2) as km_z2_semana,
  sum(km_calidad) as km_calidad_semana,
  round(100.0 * sum(km_z2) / nullif(sum(km_totales), 0), 1) as pct_z2_semana,
  round(100.0 * sum(km_calidad) / nullif(sum(km_totales), 0), 1) as pct_calidad_semana
from v_sesion_calculada
group by usuario_id, meta_id, date_trunc('week', fecha);

-- --------------------------------------------------------------
-- SUGERENCIAS DE RITMO (generadas por Claude, una fila por semana)
-- --------------------------------------------------------------
create table ritmos_sugeridos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references profiles(id) on delete cascade,
  meta_id uuid not null references metas(id) on delete cascade,
  semana_inicio date not null,

  ritmo_easy_seg_km int,
  ritmo_calidad_seg_km int,
  ritmo_long_seg_km int,
  ritmo_regenerativo_seg_km int,

  justificacion text,       -- explicación breve que da Claude
  aceptado boolean,          -- null = pendiente de decidir, true/false tras revisar
  created_at timestamptz not null default now(),
  unique (usuario_id, meta_id, semana_inicio)
);

-- ============================================================
-- ROW LEVEL SECURITY: cada usuario ve solo sus propios datos
-- ============================================================
alter table profiles enable row level security;
alter table metas enable row level security;
alter table sesiones enable row level security;
alter table series_calidad enable row level security;
alter table ritmos_sugeridos enable row level security;

create policy "cada uno ve su perfil" on profiles for select using (auth.uid() = id);
create policy "cada uno edita su perfil" on profiles for update using (auth.uid() = id);
create policy "perfil se crea al registrarse" on profiles for insert with check (auth.uid() = id);

create policy "cada uno gestiona sus metas" on metas for all
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

create policy "cada uno gestiona sus sesiones" on sesiones for all
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

create policy "cada uno gestiona sus series" on series_calidad for all
  using (exists (select 1 from sesiones where id = sesion_id and usuario_id = auth.uid()))
  with check (exists (select 1 from sesiones where id = sesion_id and usuario_id = auth.uid()));

create policy "cada uno ve sus ritmos sugeridos" on ritmos_sugeridos for select
  using (usuario_id = auth.uid());
create policy "cada uno actualiza sus ritmos sugeridos" on ritmos_sugeridos for update
  using (usuario_id = auth.uid());
-- Las inserciones de ritmos_sugeridos las hace el backend con la service_role key
-- (la API route que llama a Claude), no el usuario directamente.
