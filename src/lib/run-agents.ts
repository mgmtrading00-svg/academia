import 'server-only';
import { after } from 'next/server';
import { IS_DEMO } from './config';

/**
 * Los empleados trabajan justo después de responder a la tienda, en el propio servidor.
 * En la demostración, sobre la tienda de ejemplo; en la web real, con la clave de servicio.
 * (En producción también puede correr aparte con `npm run empleados`.)
 */
export function runAgentsSoon() {
  after(async () => {
    const { drain } = await import('@/agents/runner');
    if (IS_DEMO) {
      const { demoStore } = await import('@/agents/stores/demo');
      await drain(demoStore);
    } else if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { supabaseStore } = await import('@/agents/stores/supabase');
      await drain(supabaseStore(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY));
    }
  });
}
