-- ==============================================================================
-- Migración: Cronogramas Inteligentes, Disponibilidad, Eventos de Calendario y Logs IA
-- ==============================================================================

-- 1. Tabla de Cronogramas (cronogramas)
create table if not exists public.cronogramas (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.projects(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  generado_en timestamptz not null default now(),
  version int not null default 1,
  datos jsonb not null default '{}'::jsonb,
  activo boolean not null default true,
  estado text not null default 'vigente' check (estado in ('vigente', 'desactualizado', 'archivado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cronogramas enable row level security;

drop policy if exists "cronogramas_select_policy" on public.cronogramas;
create policy "cronogramas_select_policy" on public.cronogramas
  for select using (auth.uid() = usuario_id);

drop policy if exists "cronogramas_insert_policy" on public.cronogramas;
create policy "cronogramas_insert_policy" on public.cronogramas
  for insert with check (auth.uid() = usuario_id);

drop policy if exists "cronogramas_update_policy" on public.cronogramas;
create policy "cronogramas_update_policy" on public.cronogramas
  for update using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists "cronogramas_delete_policy" on public.cronogramas;
create policy "cronogramas_delete_policy" on public.cronogramas
  for delete using (auth.uid() = usuario_id);

create index if not exists cronogramas_proyecto_activo_idx on public.cronogramas (proyecto_id, activo);
create index if not exists cronogramas_usuario_id_idx on public.cronogramas (usuario_id);


-- 2. Tabla de Bloques de Disponibilidad (bloques_disponibilidad)
create table if not exists public.bloques_disponibilidad (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  dia_semana int check (dia_semana between 0 and 6), -- 0: Domingo, 1: Lunes, ... 6: Sábado
  fecha_especifica date null,                         -- Opcional si es un bloqueo puntual de una sola fecha
  hora_inicio time not null,
  hora_fin time not null,
  tipo text not null check (tipo in ('ocupado', 'tareas', 'estudio', 'trabajo', 'otra_actividad')),
  origen text not null default 'manual' check (origen in ('manual', 'extraido_ia', 'google_calendar')),
  fecha_vigencia_desde date null,
  fecha_vigencia_hasta date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bloques_disponibilidad enable row level security;

drop policy if exists "bloques_disponibilidad_select_policy" on public.bloques_disponibilidad;
create policy "bloques_disponibilidad_select_policy" on public.bloques_disponibilidad
  for select using (auth.uid() = usuario_id);

drop policy if exists "bloques_disponibilidad_insert_policy" on public.bloques_disponibilidad;
create policy "bloques_disponibilidad_insert_policy" on public.bloques_disponibilidad
  for insert with check (auth.uid() = usuario_id);

drop policy if exists "bloques_disponibilidad_update_policy" on public.bloques_disponibilidad;
create policy "bloques_disponibilidad_update_policy" on public.bloques_disponibilidad
  for update using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists "bloques_disponibilidad_delete_policy" on public.bloques_disponibilidad;
create policy "bloques_disponibilidad_delete_policy" on public.bloques_disponibilidad
  for delete using (auth.uid() = usuario_id);

create index if not exists bloques_disp_usuario_dia_idx on public.bloques_disponibilidad (usuario_id, dia_semana);
create index if not exists bloques_disp_usuario_fecha_idx on public.bloques_disponibilidad (usuario_id, fecha_especifica);


-- 3. Tabla de Eventos de Calendario (eventos_calendario)
create table if not exists public.eventos_calendario (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  proyecto_id uuid null references public.projects(id) on delete cascade,
  tarea_id uuid null references public.tareas(id) on delete cascade,
  titulo text not null,
  descripcion text null,
  inicio timestamptz not null,
  fin timestamptz not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'completado', 'cancelado')),
  generado_por_ia boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.eventos_calendario enable row level security;

drop policy if exists "eventos_calendario_select_policy" on public.eventos_calendario;
create policy "eventos_calendario_select_policy" on public.eventos_calendario
  for select using (auth.uid() = usuario_id);

drop policy if exists "eventos_calendario_insert_policy" on public.eventos_calendario;
create policy "eventos_calendario_insert_policy" on public.eventos_calendario
  for insert with check (auth.uid() = usuario_id);

drop policy if exists "eventos_calendario_update_policy" on public.eventos_calendario;
create policy "eventos_calendario_update_policy" on public.eventos_calendario
  for update using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists "eventos_calendario_delete_policy" on public.eventos_calendario;
create policy "eventos_calendario_delete_policy" on public.eventos_calendario
  for delete using (auth.uid() = usuario_id);

create index if not exists eventos_cal_usuario_inicio_idx on public.eventos_calendario (usuario_id, inicio);
create index if not exists eventos_cal_proyecto_idx on public.eventos_calendario (proyecto_id);


-- 4. Tabla de Auditoría y Debugging IA (logs_ia)
create table if not exists public.logs_ia (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid null references auth.users(id) on delete set null,
  proyecto_id uuid null references public.projects(id) on delete set null,
  tipo_operacion text not null, -- 'generacion_cronograma', 'regeneracion_cronograma', 'extraccion_horario'
  modelo text not null,
  prompt_enviado text not null,
  respuesta_cruda text not null,
  tokens_prompt int null,
  tokens_respuesta int null,
  duracion_ms int null,
  error text null,
  creado_en timestamptz not null default now()
);

alter table public.logs_ia enable row level security;

drop policy if exists "logs_ia_select_policy" on public.logs_ia;
create policy "logs_ia_select_policy" on public.logs_ia
  for select using (auth.uid() = usuario_id);

drop policy if exists "logs_ia_insert_policy" on public.logs_ia;
create policy "logs_ia_insert_policy" on public.logs_ia
  for insert with check (auth.uid() = usuario_id or auth.uid() is null);

create index if not exists logs_ia_usuario_creado_idx on public.logs_ia (usuario_id, creado_en desc);


-- 5. Bucket de Storage para Archivos y Horarios de Proyectos (project-files)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files',
  'project-files',
  true,
  52428800, -- 50 MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'image/png',
    'image/jpeg',
    'image/webp'
  ];

drop policy if exists "project_files_select_policy" on storage.objects;
create policy "project_files_select_policy" on storage.objects
  for select to authenticated
  using (bucket_id = 'project-files');

drop policy if exists "project_files_insert_policy" on storage.objects;
create policy "project_files_insert_policy" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-files' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "project_files_update_policy" on storage.objects;
create policy "project_files_update_policy" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'project-files' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "project_files_delete_policy" on storage.objects;
create policy "project_files_delete_policy" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-files' and
    (storage.foldername(name))[1] = auth.uid()::text
  );
