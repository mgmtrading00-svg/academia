// Ejemplo ilustrativo del recorrido de una prenda: foto del móvil → foto en modelo → ficha publicada.
const DRESS = 'M100 82 Q120 97 140 82 L156 92 L150 116 L142 112 L140 150 L162 250 L78 250 L100 150 L98 112 L90 116 L84 92 Z';
const GREEN = '#2F5D50';

function PhonePhoto() {
  return (
    <svg viewBox="0 0 240 300" role="img" aria-label="Vestido verde colgado en una percha, foto hecha con el móvil">
      <rect width="240" height="300" fill="#D3D7DD" />
      <rect y="262" width="240" height="38" fill="#B9A280" />
      <rect y="258" width="240" height="6" fill="#A58D6B" />
      <g transform="rotate(-3 120 150)">
        <path d="M120 70 L120 60 q0 -10 8 -10 q8 0 6 9" fill="none" stroke="#6B7280" strokeWidth="3" strokeLinecap="round" />
        <path d="M80 88 L120 70 L160 88" fill="none" stroke="#8A6E4B" strokeWidth="5" strokeLinecap="round" />
        <path d={DRESS} fill={GREEN} />
        <path d="M100 150 Q120 156 140 150" fill="none" stroke="#24493F" strokeWidth="3" />
        <path d="M108 170 L100 248 M126 168 L132 248" stroke="#24493F" strokeWidth="1.5" opacity=".6" />
      </g>
      <rect width="240" height="300" fill="url(#vig)" />
      <defs>
        <radialGradient id="vig" cx=".5" cy=".45" r=".7"><stop offset=".6" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".22" /></radialGradient>
      </defs>
    </svg>
  );
}

function ModelPhoto() {
  return (
    <svg viewBox="0 0 240 300" role="img" aria-label="El mismo vestido puesto en una modelo, con fondo de estudio">
      <defs>
        <linearGradient id="studio" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F1F3F7" /><stop offset="1" stopColor="#DFE4EC" /></linearGradient>
      </defs>
      <rect width="240" height="300" fill="url(#studio)" />
      <ellipse cx="120" cy="290" rx="58" ry="7" fill="#0E1726" opacity=".12" />
      {/* piernas y brazos */}
      <rect x="104" y="244" width="10" height="42" rx="5" fill="#E3B08F" />
      <rect x="126" y="244" width="10" height="42" rx="5" fill="#E3B08F" />
      <ellipse cx="108" cy="287" rx="9" ry="4" fill="#1F2A44" />
      <ellipse cx="132" cy="287" rx="9" ry="4" fill="#1F2A44" />
      <rect x="80" y="100" width="11" height="76" rx="5.5" fill="#E3B08F" transform="rotate(8 85 100)" />
      <rect x="149" y="100" width="11" height="76" rx="5.5" fill="#E3B08F" transform="rotate(-8 155 100)" />
      {/* cabeza */}
      <rect x="106" y="34" width="28" height="44" rx="12" fill="#2E1F17" />
      <rect x="115" y="62" width="10" height="22" fill="#E3B08F" />
      <circle cx="120" cy="50" r="15" fill="#E3B08F" />
      <path d="M105 48 a15 15 0 0 1 30 0 q-15 -8 -30 0z" fill="#2E1F17" />
      <path d={DRESS} fill={GREEN} />
      <path d="M100 150 Q120 156 140 150" fill="none" stroke="#24493F" strokeWidth="3" />
      <path d="M140 150 L162 250" stroke="#ffffff" strokeOpacity=".18" strokeWidth="6" />
    </svg>
  );
}

export default function BeforeAfter() {
  return (
    <div className="ba">
      <figure className="ba-step">
        <div className="ba-img"><PhonePhoto /></div>
        <figcaption><span className="n">1</span><b>Lo que mandas</b><span className="muted">Una foto con el móvil, como te salga.</span></figcaption>
      </figure>
      <span className="ba-arrow" aria-hidden="true" />
      <figure className="ba-step">
        <div className="ba-img"><ModelPhoto /></div>
        <figcaption><span className="n">2</span><b>Lo que prepara Teo</b><span className="muted">Tu prenda en una modelo, con luz de estudio.</span></figcaption>
      </figure>
      <span className="ba-arrow" aria-hidden="true" />
      <figure className="ba-step">
        <div className="ba-card">
          <div className="ba-thumb"><ModelPhoto /></div>
          <div className="ba-body">
            <b>Vestido midi de punto, verde botella</b>
            <span className="ba-price">39,90 €</span>
            <p className="muted small">Punto suave que no transparenta, cuello redondo y caída hasta media pierna. Para la oficina o una cena.</p>
            <div className="chips"><span>S</span><span>M</span><span>L</span></div>
            <div className="chips ch"><span>Tu web</span><span>Vinted</span><span>Amazon</span><span>Instagram</span></div>
          </div>
        </div>
        <figcaption><span className="n">3</span><b>Lo que se publica</b><span className="muted">Ficha escrita por Nuria, lista en todos tus canales.</span></figcaption>
      </figure>
    </div>
  );
}
