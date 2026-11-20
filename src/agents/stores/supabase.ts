import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { OfficeStore, QueuedTask } from '../store';

const BUCKET = 'fotos';

/** Acceso a la base de datos real con la clave de servicio. Solo para el proceso de los empleados, nunca en el navegador. */
export function supabaseStore(url: string, serviceKey: string): OfficeStore {
  const sb: SupabaseClient = createClient(url, serviceKey, { auth: { persistSession: false } });
  const must = <T,>(r: { data: T; error: { message: string } | null }) => {
    if (r.error) throw new Error(r.error.message);
    return r.data;
  };

  return {
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
      return { name: shop.data?.name ?? '', modelo: a.modelo, autonomia: a.autonomia, tono: a.tono };
    },

    async getPhoto(photoId) {
      const { data: p } = await sb.from('photos').select('id,shop_id,storage_path,file_name,note').eq('id', photoId).maybeSingle();
      if (!p) return null;
      const file = must(await sb.storage.from(BUCKET).download(p.storage_path)) as Blob;
      return { id: p.id, shopId: p.shop_id, fileName: p.file_name, note: p.note, image: { data: Buffer.from(await file.arrayBuffer()), mediaType: file.type } };
    },

    async savePhotoResult(photoId, r) {
      const { data: p } = await sb.from('photos').select('shop_id').eq('id', photoId).single();
      const path = `${p!.shop_id}/modelo/${photoId}-${Date.now()}.jpg`;
      must(await sb.storage.from(BUCKET).upload(path, r.image.data, { contentType: r.image.mediaType, upsert: true }));
      must(await sb.from('photos').update({ model_path: path, status: r.status, attributes: r.attributes }).eq('id', photoId));
    },

    async markPhoto(photoId, status, attributes) {
      must(await sb.from('photos').update({ status, attributes }).eq('id', photoId));
    },

    async setAgent(shopId, agentId, s) {
      must(await sb.from('agent_states').upsert({ shop_id: shopId, agent_id: agentId, ...s, updated_at: new Date().toISOString() }));
    },

    async log(shopId, agentId, message) {
      must(await sb.from('activity').insert({ shop_id: shopId, agent_id: agentId, message }));
    },
  };
}
