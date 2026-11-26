'use client';
import { useActionState, useState, useTransition } from 'react';
import type { FormState } from '@/app/actions';
import { disconnectShopify, saveShopify } from '@/app/tienda-actions';
import type { ShopifyStatus } from '@/lib/conexiones';

/** Formulario para conectar la tienda Shopify. Las claves se guardan cifradas y nunca se vuelven a enseñar. */
export default function ShopifyForm({ status }: { status: ShopifyStatus }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveShopify, {});
  const [legacy, setLegacy] = useState(status.mode === 'token');
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<FormState>({});
  const c = status.connected;

  return (
    <form action={action} className="survey" style={{ gap: 16 }}>
      <label>Dirección de tu tienda en Shopify
        <input name="tienda" placeholder="victoriamoral.myshopify.com" defaultValue={status.shopDomain ?? ''} required={!c} autoComplete="off" />
        <span className="muted small" style={{ fontWeight: 400 }}>La que acaba en .myshopify.com. También vale tu web (victoriamoral.com) y buscamos la dirección nosotros.</span>
      </label>

      {!legacy ? (
        <>
          <label>Client ID
            <input name="client_id" placeholder={c && status.mode === 'app' ? 'Guardado (déjalo vacío para no cambiarlo)' : 'Lo copias de Settings de tu app'} autoComplete="off" spellCheck={false} />
          </label>
          <label>Client secret
            <input name="client_secret" type="password" placeholder={c && status.mode === 'app' ? '•••••••• guardado' : 'Pulsa el ojo en Shopify y cópialo'} autoComplete="new-password" spellCheck={false} />
          </label>
        </>
      ) : (
        <label>Token de acceso (empieza por shpat_)
          <input name="token" type="password" placeholder={c && status.mode === 'token' ? '•••••••• guardado' : 'shpat_…'} autoComplete="new-password" spellCheck={false} />
        </label>
      )}
      <button type="button" className="linkbtn small" style={{ justifySelf: 'start' }} onClick={() => setLegacy(!legacy)}>
        {legacy ? 'Usar Client ID y Client secret (apps nuevas)' : '¿Tienes una app antigua con token shpat_? Úsalo aquí'}
      </button>

      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        <legend style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Cómo subo cada prenda aprobada</legend>
        <div className="opts" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <label><input type="radio" name="modo" value="DRAFT" defaultChecked={status.publishStatus !== 'ACTIVE'} /> Como borrador (la revisas en Shopify)</label>
          <label><input type="radio" name="modo" value="ACTIVE" defaultChecked={status.publishStatus === 'ACTIVE'} /> Directamente a la venta</label>
        </div>
      </fieldset>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 500 }}>
        <input type="checkbox" name="auto" defaultChecked={status.autoPublish ?? true} style={{ width: 'auto' }} />
        Subir sola cada prenda en cuanto apruebe la foto y la ficha
      </label>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="submit" disabled={pending}>{pending ? 'Comprobando con Shopify…' : c ? 'Guardar y comprobar' : 'Conectar mi tienda'}</button>
        {c && (
          <button type="button" className="btn ghost" disabled={busy} onClick={() => { if (confirm('¿Desconectar tu tienda Shopify? Lo ya subido se queda en tu web.')) start(async () => setMsg(await disconnectShopify())); }}>
            Desconectar
          </button>
        )}
        {(state.ok || msg.ok) && <span className="okmsg" role="status">{state.ok ?? msg.ok}</span>}
        {(state.error || msg.error) && <span className="err" role="alert">{state.error ?? msg.error}</span>}
      </div>
    </form>
  );
}
