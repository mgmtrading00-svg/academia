const I = {
  model: <><circle cx="12" cy="6" r="3" /><path d="M8 21l1.5-7L7 10l5-1 5 1-2.5 4L16 21" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  hanger: <><path d="M12 7a2 2 0 1 1 2-2" /><path d="M12 7v2L3 16h18l-9-7" /></>,
  box: <><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7M12 11v10" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>,
};

const ITEMS: { icon: keyof typeof I; title: string; text: string }[] = [
  { icon: 'model', title: 'Una modelo propia de tu marca', text: 'Elegimos contigo una modelo y la usamos en todas tus fotos. Tu catálogo se ve coherente, como el de una marca grande.' },
  { icon: 'mic', title: 'Hablas por audio de WhatsApp', text: 'Le cuentas a Lola lo que necesitas como se lo contarías a una empleada. Ella lo reparte y te confirma.' },
  { icon: 'hanger', title: 'Probador para tus clientas', text: 'Tus clientas suben una foto suya y ven cómo les queda la prenda antes de comprar.' },
  { icon: 'box', title: 'Un solo stock para todo', text: 'Lo que vendes en la tienda física se descuenta en la web, Amazon y Vinted. Nada se vende dos veces.' },
  { icon: 'chart', title: 'Un informe que se entiende', text: 'Cada lunes, en un mensaje: qué se vendió, qué funcionó en redes y qué hacemos esta semana.' },
  { icon: 'shield', title: 'Garantía de 30 días', text: 'Si en el primer mes no notas que trabajas menos, te devolvemos la cuota.' },
];

export default function Advantages() {
  return (
    <div className="adv">
      {ITEMS.map((it) => (
        <div key={it.title} className="adv-item">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{I[it.icon]}</svg>
          <h3>{it.title}</h3>
          <p>{it.text}</p>
        </div>
      ))}
    </div>
  );
}
