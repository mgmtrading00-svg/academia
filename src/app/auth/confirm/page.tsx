import TopBar from '@/components/TopBar';
import { confirmEmailLink } from '@/app/actions';

export const dynamic = 'force-dynamic';

/**
 * El botón del correo trae aquí. No se entra solo al abrir la página (los lectores de correo
 * abren los enlaces para revisarlos y lo gastarían): se entra al pulsar «Entrar».
 * Funciona en cualquier navegador, también dentro de la app de Gmail.
 */
export default async function Confirmar({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string }> }) {
  const { token_hash = '', type = 'email' } = await searchParams;
  return (
    <>
      <TopBar variant="public" />
      <div className="wrap acc-page">
        <div className="acc-card">
          <p className="eyebrow">Área de clientes</p>
          <h1>Entra en tu oficina</h1>
          {token_hash ? (
            <form action={confirmEmailLink} className="acc-form">
              <input type="hidden" name="token_hash" value={token_hash} />
              <input type="hidden" name="type" value={type} />
              <button type="submit">Entrar en mi oficina</button>
            </form>
          ) : (
            <p className="err" role="alert">Este enlace no está completo. Pide uno nuevo desde Acceso clientes.</p>
          )}
        </div>
      </div>
    </>
  );
}
