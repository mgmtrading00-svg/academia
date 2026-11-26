-- Marco sube a la web de la tienda (Shopify) cada prenda con la foto y la ficha aprobadas.

-- Conexión de cada tienda con su Shopify. Las claves van cifradas por el servidor y
-- la tabla no tiene políticas: solo el servidor (clave de servicio) puede leerla.
create table public.shop_connections (
  shop_id uuid not null references public.shops(id) on delete cascade,
  provider text not null check (provider in ('shopify')),
  shop_domain text not null,          -- xxxx.myshopify.com
  client_id text,
  client_secret_enc text,             -- cifrado (AES-GCM) por el servidor
  access_token_enc text,              -- token fijo (apps antiguas) o el de 24 h, cifrado
  token_expires_at timestamptz,       -- null = token fijo
  publish_status text not null default 'DRAFT' check (publish_status in ('DRAFT','ACTIVE')),
  auto_publish boolean not null default true,
  store_name text,
  last_ok_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now(),
  primary key (shop_id, provider)
);
alter table public.shop_connections enable row level security;

alter table public.listings
  add column shopify_product_id text,
  add column shopify_admin_url text,
  add column shopify_url text,
  add column publish_error text;

-- Encola la subida cuando la foto y la ficha están aprobadas y la tienda tiene Shopify conectado.
create or replace function public.queue_shopify(p_photo uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_shop uuid; v_title text;
begin
  select p.shop_id, l.data->'web'->>'title' into v_shop, v_title
  from photos p join listings l on l.photo_id = p.id
  where p.id = p_photo and p.status = 'aprobada' and l.status = 'aprobada' and l.shopify_product_id is null;
  if v_shop is null then return; end if;
  if not exists (select 1 from shop_connections c where c.shop_id = v_shop and c.provider = 'shopify' and c.auto_publish) then return; end if;
  if exists (select 1 from tasks where shop_id = v_shop and agent_id = 'marco' and kind = 'publicar_shopify'
             and status in ('pendiente','en_curso') and payload->>'photo_id' = p_photo::text) then return; end if;
  insert into tasks (shop_id, agent_id, kind, title, payload)
  values (v_shop, 'marco', 'publicar_shopify', 'Subir a tu web: ' || coalesce(v_title, 'prenda'), jsonb_build_object('photo_id', p_photo));
  update agent_states set status = 'busy', task = 'Subiendo prendas a tu web', short = 'Subiendo a tu web', updated_at = now()
  where shop_id = v_shop and agent_id = 'marco';
end $$;
revoke all on function public.queue_shopify(uuid) from public, anon, authenticated;
grant execute on function public.queue_shopify(uuid) to service_role;

create or replace function public.photos_queue_shopify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'aprobada' then perform queue_shopify(new.id); end if;
  return new;
end $$;
create trigger photos_shopify after update of status on public.photos
  for each row execute function public.photos_queue_shopify();

create or replace function public.listings_queue_shopify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'aprobada' then perform queue_shopify(new.photo_id); end if;
  return new;
end $$;
create trigger listings_shopify after insert or update of status on public.listings
  for each row execute function public.listings_queue_shopify();
