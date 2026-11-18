-- Oficina Virtual: esquema inicial
-- Cada tienda solo ve lo suyo (Row Level Security). Los agentes trabajan con la
-- clave de servicio, que se salta RLS, y nunca se usa en el navegador.

create extension if not exists pgcrypto;

-- Tiendas y quién puede entrar en cada una ---------------------------------
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_name text not null default '',
  plan text not null default 'beta' check (plan in ('beta','esencial','profesional','elite')),
  created_at timestamptz not null default now()
);

create table public.shop_members (
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','staff')),
  primary key (shop_id, user_id)
);

create or replace function public.is_member(p_shop uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from shop_members where shop_id = p_shop and user_id = auth.uid());
$$;

-- Estado de cada empleado en cada tienda ------------------------------------
create table public.agent_states (
  shop_id uuid not null references public.shops(id) on delete cascade,
  agent_id text not null check (agent_id in ('lola','teo','nuria','bruno','vera','marco','sara','leo')),
  status text not null default 'off' check (status in ('busy','ok','warn','off')),
  task text not null default 'Libre',
  short text not null default 'Libre',
  updated_at timestamptz not null default now(),
  primary key (shop_id, agent_id)
);

-- Cola de trabajo de los agentes --------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  agent_id text not null,
  kind text not null,
  title text not null,
  status text not null default 'pendiente'
    check (status in ('pendiente','en_curso','espera_aprobacion','hecha','cambios')),
  approval_label text,
  payload jsonb not null default '{}'::jsonb,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_queue_idx on public.tasks (status, agent_id, created_at);
create index tasks_shop_idx on public.tasks (shop_id, created_at desc);

create table public.activity (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  agent_id text not null,
  message text not null,
  created_at timestamptz not null default now()
);
create index activity_shop_idx on public.activity (shop_id, created_at desc);

-- Fotos que manda la tienda --------------------------------------------------
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  note text not null default '',
  status text not null default 'en_cola' check (status in ('en_cola','lista','aprobada','publicada')),
  model_path text, -- foto en modelo generada por Teo
  created_at timestamptz not null default now()
);

-- Encuesta de alta -----------------------------------------------------------
create table public.survey_responses (
  shop_id uuid primary key references public.shops(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  completed boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Cifras del panel (las rellenan los agentes) --------------------------------
create table public.shop_kpis (
  shop_id uuid primary key references public.shops(id) on delete cascade,
  published int not null default 0,
  marketplace_sales int not null default 0,
  low_stock int not null default 0,
  ads_roas numeric,
  updated_at timestamptz not null default now()
);

-- Al crear una tienda, se crean sus 8 puestos y su ficha de cifras ------------
create or replace function public.seed_shop() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into agent_states (shop_id, agent_id, status, task, short)
  select new.id, a, case when a = 'lola' then 'ok' else 'off' end,
         case when a = 'lola' then 'Esperando tu encuesta de alta' else 'Libre' end,
         case when a = 'lola' then 'Esperando tu encuesta' else 'Libre' end
  from unnest(array['lola','teo','nuria','bruno','vera','marco','sara','leo']) a;
  insert into shop_kpis (shop_id) values (new.id);
  return new;
end $$;
create trigger shops_seed after insert on public.shops for each row execute function public.seed_shop();

-- Seguridad por tienda --------------------------------------------------------
alter table public.shops enable row level security;
alter table public.shop_members enable row level security;
alter table public.agent_states enable row level security;
alter table public.tasks enable row level security;
alter table public.activity enable row level security;
alter table public.photos enable row level security;
alter table public.survey_responses enable row level security;
alter table public.shop_kpis enable row level security;

create policy "ver mi tienda" on public.shops for select using (is_member(id));
create policy "ver mis miembros" on public.shop_members for select using (user_id = auth.uid());
create policy "ver mis agentes" on public.agent_states for select using (is_member(shop_id));
create policy "ver mis tareas" on public.tasks for select using (is_member(shop_id));
create policy "ver mi actividad" on public.activity for select using (is_member(shop_id));
create policy "ver mis fotos" on public.photos for select using (is_member(shop_id));
create policy "subir mis fotos" on public.photos for insert with check (is_member(shop_id) and status = 'en_cola');
create policy "ver mi encuesta" on public.survey_responses for select using (is_member(shop_id));
create policy "rellenar mi encuesta" on public.survey_responses for insert with check (is_member(shop_id));
create policy "editar mi encuesta" on public.survey_responses for update using (is_member(shop_id));
create policy "ver mis cifras" on public.shop_kpis for select using (is_member(shop_id));

-- La tienda aprueba o pide cambios. Solo puede tocar tareas que esperan su visto bueno.
create or replace function public.decide_task(p_task uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare t tasks;
begin
  select * into t from tasks where id = p_task for update;
  if t.id is null or not is_member(t.shop_id) then raise exception 'Tarea no encontrada'; end if;
  if t.status <> 'espera_aprobacion' then raise exception 'Esta tarea ya no espera aprobación'; end if;
  update tasks set status = case when p_approve then 'hecha' else 'cambios' end, updated_at = now() where id = p_task;
  insert into activity (shop_id, agent_id, message)
  values (t.shop_id, t.agent_id, case when p_approve then 'Aprobado: ' || t.title else 'Me pides cambios en: ' || t.title end);
  if not exists (select 1 from tasks where shop_id = t.shop_id and agent_id = t.agent_id and status = 'espera_aprobacion') then
    update agent_states set status = case when p_approve then 'busy' else 'busy' end,
      task = case when p_approve then 'Aplicando lo que has aprobado' else 'Rehaciendo con tus cambios' end,
      short = case when p_approve then 'Aplicando lo aprobado' else 'Rehaciendo cambios' end,
      updated_at = now()
    where shop_id = t.shop_id and agent_id = t.agent_id;
  end if;
end $$;
grant execute on function public.decide_task(uuid, boolean) to authenticated;

-- Al subir una foto, Teo recibe una tarea en su cola.
create or replace function public.photo_to_task() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into tasks (shop_id, agent_id, kind, title, payload)
  values (new.shop_id, 'teo', 'foto_modelo', 'Foto en modelo: ' || new.file_name, jsonb_build_object('photo_id', new.id));
  update agent_states set status = 'busy', task = 'Poniendo tus prendas en modelo', short = 'Fotos nuevas en cola', updated_at = now()
  where shop_id = new.shop_id and agent_id = 'teo';
  return new;
end $$;
create trigger photos_task after insert on public.photos for each row execute function public.photo_to_task();

-- Almacenamiento privado de fotos: carpeta = id de la tienda
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', false) on conflict do nothing;
create policy "subir fotos de mi tienda" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and is_member(((storage.foldername(name))[1])::uuid));
create policy "ver fotos de mi tienda" on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and is_member(((storage.foldername(name))[1])::uuid));

-- Tiempo real para que el panel se actualice solo
alter publication supabase_realtime add table public.agent_states, public.activity, public.tasks;
