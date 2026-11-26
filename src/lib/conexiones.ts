import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { IS_DEMO } from './config';

/** Cliente con la clave de servicio. Solo en el servidor, y siempre después de comprobar la tienda de la sesión. */
export function adminClient() {
  if (IS_DEMO || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

/** Lo que el panel puede enseñar de la conexión con Shopify (nunca las claves). */
export interface ShopifyStatus {
  connected: boolean;
  shopDomain?: string;
  storeName?: string | null;
  mode?: 'app' | 'token';
  publishStatus?: 'DRAFT' | 'ACTIVE';
  autoPublish?: boolean;
  lastOkAt?: string | null;
  lastError?: string | null;
  serverReady: boolean;
}

export async function getShopifyStatus(shopId: string): Promise<ShopifyStatus> {
  const sb = adminClient();
  if (!sb) return { connected: false, serverReady: false };
  const { data: c } = await sb.from('shop_connections')
    .select('shop_domain,store_name,client_id,publish_status,auto_publish,last_ok_at,last_error')
    .eq('shop_id', shopId).eq('provider', 'shopify').maybeSingle();
  if (!c) return { connected: false, serverReady: true };
  return {
    connected: true, serverReady: true, shopDomain: c.shop_domain, storeName: c.store_name, mode: c.client_id ? 'app' : 'token',
    publishStatus: c.publish_status, autoPublish: c.auto_publish, lastOkAt: c.last_ok_at, lastError: c.last_error,
  };
}
