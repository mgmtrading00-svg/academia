import sharp from 'sharp';
import type { OfficeStore, QueuedTask, ShopProfile, StoredImage, TaskOutcome, TeoResult } from '../store';
import { canGenerateImages, generateImage } from '../gemini';
import { checkPackshot, checkResult, inspectGarment, type Garment } from './vision';
import { ESTILO_PRODUCTO } from './estilo-producto';
import { centerOnWhite, packshotLocal } from './recorte';
import { escenasPara, modeloPara, type Escena } from './escenas';
import { postNovedad, postOferta, preciosOferta } from '../posts';
import { parseNote } from '../nuria';

/** Fotos en modelo por prenda (cada una cuesta unos céntimos en Gemini). */
const FOTOS_MODELO = Math.max(0, Math.min(4, Number(process.env.GEMINI_FOTOS_POR_PRENDA ?? 2) || 0));

/**
 * Teo, el fotógrafo. Recibe una foto de una prenda en la percha y entrega:
 *   1. Foto de producto: la prenda sola sobre blanco, sin pared ni percha, centrada. Gratis,
 *      se hace aquí mismo sin IA de pago y sin tocar el color.
 *   2. Fotos en modelo (si la generación de fotos de Gemini está activada): un bebé, una niña
 *      o una mujer, según la prenda, con ella puesta en escenas cuidadas (patio andaluz, calle
 *      encalada, otoño…). Cada una pasa un control: si el estampado, el color o el cuello no son
 *      idénticos, la repite una vez; si sigue sin serlo, la descarta. A la tienda no le llega nada malo.
 *   3. Según la autonomía elegida, las aprueba solo o deja al cliente un «Sí, adelante».
 *   4. Pasa la ficha a Nuria con todo lo que ha visto de la prenda.
 * Si la foto no sirve, Lola le pide otra a la tienda.
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

  // 1. Foto de producto limpia (gratis).
  await store.setAgent(task.shopId, 'teo', { status: 'busy', task: `Quitando la percha y el fondo: ${g.title.toLowerCase()}`, short: 'Foto de producto' });
  let producto = await cleanProduct(photo.image);
  const recorte = producto.result.image;

  // 2. Con la generación de Gemini activada, a la vez: la de producto «de catálogo» (planchada, con forma
  //    y sombra suave) y las fotos en modelo. Un fallo en una no tumba las demás: queda anotado en la actividad.
  const results: TeoResult[] = [];
  const problems: string[] = [];
  const wantsModel = canGenerateImages() && FOTOS_MODELO > 0 && profile.modelo !== 'Sin modelo, solo producto' && g.placement !== 'no_se_viste';
  if (canGenerateImages()) {
    await store.setAgent(task.shopId, 'teo', { status: 'busy', task: `Haciendo las fotos de catálogo: ${g.title.toLowerCase()}`, short: 'Fotos de catálogo' });
    const seed = task.payload.redo ? `${photoId}-${Date.now()}` : photoId;
    const escenas = wantsModel ? escenasPara(g, seed, FOTOS_MODELO) : [];
    const [pro, ...modelos] = await Promise.allSettled([
      catalogPackshot(photo.image, recorte, g),
      ...escenas.map((e) => modelPhoto(photo.image, recorte, g, profile, e)),
    ]);
    const why = (r: PromiseRejectedResult) => (r.reason instanceof Error ? r.reason.message : String(r.reason)).slice(0, 200);
    if (pro.status === 'fulfilled' && pro.value) producto = { result: { kind: 'producto', label: 'Foto de producto', image: pro.value } };
    else {
      const msg = pro.status === 'rejected' ? why(pro) : 'no salía idéntica a la prenda';
      problems.push(`foto de producto: ${msg}`);
      await store.log(task.shopId, 'teo', `La foto de producto de catálogo de ${g.title.toLowerCase()} no ha salido bien (${msg}). Te dejo el recorte.`);
    }
    for (const [i, r] of modelos.entries()) {
      const escena = escenas[i];
      if (r.status === 'rejected') {
        problems.push(`${escena.label}: ${why(r)}`);
        await store.log(task.shopId, 'teo', `No he podido hacer la foto en modelo de ${g.title.toLowerCase()} en ${escena.label}: ${why(r)}`);
      } else if (r.value.image) {
        results.push({ kind: 'modelo', label: `En modelo · ${escena.label}`, image: r.value.image });
      } else {
        problems.push(...r.value.problems);
        await store.log(task.shopId, 'teo', `Descarto la foto en modelo de ${g.title.toLowerCase()} en ${escena.label}: ${r.value.problems.join('; ')}.`);
      }
    }
  }
  // La de producto va primera: es la de la ficha y la que se ve en la tienda online.
  results.unshift(producto.result);

  // 3. Post para Instagram, si la tienda dijo el precio (y el de antes, si es una oferta).
  try {
    const post = await makePost(photo.note, g, profile, results);
    if (post) results.push(post);
  } catch (e) {
    console.error('[teo] post:', e);
  }

  const meta = {
    garment: g, provider: results.some((r) => r.kind === 'modelo') ? 'gemini' : 'local', mode: wantsModel ? 'modelo' : 'producto',
    qa: { pass: true, problems }, tries: 1,
  };
  const auto = canPublishPhotos(profile);
  await store.savePhotoResult(photo.id, { results, attributes: meta, status: auto ? 'aprobada' : 'lista' });

  const modelos = results.filter((r) => r.kind === 'modelo').length;
  const what = [producto.result.kind === 'producto' ? 'foto de producto' : 'foto mejorada', modelos ? `${modelos} en modelo` : ''].filter(Boolean).join(' y ');
  await store.log(task.shopId, 'teo', `Lista la ${what}: ${g.title.toLowerCase()}.`);
  if (g.defects.length) await store.log(task.shopId, 'teo', `Ojo, en la foto de ${g.title.toLowerCase()} se ve: ${g.defects.join(', ')}. Revísalo antes de venderla.`);

  await store.createTask({ shopId: task.shopId, agentId: 'nuria', kind: 'ficha', title: `Ficha: ${g.title}`, payload: { photo_id: photo.id, garment: g } });
  await idle(store, task.shopId);
  return auto
    ? { status: 'hecha', payload: meta }
    : { status: 'espera_aprobacion', approvalLabel: `Aprobar las fotos: ${g.title.toLowerCase()}`, payload: meta };
}

async function makePost(note: string, g: Garment, p: ShopProfile, results: TeoResult[]): Promise<TeoResult | null> {
  const marca = { web: (p.web || p.name || '').replace(/^https?:\/\//, '').replace(/\/$/, '') };
  if (!marca.web) return null;
  const hero = results.find((r) => r.kind === 'modelo')?.image ?? results[0].image;
  const producto = results.find((r) => r.kind === 'producto')?.image;
  const oferta = preciosOferta(note);
  if (oferta) {
    const pct = Math.round((1 - oferta.ahora / oferta.antes) * 100);
    const etiqueta = /black/i.test(note) ? `-${pct} % Black Friday` : /rebaja/i.test(note) ? `Rebajas -${pct} %` : `-${pct} %`;
    return { kind: 'post', label: 'Historia de oferta', image: await postOferta({ marca, etiqueta, nombre: g.title, foto: hero, producto, ...oferta }) };
  }
  const { priceEur } = parseNote(note);
  if (priceEur == null) return null;
  return { kind: 'post', label: 'Post de novedad', image: await postNovedad({ marca, titulo: g.title, antetitulo: 'Novedad · ya en la web', foto: hero, prendas: producto ? [{ nombre: g.category[0].toUpperCase() + g.category.slice(1), precio: priceEur, foto: producto }] : [] }) };
}

/** Las respuestas de la encuesta que dejan publicar fotos sin preguntar. */
export function canPublishPhotos(p: ShopProfile) {
  return !!p.autonomia && p.autonomia !== 'Nada, quiero aprobar todo';
}

/** Foto de producto de catálogo con Gemini, a partir del recorte. Si no es fiel tras dos intentos, se queda el recorte. */
async function catalogPackshot(original: StoredImage, recorte: StoredImage, g: Garment): Promise<StoredImage | null> {
  const prep = async (img: StoredImage) => ({
    mimeType: 'image/jpeg',
    base64: (await sharp(img.data).rotate().resize(1536, 1536, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer()).toString('base64'),
  });
  // Orden: 1) ejemplo de estilo de catálogo, 2) la prenda en la percha, 3) la prenda recortada.
  const refs = [ESTILO_PRODUCTO, await prep(original), await prep(recorte)];
  const prompt = (extra: string) => [
    `Create a professional e-commerce "ghost mannequin" packshot of the garment shown in images 2 and 3 (${g.title}).`,
    'Image 1 is ONLY a style reference from the same shop: copy its presentation exactly (front view, garment perfectly steamed and smooth with absolutely no creases or wrinkles anywhere, as in a big fashion brand online shop, fabric gently filled as if worn by an invisible body, perfectly symmetrical, sleeves angled down and slightly outward at the same angle on both sides, cuffs and collar neatly arranged, very soft even studio light, plain white background, no visible shadow or only a faint one, garment centred and filling about 75% of the height). Never copy the garment, fabric, print or colours of image 1.',
    'Images 2 and 3 are the real garment, photographed on a hanger with a phone. Reproduce that garment, not a new one.',
    KEEP,
    'If the set includes bloomers or a diaper cover, show it laid flat, smooth and fully spread just below the garment, centred and symmetrical, never crumpled.',
    'Plain pure white background edge to edge: no frame, no border, no dark strip, no hanger, no tags, no labels, no wall, no props, no text.',
    extra,
  ].filter(Boolean).join(' ');
  const model = process.env.GEMINI_PRODUCT_IMAGE_MODEL || undefined;
  // Hasta 3 intentos; cada uno se centra en código y pasa el control (arrugas, simetría, centrado, bordes, fidelidad).
  let extra = '';
  for (let i = 0; i < 3; i++) {
    const raw = await generateImage({ images: refs, prompt: prompt(extra), aspectRatio: '4:5', model });
    const image = await centerOnWhite(raw.data);
    const qa = await checkPackshot(original, image, g);
    if (qa.pass) return image;
    extra = qa.retry_prompt;
  }
  return null;
}

/** Recorta la prenda sobre blanco. Si la foto no es de una prenda sobre pared clara, solo la encuadra. */
async function cleanProduct(original: StoredImage): Promise<{ result: TeoResult }> {
  try {
    const r = await packshotLocal(original.data);
    // Si «la prenda» ocupa casi nada o casi todo, el recorte no es fiable.
    if (r.coverage > 0.06 && r.coverage < 0.8) return { result: { kind: 'producto', label: 'Foto de producto', image: { data: r.data, mediaType: r.mediaType } } };
  } catch { /* se usa el encuadre simple */ }
  return { result: { kind: 'mejorada', label: 'Foto encuadrada', image: await enhanceLocally(original.data) } };
}

const KEEP = 'The garment must be an exact copy of the one in the reference photos: identical fabric print or plaid (same colours, same scale and spacing of stripes or checks), identical collar shape, ruffles, buttons, cuffs, length and cut. Do not recolour, simplify or redesign it. Shops often photograph the back of the garment: if the reference shows back buttons or a back opening, show the front view with the same fabric, collar and cuffs and without those back buttons. No text, logos or watermarks.';

async function modelPhoto(original: StoredImage, producto: StoredImage, g: Garment, p: ShopProfile, escena: Escena, ) {
  const refs = await Promise.all([producto, original].map(async (img) => ({
    mimeType: 'image/jpeg',
    base64: (await sharp(img.data).rotate().resize(1536, 1536, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer()).toString('base64'),
  })));
  const garment = `${g.title} (${g.color}${g.pattern && g.pattern !== 'liso' ? `, ${g.pattern}` : ''}${g.details.length ? `; ${g.details.join(', ')}` : ''})`;
  const isKid = !['mujer', 'hombre'].includes(g.wearer);
  const styling = isKid ? 'Style it like a premium Spanish children\'s fashion brand: knee-high socks in a matching tone and classic leather shoes, natural and tender, never posed like an adult.' : 'Natural relaxed pose.';
  const prompt = (extra: string) =>
    `Photorealistic children's and family fashion catalogue photograph. ${modeloPara(g, p.modelo)} wearing this exact garment: ${garment}. The first image shows the garment alone, the second shows it on a hanger. Scene: ${escena.prompt}. ${styling} Shot on an 85mm lens, natural light, shallow depth of field, the garment sharp and fully visible, realistic face and hands. ${KEEP}${extra ? ' ' + extra : ''}`;

  let image = await generateImage({ images: refs, prompt: prompt(''), aspectRatio: '4:5' });
  let qa = await checkResult(original, image, g);
  const firstProblems = qa.problems;
  if (qa.pass) return { image, problems: [], firstProblems, retried: false };
  image = await generateImage({ images: refs, prompt: prompt(qa.retry_prompt), aspectRatio: '4:5' });
  qa = await checkResult(original, image, g);
  return { image: qa.pass ? image : null, problems: qa.problems, firstProblems, retried: true };
}

/** Sin recorte posible: encuadra en 4:5 sobre fondo claro sin tocar el color. */
async function enhanceLocally(input: Buffer): Promise<StoredImage> {
  const W = 1200, H = 1500;
  const item = await sharp(input).rotate().toColourspace('srgb').resize(Math.round(W * 0.92), Math.round(H * 0.92), { fit: 'inside' }).toBuffer();
  const data = await sharp({ create: { width: W, height: H, channels: 3, background: '#F7F6F3' } })
    .composite([{ input: item, gravity: 'center' }]).toColourspace('srgb').jpeg({ quality: 90 }).toBuffer();
  return { data, mediaType: 'image/jpeg' };
}

async function idle(store: OfficeStore, shopId: string) {
  await store.setAgent(shopId, 'teo', { status: 'ok', task: 'Al día. Esperando fotos nuevas', short: 'Al día' });
}
