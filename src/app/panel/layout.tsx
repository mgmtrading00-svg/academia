import { redirect } from 'next/navigation';
import TopBar from '@/components/TopBar';
import SideNav from '@/components/SideNav';
import { IS_DEMO } from '@/lib/config';
import { currentShopId, getOffice, hasSession } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const shopId = await currentShopId();
  if (!shopId) {
    // Sesión sin tienda asignada: la cuenta existe pero aún no está dada de alta.
    if (await hasSession()) {
      return (
        <>
          <TopBar variant="app" />
          <div className="wrap auth"><div className="card"><h2 style={{ fontSize: 24 }}>Tu oficina se está preparando</h2><p className="muted">Tu cuenta todavía no tiene una tienda asignada. Te avisaremos en cuanto esté lista.</p></div></div>
        </>
      );
    }
    redirect('/acceso');
  }
  const office = await getOffice(shopId);
  return (
    <>
      <TopBar variant="app" />
      <div className="wrap app">
        <SideNav shopName={office.shop.name} demo={IS_DEMO} />
        <div className="main">{children}</div>
      </div>
    </>
  );
}
