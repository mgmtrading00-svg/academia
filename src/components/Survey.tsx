'use client';
import { useState, useTransition } from 'react';
import { saveSurvey } from '@/app/actions';
import { STEPS, type Field } from '@/lib/survey';
import type { SurveyAnswers } from '@/lib/types';

const split = (v?: string) => (v ? v.split(', ').filter(Boolean) : []);

export default function Survey({ initial }: { initial: SurveyAnswers }) {
  const [answers, setAnswers] = useState<SurveyAnswers>(initial);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const set = (k: string, v: string) => setAnswers((a) => ({ ...a, [k]: v }));
  const last = step === STEPS.length - 1;

  const go = (next: number, finish = false) =>
    start(async () => {
      const r = await saveSurvey(answers, finish);
      if (r.error) return setError(r.error);
      setError('');
      if (finish) setDone(true); else setStep(next);
    });

  if (done)
    return (
      <div className="survey">
        <div><p className="eyebrow">Encuesta de alta</p><h1 style={{ marginTop: 6 }}>Gracias</h1></div>
        <p style={{ fontSize: 18 }}>Lola ya tiene tu ficha y configurará tu oficina con estas respuestas.</p>
        <p><button type="button" className="btn ghost" onClick={() => { setDone(false); setStep(0); }}>Revisar mis respuestas</button></p>
      </div>
    );

  const field = (f: Field) => {
    const v = answers[f.name] ?? '';
    const id = `q-${f.name}`;
    switch (f.kind) {
      case 'text':
        return <label key={f.name} htmlFor={id}>{f.label}<input id={id} value={v} placeholder={f.placeholder} maxLength={200} onChange={(e) => set(f.name, e.target.value)} /></label>;
      case 'textarea':
        return <label key={f.name} htmlFor={id}>{f.label}<textarea id={id} rows={3} value={v} placeholder={f.placeholder} maxLength={1000} onChange={(e) => set(f.name, e.target.value)} /></label>;
      case 'select':
        return <label key={f.name} htmlFor={id}>{f.label}<select id={id} value={v || f.options[0]} onChange={(e) => set(f.name, e.target.value)}>{f.options.map((o) => <option key={o}>{o}</option>)}</select></label>;
      case 'multi':
      case 'single': {
        const sel = split(v);
        return (
          <fieldset key={f.name} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            <legend style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{f.label}</legend>
            <div className="opts">
              {f.options.map((o, i) => (
                <label key={o} htmlFor={`${id}-${i}`}>
                  <input id={`${id}-${i}`} type={f.kind === 'multi' ? 'checkbox' : 'radio'} name={f.name} checked={sel.includes(o)}
                    onChange={(e) => f.kind === 'single' ? set(f.name, o) : set(f.name, (e.target.checked ? [...sel, o] : sel.filter((x) => x !== o)).join(', '))} />
                  {o}
                </label>
              ))}
            </div>
          </fieldset>
        );
      }
    }
  };

  return (
    <form className="survey" onSubmit={(e) => { e.preventDefault(); go(step + 1, last); }}>
      <div><p className="eyebrow">Paso {step + 1} de {STEPS.length}</p><h1 style={{ marginTop: 6 }}>{STEPS[step].title}</h1></div>
      <div className="progress">{STEPS.map((_, i) => <i key={i} className={i <= step ? 'done' : ''} />)}</div>
      <div style={{ display: 'grid', gap: 16 }}>{STEPS[step].fields.map(field)}</div>
      {error && <p className="err" role="alert">{error}</p>}
      <div className="nav-btns">
        <button type="button" className="btn ghost" style={{ visibility: step ? 'visible' : 'hidden' }} disabled={pending} onClick={() => go(step - 1)}>Atrás</button>
        <button type="submit" disabled={pending}>{pending ? 'Guardando…' : last ? 'Terminar' : 'Siguiente'}</button>
      </div>
    </form>
  );
}
