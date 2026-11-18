import { redirect } from 'next/navigation';
import TopBar from '@/components/TopBar';
import LoginForm from '@/components/LoginForm';
import { demoLogin } from '@/app/actions';
import { IS_DEMO } from '@/lib/config';
import { hasSession } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Acceso({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await hasSession()) redirect('/panel');
  const { error } = await searchParams;
  return (
    <>
      <TopBar variant="public" />
      <div className="wrap auth">
        <div className="card">
          <p className="eyebrow">Área de clientes</p>
          <h2 style={{ fontSize: 28 }}>Entra en tu oficina</h2>
          {error === 'enlace' && <p className="err" role="alert">El enlace ha caducado o ya se usó. Pide uno nuevo.</p>}
          <LoginForm demo={IS_DEMO} />
          {IS_DEMO && (
            <>
              <hr style={{ border: 0, borderTop: '1px solid var(--line)', width: '100%' }} />
              <form action={demoLogin}><button type="submit" className="btn ghost" style={{ width: '100%', justifyContent: 'center' }}>Entrar con la tienda de ejemplo</button></form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
