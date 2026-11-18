'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/actions';

const TABS = [
  { href: '/panel', label: 'Oficina' },
  { href: '/panel/fotos', label: 'Enviar fotos' },
  { href: '/panel/encuesta', label: 'Encuesta de alta' },
];

export default function SideNav({ shopName, demo }: { shopName: string; demo: boolean }) {
  const path = usePathname();
  return (
    <aside className="side">
      <div className="shop">
        <span className="eyebrow">Tienda</span>
        <b>{shopName}</b>
        {demo && <span className="demo-flag" style={{ justifySelf: 'start' }}>Ejemplo</span>}
      </div>
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={path === t.href ? 'on' : ''} aria-current={path === t.href ? 'page' : undefined}>{t.label}</Link>
      ))}
      <form action={logout}><button type="submit" className="linkbtn">Salir</button></form>
    </aside>
  );
}
