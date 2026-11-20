'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AGENTS, AGENT_BY_ID, STATUS_LABEL, type AgentId } from '@/lib/agents';
import type { OfficeSnapshot, Task } from '@/lib/types';
import { decideTask } from '@/app/actions';
import OfficeScene from './OfficeScene';
import Avatar from './Avatar';

const TZ = 'Europe/Madrid';
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { timeZone: TZ });

function useDecide() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<Record<string, { ok?: string; error?: string }>>({});
  const router = useRouter();
  const decide = (t: Task, approve: boolean) =>
    start(async () => {
      const r = await decideTask(t.id, approve);
      setResult((m) => ({ ...m, [t.id]: r }));
      router.refresh();
    });
  return { pending, result, decide };
}

function Needs({ tasks, onOpen, d }: { tasks: Task[]; onOpen: (id: AgentId) => void; d: ReturnType<typeof useDecide> }) {
  const done = Object.entries(d.result).filter(([, r]) => r.ok);
  if (!tasks.length)
    return (
      <section className="needs calm" aria-labelledby="needs-h">
        <h2 id="needs-h">No necesitamos nada de ti</h2>
        <p className="muted">{done.length ? 'Gracias. Tu equipo ya se ha puesto con ello.' : 'Tu equipo sigue trabajando. Te escribiremos por WhatsApp si hace falta algo.'}</p>
      </section>
    );
  return (
    <section className="needs" aria-labelledby="needs-h">
      <h2 id="needs-h">{tasks.length === 1 ? 'Una cosa necesita tu decisión' : `${tasks.length} cosas necesitan tu decisión`}</h2>
      <ul>
        {tasks.map((t) => {
          const a = AGENT_BY_ID[t.agentId];
          const r = d.result[t.id];
          return (
            <li key={t.id}>
              <Avatar agent={a} status="warn" />
              <div className="needs-txt">
                <button type="button" className="linklike" onClick={() => onOpen(a.id)}>{a.name} · {a.role}</button>
                <span>{t.approvalLabel ?? t.title}</span>
                {r?.error && <span className="err">{r.error}</span>}
              </div>
              <div className="needs-btns">
                <button type="button" disabled={d.pending} onClick={() => d.decide(t, true)}>Sí, adelante</button>
                <button type="button" className="btn ghost" disabled={d.pending} onClick={() => d.decide(t, false)}>Cambiar algo</button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function PanelOffice({ office }: { office: OfficeSnapshot }) {
  const waitingAll = office.tasks.filter((t) => t.status === 'espera_aprobacion');
  const [sel, setSel] = useState<AgentId>(waitingAll[0]?.agentId ?? 'lola');
  const d = useDecide();

  const def = AGENT_BY_ID[sel];
  const state = office.agents.find((a) => a.id === sel)!;
  const feed = office.activity.filter((a) => a.agentId === sel).slice(0, 6);
  const queue = office.tasks.filter((t) => t.agentId === sel && (t.status === 'pendiente' || t.status === 'en_curso')).length;
  const today = dayKey(new Date().toISOString());
  const todayFeed = office.activity.filter((a) => dayKey(a.at) === today).slice(0, 12);

  const open = (id: AgentId) => {
    setSel(id);
    document.getElementById('puesto')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <Needs tasks={waitingAll} onOpen={open} d={d} />

      <div style={{ display: 'grid', gap: 10 }}>
        <OfficeScene id="panel" states={office.agents} selected={sel} onSelect={setSel} />
        <div className="agent-chips" role="tablist" aria-label="Empleados">
          {AGENTS.map((a) => {
            const st = office.agents.find((s) => s.id === a.id)!.status;
            return (
              <button key={a.id} type="button" role="tab" aria-selected={sel === a.id} className={sel === a.id ? 'on' : ''} onClick={() => setSel(a.id)}>
                <span className={`dot ${st}`} />{a.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel-cols">
        <section className="detail" id="puesto" aria-live="polite">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Avatar agent={def} status={state.status} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <h3 style={{ fontSize: 20 }}>{def.name}, {def.role.toLowerCase()}</h3>
              <p className="muted small">{def.does}</p>
            </div>
            <span className={`pill ${state.status}`}>{STATUS_LABEL[state.status]}</span>
          </div>
          <div className="now">
            <span className="eyebrow">Ahora</span>
            <p>{state.task}</p>
            {queue > 0 && <p className="small muted">{queue === 1 ? '1 trabajo más en cola' : `${queue} trabajos más en cola`}</p>}
          </div>
          {feed.length ? (
            <ul className="feed">
              {feed.map((f) => (
                <li key={f.id}><time dateTime={f.at}>{dayKey(f.at) === today ? hhmm(f.at) : new Date(f.at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: TZ })}</time><span>{f.message}</span></li>
              ))}
            </ul>
          ) : (
            <p className="muted small">{def.phase === 2 ? 'Este puesto se activa en la fase 2.' : 'Todavía no hay actividad.'}</p>
          )}
        </section>

        <section className="today" aria-labelledby="today-h">
          <h3 id="today-h">Hoy en tu oficina</h3>
          {todayFeed.length ? (
            <ol>
              {todayFeed.map((f) => {
                const a = AGENT_BY_ID[f.agentId];
                return (
                  <li key={f.id}>
                    <time dateTime={f.at}>{hhmm(f.at)}</time>
                    <span className="who" style={{ color: a.color }}>{a.name}</span>
                    <span>{f.message}</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="muted small">Hoy todavía no ha pasado nada. En cuanto mandes fotos o stock, lo verás aquí.</p>
          )}
        </section>
      </div>
    </>
  );
}
