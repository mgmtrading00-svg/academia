import sharp from 'sharp';
import { supabaseServer } from '@/lib/supabase/server';
import { PHOTO_BUCKET } from '@/lib/config';

export const runtime = 'nodejs';

/**
 * Sirve una foto del almacén reducida y con caché larga en el navegador.
 * Así el panel no vuelve a descargar la foto original entera en cada refresco
 * (era lo que gastaba la cuota de transferencia de Supabase).
 * Cada archivo tiene un nombre único, así que nunca cambia: se puede guardar para siempre.
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const path = u.searchParams.get('p');
  const w = Math.min(Math.max(Number(u.searchParams.get('w')) || 800, 100), 2000);
  if (!path || path.includes('..')) return new Response('Falta la foto', { status: 400 });
  const sb = await supabaseServer();
  const { data, error } = await sb.storage.from(PHOTO_BUCKET).download(path);
  if (error || !data) return new Response('No encontrada', { status: 404 });
  const out = await sharp(Buffer.from(await data.arrayBuffer())).rotate().resize({ width: w, withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(out), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=31536000, immutable' },
  });
}
