/* eslint-disable @typescript-eslint/no-explicit-any -- script de prueba que lee JSON sin tipar */
/**
 * Prueba de Teo y Nuria sin gastar: levanta un Gemini de mentira en local, pasa una foto
 * por todo el proceso y comprueba lo que se envía y lo que se guarda.
 *   npx tsx scripts/probar-teo.ts foto.jpg               (Teo mejora la foto, sin modelo)
 *   npx tsx scripts/probar-teo.ts foto.jpg --con-modelo  (con generación de fotos)
 *   npx tsx scripts/probar-teo.ts foto.jpg --con-modelo --falla-qa
 */
import http from 'node:http';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import type { OfficeStore, QueuedTask, TaskOutcome } from '../src/agents/store';

const photoPath = process.argv[2];
const withModel = process.argv.includes('--con-modelo');
const failFirstQa = process.argv.includes('--falla-qa');
const calls: { url: string; body: Record<string, any> }[] = [];
let qaCalls = 0;

const server = http.createServer(async (req, res) => {
  const raw = await new Promise<string>((r) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => r(b)); });
  const body = JSON.parse(raw || '{}');
  calls.push({ url: req.url ?? '', body });
  const reply = (parts: unknown[]) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ candidates: [{ content: { role: 'model', parts }, finishReason: 'STOP' }] })); };
  if (!req.url?.includes(':generateContent')) { res.writeHead(404); return res.end(); }
  if (req.url.includes('image')) {
    const img = await sharp({ create: { width: 600, height: 800, channels: 3, background: '#ddd' } }).png().toBuffer();
    return reply([{ inlineData: { mimeType: 'image/png', data: img.toString('base64') } }]);
  }
  const system = JSON.stringify(body.systemInstruction ?? body.system_instruction ?? '');
  if (system.includes('Nuria')) return reply([{ text: JSON.stringify({ web: { title: 'Vestido midi verde botella', description: 'Vestido de punto con botones.\n\nCon botines para el día.' }, vinted: { title: 'Vestido midi verde botella', description: 'Vestido midi.\nEnvío rápido.' }, amazon: { title: 'Vestido midi verde botella con botones', bullets: ['Color: verde botella', 'Detalle: seis botones', 'Corte: midi'] }, tags: ['vestido', 'verde'] }) }]);
  const out = system.includes('control de calidad')
    ? (qaCalls++ === 0 && failFirstQa ? { pass: false, problems: ['El verde es más claro que el original'], retry_prompt: 'keep the exact bottle green colour' } : { pass: true, problems: [], retry_prompt: '' })
    : { usable: true, ask_shop: '', category: 'vestido', placement: 'entera', color: 'verde botella', pattern: 'liso', fabric_guess: 'punto', details: ['seis botones crudos', 'cinturón fino'], defects: [], title: 'Vestido midi verde botella' };
  reply([{ text: JSON.stringify(out) }]);
});

async function main() {
  await new Promise<void>((r) => server.listen(4555, r));
  Object.assign(process.env, { GEMINI_API_KEY: 'test', GEMINI_BASE_URL: 'http://localhost:4555', GEMINI_FOTOS_MODELO: withModel ? 'si' : 'no' });
  const { runTeo } = await import('../src/agents/teo');

  const log: string[] = []; const created: QueuedTask[] = []; let saved: unknown = null; let listing: unknown = null;
  const store: OfficeStore = {
    claimNext: async () => null, finish: async () => {}, retryLater: async () => {},
    createTask: async (t) => void created.push({ ...t, id: `t${created.length + 2}`, attempts: 0 }),
    shopProfile: async () => ({ name: 'Prueba', modelo: 'Mujer 25 a 40', autonomia: 'Nada, quiero aprobar todo' }),
    getPhoto: async () => ({ id: 'f1', shopId: 's1', fileName: 'vestido.jpg', note: process.argv.includes('--sin-precio') ? 'vestido verde' : 'Vestido midi · 39,90 € · S, M, L', image: { data: readFileSync(photoPath), mediaType: 'image/jpeg' } }),
    savePhotoResult: async (_id, r) => void (saved = { status: r.status, bytes: r.image.data.length, provider: r.attributes.provider, tries: r.attributes.tries }),
    markPhoto: async () => {}, saveListing: async (_id, l) => void (listing = l), setAgent: async () => {}, log: async (_s, a, m) => void log.push(`${a}: ${m}`),
  };
  const task: QueuedTask = { id: 't1', shopId: 's1', agentId: 'teo', kind: 'foto_modelo', title: 'x', payload: { photo_id: 'f1' }, attempts: 0 };
  const outcome: TaskOutcome = await runTeo(task, store);
  const { runNuria } = await import('../src/agents/nuria');
  const fichaTask = created.find((t) => t.kind === 'ficha');
  const fichaOutcome = fichaTask ? await runNuria(fichaTask, store) : null;

  for (const c of calls) {
    const parts = c.body.contents?.[0]?.parts ?? [];
    const cfg = c.body.generationConfig ?? {};
    console.log('Gemini', c.url.split('?')[0], '· imágenes', parts.filter((p: any) => p.inlineData).length, '· json', !!cfg.responseJsonSchema, '· salida', cfg.responseModalities ?? '-', cfg.imageConfig ? JSON.stringify(cfg.imageConfig) : '');
    const prompt = parts.find((p: any) => p.text)?.text;
    if (c.url.includes('image')) console.log('   indicación:', prompt);
  }
  console.log('Resultado:', outcome.status, outcome.status === 'espera_aprobacion' ? outcome.approvalLabel : '');
  console.log('Guardado:', saved);
  console.log('Nuria:', fichaOutcome?.status, fichaOutcome?.status === 'espera_aprobacion' ? fichaOutcome.approvalLabel : '');
  console.log('Ficha:', JSON.stringify(listing, null, 1));
  console.log('Tareas creadas:', created.map((t) => `${t.agentId}/${t.kind}: ${t.title}`));
  console.log('Actividad:', log);
  server.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
