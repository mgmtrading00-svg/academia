import PanelOffice from '@/components/PanelOffice';
import Link from 'next/link';
import { currentShopId, getOffice, getSurvey } from '@/lib/data';

export const dynamic = 'force-dynamic';
// Los empleados trabajan justo después de subir fotos o decidir; les damos hasta un minuto.
export const maxDuration = 300;

const fmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

export default async function Panel() {
  const shopId = (await currentShopId())!;
  const [office, survey] = await Promise.all([getOffice(shopId), getSurvey(shopId)]);
  const firstTime = !survey.nombre;
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });
  const hour = Number(new Date().toLocaleString('es-ES', { hour: 'numeric', hour12: false, timeZone: 'Europe/Madrid' }));
  const greet = hour < 6 ? 'Buenas noches' : hour < 14 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches';
  const { kpis } = office;
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
        <div><p className="eyebrow">{today}</p><h1 style={{ marginTop: 6 }}>{greet}, {office.shop.ownerName || office.shop.name}</h1></div>
      </div>
      {firstTime && (
        <div className="welcome">
          <div>
            <b>Te damos la bienvenida a tu oficina</b>
            <p>Para empezar, Lola necesita conocer tu tienda. Te llamará para hacerlo contigo o, si lo prefieres, rellenas la encuesta en unos minutos.</p>
          </div>
          <Link className="btn" href="/panel/encuesta">Rellenar la encuesta</Link>
        </div>
      )}
      <div className="kpis">
        <div className="kpi"><b>{kpis.published}</b><span>prendas publicadas este mes</span></div>
        <div className="kpi"><b>{kpis.marketplaceSales}</b><span>ventas en Vinted y Amazon</span></div>
        <div className="kpi"><b>{kpis.lowStock}</b><span>tallas a punto de agotarse</span></div>
        <div className="kpi"><b>{kpis.adsRoas == null ? '—' : `${fmt.format(kpis.adsRoas)}×`}</b><span>retorno de la publicidad (7 días)</span></div>
      </div>
      <PanelOffice office={office} />
    </div>
  );
}
