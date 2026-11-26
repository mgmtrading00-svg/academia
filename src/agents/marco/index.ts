import type { OfficeStore, QueuedTask, TaskOutcome } from '../store';
import { getToken, publishProduct, ShopifyError } from './shopify';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Marco sube a la web de la tienda (Shopify) cada prenda con la foto y la ficha aprobadas:
 * fotos de Teo, título, descripción, precio y tallas de Nuria. En borrador o publicada, según
 * lo que eligió la tienda al conectar.
 */
export async function runMarco(task: QueuedTask, store: OfficeStore): Promise<TaskOutcome> {
  if (task.kind !== 'publicar_shopify') return { status: 'revision', reason: `Marco no sabe hacer «${task.kind}»` };
  const photoId = String(task.payload.photo_id ?? '');
  if (!store.shopify) return { status: 'revision', reason: 'Shopify solo funciona en la web real' };
  const [conn, data] = await Promise.all([store.shopify.connection(task.shopId), store.shopify.publishData(photoId)]);
  if (!conn) return { status: 'hecha', payload: { result: 'sin_conexion' } };
  if (!data) return { status: 'revision', reason: `Sin ficha para ${photoId}` };
  const l = data.listing;
  if (l.shopifyProductId) return { status: 'hecha', payload: { result: 'ya_estaba', product_id: l.shopifyProductId } };
  if (l.priceEur == null) return { status: 'revision', reason: 'La ficha no tiene precio' };
  if (!data.images.length) return { status: 'revision', reason: 'La prenda no tiene fotos de Teo' };

  await store.setAgent(task.shopId, 'marco', { status: 'busy', task: `Subiendo a tu web: ${l.web.title}`, short: 'Subiendo a tu web' });
  try {
    const t = await getToken(conn);
    if (t.fresh) await store.shopify.saveToken(task.shopId, t.fresh.token, t.fresh.expiresAt);
    const r = await publishProduct(conn, t.token, {
      title: l.web.title,
      descriptionHtml: l.web.description.split('\n').map((x) => x.trim()).filter(Boolean).map((x) => `<p>${esc(x)}</p>`).join(''),
      productType: data.garment?.category,
      vendor: conn.storeName ?? undefined,
      tags: l.tags ?? [],
      priceEur: l.priceEur,
      sizes: l.sizes,
      images: data.images,
    });
    await store.shopify.markPublished(photoId, r);
    await store.shopify.setStatus(task.shopId, { ok: true });
    await store.log(task.shopId, 'marco', conn.publishStatus === 'ACTIVE'
      ? `Subida a tu web y ya a la venta: ${l.web.title}.`
      : `Subida a tu web como borrador: ${l.web.title}. Revísala en Shopify y pulsa «Activo» cuando quieras.`);
    await store.setAgent(task.shopId, 'marco', { status: 'ok', task: 'Tu web está al día', short: 'Web al día' });
    return { status: 'hecha', payload: { product_id: r.productId, admin_url: r.adminUrl } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (e instanceof ShopifyError) {
      await store.shopify.markFailed(photoId, msg);
      await store.shopify.setStatus(task.shopId, { ok: false, error: msg });
      await store.log(task.shopId, 'marco', `No he podido subir «${l.web.title}» a tu web: ${msg}`);
      await store.setAgent(task.shopId, 'marco', { status: 'warn', task: msg, short: 'Revisa Shopify' });
    }
    throw e;
  }
}
