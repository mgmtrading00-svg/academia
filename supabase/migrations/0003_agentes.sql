-- Empleados reales: cola atómica, revisión interna y resultados de Teo.

-- 'revision' = lo revisa nuestro equipo por dentro; la tienda no tiene que hacer nada.
alter table public.tasks drop constraint tasks_status_check;
alter table public.tasks add constraint tasks_status_check
  check (status in ('pendiente','en_curso','espera_aprobacion','hecha','cambios','revision'));
alter table public.tasks add column last_error text;

-- 'repetir' = Lola ha pedido otra foto a la tienda.
alter table public.photos drop constraint photos_status_check;
alter table public.photos add constraint photos_status_check
  check (status in ('en_cola','repetir','lista','aprobada','publicada'));
alter table public.photos add column attributes jsonb not null default '{}'::jsonb;

-- Coge la siguiente tarea de un empleado sin que dos procesos cojan la misma.
create or replace function public.claim_task(p_agent text)
returns setof public.tasks language sql security definer set search_path = public as $$
  update tasks set status = 'en_curso', attempts = attempts + 1, updated_at = now()
  where id = (
    select id from tasks
    where agent_id = p_agent and status = 'pendiente'
    order by created_at
    for update skip locked
    limit 1
  )
  returning *;
$$;
revoke all on function public.claim_task(text) from public, anon, authenticated;
grant execute on function public.claim_task(text) to service_role;

-- Decidir una tarea: ahora también mueve la foto y, si pides cambios, Teo la repite.
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

  if t.kind = 'foto_modelo' and t.payload ? 'photo_id' then
    if p_approve then
      update photos set status = 'aprobada' where id = (t.payload->>'photo_id')::uuid;
    else
      update photos set status = 'en_cola' where id = (t.payload->>'photo_id')::uuid;
      insert into tasks (shop_id, agent_id, kind, title, payload)
      values (t.shop_id, 'teo', 'foto_modelo', 'Repetir: ' || t.title, t.payload || jsonb_build_object('redo', true));
    end if;
  end if;

  if not exists (select 1 from tasks where shop_id = t.shop_id and agent_id = t.agent_id and status = 'espera_aprobacion') then
    update agent_states set status = 'busy',
      task = case when p_approve then 'Aplicando lo que has aprobado' else 'Rehaciendo con tus cambios' end,
      short = case when p_approve then 'Aplicando lo aprobado' else 'Rehaciendo cambios' end,
      updated_at = now()
    where shop_id = t.shop_id and agent_id = t.agent_id;
  end if;
end $$;
