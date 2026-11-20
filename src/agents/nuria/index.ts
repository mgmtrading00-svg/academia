import { askJson, hasGemini } from '../gemini';
import type { OfficeStore, QueuedTask, ShopProfile, TaskOutcome } from '../store';
import type { Garment } from '../teo/vision';
import type { Listing } from '../../lib/types';

/**
 * Nuria, la catalogadora. Con lo que Teo ha visto de la prenda y lo que la tienda escribió
 * al mandar la foto, escribe la ficha para su web, Vinted y Amazon, con el tono de la tienda.
 *
 * Nunca inventa precio ni tallas: salen solo de la nota de la tienda. Si faltan, Lola
 * se los pide a la tienda y la ficha espera.
 */
export async function runNuria(task: QueuedTask, store: OfficeStore): Promise<TaskOutcome> {
  const photoId = String(task.payload.photo_id ?? '');
  const g = task.payload.garment as Garment | undefined;
  const photo = await store.getPhoto(photoId);
  if (!photo || !g) return { status: 'revision', reason: `Faltan datos para la ficha de ${photoId}` };
  const profile = await store.shopProfile(task.shopId);
  const note = [photo.note, typeof task.payload.extra_note === 'string' ? task.payload.extra_note : ''].filter(Boolean).join(' · ');

  await store.setAgent(task.shopId, 'nuria', { status: 'busy', task: `Escribiendo la ficha de: ${g.title.toLowerCase()}`, short: 'Escribiendo una ficha' });
  const draft = hasGemini() ? await writeWithGemini(g, note, profile) : writeFromTemplate(g, note, profile);

  // Precio y tallas: solo lo que la tienda escribió. Lo que diga el modelo se comprueba contra la nota.
  const facts = parseNote(note);
  const listing: Listing = { ...draft, priceEur: facts.priceEur, sizes: facts.sizes, missing: [], status: 'lista' };
  if (listing.priceEur == null) listing.missing.push('precio');
  if (!listing.sizes.length) listing.missing.push('tallas');

  if (listing.missing.length) {
    listing.status = 'falta_info';
    await store.saveListing(photoId, listing);
    const what = listing.missing.map((m) => (m === 'precio' ? 'el precio' : 'las tallas')).join(' y ');
    await store.createTask({ shopId: task.shopId, agentId: 'lola', kind: 'pedir_datos', title: `Pedir ${what}: ${g.title}`, payload: { photo_id: photoId, missing: listing.missing } });
    await store.log(task.shopId, 'lola', `Para la ficha de «${g.title}» ${listing.missing.length > 1 ? "me faltan" : "me falta"} ${what}. Te pregunto por WhatsApp.`);
    await idle(store, task.shopId);
    return { status: 'hecha', payload: { result: 'faltan_datos', missing: listing.missing } };
  }

  const auto = canPublishListings(profile);
  listing.status = auto ? 'aprobada' : 'lista';
  await store.saveListing(photoId, listing);
  await store.log(task.shopId, 'nuria', `Ficha lista: ${listing.web.title} · ${fmtPrice(listing.priceEur!)} · tallas ${listing.sizes.join(', ')}.`);
  await idle(store, task.shopId);
  return auto
    ? { status: 'hecha', payload: { listing } }
    : { status: 'espera_aprobacion', approvalLabel: `Aprobar la ficha: ${listing.web.title.toLowerCase()}`, payload: { listing } };
}

/** «Fichas y fotos, pero precios no» y las opciones más amplias dejan publicar fichas sin preguntar. */
export function canPublishListings(p: ShopProfile) {
  return !!p.autonomia && p.autonomia !== 'Nada, quiero aprobar todo';
}

const fmtPrice = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

// ---------- Datos que solo puede dar la tienda ----------

const SIZE = /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d{2}|\d{1,2}_(?:años|meses)|T\.?U\.?|única)$/i;

/** Saca precio y tallas de la nota de la tienda, p. ej. «Vestido midi · 39,90 € · S, M, L · 2 de cada». */
export function parseNote(note: string): { priceEur: number | null; sizes: string[] } {
  const price = note.match(/(\d{1,4}(?:[.,]\d{1,2})?)\s?(?:€|eur(?:os)?\b)/i) ?? note.match(/(?:€|eur)\s?(\d{1,4}(?:[.,]\d{1,2})?)/i);
  const priceEur = price ? Number(price[1].replace(',', '.')) : null;
  const sizes: string[] = [];
  // Quitar el precio y juntar «4 años» en una sola palabra antes de buscar tallas.
  const rest = (price ? note.replace(price[0], ' ') : note).replace(/(\d{1,2})\s+(años|meses)/gi, '$1_$2');
  const tallaPart = rest.match(/tallas?\s*:?\s*([^·|;\n]+)/i)?.[1];
  const segments = tallaPart ? [tallaPart] : rest.split(/[·|;\n]/);
  for (const seg of segments) {
    const tokens = seg.split(/[,/]|\s+y\s+|\s+/).map((t) => t.trim()).filter(Boolean);
    const found = tokens.filter((t) => SIZE.test(t));
    // Un segmento cuenta como tallas solo si casi todo son tallas (evita «2 de cada»).
    if (found.length && found.length >= tokens.length - 1) for (const t of found) {
      const v = /^\d/.test(t) ? t.replace('_', ' ') : /^única$/i.test(t) ? 'Única' : t.toUpperCase();
      if (!sizes.includes(v)) sizes.push(v);
    }
  }
  if (/talla única|t\.?u\.?\b/i.test(note) && !sizes.length) sizes.push('Única');
  return { priceEur: priceEur && priceEur > 0 ? priceEur : null, sizes };
}

// ---------- Redacción ----------

type Draft = Pick<Listing, 'web' | 'vinted' | 'amazon' | 'tags'>;

const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['web', 'vinted', 'amazon', 'tags'],
  properties: {
    web: { type: 'object', additionalProperties: false, required: ['title', 'description'], properties: { title: { type: 'string' }, description: { type: 'string' } } },
    vinted: { type: 'object', additionalProperties: false, required: ['title', 'description'], properties: { title: { type: 'string' }, description: { type: 'string' } } },
    amazon: { type: 'object', additionalProperties: false, required: ['title', 'bullets'], properties: { title: { type: 'string' }, bullets: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 } } },
    tags: { type: 'array', items: { type: 'string' }, maxItems: 10 },
  },
};

function system(p: ShopProfile) {
  return `Eres Nuria, la catalogadora de ${p.name || 'una tienda de ropa'} en España. Escribes fichas de producto que venden sin exagerar.

Tono de la tienda: ${p.tono || 'cercano y claro'}.${p.evitar ? `\nNunca uses estas palabras: ${p.evitar}.` : ''}

Reglas:
- Escribe en español de España, con frases cortas. Nada de emojis, mayúsculas gritonas ni «¡increíble!».
- Usa solo lo que sabes de la prenda. No inventes tejido, composición, medidas ni origen: si el tejido es una suposición, no lo afirmes.
- No escribas precios ni tallas: los añade el sistema a partir de lo que dijo la tienda.
- web.title: nombre de la prenda en 3 a 7 palabras. web.description: dos párrafos breves, el primero cómo es y el segundo cómo combinarla o cuándo ponérsela.
- vinted.title: máximo 60 caracteres, empieza por el tipo de prenda. vinted.description: 3 o 4 líneas directas, al estilo de Vinted, y acaba con «Envío rápido.».
- amazon.title: tipo de prenda, color y rasgo principal, máximo 120 caracteres, sin la palabra «mujer» repetida. amazon.bullets: de 3 a 5 puntos que empiezan por una palabra clave en mayúscula inicial.
- tags: palabras que la gente busca (tipo, color, estilo, ocasión), en minúsculas.`;
}

async function writeWithGemini(g: Garment, note: string, p: ShopProfile): Promise<Draft> {
  const facts = [
    `Prenda: ${g.title}`, `Tipo: ${g.category}`, `Color: ${g.color}`, `Estampado: ${g.pattern}`,
    `Tejido (suposición por la foto, no afirmar): ${g.fabric_guess}`,
    g.details.length ? `Detalles: ${g.details.join(', ')}` : '',
    note ? `Lo que escribió la tienda: ${note}` : '',
  ].filter(Boolean).join('\n');
  return askJson<Draft>({ system: system(p), images: [], text: facts, schema: DRAFT_SCHEMA });
}

/** Sin clave de Gemini (demostración): una ficha correcta a partir de plantilla. */
function writeFromTemplate(g: Garment, note: string, p: ShopProfile): Draft {
  // Si la tienda describió la prenda («Vestido midi de punto, verde botella · 39,90 €»), se usa esa descripción.
  const said = note.split(/[·|;\n]/)[0]?.replace(/\d+([.,]\d+)?\s?€/g, '').trim() ?? '';
  const name = said.split(/\s+/).length >= 3 ? said.split(',')[0].trim() : g.title;
  const color = said.toLowerCase().includes(g.color.toLowerCase()) || name.toLowerCase().includes(g.color.toLowerCase()) ? '' : g.color;
  const full = said.split(/\s+/).length >= 3 ? said : `${name}${color ? `, ${color}` : ''}`;
  const elegant = /elegante|clásica/i.test(p.tono ?? '');
  return {
    web: {
      title: name[0].toUpperCase() + name.slice(1),
      description: `${full[0].toUpperCase() + full.slice(1)}.${g.details.length ? ` Detalles: ${g.details.join(', ')}.` : ''}\n\n${elegant ? 'Una pieza para vestir bien sin pensarlo mucho, de día o de noche.' : 'Ponla con zapatillas para el día o con sandalias para salir.'}`,
    },
    vinted: { title: name.slice(0, 60), description: `${full[0].toUpperCase() + full.slice(1)}.\nNueva, de tienda.\nEnvío rápido.` },
    amazon: { title: full.slice(0, 120), bullets: [`Color: ${g.color}`, `Tipo: ${g.category}`, 'Cuidado: consulta la etiqueta de la prenda'] },
    tags: [g.category, g.color, g.pattern].filter((t) => t && t !== 'liso'),
  };
}

async function idle(store: OfficeStore, shopId: string) {
  await store.setAgent(shopId, 'nuria', { status: 'ok', task: 'Al día. Esperando prendas nuevas', short: 'Al día' });
}
