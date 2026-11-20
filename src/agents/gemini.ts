import { GoogleGenAI } from '@google/genai';

/**
 * Gemini (Google) es el cerebro y los ojos de los empleados. Una sola clave, la de la
 * oficina, para todas las tiendas: las tiendas nunca necesitan cuenta propia.
 *
 * - Revisar fotos y escribir: GEMINI_VISION_MODEL (por defecto gemini-3.5-flash), que
 *   tiene nivel gratuito. En ese nivel Google puede usar las fotos para mejorar sus productos.
 * - Generar la foto en modelo: GEMINI_IMAGE_MODEL. Google no lo ofrece gratis, así que solo
 *   se usa si GEMINI_FOTOS_MODELO=si. Si no, Teo mejora la foto él mismo, sin coste.
 */
export const VISION_MODEL = process.env.GEMINI_VISION_MODEL ?? 'gemini-3.5-flash';
export const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? 'gemini-3.1-flash-image';

export const hasGemini = () => !!process.env.GEMINI_API_KEY;
export const canGenerateImages = () => hasGemini() && process.env.GEMINI_FOTOS_MODELO === 'si';

let client: GoogleGenAI | null = null;
const ai = () =>
  (client ??= new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    ...(process.env.GEMINI_BASE_URL ? { httpOptions: { baseUrl: process.env.GEMINI_BASE_URL } } : {}),
  }));

export type ImageInput = { mimeType: string; base64: string };

/** El modelo no ha querido responder (filtro de seguridad). No se reintenta. */
export class AgentRefusal extends Error {}

const imagePart = (img: ImageInput) => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } });

/** Pide una respuesta que cumpla un esquema JSON y la devuelve ya interpretada. */
export async function askJson<T>(opts: { system: string; images: ImageInput[]; text: string; schema: Record<string, unknown> }): Promise<T> {
  const res = await ai().models.generateContent({
    model: VISION_MODEL,
    contents: [{ role: 'user', parts: [...opts.images.map(imagePart), { text: opts.text }] }],
    config: { systemInstruction: opts.system, responseMimeType: 'application/json', responseJsonSchema: opts.schema },
  });
  if (res.promptFeedback?.blockReason) throw new AgentRefusal(`Gemini bloqueó la petición: ${res.promptFeedback.blockReason}`);
  const text = res.text;
  if (!text) throw new AgentRefusal(`Gemini no devolvió respuesta (${res.candidates?.[0]?.finishReason ?? 'sin motivo'})`);
  return JSON.parse(text) as T;
}

/** Genera una imagen a partir de otras imágenes y una indicación. Devuelve la primera imagen. */
export async function generateImage(opts: { images: ImageInput[]; prompt: string; aspectRatio?: string }): Promise<{ data: Buffer; mediaType: string }> {
  const res = await ai().models.generateContent({
    model: IMAGE_MODEL,
    contents: [{ role: 'user', parts: [...opts.images.map(imagePart), { text: opts.prompt }] }],
    config: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: opts.aspectRatio ?? '3:4', imageSize: '1K' } },
  });
  if (res.promptFeedback?.blockReason) throw new AgentRefusal(`Gemini bloqueó la petición: ${res.promptFeedback.blockReason}`);
  const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part?.inlineData?.data) throw new AgentRefusal(`Gemini no devolvió imagen (${res.candidates?.[0]?.finishReason ?? 'sin motivo'})`);
  return { data: Buffer.from(part.inlineData.data, 'base64'), mediaType: part.inlineData.mimeType ?? 'image/png' };
}
