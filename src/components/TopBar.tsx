import Link from 'next/link';
import Molinillo from './Molinillo';

export default function TopBar({ variant }: { variant: 'public' | 'app' }) {
  return (
    <header className="top">
      <div className="wrap">
        <Link className="logo" href="/" aria-label="Oficina Virtual, de Moral Agency AI"><Molinillo size={30} /><span className="logo-txt"><b>Oficina Virtual</b><small>Moral · Agency · AI</small></span></Link>
        <nav className="links">
          {variant === 'public' ? (
            <>
              <Link href="/#equipo">Equipo</Link>
              <Link href="/#precios">Precios</Link>
              <Link href="/#preguntas">Preguntas</Link>
              <Link className="btn" href="/acceso">Acceso clientes</Link>
            </>
          ) : (
            <Link href="/">Web pública</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
