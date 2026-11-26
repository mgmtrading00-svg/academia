import type { AgentId, AgentStatus } from '../lib/agents';
import type { Listing } from '../lib/types';

/** Tarea de la cola tal y como la recibe un empleado. */
export interface QueuedTask {
  id: string;
  shopId: string;
  agentId: AgentId;
  kind: string;
  title: string;
  payload: Record<string, unknown>;
  attempts: number;
}

export interface StoredImage {
  data: Buffer;
  mediaType: string;
}

/** Una foto terminada por Teo: la de producto limpia, una en modelo o un post. */
export interface TeoResult {
  kind: 'producto' | 'modelo' | 'mejorada' | 'post';
  /** Lo que ve la tienda debajo de la foto, p. ej. «En modelo · patio andaluz». */
  label: string;
  image: StoredImage;
}

/** Lo que el empleado necesita saber de la tienda (sale de la encuesta de alta). */
export interface ShopProfile {
  name: string;
  /** Respuesta a «Modelos para las fotos». */
  modelo?: string;
  /** Respuesta a «Qué puede publicar la oficina sin preguntarte». */
  autonomia?: string;
  /** Tono de la marca, para Nuria y Sara. */
  tono?: string;
  /** Palabras que la tienda no quiere usar. */
  evitar?: string;
  /** Dónde vende (web, Vinted, Amazon…). */
  canales?: string;
  /** Dirección de su web, para los posts. */
  web?: string;
}

export type TaskOutcome =
  | { status: 'hecha'; payload?: Record<string, unknown> }
  | { status: 'espera_aprobacion'; approvalLabel: string; payload?: Record<string, unknown> }
  /** Revisión interna de nuestro equipo: el cliente no se entera ni tiene que hacer nada. */
  | { status: 'revision'; reason: string; payload?: Record<string, unknown> };

/**
 * Acceso a datos de la oficina. Hay dos implementaciones: Supabase (real, con la
 * clave de servicio) y la memoria del modo demostración. Los empleados solo ven esto.
 */
export interface OfficeStore {
  /** Coge la siguiente tarea pendiente y la marca «en curso» de forma atómica. */
  claimNext(agentId: AgentId): Promise<QueuedTask | null>;
  finish(task: QueuedTask, outcome: TaskOutcome): Promise<void>;
  /** Devuelve la tarea a la cola tras un fallo pasajero. */
  retryLater(task: QueuedTask, error: string): Promise<void>;
  createTask(t: Omit<QueuedTask, 'id' | 'attempts'>): Promise<void>;

  shopProfile(shopId: string): Promise<ShopProfile>;
  getPhoto(photoId: string): Promise<{ id: string; shopId: string; fileName: string; note: string; image: StoredImage } | null>;
  /** Guarda las fotos de Teo. La primera es la principal (la de la ficha). */
  savePhotoResult(photoId: string, r: { results: TeoResult[]; attributes: Record<string, unknown>; status: 'lista' | 'aprobada' }): Promise<void>;
  markPhoto(photoId: string, status: 'repetir', attributes: Record<string, unknown>): Promise<void>;
  saveListing(photoId: string, listing: Listing): Promise<void>;

  /** Solo en la web real: conexión con la tienda online del cliente (Marco). */
  shopify?: ShopifyStore;

  setAgent(shopId: string, agentId: AgentId, s: { status: AgentStatus; task: string; short: string }): Promise<void>;
  log(shopId: string, agentId: AgentId, message: string): Promise<void>;
}

/** Lo que Marco necesita para subir una prenda a la tienda Shopify del cliente. */
export interface ShopifyStore {
  connection(shopId: string): Promise<(import('./marco/shopify').ShopifyConnection & { storeName?: string | null }) | null>;
  saveToken(shopId: string, token: string, expiresAt: string): Promise<void>;
  setStatus(shopId: string, s: { ok: boolean; error?: string; storeName?: string }): Promise<void>;
  /** Ficha, datos de Teo y direcciones temporales de sus fotos (para que Shopify las descargue). */
  publishData(photoId: string): Promise<{
    shopId: string;
    listing: Listing & { shopifyProductId?: string | null };
    garment?: { title: string; category: string; color: string };
    images: { url: string; alt: string; kind: string }[];
  } | null>;
  markPublished(photoId: string, r: { productId: string; adminUrl: string; onlineUrl: string | null }): Promise<void>;
  markFailed(photoId: string, error: string): Promise<void>;
}
