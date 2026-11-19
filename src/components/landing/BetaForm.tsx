'use client';
import { useActionState } from 'react';
import { requestBeta, type FormState } from '@/app/actions';

export default function BetaForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestBeta, {});
  if (state.ok)
    return (
      <div className="beta-form done" role="status">
        <h3>Solicitud recibida</h3>
        <p>{state.ok}</p>
      </div>
    );
  return (
    <form action={action} className="beta-form">
      <div className="row">
        <label htmlFor="b-nombre">Tu nombre<input id="b-nombre" name="nombre" required maxLength={80} autoComplete="name" /></label>
        <label htmlFor="b-tienda">Nombre de la tienda<input id="b-tienda" name="tienda" required maxLength={80} /></label>
      </div>
      <div className="row">
        <label htmlFor="b-ciudad">Ciudad<input id="b-ciudad" name="ciudad" required maxLength={60} /></label>
        <label htmlFor="b-contacto">Correo o móvil<input id="b-contacto" name="contacto" required maxLength={120} placeholder="hola@tutienda.es o 600 000 000" /></label>
      </div>
      <label htmlFor="b-canal">Dónde vendes ahora
        <select id="b-canal" name="canal" defaultValue="Solo tienda física">
          <option>Solo tienda física</option><option>Tienda física y web</option><option>Tienda física y redes sociales</option><option>Solo online</option>
        </select>
      </label>
      <label htmlFor="b-msg">¿Algo que debamos saber? (opcional)<textarea id="b-msg" name="mensaje" rows={3} maxLength={600} /></label>
      <label htmlFor="b-ok" className="check"><input id="b-ok" name="acepto" type="checkbox" required /> Acepto que uséis estos datos solo para contactarme sobre la beta.</label>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="submit" disabled={pending}>{pending ? 'Enviando…' : 'Pedir plaza'}</button>
        {state.error && <span className="err" role="alert">{state.error}</span>}
      </div>
    </form>
  );
}
