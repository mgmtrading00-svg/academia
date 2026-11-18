'use server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { DEMO_COOKIE, IS_DEMO, PHOTO_BUCKET } from '@/lib/config';
import { currentShopId } from '@/lib/data';
import { demo } from '@/lib/demo-store';
import { supabaseServer } from '@/lib/supabase/server';
import type { SurveyAnswers } from '@/lib/types';

export type FormState = { ok?: string; error?: string };

const MAX_FILES = 20;
const MAX_BYTES = 10 * 1024 * 1024;

async function requireShop() {
  const shopId = await currentShopId();
  if (!shopId) redirect('/acceso');
  return shopId;
}

// ---------- Acceso ----------
export async function demoLogin() {
  (await cookies()).set(DEMO_COOKIE, '1', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
  redirect('/panel');
}

export async function sendMagicLink(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Escribe un correo válido, por ejemplo hola@tutienda.es.' };
  if (IS_DEMO) return { error: 'Esta instalación está en modo demostración. Entra con la tienda de ejemplo.' };
  const h = await headers();
  const origin = h.get('origin') ?? `https://${h.get('host')}`;
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}/auth/callback`, shouldCreateUser: false } });
  if (error) return { error: 'No hemos podido enviar el enlace. Comprueba que el correo es el de tu tienda.' };
  return { ok: `Te hemos enviado un enlace a ${email}. Ábrelo desde este mismo dispositivo.` };
}

export async function logout() {
  if (IS_DEMO) (await cookies()).delete(DEMO_COOKIE);
  else await (await supabaseServer()).auth.signOut();
  redirect('/');
}

// ---------- Aprobaciones ----------
export async function decideTask(taskId: string, approve: boolean): Promise<FormState> {
  await requireShop();
  try {
    if (IS_DEMO) demo.decide(taskId, approve);
    else {
      const { error } = await (await supabaseServer()).rpc('decide_task', { p_task: taskId, p_approve: approve });
      if (error) throw new Error(error.message);
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se ha podido guardar.' };
  }
  revalidatePath('/panel');
  return { ok: approve ? 'Aprobado' : 'Hemos pedido los cambios' };
}

// ---------- Fotos ----------
export async function uploadPhotos(_prev: FormState, form: FormData): Promise<FormState> {
  const shopId = await requireShop();
  const files = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  const note = String(form.get('note') ?? '').slice(0, 300);
  if (!files.length) return { error: 'Elige al menos una foto.' };
  if (files.length > MAX_FILES) return { error: `Puedes subir hasta ${MAX_FILES} fotos a la vez.` };
  for (const f of files) {
    if (!f.type.startsWith('image/')) return { error: `${f.name} no es una imagen. Sube JPG o PNG.` };
    if (f.size > MAX_BYTES) return { error: `${f.name} pesa más de 10 MB. Prueba con una foto más ligera.` };
  }

  if (IS_DEMO) {
    const items = await Promise.all(files.map(async (f) => ({
      name: f.name,
      dataUrl: f.size < 2_000_000 ? `data:${f.type};base64,${Buffer.from(await f.arrayBuffer()).toString('base64')}` : null,
    })));
    demo.addPhotos(items, note);
  } else {
    const sb = await supabaseServer();
    for (const f of files) {
      const safe = f.name.normalize('NFKD').replace(/[^\w.-]+/g, '_').slice(-80);
      const path = `${shopId}/${crypto.randomUUID()}-${safe}`;
      const up = await sb.storage.from(PHOTO_BUCKET).upload(path, f, { contentType: f.type });
      if (up.error) return { error: `No se ha podido subir ${f.name}. Inténtalo de nuevo.` };
      const ins = await sb.from('photos').insert({ shop_id: shopId, storage_path: path, file_name: f.name, note });
      if (ins.error) return { error: `No se ha podido registrar ${f.name}.` };
    }
  }
  revalidatePath('/panel/fotos');
  revalidatePath('/panel');
  return { ok: files.length === 1 ? 'Foto recibida. Teo ya la tiene en su cola.' : `${files.length} fotos recibidas. Teo ya las tiene en su cola.` };
}

// ---------- Encuesta ----------
export async function saveSurvey(answers: SurveyAnswers, completed: boolean): Promise<FormState> {
  const shopId = await requireShop();
  const clean: SurveyAnswers = {};
  for (const [k, v] of Object.entries(answers)) if (/^[a-z_]{1,30}$/.test(k)) clean[k] = String(v).slice(0, 1000);
  if (IS_DEMO) demo.saveSurvey(clean, completed);
  else {
    const sb = await supabaseServer();
    const { data: prev } = await sb.from('survey_responses').select('answers').eq('shop_id', shopId).maybeSingle();
    const { error } = await sb.from('survey_responses').upsert({ shop_id: shopId, answers: { ...(prev?.answers ?? {}), ...clean }, completed, updated_at: new Date().toISOString() });
    if (error) return { error: 'No se ha podido guardar la encuesta.' };
  }
  revalidatePath('/panel');
  return { ok: completed ? 'Encuesta enviada' : 'Guardado' };
}
