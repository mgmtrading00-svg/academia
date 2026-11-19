const QA: [string, string][] = [
  ['¿Tengo que saber de tecnología?', 'No. Si sabes mandar un WhatsApp, sabes usar tu oficina. La configuración la hacemos nosotros durante el alta.'],
  ['Ya tengo web. ¿Me sirve?', 'Sí. Nos conectamos a tu tienda de Shopify o WooCommerce y publicamos ahí. Si no tienes web, te ayudamos a montar una sencilla.'],
  ['¿Se publica algo sin que yo lo vea?', 'Solo lo que tú decidas. En la encuesta de alta eliges qué puede publicar la oficina sola y qué tiene que pasar antes por ti.'],
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
