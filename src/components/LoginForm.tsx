'use client';
import { useActionState } from 'react';
import { sendMagicLink, type FormState } from '@/app/actions';

export default function LoginForm({ demo }: { demo: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendMagicLink, {});
  return (
    <form action={action} style={{ display: 'grid', gap: 16 }}>
      <label htmlFor="email">Correo de la tienda
        <input id="email" name="email" type="email" required placeholder="hola@tutienda.es" autoComplete="email" disabled={demo} />
      </label>
      <button type="submit" disabled={pending || demo}>{pending ? 'Enviando…' : 'Enviarme un enlace de acceso'}</button>
      {state.ok && <p className="okmsg" role="status">{state.ok}</p>}
      {state.error && <p className="err" role="alert">{state.error}</p>}
      <p className="small muted">{demo ? 'El acceso por correo se activa al conectar la base de datos. Mientras tanto, usa la tienda de ejemplo.' : 'Sin contraseñas: te llega un enlace al correo.'}</p>
    </form>
  );
}
