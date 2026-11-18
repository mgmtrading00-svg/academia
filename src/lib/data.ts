import 'server-only';
import { cookies } from 'next/headers';
import { AGENTS, type AgentId, type AgentState } from './agents';
import { DEMO_COOKIE, IS_DEMO, PHOTO_BUCKET } from './config';
import { demo } from './demo-store';
import { supabaseServer } from './supabase/server';
import type { OfficeSnapshot, Photo, SurveyAnswers } from './types';

/** Devuelve el id de la tienda de la sesión actual, o null si no hay sesión. */
export async function currentShopId(): Promise<string | null> {
  if (IS_DEMO) {
    const c = (await cookies()).get(DEMO_COOKIE);
    return c?.value === '1' ? 'demo-shop' : null;
  }
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const { data } = await sb.from('shop_members').select('shop_id').eq('user_id', auth.user.id).limit(1).maybeSingle();
  return data?.shop_id ?? null;
}

export async function hasSession(): Promise<boolean> {
  if (IS_DEMO) return (await currentShopId()) !== null;
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  return !!data.user;
}

export async function getOffice(shopId: string): Promise<OfficeSnapshot> {
  if (IS_DEMO) return demo.snapshot();
  const sb = await supabaseServer();
  const [shop, agents, tasks, activity, kpis] = await Promise.all([
    sb.from('shops').select('id,name,owner_name,plan').eq('id', shopId).single(),
    sb.from('agent_states').select('agent_id,status,task,short').eq('shop_id', shopId),
    sb.from('tasks').select('id,agent_id,kind,title,status,approval_label,created_at').eq('shop_id', shopId).in('status', ['pendiente', 'en_curso', 'espera_aprobacion']).order('created_at'),
    sb.from('activity').select('id,agent_id,message,created_at').eq('shop_id', shopId).order('created_at', { ascending: false }).limit(60),
    sb.from('shop_kpis').select('published,marketplace_sales,low_stock,ads_roas').eq('shop_id', shopId).maybeSingle(),
  ]);
  if (shop.error) throw shop.error;
  const byId = new Map((agents.data ?? []).map((r) => [r.agent_id as AgentId, r]));
  const states: AgentState[] = AGENTS.map((a) => {
    const r = byId.get(a.id);
    return { id: a.id, status: r?.status ?? 'off', task: r?.task ?? 'Libre', short: r?.short ?? 'Libre' };
  });
  return {
    shop: { id: shop.data.id, name: shop.data.name, ownerName: shop.data.owner_name, plan: shop.data.plan },
    agents: states,
    tasks: (tasks.data ?? []).map((t) => ({ id: t.id, shopId, agentId: t.agent_id, kind: t.kind, title: t.title, status: t.status, approvalLabel: t.approval_label ?? undefined, createdAt: t.created_at })),
    activity: (activity.data ?? []).map((a) => ({ id: a.id, agentId: a.agent_id, at: a.created_at, message: a.message })),
    kpis: {
      published: kpis.data?.published ?? 0,
      marketplaceSales: kpis.data?.marketplace_sales ?? 0,
      lowStock: kpis.data?.low_stock ?? 0,
      adsRoas: kpis.data?.ads_roas ?? null,
    },
  };
}

export async function getPhotos(shopId: string): Promise<Photo[]> {
  if (IS_DEMO) return demo.photos();
  const sb = await supabaseServer();
  const { data } = await sb.from('photos').select('id,storage_path,file_name,note,status,created_at').eq('shop_id', shopId).order('created_at', { ascending: false }).limit(60);
  const rows = data ?? [];
  const signed = rows.length
    ? await sb.storage.from(PHOTO_BUCKET).createSignedUrls(rows.map((r) => r.storage_path), 3600)
    : { data: [] as { signedUrl: string | null }[] };
  return rows.map((r, i) => ({ id: r.id, shopId, fileName: r.file_name, url: signed.data?.[i]?.signedUrl ?? null, note: r.note, status: r.status, createdAt: r.created_at }));
}

export async function getSurvey(shopId: string): Promise<SurveyAnswers> {
  if (IS_DEMO) return demo.survey();
  const sb = await supabaseServer();
  const { data } = await sb.from('survey_responses').select('answers').eq('shop_id', shopId).maybeSingle();
  return (data?.answers as SurveyAnswers) ?? {};
}
