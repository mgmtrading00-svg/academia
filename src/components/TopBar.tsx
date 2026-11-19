import Link from 'next/link';

export default function TopBar({ variant }: { variant: 'public' | 'app' }) {
  return (
    <header className="top">
      <div className="wrap">
        <Link className="logo" href="/"><i />Oficina Virtual</Link>
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
