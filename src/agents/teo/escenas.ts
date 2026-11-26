import type { Garment } from './vision';

/**
 * Escenas para las fotos en modelo, con la estética de las tiendas de moda infantil española:
 * luz natural, patios andaluces, calles encaladas, otoño. Se van alternando para que el
 * catálogo no parezca repetido.
 */
export interface Escena { id: string; label: string; prompt: string }

const INFANTIL: Escena[] = [
  { id: 'patio', label: 'patio andaluz', prompt: 'an Andalusian courtyard garden with orange trees, hand-painted azulejo tiles and a wooden door, soft morning sun; the child sits on a cream linen blanket on the grass with a few autumn leaves' },
  { id: 'calle', label: 'calle encalada', prompt: 'a narrow whitewashed Andalusian street with cobblestones, red geraniums in terracotta pots and an old green wooden door; the child stands next to the door, holding it lightly' },
  { id: 'otono', label: 'parque en otoño', prompt: 'a park path covered in golden and orange autumn leaves, tall trees with warm late-afternoon backlight, gentle bokeh; the child walks along the path smiling' },
  { id: 'chimenea', label: 'salón con chimenea', prompt: 'a cosy rustic living room with a lit stone fireplace, a cream wool rug and a wicker basket of pine cones, warm window light; the child sits on the rug' },
];

const ADULTO: Escena[] = [
  { id: 'calle', label: 'calle de ciudad', prompt: 'a quiet street in an old Spanish city centre with stone facades and wrought-iron balconies, soft overcast daylight' },
  { id: 'terraza', label: 'terraza mediterránea', prompt: 'a whitewashed Mediterranean terrace with terracotta floor and potted olive trees, golden hour light' },
  { id: 'estudio', label: 'estudio', prompt: 'a minimal photo studio with a warm off-white backdrop and soft window-style light' },
];

const JOYA: Escena[] = [
  { id: 'mano', label: 'en la mano', prompt: 'a close-up of an elegant woman\'s hand with natural nude manicure resting lightly on a cream linen cloth next to a small sprig of dried flowers, soft warm window light' },
  { id: 'cafe', label: 'mano con taza', prompt: 'a close-up of a woman\'s hand holding a ceramic coffee cup on a light oak table in a bright Andalusian home, soft morning sun' },
  { id: 'cara', label: 'mano junto a la cara', prompt: 'a woman touching her chin softly with her hand, cropped below the eyes, cream knit sweater, warm golden-hour light, the jewel in sharp focus' },
];

/** Escenas para esta prenda, empezando por una distinta según la foto. */
export function escenasPara(g: Garment, seed: string, n: number): Escena[] {
  if (g.category === 'joya') return JOYA.slice(0, Math.min(n, JOYA.length));
  const list = g.wearer === 'mujer' || g.wearer === 'hombre' ? ADULTO : INFANTIL;
  // Los bebés no andan: mejor escenas sentados primero.
  const ordered = g.wearer === 'bebe' ? [...list].sort((a, b) => Number(/walks|stands/.test(a.prompt)) - Number(/walks|stands/.test(b.prompt))) : list;
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const start = g.wearer === 'bebe' ? h % 2 : h % ordered.length;
  return Array.from({ length: Math.min(n, ordered.length) }, (_, i) => ordered[(start + i) % ordered.length]);
}

/** Quién lleva la prenda, en inglés para el generador. La encuesta manda si la tienda eligió adultos. */
export function modeloPara(g: Garment, surveyModelo?: string): string {
  if (surveyModelo === 'Mujer 25 a 40') return 'a woman in her early thirties';
  if (surveyModelo === 'Mujer 40 a 60') return 'an elegant woman in her fifties';
  switch (g.wearer) {
    case 'bebe': return 'a happy baby of about nine to twelve months, sitting naturally';
    case 'nina': return 'a smiling little girl of about four years old with her hair tied with a small bow';
    case 'nino': return 'a smiling little boy of about four years old';
    case 'infantil': return 'a smiling toddler of about two years old';
    case 'hombre': return 'a man in his thirties';
    default: return surveyModelo === 'Variadas en edad y talla' ? 'a woman with a natural body type' : 'a woman in her early thirties';
  }
}
