(function(){
var KEY="academia-trading-v1",st={};
try{st=JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){st={}}
st.f=st.f||{};st.log=st.log||[];
function save(){try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){}}
var $=function(s,r){return(r||document).querySelector(s)},$$=function(s,r){return[].slice.call((r||document).querySelectorAll(s))};

// menú móvil y semana activa
var mb=$("#menuBtn");if(mb)mb.onclick=function(){document.body.classList.toggle("nav-open")};
$$("main").forEach(function(m){m.addEventListener("click",function(){document.body.classList.remove("nav-open")})});
var act=document.body.dataset.active;$$(".wk[data-week]").forEach(function(a){if(a.dataset.week===act)a.classList.add("on")});

// tema claro/oscuro
var tb=$("#themeBtn");if(tb)tb.onclick=function(){var d=document.documentElement,cur=d.dataset.theme||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"),nx=cur==="dark"?"light":"dark";d.dataset.theme=nx;try{localStorage.setItem("academia-theme",nx)}catch(e){}};
// continuar donde lo dejé
var rb=$("#resumeBtn");if(rb&&st.f._lastWeek){rb.href="semana-"+("0"+st.f._lastWeek).slice(-2)+".html";rb.textContent="Continuar con la semana "+st.f._lastWeek+" →"}
if(/^\d+$/.test(document.body.dataset.active||"")){st.f._lastWeek=+document.body.dataset.active;save()}

// campos guardados
var timers={};
$$("[data-store]").forEach(function(el){
 var k=el.dataset.store,v=st.f[k];
 if(el.type==="radio"){if(v===el.value)el.checked=true;el.onchange=function(){st.f[k]=el.value;save()}}
 else if(el.type==="checkbox"){el.checked=!!v;el.onchange=function(){st.f[k]=el.checked;save();refresh()}}
 else{if(v)el.value=v;el.oninput=function(){clearTimeout(timers[k]);timers[k]=setTimeout(function(){st.f[k]=el.value;save()},400)}}
});

function refresh(){
 $$("[data-dot]").forEach(function(d){d.classList.toggle("ok",!!st.f[d.dataset.dot])});
 $$("[data-progress]").forEach(function(b){
  var w=b.dataset.progress,pre="w"+w+"-done-",done=Object.keys(st.f).filter(function(k){return k.indexOf(pre)===0&&st.f[k]}).length;
  var tot=+b.dataset.total||+(st.f["_tot"+w]||0);if(b.dataset.total){st.f["_tot"+w]=tot;save()}
  b.style.width=tot?Math.round(100*done/tot)+"%":"0";
 });
 var n=$("#secsDone");if(n)n.textContent=Object.keys(st.f).filter(function(k){return /-done-/.test(k)&&st.f[k]}).length;
}

// pestañas de secciones
var panes=$$(".pane");
if(panes.length){
 var ids=panes.map(function(p){return p.id});
 function show(id){
  if(ids.indexOf(id)<0)id=ids[0];
  panes.forEach(function(p){p.hidden=p.id!==id});
  $$(".tab").forEach(function(t){t.classList.toggle("on",t.dataset.tab===id);if(t.dataset.tab===id){var bar=t.parentNode;bar.scrollLeft=t.offsetLeft-bar.clientWidth/2+t.clientWidth/2}});
  var i=ids.indexOf(id);$("#prevSec").disabled=i===0;$("#nextSec").textContent=i===ids.length-1?"Fin de la semana":"Siguiente →";
  st.f["_last"+act]=id;save();
 }
 window.addEventListener("hashchange",function(){show(location.hash.slice(1));var tabs=$(".tabs");window.scrollTo(0,tabs?tabs.offsetTop-70:0)});
 $("#prevSec").onclick=function(){var i=ids.indexOf(location.hash.slice(1)||ids[0]);if(i>0)location.hash=ids[i-1]};
 $("#nextSec").onclick=function(){var i=ids.indexOf(location.hash.slice(1)||ids[0]);if(i<ids.length-1)location.hash=ids[i+1];else location.href="progreso.html"};
 show(location.hash.slice(1)||st.f["_last"+act]);
}

// fórmulas
window.addEventListener("load",function(){if(window.renderMathInElement)renderMathInElement(document.body,{delimiters:[{left:"$$",right:"$$",display:true}],throwOnError:false})});

// registro de estudio
var lf=$("#logForm");
function drawLog(){
 var b=$("#logBody");if(!b)return;b.innerHTML="";var h=0;
 st.log.forEach(function(r,i){h+=+r.h||0;var tr=document.createElement("tr");
  [r.d,r.t,r.h,r.n].forEach(function(x){var td=document.createElement("td");td.textContent=x||"";tr.appendChild(td)});
  var td=document.createElement("td"),x=document.createElement("button");x.className="btn ghost";x.textContent="Quitar";x.onclick=function(){st.log.splice(i,1);save();drawLog()};td.appendChild(x);tr.appendChild(td);b.appendChild(tr)});
 $("#hours").textContent=Math.round(h*100)/100;
}
if(lf){$("#lgDate").valueAsDate=new Date();
 lf.onsubmit=function(e){e.preventDefault();st.log.push({d:$("#lgDate").value,t:$("#lgTask").value,h:$("#lgH").value,n:$("#lgNote").value});save();lf.reset();$("#lgDate").valueAsDate=new Date();drawLog()};drawLog();}

// copiar trabajo
var cb=$("#copyAll");
if(cb)cb.onclick=function(){
 var out=["TRABAJO DEL ALUMNO · "+new Date().toLocaleString("es-ES"),""],keys=Object.keys(st.f).filter(function(k){return k[0]!=="_"}).sort();
 keys.forEach(function(k){var v=st.f[k];if(v===true)v="completada";if(v)out.push("["+k+"]\n"+v+"\n")});
 if(st.log.length){out.push("[registro de estudio]");st.log.forEach(function(r){out.push(r.d+" · "+r.t+" · "+r.h+" h · "+r.n)})}
 var txt=out.join("\n"),box=$("#copyBox");box.value=txt;
 (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(function(){$("#copyMsg").textContent="Copiado. Pégalo en el chat de corrección."},function(){box.hidden=false;box.select();$("#copyMsg").textContent="Selecciona el texto de abajo y cópialo."});
};
var eb=$("#exportBtn");
if(eb)eb.onclick=function(){var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(st)],{type:"application/json"}));a.download="academia-copia.json";a.click()};
var fi=$("#importFile");
if(fi)fi.onchange=function(){var r=new FileReader();r.onload=function(){try{var d=JSON.parse(r.result);if(d&&d.f){st=d;st.log=st.log||[];save();location.reload()}}catch(e){alert("El archivo no es una copia válida.")}};r.readAsText(fi.files[0])};

refresh();
})();
