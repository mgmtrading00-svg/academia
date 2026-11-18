import PanelOffice from '@/components/PanelOffice';
import { currentShopId, getOffice } from '@/lib/data';

export const dynamic = 'force-dynamic';

const fmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

export default async function Panel() {
  const office = await getOffice((await currentShopId())!);
  const waiting = office.tasks.filter((t) => t.status === 'espera_aprobacion').length;
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });
  const hour = Number(new Date().toLocaleString('es-ES', { hour: 'numeric', hour12: false, timeZone: 'Europe/Madrid' }));
  const greet = hour < 14 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches';
  const { kpis } = office;
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
        <div><p className="eyebrow">{today}</p><h1 style={{ marginTop: 6 }}>{greet}, {office.shop.ownerName || office.shop.name}</h1></div>
        {waiting > 0 ? <span className="pill warn">{waiting === 1 ? '1 cosa espera tu visto bueno' : `${waiting} cosas esperan tu visto bueno`}</span> : <span className="pill ok">Todo al día</span>}
      </div>
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
