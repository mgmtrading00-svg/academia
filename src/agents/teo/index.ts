import sharp from 'sharp';
import type { OfficeStore, QueuedTask, ShopProfile, StoredImage, TaskOutcome } from '../store';
import { canGenerateImages, generateImage } from '../gemini';
import { checkResult, inspectGarment, type Garment } from './vision';

/**
 * Teo, el fotógrafo. Recibe una foto mala de una prenda y entrega una foto de catálogo:
 *   1. Revisa la foto con Gemini: qué prenda es, color, detalles y si sirve.
 *      Si no sirve, Lola le pide otra a la tienda (lo único que la tienda tendría que hacer).
 *   2. La pone en una modelo con Gemini (o solo producto con fondo limpio, según la encuesta).
 *      Si la generación de fotos no está activada (es de pago en Google), mejora la foto él
 *      mismo: la gira según el móvil, corrige la luz y la encuadra, sin coste.
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
  let qa = result.provider === 'local' ? { pass: true, problems: [], retry_prompt: '' } : await checkResult(photo.image, result.image, g);
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
  const kind = result.provider === 'local' ? 'Foto mejorada' : packshot ? 'Foto de producto' : 'Foto en modelo';
  await store.log(task.shopId, 'teo', `${kind} lista: ${g.title.toLowerCase()}.`);
  if (g.defects.length) await store.log(task.shopId, 'teo', `Ojo, en la foto de ${g.title.toLowerCase()} se ve: ${g.defects.join(', ')}. Revísalo antes de venderla.`);

  await store.createTask({ shopId: task.shopId, agentId: 'nuria', kind: 'ficha', title: `Ficha: ${g.title}`, payload: { photo_id: photo.id, garment: g } });
  await idle(store, task.shopId);
  return auto
    ? { status: 'hecha', payload: meta }
    : { status: 'espera_aprobacion', approvalLabel: `Aprobar la ${kind.toLowerCase()}: ${g.title.toLowerCase()}`, payload: meta };
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

async function generate(original: StoredImage, g: Garment, p: ShopProfile, packshot: boolean, extra: string, seed = 42): Promise<{ image: StoredImage; provider: 'gemini' | 'local' }> {
  const input = await sharp(original.data).rotate().resize(2048, 2048, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
  if (!canGenerateImages()) return { image: await enhanceLocally(input), provider: 'local' };

  const product = { mimeType: 'image/jpeg', base64: input.toString('base64') };
  const garment = `${g.title} (${g.color}${g.pattern && g.pattern !== 'liso' ? `, ${g.pattern}` : ''}${g.details.length ? `; ${g.details.join(', ')}` : ''})`;
  const keep = 'Keep the garment exactly as in the photo: same colour, length, cut, pattern, buttons and details. Do not add text, logos or watermarks.';
  const variation = seed === 42 ? '' : ` Variation ${seed}.`;
  const prompt = packshot
    ? `Professional e-commerce product photo of this item: ${garment}. Remove the background and any other objects, straighten it and place it centred on a plain light grey studio background with soft even lighting. ${keep}${extra ? ' ' + extra : ''}`
    : `Professional e-commerce catalogue photo: a ${MODEL_PROMPT[p.modelo ?? ''] ?? 'woman in her thirties'} wearing this exact garment: ${garment}. ${g.placement === 'entera' ? 'Full-body shot' : g.placement === 'abajo' ? 'Full-body shot, focus on the lower garment' : 'Three-quarter shot'}, plain light grey studio background, soft even lighting, natural relaxed pose, realistic hands and face. ${keep}${extra ? ' ' + extra : ''}${variation}`;
  return { image: await generateImage({ images: [product], prompt, aspectRatio: '3:4' }), provider: 'gemini' };
}

/** Sin generación de fotos: corrige la luz y encuadra en 3:4 sobre fondo claro. Gratis. */
async function enhanceLocally(input: Buffer): Promise<StoredImage> {
  const W = 1200, H = 1600;
  const item = await sharp(input).normalise().modulate({ brightness: 1.06, saturation: 1.05 }).resize(Math.round(W * 0.86), Math.round(H * 0.86), { fit: 'inside' }).toBuffer();
  const data = await sharp({ create: { width: W, height: H, channels: 3, background: '#F2F1EE' } }).composite([{ input: item, gravity: 'center' }]).jpeg({ quality: 88 }).toBuffer();
  return { data, mediaType: 'image/jpeg' };
}

async function idle(store: OfficeStore, shopId: string) {
  await store.setAgent(shopId, 'teo', { status: 'ok', task: 'Al día. Esperando fotos nuevas', short: 'Al día' });
}
