/**
 * Sin claves de Supabase la app arranca en modo demostración:
 * datos de ejemplo en memoria y acceso con la tienda de ejemplo.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const IS_DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY;
export const DEMO_COOKIE = 'ov_demo';
export const PHOTO_BUCKET = 'fotos';
