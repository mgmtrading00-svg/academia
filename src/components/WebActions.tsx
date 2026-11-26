'use client';
import { useState, useTransition } from 'react';
import { completeListing, publishNow } from '@/app/tienda-actions';
import type { Photo } from '@/lib/types';

/** Debajo de cada prenda: completar precio y tallas, y subirla a la web (Shopify). */
export default function WebActions({ p, shopify }: { p: Photo; shopify: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [price, setPrice] = useState('');
  const [sizes, setSizes] = useState('');
  const l = p.listing;
  const g = p.attributes?.garment;
  if (p.status === 'en_cola' || !g) return null;

  if (!l || l.status === 'falta_info') {
    if (!l && p.status !== 'lista' && p.status !== 'aprobada') return null;
    return (
      <div className="web-acts">
        <b className="small">Pon el precio y las tallas para la ficha</b>
        <div className="row">
          <label>Precio (€)<input inputMode="decimal" placeholder="24,90" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
          <label style={{ flexGrow: 3 }}>Tallas<input placeholder="0-3 meses, 3-6 meses, 6-12 meses" value={sizes} onChange={(e) => setSizes(e.target.value)} /></label>
          <button type="button" className="small" disabled={pending || !price || !sizes} onClick={() => start(async () => setMsg(await completeListing(p.id, price, sizes)))}>
            {pending ? 'Enviando…' : 'Enviar a Nuria'}
          </button>
        </div>
        {msg.ok && <span className="okmsg small" role="status">{msg.ok}</span>}
        {msg.error && <span className="err small" role="alert">{msg.error}</span>}
      </div>
    );
  }

  if (!shopify && !p.web?.adminUrl) return null;
  return (
    <div className="web-acts">
      {p.web?.adminUrl ? (
        <span className="small">En tu web ✓ · <a href={p.web.adminUrl} target="_blank" rel="noreferrer">Ver en Shopify</a>{p.web.url ? <> · <a href={p.web.url} target="_blank" rel="noreferrer">Ver en la tienda</a></> : null}</span>
      ) : (
        <>
          {p.web?.error && <span className="ask">Marco no pudo subirla: {p.web.error}</span>}
          <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="small" disabled={pending} onClick={() => start(async () => setMsg(await publishNow(p.id)))}>
              {pending ? 'Enviando…' : p.web?.error ? 'Reintentar subida a mi web' : l.status === 'aprobada' ? 'Subir a mi web ahora' : 'Aprobar y subir a mi web'}
            </button>
            {msg.ok && <span className="okmsg small" role="status">{msg.ok}</span>}
            {msg.error && <span className="err small" role="alert">{msg.error}</span>}
          </span>
        </>
      )}
    </div>
  );
}
