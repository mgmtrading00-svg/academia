import 'server-only';
import { demoInternals } from '@/lib/demo-store';
import type { OfficeStore } from '../store';

const now = () => new Date().toISOString();
const dataUrl = (img: { data: Buffer; mediaType: string }) => `data:${img.mediaType};base64,${img.data.toString('base64')}`;

/** Los empleados trabajando sobre la tienda de ejemplo en memoria. */
export const demoStore: OfficeStore = {
  async claimNext(agentId) {
    const t = demoInternals.db().tasks.find((x) => x.agentId === agentId && x.status === 'pendiente');
    if (!t) return null;
    t.status = 'en_curso';
    const attempts = t.attempts ?? 0;
    t.attempts = attempts + 1;
    return { id: t.id, shopId: t.shopId, agentId, kind: t.kind, title: t.title, payload: t.payload ?? {}, attempts };
  },
  async finish(task, o) {
    const t = demoInternals.db().tasks.find((x) => x.id === task.id);
    if (!t) return;
    t.status = o.status;
    t.payload = { ...t.payload, ...(o.payload ?? {}) };
    if (o.status === 'espera_aprobacion') t.approvalLabel = o.approvalLabel;
    if (o.status === 'revision') t.lastError = o.reason;
  },
  async retryLater(task, error) {
    const t = demoInternals.db().tasks.find((x) => x.id === task.id);
    if (t) Object.assign(t, { status: 'pendiente', lastError: error });
  },
  async createTask(t) {
    demoInternals.db().tasks.push({ ...t, id: demoInternals.id(), status: 'pendiente', attempts: 0, createdAt: now() });
  },
  async shopProfile() {
    const d = demoInternals.db();
    return { name: d.survey.nombre || d.shop.name, modelo: d.survey.modelo, autonomia: d.survey.autonomia, tono: d.survey.tono, evitar: d.survey.evitar, canales: d.survey.canales, web: d.survey.web };
  },
  async getPhoto(photoId) {
    const p = demoInternals.db().photos.find((x) => x.id === photoId);
    const image = demoInternals.files().get(photoId);
    if (!p || !image) return null;
    return { id: p.id, shopId: p.shopId, fileName: p.fileName, note: p.note, image };
  },
  async savePhotoResult(photoId, r) {
    const p = demoInternals.db().photos.find((x) => x.id === photoId);
    const results = r.results.map((x) => ({ kind: x.kind, label: x.label, url: dataUrl(x.image) }));
    if (p) Object.assign(p, { status: r.status, modelUrl: results[0]?.url ?? null, attributes: { ...r.attributes, results } });
  },
  async markPhoto(photoId, status, attributes) {
    const p = demoInternals.db().photos.find((x) => x.id === photoId);
    if (p) Object.assign(p, { status, attributes });
  },
  async saveListing(photoId, listing) {
    const p = demoInternals.db().photos.find((x) => x.id === photoId);
    if (p) p.listing = listing;
  },
  async setAgent(_shopId, agentId, s) {
    const a = demoInternals.db().agents.find((x) => x.id === agentId);
    if (a) Object.assign(a, s);
  },
  async log(_shopId, agentId, message) {
    demoInternals.db().activity.push({ id: demoInternals.id(), agentId, at: now(), message });
  },
};
