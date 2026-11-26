'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { IS_DEMO } from '@/lib/config';
import { currentShopId } from '@/lib/data';
import { adminClient } from '@/lib/conexiones';
import { runAgentsSoon } from '@/lib/run-agents';
import { supabaseServer } from '@/lib/supabase/server';
import { encrypt, resolveShopDomain, testConnection, ShopifyError } from '@/agents/marco/shopify';
import type { FormState } from './actions';

async function requireShop() {
  const shopId = await currentShopId();
  if (!shopId) redirect('/acceso');
  return shopId;
}

/** Pone en cola todas las prendas que ya tienen foto y ficha aprobadas y aún no están en la web. */
async function queueApproved(shopId: string) {
  const sb = adminClient()!;
  const { data } = await sb.from('listings').select('photo_id').eq('shop_id', shopId).eq('status', 'aprobada').is('shopify_product_id', null);
  for (const r of data ?? []) await sb.rpc('queue_shopify', { p_photo: r.photo_id });
  return data?.length ?? 0;
}

// ---------- Conectar Shopify ----------
export async function saveShopify(_prev: FormState, form: FormData): Promise<FormState> {
  const shopId = await requireShop();
  if (IS_DEMO) return { error: 'En la demostración no se puede conectar una tienda real.' };
  const sb = adminClient();
  if (!sb) return { error: 'Falta la clave del servidor (SUPABASE_SERVICE_ROLE_KEY) en Vercel.' };

  const get = (k: string) => String(form.get(k) ?? '').trim();
  const publishStatus = get('modo') === 'ACTIVE' ? 'ACTIVE' : 'DRAFT';
  const autoPublish = form.get('auto') === 'on';
  const { data: prev } = await sb.from('shop_connections').select('*').eq('shop_id', shopId).eq('provider', 'shopify').maybeSingle();

  const domain = get('tienda') ? await resolveShopDomain(get('tienda')) : prev?.shop_domain;
  if (!domain) return { error: 'No reconozco esa dirección. Escribe la que acaba en .myshopify.com (la ves en Shopify › Configuración › Dominios).' };

  // Lo que no se vuelve a escribir se queda como estaba (las claves nunca se enseñan en el panel).
  const token = get('token');
  const clientId = token ? null : get('client_id') || prev?.client_id || null;
  const { decrypt } = await import('@/agents/marco/shopify');
  const clientSecret = token ? null : get('client_secret') || decrypt(prev?.client_secret_enc) || null;
  const accessToken = token || (clientId ? null : decrypt(prev?.access_token_enc));
  if (!accessToken && !(clientId && clientSecret)) return { error: 'Pega el Client ID y el Client secret de tu app de Shopify.' };
  if (token && !/^shpat_[a-f0-9]{20,}$/i.test(token)) return { error: 'El token de acceso empieza por shpat_. Revisa que lo has copiado entero.' };

  let test;
  try {
    test = await testConnection({ shopDomain: domain, clientId, clientSecret, accessToken, publishStatus });
  } catch (e) {
    return { error: e instanceof ShopifyError ? e.message : `No he podido hablar con Shopify (${e instanceof Error ? e.message.slice(0, 120) : 'error'}). Prueba en un minuto.` };
  }
  if (test.missing.length) return { error: `La app de Shopify no tiene permiso para crear productos. En el Dev Dashboard, en Versions › Scopes, añade write_products y write_publications, pulsa Release y vuelve a instalarla.` };

  const row = {
    shop_id: shopId, provider: 'shopify', shop_domain: domain, client_id: clientId,
    client_secret_enc: clientSecret ? encrypt(clientSecret) : null,
    access_token_enc: test.fresh ? encrypt(test.fresh.token) : accessToken ? encrypt(accessToken) : null,
    token_expires_at: test.fresh?.expiresAt ?? null,
    publish_status: publishStatus, auto_publish: autoPublish, store_name: test.name,
    last_ok_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString(),
  };
  const up = await sb.from('shop_connections').upsert(row);
  if (up.error) return { error: 'No se ha podido guardar la conexión. Inténtalo otra vez.' };
  await sb.from('activity').insert({ shop_id: shopId, agent_id: 'marco', message: `Conectado con tu tienda Shopify «${test.name}». Subiré ${publishStatus === 'ACTIVE' ? 'a la venta' : 'como borrador'} cada prenda que apruebes.` });
  await sb.from('agent_states').upsert({ shop_id: shopId, agent_id: 'marco', status: 'ok', task: 'Conectado con tu web', short: 'Web conectada', updated_at: new Date().toISOString() });

  const queued = autoPublish ? await queueApproved(shopId) : 0;
  if (queued) runAgentsSoon();
  revalidatePath('/panel/tienda-online');
  const extra = test.canPublishToChannel ? '' : ' Ojo: sin el permiso write_publications las prendas no se añaden solas al canal «Tienda online».';
  return { ok: `Conectada con «${test.name}».${queued ? ` Marco ya está subiendo ${queued} prenda${queued > 1 ? 's' : ''} aprobada${queued > 1 ? 's' : ''}.` : ''}${extra}` };
}

export async function disconnectShopify(): Promise<FormState> {
  const shopId = await requireShop();
  const sb = adminClient();
  if (!sb) return { error: 'No disponible.' };
  await sb.from('shop_connections').delete().eq('shop_id', shopId).eq('provider', 'shopify');
  await sb.from('agent_states').upsert({ shop_id: shopId, agent_id: 'marco', status: 'off', task: 'Libre', short: 'Libre', updated_at: new Date().toISOString() });
  revalidatePath('/panel/tienda-online');
  return { ok: 'Desconectada. Ya no subiré nada a tu web.' };
}

/** «Subir a mi web» en una prenda: aprueba la foto y la ficha si hacía falta y la pone en cola de Marco. */
export async function publishNow(photoId: string): Promise<FormState> {
  const shopId = await requireShop();
  const sb = adminClient();
  if (!sb) return { error: 'No disponible en la demostración.' };
  const { data: photo } = await (await supabaseServer()).from('photos').select('id,status').eq('id', photoId).eq('shop_id', shopId).maybeSingle();
  if (!photo) return { error: 'No encuentro esa prenda.' };
  const { data: l } = await sb.from('listings').select('status,shopify_product_id,data').eq('photo_id', photoId).maybeSingle();
  if (!l) return { error: 'Nuria aún no ha escrito la ficha.' };
  if (l.status === 'falta_info') return { error: 'Primero pon el precio y las tallas.' };
  if (l.shopify_product_id) return { ok: 'Ya está en tu web.' };
  const { data: c } = await sb.from('shop_connections').select('shop_id').eq('shop_id', shopId).eq('provider', 'shopify').maybeSingle();
  if (!c) return { error: 'Conecta antes tu tienda en «Tu web (Shopify)».' };

  // Lo que el cliente aprueba aquí cuenta como visto bueno de la foto y de la ficha.
  const pend = await sb.from('tasks').select('id,kind').eq('shop_id', shopId).eq('status', 'espera_aprobacion').in('kind', ['foto_modelo', 'ficha']).contains('payload', { photo_id: photoId });
  for (const t of pend.data ?? []) await sb.from('tasks').update({ status: 'hecha', updated_at: new Date().toISOString() }).eq('id', t.id);
  await sb.from('listings').update({ publish_error: null }).eq('photo_id', photoId);
  if (photo.status !== 'aprobada' && photo.status !== 'publicada') await sb.from('photos').update({ status: 'aprobada' }).eq('id', photoId);
  if (l.status !== 'aprobada') await sb.from('listings').update({ status: 'aprobada', data: { ...l.data, status: 'aprobada' } }).eq('photo_id', photoId);
  // Si ya estaba todo aprobado (por ejemplo, tras un error), los disparadores no saltan: encolar a mano.
  await sb.rpc('queue_shopify', { p_photo: photoId });
  runAgentsSoon();
  revalidatePath('/panel/fotos');
  revalidatePath('/panel');
  return { ok: 'Marco la está subiendo a tu web' };
}

/** «Completar precio y tallas»: Nuria rehace la ficha con estos datos. */
export async function completeListing(photoId: string, priceText: string, sizesText: string): Promise<FormState> {
  const shopId = await requireShop();
  const sb = adminClient();
  if (!sb) return { error: 'No disponible en la demostración.' };
  const price = Number(priceText.replace(/[^\d,.]/g, '').replace(',', '.'));
  if (!(price > 0 && price < 10000)) return { error: 'Escribe el precio, por ejemplo 24,90.' };
  const sizes = sizesText.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean).slice(0, 20);
  if (!sizes.length) return { error: 'Escribe al menos una talla, por ejemplo: 0-3 meses, 3-6 meses. Si no tiene, pon «Única».' };
  const { data: photo } = await (await supabaseServer()).from('photos').select('id,attributes').eq('id', photoId).eq('shop_id', shopId).maybeSingle();
  const garment = (photo?.attributes as { garment?: { title?: string } } | null)?.garment;
  if (!photo || !garment) return { error: 'Teo aún no ha terminado con esta prenda.' };
  // Lo que Lola iba a preguntar ya está contestado.
  await sb.from('tasks').update({ status: 'hecha', updated_at: new Date().toISOString() }).eq('shop_id', shopId).eq('agent_id', 'lola').eq('kind', 'pedir_datos').eq('status', 'pendiente').contains('payload', { photo_id: photoId });
  const ins = await sb.from('tasks').insert({ shop_id: shopId, agent_id: 'nuria', kind: 'ficha', title: `Ficha: ${garment.title ?? 'prenda'}`, payload: { photo_id: photoId, garment, price_eur: price, sizes, redo: true } });
  if (ins.error) return { error: 'No se ha podido avisar a Nuria.' };
  runAgentsSoon();
  revalidatePath('/panel/fotos');
  return { ok: 'Nuria está rehaciendo la ficha' };
}
