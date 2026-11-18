// Catálogo de empleados digitales. Cada uno hace un solo trabajo.
export type AgentId = 'lola' | 'teo' | 'nuria' | 'bruno' | 'vera' | 'marco' | 'sara' | 'leo';
export type AgentStatus = 'busy' | 'ok' | 'warn' | 'off';

export interface AgentDef {
  id: AgentId;
  name: string;
  role: string;
  color: string;
  does: string;
  phase: 1 | 2;
}

export const AGENTS: AgentDef[] = [
  { id: 'lola', name: 'Lola', role: 'Jefa de oficina', color: '#2747E8', phase: 1, does: 'Habla contigo por WhatsApp, reparte el trabajo y te pide aprobación.' },
  { id: 'teo', name: 'Teo', role: 'Fotógrafo', color: '#D9488B', phase: 1, does: 'Limpia el fondo y pone tu prenda en una modelo realista.' },
  { id: 'nuria', name: 'Nuria', role: 'Catalogadora', color: '#0F8B8D', phase: 1, does: 'Título, descripción, tallas y palabras clave para cada canal.' },
  { id: 'bruno', name: 'Bruno', role: 'Almacén', color: '#8A5A2B', phase: 1, does: 'Cuadra el stock entre tienda, web, Amazon y Vinted.' },
  { id: 'vera', name: 'Vera', role: 'Publicidad', color: '#6B4FD8', phase: 2, does: 'Estudia tus anuncios de Facebook cada día y propone cambios.' },
  { id: 'marco', name: 'Marco', role: 'Marketplaces', color: '#C2410C', phase: 2, does: 'Publica y responde en Amazon y Vinted.' },
  { id: 'sara', name: 'Sara', role: 'Redes sociales', color: '#15803D', phase: 2, does: 'Instagram y Pinterest con tu estilo, sin que escribas nada.' },
  { id: 'leo', name: 'Leo', role: 'Atención al cliente', color: '#475569', phase: 2, does: 'Contesta dudas de tallas, envíos y devoluciones.' },
];

export const AGENT_BY_ID = Object.fromEntries(AGENTS.map((a) => [a.id, a])) as Record<AgentId, AgentDef>;

export const STATUS_LABEL: Record<AgentStatus, string> = {
  busy: 'Trabajando',
  ok: 'Al día',
  warn: 'Te necesita',
  off: 'Libre',
};

/** Estado de un empleado para una tienda concreta. */
export interface AgentState {
  id: AgentId;
  status: AgentStatus;
  task: string; // frase larga para el detalle
  short: string; // etiqueta corta en la oficina
}
