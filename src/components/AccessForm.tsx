'use client';
import { useActionState, useState } from 'react';
import { demoLogin, sendMagicLink, sendWhatsappCode, verifyEmailCode, verifyWhatsappCode, type AccessState } from '@/app/actions';

type Mode = 'email' | 'whatsapp';

function Check() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="var(--accent)" opacity=".12" />
      <path d="M15 24.5l6 6 12-13" fill="none" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmailFlow() {
  const [state, action, pending] = useActionState<AccessState, FormData>(sendMagicLink, {});
  const [checked, verify, verifying] = useActionState<AccessState, FormData>(verifyEmailCode, {});
  if (state.step === 'sent')
    return (
      <div className="acc-done" role="status">
        <Check />
        <h3>Revisa tu correo</h3>
        <p className="muted">Te hemos enviado un correo a <b>{state.to}</b> con un código. Escríbelo aquí, o pulsa el botón del correo.{state.demo && ' En la demostración vale cualquier código de 6 cifras.'}</p>
        <form action={verify} className="acc-form" style={{ width: '100%' }}>
          <input type="hidden" name="email" value={state.to} />
          <label htmlFor="ecode">Código del correo
            <input id="ecode" name="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={8} pattern="\d{6,8}" className="code" placeholder="000000" />
          </label>
          <button type="submit" disabled={verifying}>{verifying ? 'Comprobando…' : 'Entrar'}</button>
          {checked.error && <p className="err" role="alert">{checked.error}</p>}
        </form>
        <p className="small muted">¿No llega? Mira en la carpeta de spam o vuelve a pedirlo en unos minutos.</p>
      </div>
    );
  return (
    <form action={action} className="acc-form">
      <label htmlFor="email">Correo de la tienda
        <input id="email" name="email" type="email" required placeholder="hola@tutienda.es" autoComplete="email" inputMode="email" />
      </label>
      <button type="submit" disabled={pending}>{pending ? 'Enviando…' : 'Enviarme el código de acceso'}</button>
      {state.error && <p className="err" role="alert">{state.error}</p>}
    </form>
  );
}

function WhatsappFlow() {
  const [sent, send, sending] = useActionState<AccessState, FormData>(sendWhatsappCode, {});
  const [checked, verify, verifying] = useActionState<AccessState, FormData>(verifyWhatsappCode, {});
  if (sent.step === 'code')
    return (
      <form action={verify} className="acc-form">
        <p className="muted">Te hemos mandado un código por WhatsApp al <b>{sent.to}</b>.{sent.demo && ' En la demostración es 000000.'}</p>
        <input type="hidden" name="phone" value={sent.to} />
        <label htmlFor="code">Código de 6 cifras
          <input id="code" name="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}" className="code" placeholder="000000" />
        </label>
        <button type="submit" disabled={verifying}>{verifying ? 'Comprobando…' : 'Entrar'}</button>
        {checked.error && <p className="err" role="alert">{checked.error}</p>}
      </form>
    );
  return (
    <form action={send} className="acc-form">
      <label htmlFor="phone">Móvil de la tienda
        <input id="phone" name="phone" type="tel" required placeholder="600 123 456" autoComplete="tel" inputMode="tel" />
      </label>
      <button type="submit" disabled={sending}>{sending ? 'Enviando…' : 'Enviarme un código por WhatsApp'}</button>
      {sent.error && <p className="err" role="alert">{sent.error}</p>}
    </form>
  );
}

export default function AccessForm({ demo, whatsapp }: { demo: boolean; whatsapp: boolean }) {
  const [mode, setMode] = useState<Mode>(whatsapp ? 'whatsapp' : 'email');
  return (
    <div className="acc">
      {whatsapp && (
        <div className="seg" role="tablist" aria-label="Cómo quieres entrar">
          <button type="button" role="tab" aria-selected={mode === 'whatsapp'} className={mode === 'whatsapp' ? 'on' : ''} onClick={() => setMode('whatsapp')}>WhatsApp</button>
          <button type="button" role="tab" aria-selected={mode === 'email'} className={mode === 'email' ? 'on' : ''} onClick={() => setMode('email')}>Correo</button>
        </div>
      )}
      {mode === 'whatsapp' ? <WhatsappFlow /> : <EmailFlow />}
      <p className="small muted">Sin contraseñas. Solo entran {whatsapp ? 'el correo y el móvil' : 'el correo'} que nos diste en el alta.</p>
      {demo && (
        <>
          <hr className="sep" />
          <form action={demoLogin}><button type="submit" className="btn ghost wide">Entrar directamente con la tienda de ejemplo</button></form>
        </>
      )}
    </div>
  );
}
