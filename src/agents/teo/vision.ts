import sharp from 'sharp';
import { askJson, hasGemini, type ImageInput } from '../gemini';
import type { StoredImage } from '../store';

/** Reduce y normaliza la foto (gira según EXIF, máx. 1568 px, JPEG) para enviarla a Gemini. */
export async function forVision(img: StoredImage): Promise<ImageInput> {
  const out = await sharp(img.data).rotate().resize(1568, 1568, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  return { mimeType: 'image/jpeg', base64: out.toString('base64') };
}

// ---------- 1. Revisión de entrada: ¿qué prenda es y sirve la foto? ----------

export interface Garment {
  usable: boolean;
  /** Si no sirve: qué pedir a la tienda, en una frase amable y concreta. */
  ask_shop: string;
  category: 'vestido' | 'camisa' | 'camiseta' | 'blusa' | 'jersey' | 'chaqueta' | 'abrigo' | 'pantalon' | 'falda' | 'mono' | 'calzado' | 'bolso' | 'complemento' | 'joya' | 'otro';
  /** Prenda de arriba, de abajo, de cuerpo entero, o algo que no se lleva puesto en el cuerpo. */
  placement: 'arriba' | 'abajo' | 'entera' | 'no_se_viste';
  /** Quién la lleva, por la talla y el corte: decide si la modelo es un bebé, una niña, una mujer… */
  wearer: 'bebe' | 'nina' | 'nino' | 'infantil' | 'mujer' | 'hombre';
  color: string;
  pattern: string;
  fabric_guess: string;
  details: string[];
  defects: string[];
  /** Título corto para la ficha, en español de España. */
  title: string;
  /** Dónde está el producto en la foto: [arriba, izquierda, abajo, derecha] de 0 a 1000. */
  box?: number[];
}

const GARMENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['usable', 'ask_shop', 'category', 'placement', 'wearer', 'color', 'pattern', 'fabric_guess', 'details', 'defects', 'title', 'box'],
  properties: {
    usable: { type: 'boolean' },
    ask_shop: { type: 'string' },
    category: { type: 'string', enum: ['vestido', 'camisa', 'camiseta', 'blusa', 'jersey', 'chaqueta', 'abrigo', 'pantalon', 'falda', 'mono', 'calzado', 'bolso', 'complemento', 'joya', 'otro'] },
    placement: { type: 'string', enum: ['arriba', 'abajo', 'entera', 'no_se_viste'] },
    wearer: { type: 'string', enum: ['bebe', 'nina', 'nino', 'infantil', 'mujer', 'hombre'] },
    color: { type: 'string' },
    pattern: { type: 'string' },
    fabric_guess: { type: 'string' },
    details: { type: 'array', items: { type: 'string' } },
    defects: { type: 'array', items: { type: 'string' } },
    title: { type: 'string' },
    box: { type: 'array', items: { type: 'integer' }, minItems: 4, maxItems: 4 },
  },
};

const INSPECT_SYSTEM = `Eres Teo, el fotógrafo de una tienda de ropa española. Las tiendas te mandan fotos hechas con el móvil, a menudo mal iluminadas, torcidas, con la prenda en una percha, en el mostrador o en el suelo. Eso es normal y NO es motivo para rechazarlas: tu trabajo es arreglarlas.

Mira la foto y describe la prenda principal para que otra persona pueda escribir la ficha de producto y comprobar después que la foto en modelo es fiel.

Marca usable=false solo si con esta foto es imposible sacar una buena foto en modelo: la prenda está cortada de forma que falta una parte importante, está tan borrosa u oscura que no se distingue el color o el estampado, hay varias prendas mezcladas y no se sabe cuál es, o no aparece ninguna prenda. Cuando sea false, escribe en ask_shop qué foto necesitas, en una frase corta, cercana y concreta, tuteando (por ejemplo: «¿Me mandas otra del vestido entero, desde un poco más lejos?»). Cuando sea true, deja ask_shop vacío.

En wearer indica quién la lleva por el tamaño y el corte: «bebe» para peleles, ranitas, jesusitos y ropa de 0 a 2 años; «nina» o «nino» para ropa infantil de 2 a 12 años; «infantil» si es de niño pero no se sabe si de niña o niño; «mujer» u «hombre» para adultos. Fíjate en el tamaño de la percha y de la prenda.

Si es una joya o bisutería (anillo, pendientes, collar, pulsera), pon category «joya», placement «no_se_viste», wearer «mujer» salvo que sea claramente infantil, y en details describe el metal, la forma y las piedras. Una joya en el suelo, en una mesa o en la mano es una foto válida.

En box da el recuadro ajustado del producto principal (solo la prenda o la joya, sin percha ni fondo) como [ymin, xmin, ymax, xmax] en una escala de 0 a 1000 sobre la foto. Si es pequeño, como un anillo en el suelo, el recuadro debe ser pequeño y preciso.

En defects anota manchas, roturas, hilos o arrugas fuertes que se vean en la prenda (no los defectos de la foto). Los colores, en palabras normales de tienda («verde botella», «crudo»). Todo en español de España.`;

export async function inspectGarment(img: StoredImage, ctx: { fileName: string; note: string }): Promise<Garment> {
  if (!hasGemini()) return demoGarment(ctx.fileName);
  return askJson<Garment>({
    system: INSPECT_SYSTEM,
    images: [await forVision(img)],
    text: `Nombre del archivo: ${ctx.fileName}${ctx.note ? `\nNota de la tienda: ${ctx.note}` : ''}`,
    schema: GARMENT_SCHEMA,
  });
}

// ---------- 2. Control de calidad: ¿la foto en modelo es fiel a la prenda? ----------

export interface QaResult {
  pass: boolean;
  /** Qué está mal, para reintentar con una indicación mejor. */
  problems: string[];
  /** Indicación corta en inglés para el siguiente intento. */
  retry_prompt: string;
}

const QA_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['pass', 'problems', 'retry_prompt'],
  properties: { pass: { type: 'boolean' }, problems: { type: 'array', items: { type: 'string' } }, retry_prompt: { type: 'string' } },
};

const QA_SYSTEM = `Eres el control de calidad de las fotos de una tienda de ropa. Recibes la foto original de la prenda (primera imagen) y la foto en modelo generada por ordenador (segunda imagen). Si es una joya, la foto generada la muestra puesta en una mano o en el cuerpo: comprueba que la forma, el metal y las piedras son idénticos.

La tienda va a vender esa prenda con la segunda foto, así que tiene que ser fiel: si el cliente recibe algo distinto, lo devuelve. Aprueba (pass=true) solo si se cumple todo:
- Es la misma prenda: mismo tipo, largo y corte.
- El color es el mismo (un pequeño cambio de luz vale, otro tono no).
- El estampado, los botones, cremalleras, bolsillos y demás detalles coinciden y no se han inventado ni perdido.
- La foto parece profesional: manos, cara y cuerpo sin deformaciones, sin texto ni marcas raras.

Si falla, lista los problemas en problems (en español) y escribe en retry_prompt una indicación breve en inglés para el generador que ayude a corregirlos (por ejemplo «keep the exact emerald green colour and the six front buttons»).`;

export async function checkResult(original: StoredImage, result: StoredImage, g: Garment): Promise<QaResult> {
  if (!hasGemini()) return { pass: true, problems: [], retry_prompt: '' };
  return askJson<QaResult>({
    system: QA_SYSTEM,
    images: [await forVision(original), await forVision(result)],
    text: `Prenda según la revisión de entrada: ${g.title}. Color: ${g.color}. Estampado: ${g.pattern}. Detalles: ${g.details.join(', ') || 'ninguno'}.`,
    schema: QA_SCHEMA,
  });
}

// ---------- 3. Control de la foto de producto de catálogo ----------

const PACKSHOT_QA_SYSTEM = `Eres el control de calidad de las fotos de producto de una tienda de moda infantil de nivel alto. Recibes la foto original de la prenda en la percha (primera imagen) y la foto de producto generada por ordenador (segunda imagen).

Aprueba (pass=true) solo si se cumple TODO:
- Es la misma prenda: mismo tipo, largo, corte, cuello, volantes, puños y botones (si la original es de espaldas, la generada puede ser de frente, pero sin inventar adornos).
- El color y el estampado son idénticos: mismo tono, misma escala y mismo dibujo. Un cambio de tono no vale.
- Parece de una tienda online de una marca grande: tela lisa y planchada SIN NINGUNA arruga visible (tampoco en el cubrepañal ni en las mangas), prenda simétrica, las dos mangas colocadas con el mismo ángulo, el cubrepañal (si lo hay) extendido y centrado debajo, prenda centrada con márgenes parecidos a los lados, fondo blanco limpio de borde a borde sin franjas ni marcos, sin percha, sin etiquetas, sin pared y sin texto.
Si es una joya: misma forma, mismo metal y mismas piedras, la joya nítida, centrada y entera sobre blanco limpio con un reflejo o sombra suave; ahí no apliques lo de arrugas, mangas ni cubrepañal.
Sé exigente: si dudas de si una arruga o una asimetría se nota, recházala.

Si falla, lista los problemas en problems (en español) y escribe en retry_prompt una indicación breve en inglés para corregirlos (por ejemplo «remove the creases on the left sleeve and keep the exact dusty pink collar»).`;

export async function checkPackshot(original: StoredImage, result: StoredImage, g: Garment): Promise<QaResult> {
  if (!hasGemini()) return { pass: true, problems: [], retry_prompt: '' };
  return askJson<QaResult>({
    system: PACKSHOT_QA_SYSTEM,
    images: [await forVision(original), await forVision(result)],
    text: `Prenda según la revisión de entrada: ${g.title}. Color: ${g.color}. Estampado: ${g.pattern}. Detalles: ${g.details.join(', ') || 'ninguno'}.`,
    schema: QA_SCHEMA,
  });
}

// ---------- Modo demostración (sin clave de Gemini) ----------

function demoGarment(fileName: string): Garment {
  const n = fileName.toLowerCase();
  const pick = <T,>(pairs: [RegExp, T][], d: T) => pairs.find(([r]) => r.test(n))?.[1] ?? d;
  const category = pick<Garment['category']>([[/vestido|dress/, 'vestido'], [/camis[ae]|shirt/, 'camisa'], [/falda|skirt/, 'falda'], [/pantal|jean/, 'pantalon'], [/abrigo|coat/, 'abrigo'], [/chaqueta|blazer/, 'chaqueta'], [/jersey|punto/, 'jersey']], 'blusa');
  const placement: Garment['placement'] = category === 'vestido' || category === 'abrigo' ? 'entera' : category === 'falda' || category === 'pantalon' ? 'abajo' : 'arriba';
  const color = pick([[/verde/, 'verde'], [/azul|navy/, 'azul marino'], [/negr/, 'negro'], [/blanc|crudo/, 'crudo'], [/rojo|granate/, 'granate'], [/rosa/, 'rosa empolvado']], 'beige');
  const name = category === 'pantalon' ? 'Pantalón' : category[0].toUpperCase() + category.slice(1);
  const wearer: Garment['wearer'] = /pelele|ranita|jesusito|beb[eé]/.test(n) ? 'bebe' : /ni[ñn]a/.test(n) ? 'nina' : 'mujer';
  return { usable: true, ask_shop: '', category, placement, wearer, color, pattern: 'liso', fabric_guess: 'por confirmar', details: [], defects: [], title: `${name} ${color}` };
}
