/**
 * Proceso de los empleados en producción: vigila la cola de tareas y la va trabajando.
 *   npm run empleados            (se queda escuchando)
 *   npm run empleados -- --una   (vacía la cola una vez y termina; útil para un cron)
 * Necesita NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY y FASHN_API_KEY.
 */
import { drain } from '../src/agents/runner';
import { supabaseStore } from '../src/agents/stores/supabase';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
for (const k of ['ANTHROPIC_API_KEY', 'FASHN_API_KEY']) if (!process.env[k]) console.warn(`Aviso: falta ${k}; esa parte se simula.`);

const store = supabaseStore(url, key);
const once = process.argv.includes('--una');

async function main() {
  do {
    const n = await drain(store).catch((e) => (console.error(e), 0));
    if (n) console.log(`${new Date().toISOString()} · ${n} tarea(s) hechas`);
    if (!once) await new Promise((r) => setTimeout(r, 5000));
  } while (!once);
}
main();
