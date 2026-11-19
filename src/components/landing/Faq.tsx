const QA: [string, string][] = [
  ['¿Qué tengo que hacer yo?', 'Mandar a Lola por WhatsApp las fotos de lo nuevo y lo que te llega de stock. Nada más. No necesitas saber de tecnología ni entrar en ninguna web.'],
  ['Ya tengo web. ¿Me sirve?', 'Sí. Nos conectamos a tu tienda de Shopify o WooCommerce y publicamos ahí. Si no tienes web, te ayudamos a montar una sencilla.'],
  ['¿Tengo que aprobar cada cosa?', 'No. La oficina publica sola y solo te pregunta lo que de verdad necesita tu decisión. Si prefieres revisar algo concreto, como los precios, nos lo dices y te lo consultamos.'],
  ['¿Cómo funciona lo de Vinted?', 'Preparamos el anuncio completo con fotos, título y precio. Vinted solo permite publicar automáticamente a vendedores profesionales autorizados; si no es tu caso, lo publicas tú con un toque desde el móvil.'],
  ['¿Qué pasa con mis datos y los de mis clientas?', 'Tus datos se guardan en servidores de la Unión Europea, solo los ve tu tienda y no los vendemos ni los compartimos. Puedes pedir que los borremos cuando quieras.'],
  ['¿Hay permanencia?', 'No. La cuota es mensual y puedes darte de baja cuando quieras. El alta se paga una sola vez.'],
  ['¿Por qué solo unas pocas tiendas al mes?', 'Porque cada alta lleva trabajo a mano: conocer tu tienda, elegir tu modelo y ajustar el tono. Preferimos hacerlo bien.'],
];

export default function Faq() {
  return (
    <div className="faq">
      {QA.map(([q, a]) => (
        <details key={q}>
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}
    </div>
  );
}
