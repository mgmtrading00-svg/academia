'use server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { DEMO_COOKIE, IS_DEMO, PHOTO_BUCKET } from '@/lib/config';
import { currentShopId } from '@/lib/data';
import { demo } from '@/lib/demo-store';
import { supabaseServer } from '@/lib/supabase/server';
import type { SurveyAnswers } from '@/lib/types';

export type FormState = { ok?: string; error?: string };

const MAX_FILES = 20;
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Los empleados trabajan justo después de responder a la tienda, en el propio servidor.
 * En la demostración, sobre la tienda de ejemplo; en la web real, con la clave de servicio.
 * (En producción también puede correr aparte con `npm run empleados`.)
 */
function runAgentsSoon() {
  after(async () => {
    const { drain } = await import('@/agents/runner');
    if (IS_DEMO) {
      const { demoStore } = await import('@/agents/stores/demo');
      await drain(demoStore);
    } else if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { supabaseStore } = await import('@/agents/stores/supabase');
      await drain(supabaseStore(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY));
    }
  });
}

async function requireShop() {
  const shopId = await currentShopId();
  if (!shopId) redirect('/acceso');
  return shopId;
}

// ---------- Acceso ----------
export async function demoLogin(): Promise<never> {
  (await cookies()).set(DEMO_COOKIE, '1', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
  redirect('/panel');
}

export type AccessState = FormState & { step?: 'sent' | 'code'; to?: string; demo?: boolean };

const DEMO_CODE = '000000';

function normalizePhone(raw: string): string | null {
  let p = raw.replace(/[\s().-]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (/^[67]\d{8}$/.test(p)) p = '+34' + p; // móvil español sin prefijo
  return /^\+\d{9,15}$/.test(p) ? p : null;
}

async function origin() {
  const h = await headers();
  return h.get('origin') ?? `https://${h.get('host')}`;
}

/** Paso 1 por correo: envía el enlace mágico. */
export async function sendMagicLink(_prev: AccessState, form: FormData): Promise<AccessState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Escribe un correo válido, por ejemplo hola@tutienda.es.' };
  if (IS_DEMO) return { step: 'sent', to: email, demo: true };
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${await origin()}/auth/callback`, shouldCreateUser: false } });
  if (error) return { error: 'No encontramos una tienda con ese correo. Usa el que nos diste en el alta.' };
  return { step: 'sent', to: email };
}

/** Paso 1 por WhatsApp: envía un código de 6 cifras. */
export async function sendWhatsappCode(_prev: AccessState, form: FormData): Promise<AccessState> {
  const phone = normalizePhone(String(form.get('phone') ?? ''));
  if (!phone) return { error: 'Escribe tu móvil, por ejemplo 600 123 456.' };
  if (IS_DEMO) return { step: 'code', to: phone, demo: true };
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithOtp({ phone, options: { channel: 'whatsapp', shouldCreateUser: false } });
  if (error) return { error: 'No encontramos una tienda con ese móvil. Usa el que nos diste en el alta.' };
  return { step: 'code', to: phone };
}

/** Paso 2 por WhatsApp: comprueba el código y entra. */
export async function verifyWhatsappCode(prev: AccessState, form: FormData): Promise<AccessState> {
  const phone = String(form.get('phone') ?? '');
  const token = String(form.get('code') ?? '').replace(/\D/g, '');
  if (token.length !== 6) return { ...prev, error: 'El código tiene 6 cifras.' };
  if (IS_DEMO) {
    if (token !== DEMO_CODE) return { ...prev, error: `Código incorrecto. En la demostración es ${DEMO_CODE}.` };
    return demoLogin();
  }
  const sb = await supabaseServer();
  const { error } = await sb.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) return { ...prev, error: 'Código incorrecto o caducado. Pide uno nuevo.' };
  redirect('/panel');
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
  if (!approve) runAgentsSoon();
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
    const items = await Promise.all(files.map(async (f) => {
      const data = Buffer.from(await f.arrayBuffer());
      return { name: f.name, data, mediaType: f.type, dataUrl: f.size < 2_000_000 ? `data:${f.type};base64,${data.toString('base64')}` : null };
    }));
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
  runAgentsSoon();
  revalidatePath('/panel/fotos');
  revalidatePath('/panel');
  return { ok: files.length === 1 ? 'Foto recibida. Teo ya la tiene en su cola.' : `${files.length} fotos recibidas. Teo ya las tiene en su cola.` };
}

/** «Rehacer con Teo»: vuelve a pasar una foto por Teo (por ejemplo, tras activar las fotos en modelo). */
export async function redoPhoto(photoId: string): Promise<FormState> {
  const shopId = await requireShop();
  if (IS_DEMO) demo.redoPhoto(photoId);
  else {
    // Primero se comprueba con la sesión de la tienda que la foto es suya; luego se encola con la clave de servicio.
    const { data: photo } = await (await supabaseServer()).from('photos').select('id,file_name').eq('id', photoId).eq('shop_id', shopId).maybeSingle();
    if (!photo || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { error: 'No encuentro esa foto.' };
    const { createClient } = await import('@supabase/supabase-js');
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const busy = await admin.from('tasks').select('id').eq('shop_id', shopId).eq('agent_id', 'teo').in('status', ['pendiente', 'en_curso']).contains('payload', { photo_id: photoId }).limit(1);
    if (busy.data?.length) return { ok: 'Teo ya está con ella.' };
    const ins = await admin.from('tasks').insert({ shop_id: shopId, agent_id: 'teo', kind: 'foto_modelo', title: `Rehacer: ${photo.file_name}`, payload: { photo_id: photoId, redo: true } });
    if (ins.error) return { error: 'No se ha podido pedir a Teo.' };
    await admin.from('photos').update({ status: 'en_cola' }).eq('id', photoId);
  }
  runAgentsSoon();
  revalidatePath('/panel/fotos');
  return { ok: 'Teo la está rehaciendo' };
}

// ---------- Solicitud de plaza en la beta (portada, sin sesión) ----------
export async function requestBeta(_prev: FormState, form: FormData): Promise<FormState> {
  const get = (k: string, max: number) => String(form.get(k) ?? '').trim().slice(0, max);
  const req = { nombre: get('nombre', 80), tienda: get('tienda', 80), ciudad: get('ciudad', 60), contacto: get('contacto', 120), canal: get('canal', 60), mensaje: get('mensaje', 600) };
  if (!req.nombre || !req.tienda || !req.ciudad || !req.contacto) return { error: 'Rellena tu nombre, la tienda, la ciudad y cómo contactarte.' };
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.contacto);
  const phone = /^\+?[\d\s]{9,15}$/.test(req.contacto);
  if (!email && !phone) return { error: 'Escribe un correo o un móvil válido.' };
  if (form.get('acepto') !== 'on') return { error: 'Necesitamos tu permiso para contactarte.' };
  if (IS_DEMO) demo.addBetaRequest(req);
  else {
    const { error } = await (await supabaseServer()).from('beta_requests').insert(req);
    if (error) return { error: 'No se ha podido enviar. Inténtalo de nuevo en un momento.' };
  }
  return { ok: `Gracias, ${req.nombre.split(' ')[0]}. Te escribiremos para contarte los siguientes pasos.` };
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
