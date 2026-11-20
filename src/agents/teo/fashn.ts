/**
 * Cliente de FASHN (https://docs.fashn.ai), el servicio que pone la prenda en una modelo.
 * Precio: 0,075 $ por crédito. Producto en modelo «balanced» a 1k = 2 créditos;
 * quitar fondo = 1 crédito. Las peticiones fallidas no se cobran.
 */
const API = process.env.FASHN_API_URL ?? 'https://api.fashn.ai/v1';

export const hasFashn = () => !!process.env.FASHN_API_KEY;

type Job =
  | { model_name: 'product-to-model'; inputs: { product_image: string; prompt?: string; aspect_ratio?: string; resolution?: '1k' | '2k'; generation_mode?: 'fast' | 'balanced' | 'quality'; seed?: number; output_format?: 'png' | 'jpeg'; return_base64?: boolean } }
  | { model_name: 'tryon-max'; inputs: { product_image: string; model_image: string; prompt?: string; resolution?: '1k' | '2k'; generation_mode?: 'fast' | 'balanced' | 'quality'; seed?: number; output_format?: 'png' | 'jpeg'; return_base64?: boolean } }
  | { model_name: 'background-remove'; inputs: { image: string; return_base64?: boolean } };

type Status = { id: string; status: 'starting' | 'in_queue' | 'processing' | 'completed' | 'failed'; output?: string[]; error: { name: string; message: string } | null };

export class FashnError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.FASHN_API_KEY}`, 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) throw new FashnError(`FASHN ${res.status}: ${(await res.text()).slice(0, 200)}`, res.status === 429 || res.status >= 500);
  return res.json() as Promise<T>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Lanza un trabajo y espera el resultado (hasta ~3 min). Devuelve la imagen. */
export async function runFashn(job: Job): Promise<{ data: Buffer; mediaType: string }> {
  const sub = await call<{ id: string | null; error: unknown }>('/run', { method: 'POST', body: JSON.stringify(job) });
  if (!sub.id) throw new FashnError(`FASHN no aceptó el trabajo: ${JSON.stringify(sub.error).slice(0, 200)}`, false);
  for (let i = 0; i < 60; i++) {
    await sleep(i < 5 ? 2000 : 3000);
    const st = await call<Status>(`/status/${sub.id}`);
    if (st.status === 'completed' && st.output?.[0]) return download(st.output[0]);
    if (st.status === 'failed') throw new FashnError(`${st.error?.name}: ${st.error?.message}`, false);
  }
  throw new FashnError('FASHN tardó demasiado', true);
}

async function download(urlOrData: string) {
  if (urlOrData.startsWith('data:')) {
    const [head, b64] = urlOrData.split(',', 2);
    return { data: Buffer.from(b64, 'base64'), mediaType: head.slice(5).split(';')[0] };
  }
  const r = await fetch(urlOrData);
  if (!r.ok) throw new FashnError(`No se pudo descargar el resultado (${r.status})`, true);
  return { data: Buffer.from(await r.arrayBuffer()), mediaType: r.headers.get('content-type') ?? 'image/png' };
}
