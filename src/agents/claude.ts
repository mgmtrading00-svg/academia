import Anthropic from '@anthropic-ai/sdk';

/** Modelo que usan los empleados para ver y razonar. */
export const MODEL = 'claude-opus-5-5';

export const hasClaude = () => !!process.env.ANTHROPIC_API_KEY;

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

export type ImageInput = { mediaType: 'image/jpeg' | 'image/png' | 'image/webp'; base64: string };

export class AgentRefusal extends Error {}

/**
 * Pide a Claude una respuesta que cumpla un esquema JSON (salida estructurada).
 * Devuelve el objeto ya interpretado. Lanza AgentRefusal si el modelo se niega.
 */
export async function askJson<T>(opts: {
  system: string;
  images: ImageInput[];
  text: string;
  schema: Record<string, unknown>;
  effort?: 'low' | 'medium' | 'high';
}): Promise<T> {
  const content: Anthropic.ContentBlockParam[] = [
    ...opts.images.map((img) => ({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: img.mediaType, data: img.base64 },
    })),
    { type: 'text', text: opts.text },
  ];
  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: opts.system,
    output_config: { effort: opts.effort ?? 'medium', format: { type: 'json_schema', schema: opts.schema } },
    messages: [{ role: 'user', content }],
  });
  if (res.stop_reason === 'refusal') throw new AgentRefusal('El modelo no ha querido revisar esta imagen.');
  if (res.stop_reason === 'max_tokens') throw new Error('Respuesta cortada por longitud.');
  const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  return JSON.parse(text) as T;
}
