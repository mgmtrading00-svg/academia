-- Solicitudes de plaza en la beta desde la portada (público, sin sesión).
create table public.beta_requests (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 1 and 80),
  tienda text not null check (char_length(tienda) between 1 and 80),
  ciudad text not null check (char_length(ciudad) between 1 and 60),
  contacto text not null check (char_length(contacto) between 3 and 120),
  canal text not null default '',
  mensaje text not null default '' check (char_length(mensaje) <= 600),
  created_at timestamptz not null default now()
);
alter table public.beta_requests enable row level security;
-- Cualquiera puede enviar una solicitud; nadie puede leerlas salvo el equipo con la clave de servicio.
create policy "enviar solicitud" on public.beta_requests for insert to anon, authenticated with check (true);
