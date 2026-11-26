'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import Molinillo from '@/components/Molinillo';

/** Recoge la sesión que trae el enlace del correo (#access_token=…) y entra en el panel. */
export default function Entrar() {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    const access_token = h.get('access_token'), refresh_token = h.get('refresh_token');
    if (!access_token || !refresh_token) { setFailed(true); return; }
    supabaseBrowser().auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) setFailed(true);
      else window.location.replace('/panel');
    });
  }, []);
  return (
    <div className="wrap acc-page" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
      {failed ? (
        <div className="acc-card">
          <h1>El enlace ha caducado o ya se usó</h1>
          <p className="muted" style={{ marginTop: 10 }}>Pide uno nuevo y ábrelo nada más llegar.</p>
          <p style={{ marginTop: 16 }}><Link className="btn" href="/acceso">Pedir otro enlace</Link></p>
        </div>
      ) : (
        <p style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Molinillo size={28} spin /> Entrando en tu oficina…</p>
      )}
    </div>
  );
}
