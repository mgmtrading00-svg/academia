import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { AgentRefusal } from '../gemini';

/**
 * Conexión con la tienda Shopify de cada cliente.
 *
 * Dos formas de conectar:
 *  - App del Dev Dashboard de Shopify (desde 2026): la tienda nos da Client ID y Client secret
 *    y pedimos un token de 24 h con el «client credentials grant».
 *  - App antigua creada en el admin (antes de 2026): un token fijo que empieza por shpat_.
 */
export const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2026-10';

export interface ShopifyConnection {
  shopDomain: string;
  clientId?: string | null;
  clientSecret?: string | null;
  accessToken?: string | null;
  tokenExpiresAt?: string | null;
  publishStatus: 'DRAFT' | 'ACTIVE';
}

export class ShopifyError extends AgentRefusal {}

// ---------- Cifrado de claves guardadas ----------
// La llave sale de una variable que solo tiene el servidor; una copia de la base de datos sola no basta.
function key() {
  const secret = process.env.CONEXIONES_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Falta la clave del servidor para guardar conexiones');
  return createHash('sha256').update(`oficina-conexiones:${secret}`).digest();
}
export function encrypt(text: string) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), enc.toString('base64')].join(':');
}
export function decrypt(blob: string | null | undefined): string | null {
  if (!blob) return null;
  const [v, iv, tag, enc] = blob.split(':');
  if (v !== 'v1') return null;
  try {
    const d = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
    d.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(enc, 'base64')), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}

// ---------- Dirección de la tienda ----------
/** Acepta «victoriamoral», «victoriamoral.myshopify.com», la URL del admin o la web pública. */
export async function resolveShopDomain(input: string): Promise<string | null> {
  let s = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const admin = input.match(/admin\.shopify\.com\/store\/([a-z0-9-]+)/i);
  if (admin) return `${admin[1].toLowerCase()}.myshopify.com`;
  if (/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(s)) return s;
  if (/^[a-z0-9][a-z0-9-]*$/.test(s)) return `${s}.myshopify.com`;
  // Web propia (p. ej. victoriamoral.com): Shopify dice cuál es su dirección interna en /meta.json.
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(s)) return null;
  s = s.replace(/^www\./, '');
  for (const host of [s, `www.${s}`]) {
    try {
      const r = await fetch(`https://${host}/meta.json`, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const j = (await r.json()) as { myshopify_domain?: string };
      if (j.myshopify_domain?.endsWith('.myshopify.com')) return j.myshopify_domain;
    } catch {
      /* probar la siguiente */
    }
  }
  return null;
}

// ---------- Token ----------
/** Devuelve un token válido; si hace falta pide uno nuevo. `fresh` trae el token nuevo para guardarlo. */
export async function getToken(c: ShopifyConnection): Promise<{ token: string; fresh?: { token: string; expiresAt: string } }> {
  const valid = c.accessToken && (!c.tokenExpiresAt || new Date(c.tokenExpiresAt).getTime() - Date.now() > 5 * 60_000);
  if (valid) return { token: c.accessToken! };
  if (!c.clientId || !c.clientSecret) {
    if (c.accessToken) return { token: c.accessToken };
    throw new ShopifyError('Falta el Client ID o el Client secret de Shopify.');
  }
  const r = await fetch(`https://${c.shopDomain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: c.clientId, client_secret: c.clientSecret }),
    signal: AbortSignal.timeout(20000),
  });
  const text = await r.text();
  if (!r.ok) {
    if (/shop_not_permitted/i.test(text))
      throw new ShopifyError('Shopify no deja usar esta app en esta tienda: la app tiene que estar creada en la misma cuenta (organización) que la tienda.');
    if (r.status === 400 || r.status === 401 || /invalid_client|unauthorized/i.test(text))
      throw new ShopifyError('Shopify no acepta el Client ID o el Client secret. Cópialos otra vez desde Settings de tu app.');
    if (r.status === 404) throw new ShopifyError('No encuentro esa tienda en Shopify. Revisa la dirección .myshopify.com.');
    throw new Error(`Shopify token ${r.status}: ${text.slice(0, 200)}`);
  }
  const j = JSON.parse(text) as { access_token: string; expires_in?: number };
  const expiresAt = new Date(Date.now() + (j.expires_in ?? 86399) * 1000).toISOString();
  return { token: j.access_token, fresh: { token: j.access_token, expiresAt } };
}

export async function gql<T>(domain: string, token: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const r = await fetch(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(60000),
  });
  const text = await r.text();
  if (r.status === 401) throw new ShopifyError('Shopify ha rechazado el acceso. Vuelve a conectar la tienda.');
  if (r.status === 402 || r.status === 423) throw new ShopifyError('La tienda de Shopify está pausada o sin plan activo.');
  if (!r.ok) throw new Error(`Shopify ${r.status}: ${text.slice(0, 300)}`);
  const j = JSON.parse(text) as { data?: T; errors?: { message: string; extensions?: { code?: string } }[] };
  if (j.errors?.length) {
    const msg = j.errors.map((e) => e.message).join('; ');
    if (/access denied|ACCESS_DENIED|scope/i.test(msg + JSON.stringify(j.errors)))
      throw new ShopifyError(`A la app de Shopify le falta un permiso (${msg}). Añade write_products y write_publications y vuelve a publicar la versión.`);
    if (j.errors.some((e) => e.extensions?.code === 'THROTTLED')) throw new Error(`Shopify ocupado: ${msg}`);
    throw new Error(`Shopify: ${msg}`);
  }
  return j.data as T;
}

/** Comprueba la conexión y devuelve el nombre de la tienda y los permisos concedidos. */
export async function testConnection(c: ShopifyConnection) {
  const t = await getToken(c);
  const d = await gql<{ shop: { name: string; primaryDomain: { url: string } }; currentAppInstallation: { accessScopes: { handle: string }[] } }>(
    c.shopDomain, t.token,
    `{ shop { name primaryDomain { url } } currentAppInstallation { accessScopes { handle } } }`,
  );
  const scopes = d.currentAppInstallation.accessScopes.map((s) => s.handle);
  const missing = ['write_products'].filter((s) => !scopes.includes(s));
  return { name: d.shop.name, url: d.shop.primaryDomain.url, scopes, missing, canPublishToChannel: scopes.includes('write_publications'), fresh: t.fresh };
}

// ---------- Subir un producto ----------
export interface ProductToPublish {
  title: string;
  descriptionHtml: string;
  productType?: string;
  vendor?: string;
  tags: string[];
  priceEur: number;
  sizes: string[];
  images: { url: string; alt: string }[];
}

export async function publishProduct(c: ShopifyConnection, token: string, p: ProductToPublish) {
  const sizes = p.sizes.length ? p.sizes : ['Única'];
  const input = {
    title: p.title,
    descriptionHtml: p.descriptionHtml,
    productType: p.productType || undefined,
    vendor: p.vendor || undefined,
    tags: p.tags.slice(0, 30),
    status: c.publishStatus,
    productOptions: [{ name: 'Talla', position: 1, values: sizes.map((name) => ({ name })) }],
    variants: sizes.map((name) => ({
      optionValues: [{ optionName: 'Talla', name }],
      price: p.priceEur.toFixed(2),
      // Sin control de stock hasta que Bruno (almacén) lo lleve: así se puede comprar.
      inventoryItem: { tracked: false },
    })),
    files: p.images.map((img) => ({ originalSource: img.url, alt: img.alt.slice(0, 500), contentType: 'IMAGE' })),
  };
  const d = await gql<{ productSet: { product: { id: string; handle: string; onlineStoreUrl: string | null } | null; userErrors: { field: string[] | null; message: string }[] } }>(
    c.shopDomain, token,
    `mutation subir($input: ProductSetInput!) {
      productSet(synchronous: true, input: $input) {
        product { id handle onlineStoreUrl }
        userErrors { field message }
      }
    }`,
    { input },
  );
  const errs = d.productSet.userErrors;
  if (errs.length || !d.productSet.product) throw new ShopifyError(`Shopify no ha aceptado la prenda: ${errs.map((e) => e.message).join('; ') || 'sin respuesta'}`);
  const product = d.productSet.product;

  // Que aparezca en la tienda online (si la app tiene permiso). Un borrador tampoco se ve hasta activarlo.
  let channel = false;
  try {
    const pubs = await gql<{ publications: { nodes: { id: string; name: string }[] } }>(c.shopDomain, token, `{ publications(first: 20) { nodes { id name } } }`);
    const online = pubs.publications.nodes.find((n) => /online store|tienda online/i.test(n.name)) ?? null;
    if (online) {
      const r = await gql<{ publishablePublish: { userErrors: { message: string }[] } }>(
        c.shopDomain, token,
        `mutation pub($id: ID!, $input: [PublicationInput!]!) { publishablePublish(id: $id, input: $input) { userErrors { message } } }`,
        { id: product.id, input: [{ publicationId: online.id }] },
      );
      channel = !r.publishablePublish.userErrors.length;
    }
  } catch (e) {
    console.warn('[marco] no se pudo poner en la tienda online:', e instanceof Error ? e.message : e);
  }

  const numericId = product.id.split('/').pop();
  const storeHandle = c.shopDomain.replace('.myshopify.com', '');
  return {
    productId: product.id,
    adminUrl: `https://admin.shopify.com/store/${storeHandle}/products/${numericId}`,
    onlineUrl: product.onlineStoreUrl,
    handle: product.handle,
    channel,
  };
}
