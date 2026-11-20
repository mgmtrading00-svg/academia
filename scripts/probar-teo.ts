/**
 * Prueba de Teo sin gastar: levanta un Claude y un FASHN de mentira en local,
 * pasa una foto por todo el proceso y comprueba lo que se envía y lo que se guarda.
 *   npx tsx scripts/probar-teo.ts ruta/a/foto.jpg
 */
import http from 'node:http';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import type { OfficeStore, QueuedTask, TaskOutcome } from '../src/agents/store';

const photoPath = process.argv[2];
const sent: { claude: Record<string, unknown>[]; fashn: Record<string, unknown>[] } = { claude: [], fashn: [] };
let qaCalls = 0;
const failFirstQa = process.argv.includes('--falla-qa');

const server = http.createServer(async (req, res) => {
  const body = await new Promise<string>((r) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => r(b)); });
  const json = (o: unknown) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (req.url === '/v1/messages') {
    const b = JSON.parse(body); sent.claude.push(b);
    const isQa = (b.system as string).includes('control de calidad');
    const out = isQa
      ? (qaCalls++ === 0 && failFirstQa ? { pass: false, problems: ['El verde es más claro que el original'], retry_prompt: 'keep the exact bottle green colour' } : { pass: true, problems: [], retry_prompt: '' })
      : { usable: true, ask_shop: '', category: 'vestido', placement: 'entera', color: 'verde botella', pattern: 'liso', fabric_guess: 'punto', details: ['seis botones crudos', 'cinturón fino'], defects: [], title: 'Vestido midi verde botella' };
    return json({ id: 'msg_x', type: 'message', role: 'assistant', model: b.model, stop_reason: 'end_turn', stop_sequence: null, content: [{ type: 'text', text: JSON.stringify(out) }], usage: { input_tokens: 1, output_tokens: 1 } });
  }
  if (req.url === '/fashn/run') { sent.fashn.push(JSON.parse(body)); return json({ id: `p${sent.fashn.length}`, error: null }); }
  if (req.url?.startsWith('/fashn/status/')) {
    const png = await sharp({ create: { width: 600, height: 800, channels: 3, background: '#ddd' } }).jpeg().toBuffer();
    return json({ id: 'p', status: 'completed', output: [`data:image/jpeg;base64,${png.toString('base64')}`], error: null });
  }
  res.writeHead(404); res.end();
});

async function main() {
  await new Promise<void>((r) => server.listen(4555, r));
  Object.assign(process.env, { ANTHROPIC_API_KEY: 'test', ANTHROPIC_BASE_URL: 'http://localhost:4555', FASHN_API_KEY: 'test', FASHN_API_URL: 'http://localhost:4555/fashn' });
  const { runTeo } = await import('../src/agents/teo');

  const log: string[] = []; const created: unknown[] = []; let saved: unknown = null;
  const store: OfficeStore = {
    claimNext: async () => null, finish: async () => {}, retryLater: async () => {},
    createTask: async (t) => void created.push(t),
    shopProfile: async () => ({ name: 'Prueba', modelo: 'Mujer 25 a 40', autonomia: 'Nada, quiero aprobar todo' }),
    getPhoto: async () => ({ id: 'f1', shopId: 's1', fileName: 'vestido.jpg', note: '39,90 €', image: { data: readFileSync(photoPath), mediaType: 'image/jpeg' } }),
    savePhotoResult: async (_id, r) => void (saved = { status: r.status, bytes: r.image.data.length, attributes: r.attributes }),
    markPhoto: async () => {}, setAgent: async () => {}, log: async (_s, a, m) => void log.push(`${a}: ${m}`),
  };
  const task: QueuedTask = { id: 't1', shopId: 's1', agentId: 'teo', kind: 'foto_modelo', title: 'x', payload: { photo_id: 'f1' }, attempts: 0 };
  const outcome: TaskOutcome = await runTeo(task, store);

  const c0 = sent.claude[0] as { model: string; output_config: { effort: string; format: { type: string } }; messages: { content: { type: string }[] }[] };
  const f0 = sent.fashn[0] as { model_name: string; inputs: Record<string, unknown> };
  console.log('Claude: llamadas', sent.claude.length, '· modelo', c0.model, '· formato', c0.output_config.format.type, '· esfuerzo', c0.output_config.effort, '· imágenes', c0.messages[0].content.filter((x) => x.type === 'image').length);
  console.log('FASHN: llamadas', sent.fashn.length, '·', f0.model_name, '·', { ...f0.inputs, product_image: String(f0.inputs.product_image).slice(0, 30) + '…' });
  console.log('Resultado:', outcome.status, outcome.status === 'espera_aprobacion' ? outcome.approvalLabel : '');
  console.log('Guardado:', saved);
  console.log('Tareas creadas:', created);
  console.log('Actividad:', log);
  server.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
