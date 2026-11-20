/* eslint-disable @next/next/no-img-element */
import PhotoUpload from '@/components/PhotoUpload';
import AutoRefresh from '@/components/AutoRefresh';
import { currentShopId, getPhotos } from '@/lib/data';
import type { Photo } from '@/lib/types';

export const dynamic = 'force-dynamic';

const LABEL: Record<Photo['status'], [string, string]> = {
  en_cola: ['Teo está con ella', 'busy'],
  repetir: ['Lola te ha pedido otra', 'warn'],
  lista: ['Lista para tu visto bueno', 'warn'],
  aprobada: ['Aprobada', 'ok'],
  publicada: ['Publicada', 'ok'],
};

function PhotoCard({ p }: { p: Photo }) {
  const g = p.attributes?.garment;
  return (
    <article className={`ph ${p.modelUrl ? 'done' : ''}`}>
      <div className="ph-imgs">
        <figure>
          <div className="img">{p.url ? <img src={p.url} alt={`Tu foto: ${p.fileName}`} /> : 'Sin vista previa'}</div>
          {p.modelUrl && <figcaption>Tu foto</figcaption>}
        </figure>
        {p.modelUrl && (
          <figure>
            <div className="img"><img src={p.modelUrl} alt={`Foto de Teo: ${g?.title ?? p.fileName}`} /></div>
            <figcaption>De Teo{p.attributes?.provider === 'local' ? ' · mejorada' : ''}</figcaption>
          </figure>
        )}
      </div>
      <div className="meta">
        <b>{g?.title ?? p.fileName}</b>
        {g && <span className="muted">{[g.color, g.pattern !== 'liso' ? g.pattern : ''].filter(Boolean).join(' · ')}</span>}
        {p.status === 'repetir' && g?.ask_shop && <span className="ask">«{g.ask_shop}»</span>}
        {!!g?.defects.length && <span className="ask">Ojo: {g.defects.join(', ')}</span>}
        {p.note && <span className="muted">{p.note}</span>}
        <span className={`pill ${LABEL[p.status][1]}`}>{LABEL[p.status][0]}</span>
      </div>
    </article>
  );
}

export default async function Fotos() {
  const photos = await getPhotos((await currentShopId())!);
  const working = photos.some((p) => p.status === 'en_cola');
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <AutoRefresh active={working} />
      <div>
        <p className="eyebrow">Fotógrafo y Catalogadora</p>
        <h1 style={{ marginTop: 6 }}>Enviar fotos de prendas</h1>
        <p className="muted" style={{ marginTop: 6 }}>Sube la foto como la tengas, aunque sea en la percha o en el mostrador. Teo la pone en modelo, comprueba que el color y los detalles son fieles, y Nuria escribe la ficha.</p>
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
