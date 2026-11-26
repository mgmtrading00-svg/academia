import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { OfficeStore, QueuedTask, ShopifyStore } from '../store';
import { decrypt, encrypt } from '../marco/shopify';
import type { Listing } from '../../lib/types';

const BUCKET = 'fotos';

/** Acceso a la base de datos real con la clave de servicio. Solo para el proceso de los empleados, nunca en el navegador. */
export function supabaseStore(url: string, serviceKey: string): OfficeStore {
  const sb: SupabaseClient = createClient(url, serviceKey, { auth: { persistSession: false } });
  const must = <T,>(r: { data: T; error: { message: string } | null }) => {
    if (r.error) throw new Error(r.error.message);
    return r.data;
  };

  const shopify: ShopifyStore = {
    async connection(shopId) {
      const { data: c } = await sb.from('shop_connections').select('*').eq('shop_id', shopId).eq('provider', 'shopify').maybeSingle();
      if (!c) return null;
      return {
        shopDomain: c.shop_domain, clientId: c.client_id, clientSecret: decrypt(c.client_secret_enc),
        accessToken: decrypt(c.access_token_enc), tokenExpiresAt: c.token_expires_at, publishStatus: c.publish_status, storeName: c.store_name,
      };
    },
    async saveToken(shopId, token, expiresAt) {
      must(await sb.from('shop_connections').update({ access_token_enc: encrypt(token), token_expires_at: expiresAt }).eq('shop_id', shopId).eq('provider', 'shopify'));
    },
    async setStatus(shopId, st) {
      const patch: Record<string, unknown> = st.ok ? { last_ok_at: new Date().toISOString(), last_error: null } : { last_error: st.error ?? 'Error' };
      if (st.storeName) patch.store_name = st.storeName;
      must(await sb.from('shop_connections').update(patch).eq('shop_id', shopId).eq('provider', 'shopify'));
    },
    async publishData(photoId) {
      const { data: p } = await sb.from('photos').select('shop_id,attributes,model_path,listings(data,shopify_product_id)').eq('id', photoId).maybeSingle();
      if (!p) return null;
      const l = (Array.isArray(p.listings) ? p.listings[0] : p.listings) as { data: Listing; shopify_product_id: string | null } | null;
      if (!l) return null;
      const attrs = (p.attributes ?? {}) as { garment?: { title: string; category: string; color: string }; results?: { kind: string; label: string; path?: string }[] };
      const results = (attrs.results ?? []).filter((r) => r.path && r.kind !== 'post');
      if (!results.length && p.model_path) results.push({ kind: 'producto', label: 'Producto', path: p.model_path });
      // Primero la foto de producto, luego las de modelo.
      results.sort((a, b) => Number(a.kind !== 'producto') - Number(b.kind !== 'producto'));
      const images = [];
      for (const r of results) {
        const s = await sb.storage.from(BUCKET).createSignedUrl(r.path!, 60 * 60 * 24);
        if (s.data?.signedUrl) images.push({ url: s.data.signedUrl, alt: `${l.data.web.title}${r.kind === 'modelo' ? ' puesto' : ''}`, kind: r.kind });
      }
      return { shopId: p.shop_id, listing: { ...l.data, shopifyProductId: l.shopify_product_id }, garment: attrs.garment, images };
    },
    async markPublished(photoId, r) {
      const { data: l } = await sb.from('listings').select('data').eq('photo_id', photoId).single();
      must(await sb.from('listings').update({
        status: 'publicada', data: { ...(l!.data as Listing), status: 'publicada' },
        shopify_product_id: r.productId, shopify_admin_url: r.adminUrl, shopify_url: r.onlineUrl, publish_error: null, updated_at: new Date().toISOString(),
      }).eq('photo_id', photoId));
      must(await sb.from('photos').update({ status: 'publicada' }).eq('id', photoId));
    },
    async markFailed(photoId, error) {
      must(await sb.from('listings').update({ publish_error: error.slice(0, 500) }).eq('photo_id', photoId));
    },
  };

  return {
    shopify,

    async claimNext(agentId) {
      const rows = must(await sb.rpc('claim_task', { p_agent: agentId })) as Record<string, unknown>[] | null;
      const r = rows?.[0];
      if (!r) return null;
      return { id: r.id as string, shopId: r.shop_id as string, agentId, kind: r.kind as string, title: r.title as string, payload: (r.payload as Record<string, unknown>) ?? {}, attempts: (r.attempts as number) - 1 };
    },

    async finish(task, o) {
      const payload = { ...task.payload, ...(o.payload ?? {}) };
      must(await sb.from('tasks').update({
        status: o.status,
        approval_label: o.status === 'espera_aprobacion' ? o.approvalLabel : null,
        last_error: o.status === 'revision' ? o.reason : null,
        payload,
        updated_at: new Date().toISOString(),
      }).eq('id', task.id));
    },

    async retryLater(task, error) {
      must(await sb.from('tasks').update({ status: 'pendiente', last_error: error, updated_at: new Date().toISOString() }).eq('id', task.id));
    },

    async createTask(t: Omit<QueuedTask, 'id' | 'attempts'>) {
      must(await sb.from('tasks').insert({ shop_id: t.shopId, agent_id: t.agentId, kind: t.kind, title: t.title, payload: t.payload }));
    },

    async shopProfile(shopId) {
      const [shop, survey] = await Promise.all([
        sb.from('shops').select('name').eq('id', shopId).single(),
        sb.from('survey_responses').select('answers').eq('shop_id', shopId).maybeSingle(),
      ]);
      const a = (survey.data?.answers ?? {}) as Record<string, string>;
      return { name: a.nombre || shop.data?.name || '', modelo: a.modelo, autonomia: a.autonomia, tono: a.tono, evitar: a.evitar, canales: a.canales, web: a.web };
    },

    async getPhoto(photoId) {
      const { data: p } = await sb.from('photos').select('id,shop_id,storage_path,file_name,note').eq('id', photoId).maybeSingle();
      if (!p) return null;
      const file = must(await sb.storage.from(BUCKET).download(p.storage_path)) as Blob;
      return { id: p.id, shopId: p.shop_id, fileName: p.file_name, note: p.note, image: { data: Buffer.from(await file.arrayBuffer()), mediaType: file.type } };
    },

    async savePhotoResult(photoId, r) {
      const { data: p } = await sb.from('photos').select('shop_id').eq('id', photoId).single();
      const stamp = Date.now();
      const results = [];
      for (const [i, res] of r.results.entries()) {
        const path = `${p!.shop_id}/teo/${photoId}-${stamp}-${i}-${res.kind}.${res.image.mediaType === 'image/png' ? 'png' : 'jpg'}`;
        must(await sb.storage.from(BUCKET).upload(path, res.image.data, { contentType: res.image.mediaType, upsert: true }));
        results.push({ kind: res.kind, label: res.label, path });
      }
      must(await sb.from('photos').update({ model_path: results[0]?.path ?? null, status: r.status, attributes: { ...r.attributes, results } }).eq('id', photoId));
    },

    async markPhoto(photoId, status, attributes) {
      must(await sb.from('photos').update({ status, attributes }).eq('id', photoId));
    },

    async saveListing(photoId, listing) {
      const { data: p } = await sb.from('photos').select('shop_id').eq('id', photoId).single();
      must(await sb.from('listings').upsert({ photo_id: photoId, shop_id: p!.shop_id, status: listing.status, data: listing, updated_at: new Date().toISOString() }));
    },

    async setAgent(shopId, agentId, s) {
      must(await sb.from('agent_states').upsert({ shop_id: shopId, agent_id: agentId, ...s, updated_at: new Date().toISOString() }));
    },

    async log(shopId, agentId, message) {
      must(await sb.from('activity').insert({ shop_id: shopId, agent_id: agentId, message }));
    },
  };
}
