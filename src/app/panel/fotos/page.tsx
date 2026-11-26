/* eslint-disable @next/next/no-img-element */
import PhotoUpload from '@/components/PhotoUpload';
import AutoRefresh from '@/components/AutoRefresh';
import { currentShopId, getPhotos } from '@/lib/data';
import type { Listing, Photo } from '@/lib/types';
import { RedoButton } from '@/components/RedoButton';
import Molinillo from '@/components/Molinillo';
import { canGenerateImages, hasGemini, imageFlagDebug } from '@/agents/gemini';

export const dynamic = 'force-dynamic';
// Los empleados trabajan justo después de subir fotos o decidir; les damos hasta un minuto.
export const maxDuration = 300;

const LABEL: Record<Photo['status'], [string, string]> = {
  en_cola: ['Teo está con ella', 'busy'],
  repetir: ['Lola te ha pedido otra', 'warn'],
  lista: ['Lista para tu visto bueno', 'warn'],
  aprobada: ['Aprobada', 'ok'],
  publicada: ['Publicada', 'ok'],
};

const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const LISTING: Record<Listing['status'], [string, string]> = {
  falta_info: ['Lola te pregunta lo que falta', 'warn'],
  lista: ['Ficha para tu visto bueno', 'warn'],
  aprobada: ['Ficha aprobada', 'ok'],
  publicada: ['Ficha publicada', 'ok'],
};

function ListingBlock({ l }: { l: Listing }) {
  return (
    <details className="ficha">
      <summary>
        <span>Ficha de Nuria{l.priceEur != null ? ` · ${eur.format(l.priceEur)}` : ''}{l.sizes.length ? ` · ${l.sizes.join(', ')}` : ''}</span>
        <span className={`pill ${LISTING[l.status][1]}`}>{LISTING[l.status][0]}</span>
      </summary>
      {l.missing.length > 0 && <p className="ask">Falta {l.missing.map((m) => (m === 'precio' ? 'el precio' : 'las tallas')).join(' y ')}. Lola te lo pregunta por WhatsApp.</p>}
      <div className="ficha-canal"><span className="eyebrow">Tu web</span><b>{l.web.title}</b>{l.web.description.split('\n').filter(Boolean).map((t, i) => <p key={i}>{t}</p>)}</div>
      <div className="ficha-canal"><span className="eyebrow">Vinted</span><b>{l.vinted.title}</b><p className="pre">{l.vinted.description}</p></div>
      <div className="ficha-canal"><span className="eyebrow">Amazon</span><b>{l.amazon.title}</b><ul>{l.amazon.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul></div>
    </details>
  );
}

function PhotoCard({ p }: { p: Photo }) {
  const g = p.attributes?.garment;
  return (
    <article className={`ph ${p.modelUrl ? 'done' : ''}`}>
      <div className="ph-imgs">
        <figure>
          <div className="img">{p.url ? <img src={p.url} alt={`Tu foto: ${p.fileName}`} /> : 'Sin vista previa'}</div>
          {p.modelUrl && <figcaption>Tu foto</figcaption>}
        </figure>
        {(p.attributes?.results?.length ? p.attributes.results : p.modelUrl ? [{ kind: 'producto', label: 'De Teo', url: p.modelUrl }] : []).map((r, i) => (
          <figure key={i}>
            <div className="img">{r.url ? <a href={r.url} target="_blank" rel="noreferrer"><img src={r.url} alt={`${r.label}: ${g?.title ?? p.fileName}`} /></a> : '…'}</div>
            <figcaption>{r.label}</figcaption>
          </figure>
        ))}
      </div>
      <div className="meta">
        <b>{g?.title ?? p.fileName}</b>
        {g && <span className="muted">{[g.color, g.pattern !== 'liso' ? g.pattern : ''].filter(Boolean).join(' · ')}</span>}
        {p.status === 'repetir' && g?.ask_shop && <span className="ask">«{g.ask_shop}»</span>}
        {!!g?.defects.length && <span className="ask">Ojo: {g.defects.join(', ')}</span>}
        {p.note && <span className="muted">{p.note}</span>}
        <span className={`pill ${LABEL[p.status][1]}`}>{p.status === 'en_cola' && <Molinillo size={13} spin />}{LABEL[p.status][0]}</span>
        {p.listing && <ListingBlock l={p.listing} />}
        {p.status !== 'en_cola' && <RedoButton photoId={p.id} />}
      </div>
    </article>
  );
}

export default async function Fotos() {
  const photos = await getPhotos((await currentShopId())!);
  // Seguir refrescando mientras Teo o Nuria tengan trabajo con estas fotos.
  const working = photos.some((p) => p.status === 'en_cola' || ((p.status === 'lista' || p.status === 'aprobada') && !p.listing));
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <AutoRefresh active={working} />
      <div>
        <p className="eyebrow">Fotógrafo y Catalogadora</p>
        <h1 style={{ marginTop: 6 }}>Enviar fotos de prendas</h1>
        <p className="muted small" style={{ marginTop: 6 }}>
          {canGenerateImages() ? 'Fotos con modelo: activadas. Teo hace la foto de producto de catálogo y 2 fotos con modelo por prenda.'
            : hasGemini() ? `Fotos con modelo: desactivadas. Teo solo recorta la prenda sobre blanco. (El servidor ve: ${imageFlagDebug()})` : 'Gemini sin conectar.'}
        </p>
        <p className="muted" style={{ marginTop: 6 }}>Sube la foto como la tengas, aunque sea en la percha o en el mostrador. Teo quita la percha y el fondo, la pone en modelo comprobando que el estampado y el color son idénticos, y Nuria escribe la ficha.</p>
      </div>
      <PhotoUpload />
      {photos.length ? (
        <div className="phs">{photos.map((p) => <PhotoCard key={p.id} p={p} />)}</div>
      ) : (
        <p className="empty">Aquí verás tus fotos y en qué punto está cada una. Sube la primera para empezar.</p>
      )}
    </div>
  );
}
