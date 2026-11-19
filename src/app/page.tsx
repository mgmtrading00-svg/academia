import Link from 'next/link';
import TopBar from '@/components/TopBar';
import OfficeScene from '@/components/OfficeScene';
import Avatar from '@/components/Avatar';
import { AGENTS, type AgentState } from '@/lib/agents';
import BeforeAfter from '@/components/landing/BeforeAfter';
import Advantages from '@/components/landing/Advantages';
import Faq from '@/components/landing/Faq';
import BetaForm from '@/components/landing/BetaForm';

// Escena de la portada: ilustrativa, no son datos de ninguna tienda.
const HERO: AgentState[] = [
  { id: 'lola', status: 'busy', task: 'Atendiendo a una tienda nueva', short: '2 cosas para aprobar' },
  { id: 'teo', status: 'warn', task: '3 fotos en modelo listas', short: '3 fotos para aprobar' },
  { id: 'nuria', status: 'busy', task: 'Escribiendo fichas', short: 'Escribiendo 5 fichas' },
  { id: 'bruno', status: 'warn', task: 'Stock bajo', short: 'Lino talla M: queda 1' },
  { id: 'vera', status: 'ok', task: 'Informe enviado', short: 'Informe del día enviado' },
  { id: 'marco', status: 'busy', task: 'Subiendo a Vinted', short: 'Vinted: 2 de 4 subidas' },
  { id: 'sara', status: 'ok', task: 'Publicación programada', short: 'Publicación a las 19:00' },
  { id: 'leo', status: 'off', task: 'Fase 2', short: 'Disponible en fase 2' },
];

const PLANS = [
  { name: 'Esencial', price: 149, star: false, items: ['Jefa de oficina por WhatsApp', 'Hasta 60 prendas al mes con foto en modelo', 'Publicación en tu web'] },
  { name: 'Profesional', price: 299, star: true, items: ['Todo lo de Esencial', 'Hasta 200 prendas al mes', 'Amazon y Vinted', 'Control de stock entre canales'] },
  { name: 'Élite', price: 499, star: false, items: ['Todo lo de Profesional', 'Prendas ilimitadas (uso razonable)', 'Agente de publicidad con informe diario', 'Instagram y Pinterest gestionados'] },
];

export default function Home() {
  return (
    <>
      <TopBar variant="public" />
      <div className="hero-band"><div className="wrap hero">
        <div className="hero-copy">
          <div>
            <p className="eyebrow">Para tiendas de ropa · España</p>
            <h1 style={{ marginTop: 14 }}>Tu tienda manda las fotos. <em>Tu oficina hace el resto.</em></h1>
          </div>
          <div>
            <p className="lead">Un equipo de empleados digitales que pone tus prendas en modelo, las sube a tu web, a Amazon y a Vinted, controla el stock y prepara la publicidad. Tú solo apruebas desde el móvil.</p>
            <div className="ctas">
              <Link className="btn sun" href="#beta">Pedir plaza en la beta</Link>
              <Link className="btn ghost" href="/acceso">Ver la oficina de ejemplo</Link>
            </div>
            <p className="note">Beta privada: las 10 primeras tiendas no pagan el alta y tienen precio de fundador.</p>
          </div>
        </div>
        <OfficeScene id="hero" states={HERO} />
        <p className="stage-cap">Lola atiende en recepción y el resto del equipo trabaja en sus puestos. En tu panel, cada puesto muestra en tiempo real lo que está haciendo.</p>
      </div></div>

      <section className="block"><div className="wrap">
        <p className="eyebrow">Cómo funciona</p>
        <h2 style={{ marginTop: 10 }}>Tres pasos y te olvidas</h2>
        <div className="steps">
          <div><span className="n">1</span><h3>Rellenas la encuesta de alta</h3><p>Diez minutos. Nos cuentas qué vendes, dónde vendes y cómo hablas a tus clientas. Tu oficina se configura con eso.</p></div>
          <div><span className="n">2</span><h3>Mandas fotos por WhatsApp o aquí</h3><p>La prenda colgada o en el mostrador, como te salga. Talla, precio y unidades en un mensaje de voz si quieres.</p></div>
          <div><span className="n">3</span><h3>Apruebas y se publica</h3><p>Te llega la ficha lista con foto en modelo. Un toque y está en tu web, Instagram, Amazon y Vinted.</p></div>
        </div>
      </div></section>

      <section className="block"><div className="wrap">
        <p className="eyebrow">De la percha a la venta</p>
        <h2 style={{ marginTop: 10 }}>Una foto tuya, una ficha profesional</h2>
        <p className="sub">Así queda una prenda cuando pasa por tu oficina. Ejemplo ilustrativo.</p>
        <BeforeAfter />
      </div></section>

      <section className="block" id="equipo"><div className="wrap">
        <p className="eyebrow">Tu equipo</p>
        <h2 style={{ marginTop: 10 }}>Cada empleado hace un solo trabajo, y lo hace bien</h2>
        <p className="sub">Empezamos con cuatro puestos y vamos sumando. Todos trabajan coordinados por la jefa de oficina, que es con quien hablas.</p>
        <div className="team">
          {AGENTS.map((a) => (
            <div className="member" key={a.id}>
              <Avatar agent={a} status="off" />
              <div><b>{a.name}, {a.role.toLowerCase()}</b><p>{a.does}</p>{a.phase === 2 && <span className="soon">Fase 2</span>}</div>
            </div>
          ))}
        </div>
        <div className="channels">
          {['Tu web (Shopify / WooCommerce)', 'Amazon', 'Vinted', 'Instagram', 'Pinterest', 'Facebook Ads', 'WhatsApp'].map((c) => <span key={c}>{c}</span>)}
        </div>
      </div></section>

      <section className="block"><div className="wrap">
        <p className="eyebrow">Lo que no encontrarás en otro sitio</p>
        <h2 style={{ marginTop: 10 }}>Pensado para tiendas de barrio que quieren vender como las grandes</h2>
        <Advantages />
      </div></section>

      <section className="block" id="precios"><div className="wrap">
        <p className="eyebrow">Precios</p>
        <h2 style={{ marginTop: 10 }}>Un equipo entero por menos que un sueldo</h2>
        <p className="sub">Cuota mensual sin permanencia. Alta única de 500 €, que incluye la configuración, la conexión con tu tienda y la primera sesión de fotos. Aceptamos pocas tiendas al mes para atender bien a cada una.</p>
        <div className="plans">
          {PLANS.map((p) => (
            <div key={p.name} className={`plan${p.star ? ' star' : ''}`}>
              <p className="eyebrow">{p.name}{p.star ? ' · el más elegido' : ''}</p>
              <p className="price">{p.price} €<span> /mes</span></p>
              <ul>{p.items.map((i) => <li key={i}>{i}</li>)}</ul>
            </div>
          ))}
        </div>
        <div className="beta">
          <div><b>Beta privada, 10 plazas por invitación.</b> <span className="muted">Sin alta, 50 % de descuento los 3 primeros meses y precio de fundador congelado para siempre.</span></div>
          <Link className="btn" href="#beta">Pedir plaza</Link>
        </div>
      </div></section>

      <section className="block" id="preguntas"><div className="wrap faq-wrap">
        <div>
          <p className="eyebrow">Preguntas frecuentes</p>
          <h2 style={{ marginTop: 10 }}>Lo que nos preguntan las tiendas</h2>
        </div>
        <Faq />
      </div></section>

      <section className="block beta-band" id="beta"><div className="wrap beta-wrap">
        <div>
          <p className="eyebrow">Beta privada · 10 plazas</p>
          <h2 style={{ marginTop: 10 }}>Pide tu plaza</h2>
          <p className="sub">Sin coste de alta, 50 % de descuento los tres primeros meses y precio de fundador para siempre. A cambio, nos cuentas qué mejorarías cada dos semanas.</p>
        </div>
        <BetaForm />
      </div></section>

      <footer><div className="wrap foot"><span className="logo small-logo"><i />Oficina Virtual</span><span>Hecho en España para tiendas de ropa.</span><span>© {new Date().getFullYear()} · nombre provisional</span></div></footer>
    </>
  );
}
