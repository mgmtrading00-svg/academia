import sharp from 'sharp';
import type { StoredImage } from '../store';

/**
 * Foto de producto gratis, sin IA de pago: quita la pared y la percha y deja la prenda
 * sola sobre blanco, centrada, en 4:5 (el formato de las fichas y de Instagram).
 *
 * Funciona con lo que hacen las tiendas: la prenda colgada en una pared o puerta claras.
 * La pared y la percha son claras y casi sin color; la prenda no. Se calcula una máscara
 * con eso, se rellenan los huecos de dentro (botones, cuellos blancos) y se queda la pieza
 * más grande. El color de la prenda no se toca.
 */
export async function packshotLocal(input: Buffer, opts: { width?: number; height?: number } = {}): Promise<StoredImage & { coverage: number }> {
  const OW = opts.width ?? 1200, OH = opts.height ?? 1500;
  const src = sharp(input).rotate().toColourspace('srgb').removeAlpha();
  const full = await src.clone().resize(2000, 2000, { fit: 'inside', withoutEnlargement: true }).raw().toBuffer({ resolveWithObject: true });
  const { width: FW, height: FH } = full.info;

  // La máscara se calcula en pequeño (rápido) y luego se escala.
  const S = 600;
  const small = await sharp(full.data, { raw: { width: FW, height: FH, channels: 3 } }).resize(S, S, { fit: 'inside' }).blur(1.2).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = small.info;
  const px = small.data;
  const n = w * h;

  // Color de la pared: mediana del borde. Se compara el tono (no la luz) para que las sombras cuenten como pared.
  const border: number[][] = [];
  for (let x = 0; x < w; x++) { border.push(rgb(px, x, 0, w), rgb(px, x, h - 1, w)); }
  for (let y = 0; y < h; y++) { border.push(rgb(px, 0, y, w), rgb(px, w - 1, y, w)); }
  const wall = [0, 1, 2].map((c) => median(border.map((p) => p[c])));
  const wallL = luma(wall);
  const wallChroma = chroma(wall);

  const fg = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const p = [px[i * 3], px[i * 3 + 1], px[i * 3 + 2]];
    const L = luma(p);
    const c = chroma(p);
    const dc = Math.hypot(c[0] - wallChroma[0], c[1] - wallChroma[1]);
    // Prenda: color distinto al de la pared, o bastante más oscura que la pared (aunque sea gris).
    fg[i] = dc > 14 || L < wallL * 0.62 ? 1 : 0;
  }

  let m = close(fg, w, h, 3);
  m = fillHoles(m, w, h);
  m = keepBig(m, w, h, 0.02);
  // Quitar lo fino que sale de la prenda (el gancho de la percha, hilos, etiquetas colgando)
  // sin redondear el contorno: se mira qué sobrevive a una apertura grande y se recupera su borde.
  const core = keepBig(open(m, w, h, 5), w, h, 0.02);
  const near = dilate(core, w, h, 6);
  m = m.map((v, i) => (v && near[i] ? 1 : 0)) as Uint8Array;
  m = fillHoles(m, w, h);

  let count = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) {
    count++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const coverage = count / n;
  if (count === 0) throw new Error('No encuentro la prenda en la foto');

  // Máscara a tamaño real, con borde suave.
  const maskSmall = Buffer.alloc(n);
  for (let i = 0; i < n; i++) maskSmall[i] = m[i] ? 255 : 0;
  const mask = await sharp(maskSmall, { raw: { width: w, height: h, channels: 1 } }).resize(FW, FH, { kernel: 'cubic' }).blur(1.5).extractChannel(0).raw().toBuffer();

  const rgba = Buffer.alloc(FW * FH * 4);
  for (let i = 0; i < FW * FH; i++) {
    rgba[i * 4] = full.data[i * 3]; rgba[i * 4 + 1] = full.data[i * 3 + 1]; rgba[i * 4 + 2] = full.data[i * 3 + 2]; rgba[i * 4 + 3] = mask[i];
  }
  const sx = FW / w, sy = FH / h;
  const crop = { left: Math.max(0, Math.floor(x0 * sx) - 4), top: Math.max(0, Math.floor(y0 * sy) - 4) };
  const cw = Math.min(FW - crop.left, Math.ceil((x1 - x0 + 1) * sx) + 8), ch = Math.min(FH - crop.top, Math.ceil((y1 - y0 + 1) * sy) + 8);
  const cut = await sharp(rgba, { raw: { width: FW, height: FH, channels: 4 } })
    .extract({ left: crop.left, top: crop.top, width: cw, height: ch })
    .resize(Math.round(OW * 0.82), Math.round(OH * 0.84), { fit: 'inside' })
    .png().toBuffer({ resolveWithObject: true });

  // Sombra muy suave debajo, como en una mesa de estudio.
  const { width: pw, height: ph } = cut.info;
  const shadow = await sharp(await sharp(cut.data).extractChannel(3).toBuffer())
    .linear(0.16, 0).blur(18)
    .toColourspace('b-w').toBuffer();
  const shadowRgba = await sharp({ create: { width: pw, height: ph, channels: 3, background: '#3a3330' } })
    .joinChannel(shadow).png().toBuffer();
  const left = Math.round((OW - pw) / 2), top = Math.round((OH - ph) / 2);
  const data = await sharp({ create: { width: OW, height: OH, channels: 3, background: '#FFFFFF' } })
    .composite([{ input: shadowRgba, left: left + 6, top: top + 14 }, { input: cut.data, left, top }])
    .toColourspace('srgb').jpeg({ quality: 92 }).toBuffer();
  return { data, mediaType: 'image/jpeg', coverage };
}

// ---------- utilidades ----------

const rgb = (px: Buffer, x: number, y: number, w: number) => { const i = (y * w + x) * 3; return [px[i], px[i + 1], px[i + 2]]; };
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const luma = (p: number[]) => 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2];
/** Tono sin luz: diferencias de color, más o menos como a/b de Lab. */
const chroma = (p: number[]) => [p[0] - p[1], (p[0] + p[1]) / 2 - p[2]];

function dilate(m: Uint8Array, w: number, h: number, r: number) {
  const out = new Uint8Array(m.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0;
    for (let dy = -r; dy <= r && !v; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h && m[yy * w + xx]) { v = 1; break; }
    }
    out[y * w + x] = v;
  }
  return out;
}
function erode(m: Uint8Array, w: number, h: number, r: number) {
  const inv = m.map((v) => 1 - v) as Uint8Array;
  return dilate(inv, w, h, r).map((v) => 1 - v) as Uint8Array;
}
const close = (m: Uint8Array, w: number, h: number, r: number) => erode(dilate(m, w, h, r), w, h, r);
const open = (m: Uint8Array, w: number, h: number, r: number) => dilate(erode(m, w, h, r), w, h, r);

/** Rellena todo lo que no está conectado con el borde de la foto (huecos dentro de la prenda). */
function fillHoles(m: Uint8Array, w: number, h: number) {
  const outside = new Uint8Array(m.length);
  const stack: number[] = [];
  const push = (i: number) => { if (!m[i] && !outside[i]) { outside[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (stack.length) {
    const i = stack.pop()!; const x = i % w, y = (i / w) | 0;
    if (x > 0) push(i - 1); if (x < w - 1) push(i + 1); if (y > 0) push(i - w); if (y < h - 1) push(i + w);
  }
  return outside.map((v) => 1 - v) as Uint8Array;
}

/** Se queda con la pieza más grande y con las que sean al menos `minFrac` de la foto (p. ej. el cubrepañal). */
function keepBig(m: Uint8Array, w: number, h: number, minFrac: number) {
  const label = new Int32Array(m.length);
  const sizes: number[] = [0];
  for (let s = 0; s < m.length; s++) {
    if (!m[s] || label[s]) continue;
    const id = sizes.length; let size = 0; const stack = [s]; label[s] = id;
    while (stack.length) {
      const i = stack.pop()!; size++; const x = i % w, y = (i / w) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (j >= 0 && m[j] && !label[j]) { label[j] = id; stack.push(j); }
      }
    }
    sizes.push(size);
  }
  const biggest = Math.max(...sizes);
  const keep = sizes.map((s) => s === biggest || s >= minFrac * m.length);
  return label.map((l) => (l && keep[l] ? 1 : 0)) as unknown as Uint8Array;
}

/**
 * Acabado de una foto de producto que ya viene sobre blanco (la de Gemini): quita bordes o franjas
 * en los lados, deja el fondo blanco puro y centra la prenda con los mismos márgenes a los lados.
 * No recorta la prenda, así que no pierde cuellos blancos ni detalles claros.
 */
export async function centerOnWhite(input: Buffer, opts: { width?: number; height?: number; fill?: number } = {}): Promise<StoredImage> {
  const OW = opts.width ?? 1200, OH = opts.height ?? 1500, FILL = opts.fill ?? 0.8;
  const img = sharp(input).rotate().toColourspace('srgb').removeAlpha();
  const meta = await img.clone().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = meta.info;
  // Quitar un 2 % de cada lado: ahí aparecen las franjas y marcos que a veces añade el generador.
  const sx = Math.round(W * 0.02), sy = Math.round(H * 0.02);
  const inner = await sharp(meta.data, { raw: { width: W, height: H, channels: 3 } }).extract({ left: sx, top: sy, width: W - 2 * sx, height: H - 2 * sy }).raw().toBuffer({ resolveWithObject: true });
  // Además, quitar franjas o marcos enteros: columnas o filas del borde que no son casi todo blanco.
  const iw = inner.info.width, ih = inner.info.height, ip = inner.data;
  const darkRatioCol = (x: number) => { let n = 0; for (let y = 0; y < ih; y++) { const i = (y * iw + x) * 3; if (Math.min(ip[i], ip[i + 1], ip[i + 2]) < 200) n++; } return n / ih; };
  const darkRatioRow = (y: number) => { let n = 0; for (let x = 0; x < iw; x++) { const i = (y * iw + x) * 3; if (Math.min(ip[i], ip[i + 1], ip[i + 2]) < 200) n++; } return n / iw; };
  let L = 0, R = iw - 1, T = 0, B = ih - 1;
  const maxCut = 0.12;
  while (L < iw * maxCut && darkRatioCol(L) > 0.6) L++;
  while (R > iw * (1 - maxCut) && darkRatioCol(R) > 0.6) R--;
  while (T < ih * maxCut && darkRatioRow(T) > 0.6) T++;
  while (B > ih * (1 - maxCut) && darkRatioRow(B) > 0.6) B--;
  // Un margen de seguridad tras la franja, por si tiene borde difuminado.
  if (L > 0) L = Math.min(L + 4, iw - 1); if (R < iw - 1) R = Math.max(R - 4, L + 1);
  if (T > 0) T = Math.min(T + 4, ih - 1); if (B < ih - 1) B = Math.max(B - 4, T + 1);
  const clean = (L || T || R < iw - 1 || B < ih - 1)
    ? await sharp(ip, { raw: { width: iw, height: ih, channels: 3 } }).extract({ left: L, top: T, width: R - L + 1, height: B - T + 1 }).raw().toBuffer({ resolveWithObject: true })
    : inner;
  const { width: w, height: h } = clean.info;
  const px = clean.data;
  // Fondo casi blanco → blanco puro, con transición suave para no dejar halo.
  const out = Buffer.alloc(px.length);
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let i = 0; i < w * h; i++) {
    const r = px[i * 3], g = px[i * 3 + 1], b = px[i * 3 + 2];
    const m = Math.min(r, g, b);
    const t = m >= 246 ? 1 : m <= 232 ? 0 : (m - 232) / 14;
    out[i * 3] = Math.round(r + (255 - r) * t); out[i * 3 + 1] = Math.round(g + (255 - g) * t); out[i * 3 + 2] = Math.round(b + (255 - b) * t);
    if (m < 228) { const x = i % w, y = (i / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 <= x0 || y1 <= y0) return { data: await sharp(input).jpeg({ quality: 92 }).toBuffer(), mediaType: 'image/jpeg' };
  const pad = 6;
  const left = Math.max(0, x0 - pad), top = Math.max(0, y0 - pad);
  const cw = Math.min(w - left, x1 - x0 + 1 + 2 * pad), ch = Math.min(h - top, y1 - y0 + 1 + 2 * pad);
  const item = await sharp(out, { raw: { width: w, height: h, channels: 3 } })
    .extract({ left, top, width: cw, height: ch })
    .resize(Math.round(OW * FILL), Math.round(OH * FILL), { fit: 'inside' })
    .png().toBuffer({ resolveWithObject: true });
  const data = await sharp({ create: { width: OW, height: OH, channels: 3, background: '#FFFFFF' } })
    .composite([{ input: item.data, left: Math.round((OW - item.info.width) / 2), top: Math.round((OH - item.info.height) / 2) }])
    .jpeg({ quality: 93 }).toBuffer();
  return { data, mediaType: 'image/jpeg' };
}
