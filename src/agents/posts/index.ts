import satori from 'satori';
import sharp from 'sharp';
import type { StoredImage } from '../store';
import { SANS_500, SANS_700, SERIF_600 } from './fuentes';

/**
 * Posts listos para Instagram con la estética de la tienda: «Nueva familia» con varias prendas
 * y precios, y ofertas (Black Friday, rebajas) con el precio de antes y el de ahora.
 * Se dibujan aquí mismo, sin IA y sin coste: el texto y los precios salen exactos.
 */

export interface Marca {
  /** Dirección de la web que sale en el botón, p. ej. «victoriamoral.com». */
  web: string;
  /** Color principal (burdeos por defecto) y fondo claro. */
  color?: string;
  fondo?: string;
}

type El = { type: string; props: Record<string, unknown> & { children?: unknown } };
const h = (type: string, style: Record<string, unknown>, ...children: unknown[]): El => ({ type, props: { style: { display: 'flex', boxSizing: 'border-box', ...style }, children: children.length === 1 ? children[0] : children } });
const img = (src: string, style: Record<string, unknown>): El => ({ type: 'img', props: { src, style } });

const FONTS = [
  { name: 'Serif', data: SERIF_600, weight: 600 as const, style: 'normal' as const },
  { name: 'Sans', data: SANS_500, weight: 500 as const, style: 'normal' as const },
  { name: 'Sans', data: SANS_700, weight: 700 as const, style: 'normal' as const },
];

async function render(tree: El, width: number, height: number): Promise<StoredImage> {
  const svg = await satori(tree as never, { width, height, fonts: FONTS });
  const data = await sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer();
  return { data, mediaType: 'image/jpeg' };
}

async function dataUrl(image: StoredImage, w: number, h: number, fit: 'cover' | 'inside' = 'cover') {
  const buf = await sharp(image.data).rotate().resize(w, h, { fit, background: '#ffffff' }).flatten({ background: '#ffffff' }).jpeg({ quality: 88 }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

const eur = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2).replace('.', ',')}\u00A0€`;

/** «Nueva familia · ya en la web»: foto grande arriba y hasta 3 prendas con nombre y precio. 1080×1350. */
export async function postNovedad(o: { marca: Marca; titulo: string; antetitulo?: string; foto: StoredImage; prendas: { nombre: string; precio: number | null; foto: StoredImage }[] }) {
  const C = o.marca.color ?? '#6E1E2B', BG = o.marca.fondo ?? '#F7F0EA';
  const prendas = o.prendas.slice(0, 3);
  const hero = await dataUrl(o.foto, 960, prendas.length ? 640 : 900);
  const thumbs = await Promise.all(prendas.map((p) => dataUrl(p.foto, 260, 260, 'inside')));
  const tree = h('div', { width: 1080, height: 1350, background: BG, flexDirection: 'column', alignItems: 'center', padding: '56px 60px 52px', fontFamily: 'Sans' },
    h('div', { fontSize: 22, letterSpacing: 4, color: '#B08A4A', fontWeight: 500 }, (o.antetitulo ?? 'NUEVA FAMILIA · YA EN LA WEB').toUpperCase()),
    h('div', { fontFamily: 'Serif', fontSize: 76, color: C, marginTop: 14, textAlign: 'center' }, o.titulo),
    img(hero, { width: 960, height: prendas.length ? 640 : 900, borderRadius: 28, objectFit: 'cover', marginTop: 28 }),
    prendas.length
      ? h('div', { flexDirection: 'row', justifyContent: 'center', gap: 34, marginTop: 34 },
          ...prendas.map((p, i) => h('div', { flexDirection: 'column', alignItems: 'center', width: 260 },
            h('div', { width: 260, height: 220, background: '#FFFFFF', borderRadius: 18, alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(80,40,40,.10)' },
              img(thumbs[i], { width: 200, height: 200, objectFit: 'contain' })),
            h('div', { fontSize: 26, color: C, fontWeight: 700, marginTop: 14 }, p.nombre),
            h('div', { fontSize: 22, color: '#B08A4A', marginTop: 4 }, p.precio != null ? eur(p.precio) : ' '),
          )))
      : h('div', {}),
    h('div', { marginTop: 'auto', background: C, color: '#FFFFFF', borderRadius: 999, padding: '18px 48px', fontFamily: 'Serif', fontSize: 38 }, `Ya en la web · ${o.marca.web}`),
  );
  return render(tree, 1080, 1350);
}

/** Oferta para historias de Instagram (1080×1920): etiqueta, foto, nombre, antes y ahora. */
export async function postOferta(o: { marca: Marca; etiqueta: string; nombre: string; foto: StoredImage; producto?: StoredImage; antes: number; ahora: number }) {
  const DARK = '#2A0E14', GOLD = '#E2B35A';
  const hero = await dataUrl(o.foto, 880, 1100);
  const thumb = o.producto ? await dataUrl(o.producto, 220, 220, 'inside') : null;
  const tree = h('div', { width: 1080, height: 1920, background: `linear-gradient(180deg, #3A121B 0%, ${DARK} 100%)`, flexDirection: 'column', alignItems: 'center', padding: '120px 80px 110px', fontFamily: 'Sans' },
    h('div', { background: '#1A070C', border: `2px solid ${GOLD}`, color: '#FFFFFF', borderRadius: 999, padding: '12px 34px', fontSize: 28, fontWeight: 700, letterSpacing: 3 }, o.etiqueta.toUpperCase()),
    h('div', { position: 'relative', marginTop: 50, width: 920, height: 1140, border: `2px solid ${GOLD}`, borderRadius: 22, padding: 20 },
      img(hero, { width: 880, height: 1100, borderRadius: 12, objectFit: 'cover' }),
      thumb ? h('div', { position: 'absolute', right: -30, bottom: -40, width: 250, height: 250, borderRadius: 999, background: '#FFFFFF', border: `6px solid ${GOLD}`, alignItems: 'center', justifyContent: 'center' },
        img(thumb, { width: 190, height: 190, objectFit: 'contain' })) : h('div', {}),
    ),
    h('div', { fontFamily: 'Serif', fontSize: 66, color: '#FFFFFF', marginTop: 70, alignSelf: 'flex-start' }, o.nombre),
    h('div', { flexDirection: 'row', alignItems: 'flex-end', alignSelf: 'stretch', marginTop: 'auto' },
      h('div', { flexDirection: 'column' },
        h('div', { fontSize: 24, color: '#C9A9AE', letterSpacing: 3 }, 'ANTES'),
        h('div', { fontSize: 64, color: '#C9A9AE', textDecoration: 'line-through', whiteSpace: 'nowrap' }, eur(o.antes))),
      h('div', { flexDirection: 'column', marginLeft: 50 },
        h('div', { fontSize: 24, color: GOLD, letterSpacing: 3, fontWeight: 700 }, 'AHORA'),
        h('div', { fontSize: 120, color: GOLD, fontWeight: 700, lineHeight: 1, whiteSpace: 'nowrap' }, eur(o.ahora))),
      h('div', { marginLeft: 'auto', background: GOLD, color: DARK, borderRadius: 999, padding: '16px 34px', fontSize: 26, fontWeight: 700 }, o.marca.web),
    ),
  );
  return render(tree, 1080, 1920);
}

/** Saca «antes» y «ahora» de una nota como «Pelele ciruela · antes 26 € ahora 20 €» o «26 € → 20 €». */
export function preciosOferta(note: string): { antes: number; ahora: number } | null {
  const nums = [...note.matchAll(/(\d{1,4}(?:[.,]\d{1,2})?)\s?(?:€|eur(?:os)?\b)/gi)].map((m) => Number(m[1].replace(',', '.')));
  if (nums.length < 2) return null;
  const [a, b] = nums;
  return a > b ? { antes: a, ahora: b } : null;
}
