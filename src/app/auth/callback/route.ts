import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// El enlace mágico del correo vuelve aquí con un código que cambiamos por la sesión.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL('/panel', req.url));
  }
  // Si el enlace ya se usó pero la sesión está abierta en este navegador, se entra igual.
  const { data } = await (await supabaseServer()).auth.getUser();
  if (data.user) return NextResponse.redirect(new URL('/panel', req.url));
  return NextResponse.redirect(new URL('/acceso?error=enlace', req.url));
}
