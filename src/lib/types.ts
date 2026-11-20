import type { AgentId, AgentState } from './agents';

export interface Shop {
  id: string;
  name: string;
  ownerName: string;
  plan: 'esencial' | 'profesional' | 'elite' | 'beta';
}

export type TaskStatus = 'pendiente' | 'en_curso' | 'espera_aprobacion' | 'hecha' | 'cambios' | 'revision';

/** Unidad de trabajo de un empleado. Es la "cola" que procesan los agentes. */
export interface Task {
  id: string;
  shopId: string;
  agentId: AgentId;
  kind: string; // p. ej. 'foto_modelo', 'ficha', 'stock_alerta'
  title: string;
  status: TaskStatus;
  approvalLabel?: string; // texto del botón cuando espera aprobación
  payload?: Record<string, unknown>;
  attempts?: number;
  lastError?: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  agentId: AgentId;
  at: string; // ISO
  message: string;
}

export interface Photo {
  id: string;
  shopId: string;
  fileName: string;
  url: string | null; // URL firmada o data: en modo demo
  note: string;
  status: 'en_cola' | 'repetir' | 'lista' | 'aprobada' | 'publicada';
  /** Foto de catálogo que ha hecho Teo (URL firmada o data: en modo demo). */
  modelUrl?: string | null;
  /** Lo que Teo ha visto de la prenda: título, color, defectos… */
  attributes?: PhotoAttributes;
  createdAt: string;
}

export interface PhotoAttributes {
  garment?: { title: string; color: string; pattern: string; category: string; defects: string[]; ask_shop: string };
  qa?: { pass: boolean; problems: string[] };
  tries?: number;
  mode?: 'modelo' | 'producto';
  provider?: 'fashn' | 'simulado';
}

export interface Kpis {
  published: number;
  marketplaceSales: number;
  lowStock: number;
  adsRoas: number | null;
}

export interface OfficeSnapshot {
  shop: Shop;
  agents: AgentState[];
  tasks: Task[];
  activity: ActivityItem[];
  kpis: Kpis;
}

export type SurveyAnswers = Record<string, string>;
