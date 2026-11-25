'use client';
import { useState, useTransition } from 'react';
import { redoPhoto } from '@/app/actions';

/** Botón «Rehacer con Teo» de cada foto. */
export function RedoButton({ photoId }: { photoId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  return (
    <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <button type="button" className="btn ghost small" disabled={pending} onClick={() => start(async () => { const r = await redoPhoto(photoId); setMsg(r.ok ?? r.error ?? ''); })}>
        {pending ? 'Pidiendo…' : 'Rehacer con Teo'}
      </button>
      {msg && <span className="muted small" role="status">{msg}</span>}
    </span>
  );
}
