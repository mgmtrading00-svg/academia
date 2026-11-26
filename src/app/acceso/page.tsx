import { redirect } from 'next/navigation';
import Link from 'next/link';
import TopBar from '@/components/TopBar';
import AccessForm from '@/components/AccessForm';
import { IS_DEMO, WHATSAPP_LOGIN } from '@/lib/config';
import { hasSession } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Acceso({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await hasSession()) redirect('/panel');
  const { error } = await searchParams;
  return (
    <>
      <TopBar variant="public" />
      <div className="wrap acc-page">
        <div className="acc-card">
          <p className="eyebrow">Área de clientes</p>
          <h1>Entra en tu oficina</h1>
          {error === 'enlace' && <p className="err" role="alert">El enlace ha caducado o ya se usó. Pide uno nuevo y, en el móvil, mejor escribe el código que viene en el correo.</p>}
          <AccessForm demo={IS_DEMO} whatsapp={WHATSAPP_LOGIN} />
        </div>
        <aside className="acc-side">
          <p className="eyebrow">Recuerda</p>
          <h2>No tienes que entrar para que tu oficina trabaje</h2>
          <p>Todo lo importante te llega por WhatsApp. El panel es para cuando te apetezca ver qué está haciendo tu equipo.</p>
          <ul>
            <li>Qué está haciendo cada empleado ahora mismo</li>
            <li>Tus fotos, antes y después</li>
            <li>Lo poco que necesita tu decisión</li>
            <li>Tus ventas y tu stock del mes</li>
          </ul>
          <p className="small">¿Aún no eres cliente? <Link href="/#beta">Pide plaza en la beta</Link>.</p>
        </aside>
      </div>
    </>
  );
}
