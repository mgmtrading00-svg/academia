-- Dar de alta una tienda y su dueño.
-- Antes: Supabase > Authentication > Users > Add user > Create new user, con el correo del dueño
--        y marcando «Auto Confirm User».
-- Cambia los tres textos entre comillas y pulsa Run.
with nueva as (
  insert into public.shops (name, owner_name, plan)
  values ('Nombre de la tienda', 'Nombre del dueño', 'beta')
  returning id
)
insert into public.shop_members (shop_id, user_id, role)
select nueva.id, u.id, 'owner'
from nueva, auth.users u
where u.email = lower('correo@deldueño.es');

-- Comprobación: debe salir una fila con la tienda y el correo.
select s.name, u.email from public.shop_members m
join public.shops s on s.id = m.shop_id join auth.users u on u.id = m.user_id;
