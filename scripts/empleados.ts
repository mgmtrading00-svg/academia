/**
 * Proceso de los empleados en producción: vigila la cola de tareas y la va trabajando.
 *   npm run empleados            (se queda escuchando)
 *   npm run empleados -- --una   (vacía la cola una vez y termina; útil para un cron)
 * Necesita NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y GEMINI_API_KEY.
 */
import { drain } from '../src/agents/runner';
import { supabaseStore } from '../src/agents/stores/supabase';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
if (!process.env.GEMINI_API_KEY) console.warn('Aviso: falta GEMINI_API_KEY; el trabajo de los empleados se simula.');

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
