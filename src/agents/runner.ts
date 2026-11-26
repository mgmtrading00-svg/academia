import { ApiError } from '@google/genai';
import { AgentRefusal } from './gemini';
import { runTeo } from './teo';
import { runNuria } from './nuria';
import { runMarco } from './marco';
import type { OfficeStore, QueuedTask, TaskOutcome } from './store';
import type { AgentId } from '../lib/agents';

type Worker = (task: QueuedTask, store: OfficeStore) => Promise<TaskOutcome>;

/** Empleados que ya trabajan de verdad. Los demás dejan sus tareas en cola. */
export const WORKERS: Partial<Record<AgentId, Worker>> = {
  teo: runTeo,
  nuria: runNuria,
  marco: runMarco,
};

const MAX_ATTEMPTS = 3;

/** Procesa una tarea de cada empleado disponible. Devuelve cuántas ha hecho. */
export async function tick(store: OfficeStore): Promise<number> {
  let done = 0;
  for (const [agentId, worker] of Object.entries(WORKERS) as [AgentId, Worker][]) {
    const task = await store.claimNext(agentId);
    if (!task) continue;
    done++;
    try {
      const outcome = await worker(task, store);
      await store.finish(task, outcome);
      if (outcome.status === 'espera_aprobacion') {
        const what = agentId === 'nuria' ? ['fichas nuevas', 'Fichas para aprobar'] : ['fotos nuevas', 'Fotos para aprobar'];
        await store.setAgent(task.shopId, agentId, { status: 'warn', task: `Tienes ${what[0]} para dar el visto bueno`, short: what[1] });
        await store.setAgent(task.shopId, 'lola', { status: 'busy', task: 'Te he dejado cosas para aprobar', short: 'Cosas para aprobar' });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Reintentar solo fallos pasajeros: red, saturación (429) o error del servidor (5xx).
      const retryable = !(e instanceof AgentRefusal) && !(e instanceof SyntaxError) && !(e instanceof ApiError && e.status < 500 && e.status !== 429);
      if (retryable && task.attempts + 1 < MAX_ATTEMPTS) await store.retryLater(task, msg);
      else await store.finish(task, { status: 'revision', reason: msg });
      await store.setAgent(task.shopId, agentId, { status: 'ok', task: 'Al día', short: 'Al día' }).catch(() => {});
      console.error(`[${agentId}] tarea ${task.id}: ${msg}`);
    }
  }
  return done;
}

/** Procesa la cola hasta vaciarla. */
export async function drain(store: OfficeStore, max = 50) {
  let total = 0;
  for (let n = await tick(store); n > 0 && total < max; n = await tick(store)) total += n;
  return total;
}
