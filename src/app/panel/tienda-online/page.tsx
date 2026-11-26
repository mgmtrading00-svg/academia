import ShopifyForm from '@/components/ShopifyForm';
import { currentShopId } from '@/lib/data';
import { getShopifyStatus } from '@/lib/conexiones';
import { IS_DEMO } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const fecha = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Madrid' });

export default async function TiendaOnline() {
  const status = await getShopifyStatus((await currentShopId())!);
  return (
    <div style={{ display: 'grid', gap: 18, maxWidth: 720 }}>
      <div>
        <p className="eyebrow">Marco · Tu web</p>
        <h1 style={{ marginTop: 6 }}>Conectar tu tienda Shopify</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Cuando apruebas la foto de Teo y la ficha de Nuria, Marco sube la prenda a tu web: fotos, título, descripción, precio y tallas. Tú decides si llega como borrador o directamente a la venta.
        </p>
      </div>

      {IS_DEMO ? (
        <p className="empty">En la demostración no se conecta ninguna tienda real.</p>
      ) : !status.serverReady ? (
        <p className="err">Falta la clave del servidor en Vercel (SUPABASE_SERVICE_ROLE_KEY).</p>
      ) : (
        <>
          {status.connected && (
            <div className="detail">
              <b>{status.lastError ? 'Conectada, pero con un problema' : `Conectada con «${status.storeName ?? status.shopDomain}»`}</b>
              <span className="muted small">{status.shopDomain} · {status.publishStatus === 'ACTIVE' ? 'sube directamente a la venta' : 'sube como borrador'}{status.autoPublish ? '' : ' · subida automática apagada'}</span>
              {status.lastError && <span className="ask">{status.lastError}</span>}
              {status.lastOkAt && <span className="muted small">Última vez que todo fue bien: {fecha.format(new Date(status.lastOkAt))}</span>}
            </div>
          )}
          <ShopifyForm status={status} />
          <details className="ficha">
            <summary><span>Dónde saco el Client ID y el Client secret</span></summary>
            <ol className="muted small" style={{ display: 'grid', gap: 6, paddingLeft: 18 }}>
              <li>Entra en dev.shopify.com con la misma cuenta de tu tienda y pulsa «Create app» › «Start from Dev Dashboard». Llámala «Oficina Virtual».</li>
              <li>En «Versions», en «Scopes», escribe: write_products, write_publications, read_publications. Pulsa «Release».</li>
              <li>Pulsa «Install app» y elige tu tienda.</li>
              <li>En «Settings» copia el Client ID y el Client secret y pégalos aquí.</li>
            </ol>
          </details>
        </>
      )}
    </div>
  );
}
