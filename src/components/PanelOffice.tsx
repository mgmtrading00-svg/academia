'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AGENT_BY_ID, STATUS_LABEL, type AgentId } from '@/lib/agents';
import type { OfficeSnapshot } from '@/lib/types';
import { decideTask } from '@/app/actions';
import OfficeScene from './OfficeScene';
import Avatar from './Avatar';

const hhmm = (iso: string) => {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })
    : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'Europe/Madrid' });
};

export default function PanelOffice({ office }: { office: OfficeSnapshot }) {
  const firstWaiting = office.tasks.find((t) => t.status === 'espera_aprobacion')?.agentId;
  const [sel, setSel] = useState<AgentId>(firstWaiting ?? 'lola');
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [pending, start] = useTransition();
  const router = useRouter();

  const def = AGENT_BY_ID[sel];
  const state = office.agents.find((a) => a.id === sel)!;
  const waiting = office.tasks.filter((t) => t.agentId === sel && t.status === 'espera_aprobacion');
  const feed = office.activity.filter((a) => a.agentId === sel).slice(0, 8);

  const decide = (taskId: string, approve: boolean) =>
    start(async () => {
      const r = await decideTask(taskId, approve);
      setMsg(r);
      router.refresh();
    });

  return (
    <>
      <div style={{ display: 'grid', gap: 10 }}>
        <OfficeScene id="panel" states={office.agents} selected={sel} onSelect={(id) => { setSel(id); setMsg({}); }} />
        <p className="small muted">Pulsa un puesto para ver su actividad y aprobar lo que te pida.</p>
      </div>
      <section className="detail" aria-live="polite">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Avatar agent={def} status={state.status} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3 style={{ fontSize: 20 }}>{def.name}, {def.role.toLowerCase()}</h3>
            <p className="muted small">{def.does}</p>
          </div>
          <span className={`pill ${state.status}`}>{STATUS_LABEL[state.status]}</span>
        </div>
        <p>{state.task}</p>
        {waiting.map((t) => (
          <div key={t.id} className="approve">
            <button type="button" disabled={pending} onClick={() => decide(t.id, true)}>{t.approvalLabel ?? `Aprobar: ${t.title}`}</button>
            <button type="button" className="btn ghost" disabled={pending} onClick={() => decide(t.id, false)}>Pedir cambios</button>
          </div>
        ))}
        {msg.ok && <p className="okmsg">{msg.ok}</p>}
        {msg.error && <p className="err">{msg.error}</p>}
        {feed.length ? (
          <ul className="feed">
            {feed.map((f) => (
              <li key={f.id}><time dateTime={f.at}>{hhmm(f.at)}</time><span>{f.message}</span></li>
            ))}
          </ul>
        ) : (
          <p className="muted small">{def.phase === 2 ? 'Este puesto se activa en la fase 2.' : 'Todavía no hay actividad.'}</p>
        )}
      </section>
    </>
  );
}
