/* eslint-disable @next/next/no-img-element */
import PhotoUpload from '@/components/PhotoUpload';
import { currentShopId, getPhotos } from '@/lib/data';
import type { Photo } from '@/lib/types';

export const dynamic = 'force-dynamic';

const LABEL: Record<Photo['status'], [string, string]> = {
  en_cola: ['En cola para Teo', 'busy'],
  lista: ['Foto en modelo lista', 'warn'],
  aprobada: ['Aprobada', 'ok'],
  publicada: ['Publicada', 'ok'],
};

export default async function Fotos() {
  const photos = await getPhotos((await currentShopId())!);
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <p className="eyebrow">Fotógrafo y Catalogadora</p>
        <h1 style={{ marginTop: 6 }}>Enviar fotos de prendas</h1>
        <p className="muted" style={{ marginTop: 6 }}>Sube la foto como la tengas. Teo la pone en modelo y Nuria escribe la ficha. Te avisamos para aprobar.</p>
      </div>
      <PhotoUpload />
      {photos.length ? (
        <div className="thumbs">
          {photos.map((p) => (
            <div className="thumb" key={p.id}>
              <div className="img">{p.url ? <img src={p.url} alt={p.fileName} /> : 'Sin vista previa'}</div>
              <div className="meta"><b>{p.fileName}</b>{p.note && <span className="muted">{p.note}</span>}<span className={`pill ${LABEL[p.status][1]}`}>{LABEL[p.status][0]}</span></div>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">Aquí verás tus fotos y en qué punto está cada una. Sube la primera para empezar.</p>
      )}
    </div>
  );
}
