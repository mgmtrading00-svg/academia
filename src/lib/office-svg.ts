// Oficina isométrica generada como SVG. Sin dependencias: se usa en la portada y en el panel.
/* eslint-disable */
// @ts-nocheck
import { AGENTS as DEFS, type AgentId, type AgentState } from './agents';

const esc = (s: string) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let AGENTS: any[] = [];
let sel: AgentId | null = null;
let FID = 'sh';
// ---------- Oficina isométrica (SVG) ----------
const LOOK={
 lola:{skin:'#E3B08F',hair:'#2E1F17',hs:'long',shirt:'#1F2A44'},
 teo:{skin:'#B97D57',hair:'#1A1A1A',hs:'short',shirt:'#2E3440'},
 nuria:{skin:'#EEC7A8',hair:'#8C4A2F',hs:'long',shirt:'#F3F5F8'},
 bruno:{skin:'#7A4E35',hair:'#141414',hs:'short',shirt:'#7FA58F'},
 vera:{skin:'#F0C9A8',hair:'#C9A35C',hs:'long',shirt:'#2747E8'},
 marco:{skin:'#D6A07A',hair:'#3A2A1E',hs:'short',shirt:'#8A94A6'},
 sara:{skin:'#6B4230',hair:'#120C0A',hs:'long',shirt:'#7A2E3B'},
 leo:{skin:'#F2D0B6',hair:'#6B4426',hs:'short',shirt:'#B08D63'}
};
const _SHORT={lola:'2 cosas para aprobar',teo:'3 fotos para aprobar',nuria:'Escribiendo 5 fichas',bruno:'Lino talla M: queda 1',vera:'Informe del día enviado',marco:'Vinted: 2 de 4 subidas',sara:'Publicación a las 19:00',leo:'Disponible en fase 2'};
const STC={busy:'#2747E8',ok:'#1E8E5A',warn:'#D9822B',off:'#9AA3B2'};
const U=46,IA=U*0.866,IB=U*0.5,OX=508,OY=182,WD=14,DP=12,WH=3.4;
const P=(x,y,z=0)=>[OX+(x-y)*IA,OY+(x+y)*IB-z*U];
const pt=(x,y,z=0)=>P(x,y,z).map(v=>v.toFixed(1)).join(',');
const poly=(pts,fill,extra='')=>`<polygon points="${pts.map(p=>pt(...p)).join(' ')}" fill="${fill}" ${extra}/>`;
function box(x,y,z,w,d,h,top,left,right){
  return poly([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]],left)+
         poly([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]],right)+
         poly([[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]],top);
}
// cara frontal (plano y) entre x0..x1 y z0..z1
const faceY=(y,x0,x1,z0,z1,fill)=>poly([[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1]],fill);
const WOOD=['#E6D6BE','#CDB797','#B9A280'],DARK=['#4A5263','#363D4B','#2A303B'],WHITE=['#FFFFFF','#E9EDF2','#D7DDE5'];
function figure(a,px,py,front,zBase){
  const L=LOOK[a.id],[bx,by]=P(px,py,zBase+0.42),[hx,hy]=P(px,py,zBase+1.06);
  let s=`<rect x="${(bx-12).toFixed(1)}" y="${(by-20).toFixed(1)}" width="24" height="34" rx="10" fill="${L.shirt}" ${L.shirt==='#F3F5F8'?'stroke="#D7DDE5"':''}/>`;
  s+=`<rect x="${(hx-3.5).toFixed(1)}" y="${(hy+6).toFixed(1)}" width="7" height="6" fill="${L.skin}"/>`;
  if(front){
    if(L.hs==='long')s+=`<rect x="${(hx-10).toFixed(1)}" y="${(hy-9).toFixed(1)}" width="20" height="24" rx="9" fill="${L.hair}"/>`;
    s+=`<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="8.5" fill="${L.skin}"/><path d="M${(hx-9).toFixed(1)} ${(hy-1).toFixed(1)} a9 9 0 0 1 18 0 q-9 -5 -18 0z" fill="${L.hair}"/>`;
  }else{
    s+=`<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="8.5" fill="${L.skin}"/><circle cx="${hx.toFixed(1)}" cy="${(hy-0.6).toFixed(1)}" r="8.9" fill="${L.hair}"/>`;
    if(L.hs==='long')s+=`<rect x="${(hx-8.5).toFixed(1)}" y="${hy.toFixed(1)}" width="17" height="15" rx="6" fill="${L.hair}"/>`;
  }
  return s;
}
function propFor(id,x,y){
  switch(id){
    case 'teo':return box(x+1.25,y+0.25,0.74,0.28,0.2,0.17,...DARK)+`<line x1="${P(x+2.2,y+0.1,0)[0]}" y1="${P(x+2.2,y+0.1,0)[1]}" x2="${P(x+2.2,y+0.1,1.7)[0]}" y2="${P(x+2.2,y+0.1,1.7)[1]}" stroke="#363D4B" stroke-width="2.5"/>`+box(x+1.95,y-0.15,1.55,0.5,0.5,0.55,...WHITE);
    case 'bruno':return box(x+1.95,y+0.1,0,0.6,0.6,0.5,'#D9B98C','#C49E6C','#AF8A59')+box(x+2.0,y+0.15,0.5,0.5,0.5,0.42,'#D9B98C','#C49E6C','#AF8A59');
    case 'vera':return box(x+1.15,y+0.18,0.95,0.42,0.05,0.34,'#1E2430','#1E2430','#141922')+faceY(y+0.23,x+1.18,x+1.54,0.98,1.26,'#EAF6EF')+poly([[x+1.22,y+0.23,1.02],[x+1.32,y+0.23,1.1],[x+1.4,y+0.23,1.07],[x+1.5,y+0.23,1.2],[x+1.5,y+0.23,1.02]],'#1E8E5A');
    case 'marco':return box(x+1.15,y+0.2,0.74,0.38,0.32,0.22,'#D9B98C','#C49E6C','#AF8A59')+box(x+1.2,y+0.25,0.96,0.26,0.22,0.14,'#E2C69C','#C9A675','#B39062');
    case 'nuria':return box(x+1.2,y+0.3,0.74,0.3,0.2,0.04,'#F6C5D3','#E3A9BA','#D395A7');
    case 'sara':return box(x+1.25,y+0.35,0.74,0.14,0.24,0.03,'#1E2430','#141922','#141922');
    case 'leo':return box(x+1.2,y+0.3,0.74,0.32,0.24,0.03,'#FFFFFF','#E9EDF2','#D7DDE5');
  }return '';
}
function station(a,x,y,interactive){
  const on=interactive&&a.id===sel,px=x+0.85,py=y+1.3;
  let s=on?poly([[x-0.25,y-0.25,0],[x+1.95,y-0.25,0],[x+1.95,y+1.95,0],[x-0.25,y+1.95,0]],'rgba(39,71,232,.12)','stroke="#2747E8" stroke-width="2"'):'';
  s+=poly([[x+0.05,y+0.05,0],[x+1.75,y+0.05,0],[x+1.75,y+1.0,0],[x+0.05,y+1.0,0]],'rgba(20,30,50,.07)');
  s+=box(x,y,0,0.06,0.9,0.68,...WOOD)+box(x+1.64,y,0,0.06,0.9,0.68,...WOOD)+box(x,y,0.68,1.7,0.9,0.06,...WOOD);
  // monitor
  s+=box(x+0.78,y+0.16,0.74,0.12,0.08,0.24,...DARK)+box(x+0.38,y+0.14,0.95,0.92,0.06,0.52,'#2A303B','#1E2430','#141922');
  s+=faceY(y+0.2,x+0.42,x+1.26,0.99,1.43,'#F1F4FA')+faceY(y+0.2,x+0.42,x+1.26,1.35,1.43,a.color)+faceY(y+0.2,x+0.5,x+0.9,1.06,1.27,'#DCE3EE')+faceY(y+0.2,x+0.96,x+1.2,1.06,1.27,'#E6EBF3');
  s+=box(x+0.5,y+0.48,0.74,0.62,0.22,0.02,'#D7DDE5','#BFC7D2','#AEB7C4');
  s+=propFor(a.id,x,y);
  // silla + persona (de espaldas)
  s+=box(px-0.28,py-0.2,0.38,0.56,0.5,0.08,...DARK)+box(px-0.03,py+0.02,0,0.06,0.06,0.38,...DARK);
  s+=figure(a,px,py,false,0.25);
  s+=box(px-0.28,py+0.28,0.46,0.56,0.08,0.62,...DARK);
  return interactive?`<g data-a="${a.id}" tabindex="0" role="button" aria-label="${esc(a.name+', '+a.role+': '+a.task)}">${s}</g>`:s;
}
function reception(a,interactive){
  const on=interactive&&a.id===sel,x=8.6,y=9.2;
  let s=on?poly([[x-0.4,y-1.6,0],[x+4,y-1.6,0],[x+4,y+1.2,0],[x-0.4,y+1.2,0]],'rgba(39,71,232,.12)','stroke="#2747E8" stroke-width="2"'):'';
  s+=box(x+0.4,y-1.4,0,1.6,0.5,0.74,...WOOD); // mesa trasera
  s+=figure(a,x+1.8,y-0.45,true,0.48);
  s+=box(x,y,0,3.6,0.75,1.05,'#FFFFFF','#1F2A44','#16203A');
  s+=box(x-0.05,y-0.05,1.05,3.7,0.85,0.06,'#F4F6F9','#DCE1E8','#C9D0DA');
  const [tx,ty]=P(x+0.5,y+0.75,0.38);
  s+=`<g transform="matrix(${IA/U},${IB/U},0,1,${tx.toFixed(1)},${ty.toFixed(1)})"><rect x="0" y="-16" width="14" height="14" rx="3" fill="#2747E8"/><text x="22" y="-3.5" font-size="15" font-weight="700" fill="#FFFFFF" letter-spacing="1">Recepción</text></g>`;
  s+=box(x+2.7,y+0.15,1.11,0.4,0.3,0.03,'#FFFFFF','#E9EDF2','#D7DDE5');
  return interactive?`<g data-a="lola" tabindex="0" role="button" aria-label="${esc(a.name+', '+a.role+': '+a.task)}">${s}</g>`:s;
}
function plant(x,y,sc=1){
  const [cx,cy]=P(x+0.25,y+0.25,0.55+0.55*sc);
  return box(x,y,0,0.5,0.5,0.55,'#E9EDF2','#D7DDE5','#C3CBD6')+`<circle cx="${cx.toFixed(1)}" cy="${(cy+8).toFixed(1)}" r="${18*sc}" fill="#5E8C6A"/><circle cx="${(cx-9).toFixed(1)}" cy="${(cy-4).toFixed(1)}" r="${13*sc}" fill="#6F9E7B"/><circle cx="${(cx+10).toFixed(1)}" cy="${(cy-2).toFixed(1)}" r="${12*sc}" fill="#4F7A5B"/>`;
}
function label(a,fid){
  const pos={teo:[2.85,2.8],nuria:[6.35,2.8],bruno:[9.85,2.8],vera:[13.0,2.8],marco:[3.6,6.6],sara:[7.1,6.6],leo:[10.6,6.6],lola:[10.4,8.75]}[a.id];
  const [x,y]=P(pos[0],pos[1],a.id==='lola'?1.9:2.15);
  const t1=esc(`${a.name} · ${a.role}`),t2=esc(a.short),w=Math.round(Math.max(t1.length*6.9,t2.length*6.4)+34);
  const l=x-w/2,tp=y-46;
  return `<g class="tag"><rect x="${l.toFixed(1)}" y="${tp.toFixed(1)}" width="${w}" height="40" rx="9" fill="#FFFFFF" filter="url(#${fid})"/>
   <path d="M${(x-6).toFixed(1)} ${(tp+40).toFixed(1)} L${x.toFixed(1)} ${(tp+47).toFixed(1)} L${(x+6).toFixed(1)} ${(tp+40).toFixed(1)}Z" fill="#FFFFFF"/>
   <circle class="${a.st==='busy'?'blink':''}" cx="${(l+14).toFixed(1)}" cy="${(tp+14).toFixed(1)}" r="4" fill="${STC[a.st]}"/>
   <text x="${(l+24).toFixed(1)}" y="${(tp+18).toFixed(1)}" font-size="12" font-weight="700" fill="#13202B">${t1}</text>
   <text x="${(l+24).toFixed(1)}" y="${(tp+33).toFixed(1)}" font-size="11.5" fill="#5B6874">${t2}</text></g>`;
}
function room(interactive){
  void 0;
  const A=id=>AGENTS.find(a=>a.id===id),fid=FID;
  let g='';
  for(let i=1;i<WD;i++)g+=`<line x1="${P(i,0)[0]}" y1="${P(i,0)[1]}" x2="${P(i,DP)[0]}" y2="${P(i,DP)[1]}" stroke="#E3E7ED" stroke-width="1"/>`;
  for(let j=1;j<DP;j++)g+=`<line x1="${P(0,j)[0]}" y1="${P(0,j)[1]}" x2="${P(WD,j)[0]}" y2="${P(WD,j)[1]}" stroke="#E3E7ED" stroke-width="1"/>`;
  // paredes
  let w=poly([[0,0,0],[0,DP,0],[0,DP,WH],[0,0,WH]],'#E4E8EE')+poly([[0,0,0],[WD,0,0],[WD,0,WH],[0,0,WH]],'#F2F4F7');
  w+=poly([[0,0,0],[0,DP,0],[0,DP,0.18],[0,0,0.18]],'#CDD3DC')+poly([[0,0,0],[WD,0,0],[WD,0,0.18],[0,0,0.18]],'#DCE1E8');
  // ventanas pared derecha
  for(let i=0;i<3;i++){const x0=6.6+i*2.35;w+=faceY(0,x0,x0+1.95,1.0,2.95,'#C9D6E6')+faceY(0,x0+0.08,x0+1.87,1.08,2.87,'#DDE8F4')+faceY(0,x0+0.95,x0+1.0,1.08,2.87,'#C9D6E6')+poly([[x0+0.1,0,1.1],[x0+0.7,0,1.1],[x0+1.4,0,2.85],[x0+0.8,0,2.85]],'rgba(255,255,255,.55)')}
  // pantalla de datos en la pared
  w+=faceY(0,1.4,4.9,1.35,2.85,'#1B2333')+faceY(0,1.55,4.75,1.48,2.72,'#222C40');
  w+=poly([[1.75,0,1.7],[2.4,0,1.95],[3.0,0,1.85],[3.6,0,2.25],[4.2,0,2.15],[4.55,0,2.5],[4.55,0,1.6],[1.75,0,1.6]],'rgba(126,149,255,.35)');
  w+=`<polyline points="${[[1.75,1.7],[2.4,1.95],[3.0,1.85],[3.6,2.25],[4.2,2.15],[4.55,2.5]].map(([x,z])=>pt(x,0,z)).join(' ')}" fill="none" stroke="#7E95FF" stroke-width="2.5"/>`;
  [[1.75,'#2BB673'],[2.3,'#7E95FF'],[2.85,'#FFFFFF']].forEach(([x,c])=>w+=faceY(0,x,x+0.42,2.5,2.6,c));
  // logotipo pared izquierda
  const [lx,ly]=P(0,7.9,2.35);
  w+=`<g transform="matrix(${IA/U},${-IB/U},0,1,${lx.toFixed(1)},${ly.toFixed(1)})"><rect x="0" y="-30" width="30" height="30" rx="7" fill="#2747E8"/><rect x="10" y="-20" width="10" height="10" rx="2" fill="#FFFFFF"/><text x="44" y="-7" class="disp" font-size="27" font-weight="700" fill="#13202B">Oficina Virtual</text><text x="45" y="16" font-size="12" font-weight="600" fill="#5B6874" letter-spacing="2.5">TU EQUIPO DIGITAL</text></g>`;
  // perchero con ropa en la pared izquierda
  w+=box(0.25,8.6,0,0.06,0.06,1.9,...DARK)+box(0.25,11.3,0,0.06,0.06,1.9,...DARK)+box(0.25,8.6,1.85,0.06,2.76,0.05,...DARK);
  ['#1F2A44','#F3F5F8','#7A2E3B','#B08D63','#8A94A6','#7FA58F'].forEach((c,i)=>{const y0=8.75+i*0.42;w+=poly([[0.3,y0,1.82],[0.3,y0+0.36,1.82],[0.3,y0+0.36,i%2?1.0:0.75],[0.3,y0,i%2?1.0:0.75]],c,'stroke="rgba(0,0,0,.08)"')});
  // estantería almacén
  w+=box(12.2,0.1,0,1.5,0.55,0.05,...WOOD)+box(12.2,0.1,1.0,1.5,0.55,0.05,...WOOD)+box(12.2,0.1,2.0,1.5,0.55,0.05,...WOOD);
  [[12.3,0.05],[12.85,0.05],[12.4,1.05],[13.05,1.05],[12.6,2.05]].forEach(([x,z])=>w+=box(x,0.15,z,0.48,0.45,0.42,'#D9B98C','#C49E6C','#AF8A59'));
  // escena
  const st=[];
  [['teo',2,1.5],['nuria',5.5,1.5],['bruno',9,1.5],['vera',12.2,1.6],['marco',2.8,5.3],['sara',6.3,5.3],['leo',9.8,5.3]].forEach(([id,x,y])=>st.push([x+y,station(A(id),x,y,interactive)]));
  st.push([17.8,reception(A('lola'),interactive)]);
  st.push([2.5,plant(1.0,0.6,1.1)]);st.push([12.2,plant(0.6,11.2,0.9)]);st.push([21.5,plant(13.2,8.6,1.2)]);
  // zona de espera
  st.push([17,box(4.0,10.2,0,2.2,0.8,0.42,'#C9D0DA','#AEB7C4','#9AA5B4')+box(4.0,10.85,0.42,2.2,0.15,0.45,'#C9D0DA','#AEB7C4','#9AA5B4')+box(6.6,10.2,0,0.7,0.7,0.4,...WOOD)]);
  st.sort((p,q)=>p[0]-q[0]);
  const order=['teo','nuria','bruno','vera','marco','sara','leo','lola'];
  return `<svg class="room" viewBox="0 0 1100 800" role="img" aria-label="Oficina virtual con recepción y ocho puestos de trabajo">
   <defs><filter id="${fid}" x="-20%" y="-30%" width="140%" height="180%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#0E1726" flood-opacity=".18"/></filter></defs>
   ${poly([[0,0,0],[WD,0,0],[WD,DP,0],[0,DP,0]],'#F7F8FA')}${g}${w}
   ${st.map(s=>s[1]).join('')}
   ${order.map(id=>label(A(id),fid)).join('')}
  </svg>`;
}

export function officeSvg(states: AgentState[], opts: { interactive: boolean; selected?: AgentId | null; id: string }): string {
  const byId = new Map(states.map((s) => [s.id, s]));
  AGENTS = DEFS.map((d) => ({ ...d, ...(byId.get(d.id) ?? { status: 'off', task: 'Libre', short: 'Libre' }), st: (byId.get(d.id)?.status ?? 'off') }));
  sel = opts.selected ?? null;
  FID = `sh-${opts.id}`;
  return room(opts.interactive);
}
