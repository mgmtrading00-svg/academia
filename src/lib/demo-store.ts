import 'server-only';
import type { AgentId, AgentState } from './agents';
import type { ActivityItem, Kpis, OfficeSnapshot, Photo, Shop, SurveyAnswers, Task } from './types';

// Datos de ejemplo en memoria (se reinician al reiniciar el servidor).
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
let seq = 100;
const id = () => `demo-${++seq}`;

interface DemoDb {
  shop: Shop;
  agents: AgentState[];
  tasks: Task[];
  activity: ActivityItem[];
  photos: Photo[];
  survey: SurveyAnswers;
  kpis: Kpis;
}

function seed(): DemoDb {
  const shop: Shop = { id: 'demo-shop', name: 'Boutique Carmela', ownerName: 'Carmela', plan: 'beta' };
  return {
    shop,
    agents: [
      { id: 'lola', status: 'busy', task: 'Preparando tu resumen de la tarde', short: '2 cosas para aprobar' },
      { id: 'teo', status: 'warn', task: '3 fotos en modelo esperan tu visto bueno', short: '3 fotos para aprobar' },
      { id: 'nuria', status: 'busy', task: 'Escribiendo fichas de 5 prendas nuevas', short: 'Escribiendo 5 fichas' },
      { id: 'bruno', status: 'warn', task: 'Vestido de lino talla M: queda 1', short: 'Lino talla M: queda 1' },
      { id: 'vera', status: 'ok', task: 'Informe diario de anuncios enviado', short: 'Informe del día enviado' },
      { id: 'marco', status: 'busy', task: 'Subiendo 4 prendas a Vinted', short: 'Vinted: 2 de 4 subidas' },
      { id: 'sara', status: 'ok', task: 'Publicación y pin programados para las 19:00', short: 'Publicación a las 19:00' },
      { id: 'leo', status: 'off', task: 'Disponible en la fase 2', short: 'Disponible en fase 2' },
    ],
    tasks: [
      { id: 'demo-t1', shopId: shop.id, agentId: 'teo', kind: 'foto_modelo', title: '3 fotos en modelo', status: 'espera_aprobacion', approvalLabel: 'Aprobar 3 fotos en modelo', createdAt: ago(45) },
      { id: 'demo-t2', shopId: shop.id, agentId: 'bruno', kind: 'stock_alerta', title: 'Retirar el vestido de lino M de Amazon', status: 'espera_aprobacion', approvalLabel: 'Retirar el vestido de lino M de Amazon', createdAt: ago(78) },
    ],
    activity: [
      { id: id(), agentId: 'lola', at: ago(33), message: 'Te he dejado 2 cosas para aprobar.' },
      { id: id(), agentId: 'lola', at: ago(245), message: 'Resumen de la mañana: 6 prendas nuevas en camino.' },
      { id: id(), agentId: 'teo', at: ago(45), message: 'Fotos en modelo listas: vestido midi verde, camisa de lino, falda plisada.' },
      { id: id(), agentId: 'teo', at: ago(310), message: 'Fondo limpiado en 5 fotos del mostrador.' },
      { id: id(), agentId: 'nuria', at: ago(55), message: 'Ficha de la falda plisada lista para Vinted y tu web.' },
      { id: id(), agentId: 'bruno', at: ago(78), message: 'Vestido de lino talla M: queda 1. ¿Lo retiro de Amazon para no venderlo dos veces?' },
      { id: id(), agentId: 'vera', at: ago(480), message: 'Ayer: 23 € gastados, 97 € vendidos. Propongo subir 5 € al anuncio de abrigos.' },
      { id: id(), agentId: 'marco', at: ago(65), message: 'Subiendo 4 prendas a Vinted. 2 publicadas.' },
      { id: id(), agentId: 'sara', at: ago(380), message: 'Publicación de Instagram y pin programados para las 19:00.' },
    ],
    photos: [],
    survey: {},
    kpis: { published: 34, marketplaceSales: 11, lowStock: 3, adsRoas: 4.2 },
  };
}

const g = globalThis as unknown as { __ovDemo?: DemoDb };
const db = () => (g.__ovDemo ??= seed());

export const demo = {
  snapshot(): OfficeSnapshot {
    const d = db();
    return { shop: d.shop, agents: d.agents, tasks: d.tasks, activity: [...d.activity].sort((a, b) => b.at.localeCompare(a.at)), kpis: d.kpis };
  },
  decide(taskId: string, approve: boolean) {
    const d = db();
    const t = d.tasks.find((x) => x.id === taskId && x.status === 'espera_aprobacion');
    if (!t) throw new Error('Esta tarea ya no espera aprobación');
    t.status = approve ? 'hecha' : 'cambios';
    d.activity.push({ id: id(), agentId: t.agentId, at: new Date().toISOString(), message: approve ? `Aprobado: ${t.title}. Me pongo con ello.` : `Vale, rehago: ${t.title}.` });
    const a = d.agents.find((x) => x.id === t.agentId)!;
    a.status = 'busy';
    a.task = approve ? 'Aplicando lo que has aprobado' : 'Rehaciendo con tus cambios';
    a.short = approve ? 'Aplicando lo aprobado' : 'Rehaciendo cambios';
    const left = d.tasks.filter((x) => x.status === 'espera_aprobacion').length;
    const lola = d.agents.find((x) => x.id === 'lola')!;
    lola.short = left ? `${left} cosa${left > 1 ? 's' : ''} para aprobar` : 'Todo al día';
    lola.task = left ? `Te he dejado ${left} cosa${left > 1 ? 's' : ''} para aprobar` : 'Todo aprobado. Vigilo que el equipo avance.';
    lola.status = left ? 'busy' : 'ok';
  },
  addPhotos(files: { name: string; dataUrl: string | null }[], note: string) {
    const d = db();
    for (const f of files) {
      d.photos.unshift({ id: id(), shopId: d.shop.id, fileName: f.name, url: f.dataUrl, note, status: 'en_cola', createdAt: new Date().toISOString() });
      d.tasks.push({ id: id(), shopId: d.shop.id, agentId: 'teo', kind: 'foto_modelo', title: `Foto en modelo: ${f.name}`, status: 'pendiente', createdAt: new Date().toISOString() });
    }
    const teo = d.agents.find((x) => x.id === 'teo')!;
    teo.status = 'busy';
    teo.task = `Poniendo en modelo ${files.length} foto${files.length > 1 ? 's' : ''} nueva${files.length > 1 ? 's' : ''}`;
    teo.short = 'Fotos nuevas en cola';
    d.activity.push({ id: id(), agentId: 'teo', at: new Date().toISOString(), message: files.length === 1 ? 'Recibida 1 foto. Te aviso cuando esté en modelo.' : `Recibidas ${files.length} fotos. Te aviso cuando estén en modelo.` });
  },
  photos: () => db().photos,
  survey: () => db().survey,
  saveSurvey(answers: SurveyAnswers, completed: boolean) {
    const d = db();
    d.survey = { ...d.survey, ...answers };
    if (completed) {
      d.activity.push({ id: id(), agentId: 'lola' as AgentId, at: new Date().toISOString(), message: 'Encuesta de alta recibida. Configuro tu oficina con tus respuestas.' });
    }
  },
};
