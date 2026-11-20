import sharp from 'sharp';
import type { OfficeStore, QueuedTask, ShopProfile, StoredImage, TaskOutcome } from '../store';
import { hasFashn, runFashn } from './fashn';
import { checkResult, inspectGarment, type Garment } from './vision';

/**
 * Teo, el fotógrafo. Recibe una foto mala de una prenda y entrega una foto de catálogo:
 *   1. Revisa la foto con Claude: qué prenda es, color, detalles y si sirve.
 *      Si no sirve, Lola le pide otra a la tienda (lo único que la tienda tendría que hacer).
 *   2. La pone en una modelo con FASHN (o solo producto con fondo limpio, según la encuesta).
 *   3. Compara el resultado con la original. Si no es fiel, lo repite una vez con indicaciones.
 *      Si sigue sin ser fiel, lo revisa nuestro equipo: a la tienda no le llega nada malo.
 *   4. Según la autonomía elegida, la aprueba solo o deja al cliente un «Sí, adelante».
 *   5. Pasa la ficha a Nuria con todo lo que ha visto de la prenda.
 */
export async function runTeo(task: QueuedTask, store: OfficeStore): Promise<TaskOutcome> {
  const photoId = String(task.payload.photo_id ?? '');
  const photo = await store.getPhoto(photoId);
  if (!photo) return { status: 'revision', reason: `No encuentro la foto ${photoId}` };
  const profile = await store.shopProfile(task.shopId);

  await store.setAgent(task.shopId, 'teo', { status: 'busy', task: `Revisando la foto ${photo.fileName}`, short: 'Revisando una foto' });
  const g = await inspectGarment(photo.image, { fileName: photo.fileName, note: photo.note });

  if (!g.usable) {
    await store.markPhoto(photo.id, 'repetir', { garment: g });
    await store.createTask({ shopId: task.shopId, agentId: 'lola', kind: 'pedir_foto', title: `Pedir otra foto de ${photo.fileName}`, payload: { photo_id: photo.id, message: g.ask_shop } });
    await store.log(task.shopId, 'lola', `Le pido a la tienda otra foto: ${g.ask_shop}`);
    await idle(store, task.shopId);
    return { status: 'hecha', payload: { garment: g, result: 'pedida_otra_foto' } };
  }

  const packshot = profile.modelo === 'Sin modelo, solo producto' || g.placement === 'no_se_viste';
  await store.setAgent(task.shopId, 'teo', { status: 'busy', task: packshot ? `Limpiando el fondo de: ${g.title}` : `Poniendo en modelo: ${g.title}`, short: packshot ? 'Limpiando fondo' : 'Foto en modelo' });

  const firstSeed = task.payload.redo ? Math.floor(Math.random() * 1e6) : 42;
  let result = await generate(photo.image, g, profile, packshot, '', firstSeed);
  let qa = await checkResult(photo.image, result.image, g);
  let tries = 1;
  if (!qa.pass && !packshot) {
    await store.log(task.shopId, 'teo', `Repito la foto de ${g.title.toLowerCase()}: ${qa.problems.join('; ')}.`);
    result = await generate(photo.image, g, profile, packshot, qa.retry_prompt, firstSeed + 7);
    qa = await checkResult(photo.image, result.image, g);
    tries = 2;
  }
  const meta = { garment: g, qa, tries, mode: packshot ? 'producto' : 'modelo', provider: result.provider };
  if (!qa.pass) {
    await idle(store, task.shopId);
    return { status: 'revision', reason: `La foto en modelo no es fiel tras ${tries} intentos: ${qa.problems.join('; ')}`, payload: meta };
  }

  const auto = canPublishPhotos(profile);
  await store.savePhotoResult(photo.id, { image: result.image, attributes: meta, status: auto ? 'aprobada' : 'lista' });
  await store.log(task.shopId, 'teo', `${packshot ? 'Foto de producto' : 'Foto en modelo'} lista: ${g.title.toLowerCase()}.${result.provider === 'simulado' ? ' (simulación)' : ''}`);
  if (g.defects.length) await store.log(task.shopId, 'teo', `Ojo, en la foto de ${g.title.toLowerCase()} se ve: ${g.defects.join(', ')}. Revísalo antes de venderla.`);

  await store.createTask({ shopId: task.shopId, agentId: 'nuria', kind: 'ficha', title: `Ficha: ${g.title}`, payload: { photo_id: photo.id, garment: g } });
  await idle(store, task.shopId);
  return auto
    ? { status: 'hecha', payload: meta }
    : { status: 'espera_aprobacion', approvalLabel: `Aprobar la foto en modelo: ${g.title.toLowerCase()}`, payload: meta };
}

/** Las respuestas de la encuesta que dejan publicar fotos sin preguntar. */
export function canPublishPhotos(p: ShopProfile) {
  return !!p.autonomia && p.autonomia !== 'Nada, quiero aprobar todo';
}

const MODEL_PROMPT: Record<string, string> = {
  'Mujer 25 a 40': 'woman in her early thirties',
  'Mujer 40 a 60': 'elegant woman in her fifties',
  'Niños y niñas': 'child model, age appropriate',
  'Variadas en edad y talla': 'woman, natural body type',
};

async function generate(original: StoredImage, g: Garment, p: ShopProfile, packshot: boolean, extra: string, seed = 42): Promise<{ image: StoredImage; provider: 'fashn' | 'simulado' }> {
  const input = await sharp(original.data).rotate().resize(2048, 2048, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
  const dataUri = `data:image/jpeg;base64,${input.toString('base64')}`;
  if (!hasFashn()) return { image: await simulate(input), provider: 'simulado' };

  if (packshot) {
    const cut = await runFashn({ model_name: 'background-remove', inputs: { image: dataUri, return_base64: true } });
    return { image: await onStudioBackground(cut.data), provider: 'fashn' };
  }
  const who = MODEL_PROMPT[p.modelo ?? ''] ?? 'woman in her thirties';
  const shot = g.placement === 'entera' ? 'full-body' : g.placement === 'abajo' ? 'full-body, focus on the lower garment' : 'three-quarter';
  const prompt = `${shot} e-commerce catalogue photo of a ${who}, plain light grey studio background, soft even lighting, natural relaxed pose. Keep the garment exactly as in the product photo.${extra ? ' ' + extra : ''}`;
  const out = await runFashn({
    model_name: 'product-to-model',
    inputs: { product_image: dataUri, prompt, aspect_ratio: '3:4', resolution: '1k', generation_mode: 'balanced', seed: p.modelo === 'Variadas en edad y talla' ? Math.floor(Math.random() * 1e6) : seed, output_format: 'jpeg', return_base64: true },
  });
  return { image: out, provider: 'fashn' };
}

/** Coloca un recorte con transparencia sobre fondo de estudio 3:4. */
async function onStudioBackground(png: Buffer): Promise<StoredImage> {
  const W = 1200, H = 1600;
  const item = await sharp(png).trim().resize(Math.round(W * 0.8), Math.round(H * 0.8), { fit: 'inside' }).toBuffer();
  const data = await sharp({ create: { width: W, height: H, channels: 3, background: '#F2F1EE' } }).composite([{ input: item, gravity: 'center' }]).jpeg({ quality: 90 }).toBuffer();
  return { data, mediaType: 'image/jpeg' };
}

/** Sin FASHN: endereza, corrige luz y encuadra en 3:4 sobre fondo claro. Sirve para probar el flujo. */
async function simulate(input: Buffer): Promise<StoredImage> {
  const W = 1200, H = 1600;
  const item = await sharp(input).normalise().modulate({ brightness: 1.06, saturation: 1.05 }).resize(Math.round(W * 0.86), Math.round(H * 0.86), { fit: 'inside' }).toBuffer();
  const data = await sharp({ create: { width: W, height: H, channels: 3, background: '#F2F1EE' } }).composite([{ input: item, gravity: 'center' }]).jpeg({ quality: 88 }).toBuffer();
  return { data, mediaType: 'image/jpeg' };
}

async function idle(store: OfficeStore, shopId: string) {
  await store.setAgent(shopId, 'teo', { status: 'ok', task: 'Al día. Esperando fotos nuevas', short: 'Al día' });
}
