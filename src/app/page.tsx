import Link from 'next/link';
import TopBar from '@/components/TopBar';
import OfficeScene from '@/components/OfficeScene';
import Avatar from '@/components/Avatar';
import { AGENTS, type AgentState } from '@/lib/agents';
import BeforeAfter from '@/components/landing/BeforeAfter';
import Advantages from '@/components/landing/Advantages';
import Faq from '@/components/landing/Faq';
import BetaForm from '@/components/landing/BetaForm';
import Molinillo from '@/components/Molinillo';

// Escena de la portada: ilustrativa, no son datos de ninguna tienda.
const HERO: AgentState[] = [
  { id: 'lola', status: 'busy', task: 'Atendiendo a una tienda nueva', short: '2 cosas para aprobar' },
  { id: 'teo', status: 'warn', task: '3 fotos en modelo listas', short: '3 fotos para aprobar' },
  { id: 'nuria', status: 'busy', task: 'Escribiendo fichas', short: 'Escribiendo 5 fichas' },
  { id: 'bruno', status: 'warn', task: 'Stock bajo', short: 'Lino talla M: queda 1' },
  { id: 'vera', status: 'ok', task: 'Informe enviado', short: 'Informe del día enviado' },
  { id: 'marco', status: 'busy', task: 'Subiendo a Vinted', short: 'Vinted: 2 de 4 subidas' },
  { id: 'sara', status: 'busy', task: 'Publicando la oferta de abrigos', short: 'Oferta subida a TikTok' },
  { id: 'leo', status: 'off', task: 'Fase 2', short: 'Disponible en fase 2' },
];

const PLANS = [
  { name: 'Esencial', price: 149, star: false, items: ['Jefa de oficina por WhatsApp', 'Hasta 60 prendas al mes con foto en modelo', 'Publicación en tu web'] },
  { name: 'Profesional', price: 299, star: true, items: ['Todo lo de Esencial', 'Hasta 200 prendas al mes', 'Amazon y Vinted', 'Control de stock entre canales'] },
  { name: 'Élite', price: 499, star: false, items: ['Todo lo de Profesional', 'Prendas ilimitadas (uso razonable)', 'Agente de publicidad con informe diario', 'Instagram, TikTok y Pinterest gestionados'] },
];

export default function Home() {
  return (
    <>
      <TopBar variant="public" />
      <div className="hero-band"><div className="wrap hero">
        <div className="hero-copy">
          <div>
            <p className="eyebrow">Para tiendas de ropa · España</p>
            <h1 style={{ marginTop: 14 }}>Tú solo mandas. <em>Tu oficina hace todo lo demás.</em></h1>
          </div>
          <div>
            <p className="lead">Envía a tu jefa de oficina las fotos, aunque estén mal hechas, y el stock que te llega. Ella y su equipo ponen las prendas en modelo, las publican en tu web, Amazon y Vinted, suben novedades y ofertas a Instagram y TikTok, llevan el stock y hacen la publicidad. Sin fotógrafos y sin nadie en la oficina.</p>
            <div className="ctas">
              <Link className="btn sun" href="#beta">Pedir plaza en la beta</Link>
              <Link className="btn ghost" href="/acceso">Ver la oficina de ejemplo</Link>
            </div>
            <p className="note">Beta privada: las 10 primeras tiendas no pagan el alta y tienen precio de fundador.</p>
          </div>
        </div>
        <OfficeScene id="hero" states={HERO} />
        <p className="stage-cap">Lola recibe lo que mandas y reparte el trabajo. Si te apetece mirar, en tu panel ves en tiempo real qué hace cada uno. Si no, no hace falta.</p>
      </div></div>

      <section className="block"><div className="wrap">
        <p className="eyebrow">Cómo funciona</p>
        <h2 style={{ marginTop: 10 }}>Tú mandas. Nosotros trabajamos.</h2>
        <div className="steps">
          <div><span className="n">1</span><h3>Nos conocemos una vez</h3><p>Una llamada de quince minutos o una encuesta corta. Nos cuentas qué vendes y cómo es tu tienda, y nosotros lo configuramos todo.</p></div>
          <div><span className="n">2</span><h3>Mandas fotos y stock a Lola</h3><p>Por WhatsApp, como te salga: la prenda colgada o encima del mostrador, y un audio con tallas, precio y unidades. Eso es todo lo que haces.</p></div>
          <div><span className="n">3</span><h3>La oficina hace el resto</h3><p>Fotos en modelo, fichas, publicación en todos tus canales, stock, redes y anuncios. Solo te pregunta si algo necesita de verdad tu decisión.</p></div>
        </div>
      </div></section>

      <section className="block saves"><div className="wrap">
        <p className="eyebrow">Lo que ya no necesitas</p>
        <h2 style={{ marginTop: 10 }}>Todo el trabajo de oficina, sin pagar a nadie más</h2>
        <div className="save-list">
          <div><s>Fotógrafo y estudio</s><span>Teo pone tus prendas en modelo a partir de una foto de móvil.</span></div>
          <div><s>Horas subiendo productos</s><span>Nuria escribe las fichas y las publica en todos tus canales.</span></div>
          <div><s>Llevar el stock a mano</s><span>Bruno descuenta cada venta en la tienda, la web, Amazon y Vinted.</span></div>
          <div><s>Community manager y anuncios</s><span>Sara publica sola en Instagram y TikTok, también tus ofertas, y Vera lleva tu publicidad.</span></div>
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
          {['Tu web (Shopify / WooCommerce)', 'Amazon', 'Vinted', 'Instagram', 'TikTok', 'Pinterest', 'Facebook Ads', 'WhatsApp'].map((c) => <span key={c}>{c}</span>)}
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

      <footer><div className="wrap foot"><span className="logo small-logo"><Molinillo size={22} /><span className="logo-txt"><b>Oficina Virtual</b><small>Moral · Agency · AI</small></span></span><span>Hecho en España para tiendas de ropa.</span><span>© {new Date().getFullYear()} · nombre provisional</span></div></footer>
    </>
  );
}
