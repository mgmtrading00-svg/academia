-- Fichas de producto que escribe Nuria (una por foto).
create table public.listings (
  photo_id uuid primary key references public.photos(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  status text not null default 'lista' check (status in ('falta_info','lista','aprobada','publicada')),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.listings enable row level security;
create policy "ver fichas de mi tienda" on public.listings for select to authenticated using (is_member(shop_id));

-- Al aprobar una ficha queda aprobada; si pides cambios, Nuria la reescribe.
create or replace function public.after_decide_ficha() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'ficha' and old.status = 'espera_aprobacion' and new.payload ? 'photo_id' then
    if new.status = 'hecha' then
      update listings set status = 'aprobada', updated_at = now() where photo_id = (new.payload->>'photo_id')::uuid;
    elsif new.status = 'cambios' then
      insert into tasks (shop_id, agent_id, kind, title, payload)
      values (new.shop_id, 'nuria', 'ficha', 'Reescribir: ' || new.title, new.payload || jsonb_build_object('redo', true));
    end if;
  end if;
  return new;
end $$;
create trigger tasks_decide_ficha after update of status on public.tasks
  for each row execute function public.after_decide_ficha();
