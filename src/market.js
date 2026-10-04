/* ===== 8. Сторінка пари: детальний графік за вибраний період (1 год … 5 років) =====
   Джерела ті самі, що й у тікера: Frankfurter (валюти, щоденні курси ЄЦБ) і Kraken (крипто, свічки OHLC).
   Для валют годинних даних у джерела немає, тому періоди «1 год» і «1 день» є лише в крипто. */
var MKP_FX=['7D','1M','3M','1Y','5Y'],MKP_CR=['1H','1D','7D','1M','3M','1Y','5Y'];
var MKP_L={'1H':'1 год','1D':'1 день','7D':'7 днів','1M':'1 міс','3M':'3 міс','1Y':'1 рік','5Y':'5 років'};
var MKP_DAYS={'7D':7,'1M':30,'3M':91,'1Y':365,'5Y':1826};
var MKP_KR={'1H':[1,3600000],'1D':[5,86400000],'7D':[60,604800000],'1M':[240,2592000000],'3M':[1440,7776000000],'1Y':[1440,31536000000],'5Y':[10080,157680000000]};
var mkpCache={},mkP={id:'',period:'1M',pts:null,draw:null,state:'idle'},mkpReq=0,mcrossEl=document.getElementById('mcross');

function mkMeta(id){var c=VF.marketCatalog();for(var i=0;i<c.length;i++)if(c[i].id===id)return c[i];return null;}
function mkPeriods(m){return m&&m.kind==='crypto'?MKP_CR:MKP_FX;}
function mkJson(url){return fetch(url).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();});}
function mkLoadSeries(m,period){
 var now=Date.now(),key=m.id+'|'+period,c=mkpCache[key];
 if(c&&now-c.t<(m.kind==='crypto'?60000:3600000))return Promise.resolve(c.pts);
 var p;
 if(m.kind==='fx'){
  var all=mkpCache[m.id+'|fx5y'];
  if(all&&now-all.t<3600000)p=Promise.resolve(all.pts);
  else{
   var f=new Date(now);f.setFullYear(f.getFullYear()-5);
   p=mkJson('https://api.frankfurter.dev/v2/rates?from='+f.toISOString().slice(0,10)+'&base='+m.base.toLowerCase()+'&quotes='+m.quote.toLowerCase()).then(function(rows){
    var pts=rows.map(function(r){return{t:Date.parse(r.date),v:Number(r.rate)};}).filter(function(x){return isFinite(x.v)&&isFinite(x.t);});
    mkpCache[m.id+'|fx5y']={t:now,pts:pts};return pts;});
  }
  p=p.then(function(pts){
   var from=now-MKP_DAYS[period]*86400000,i=0;while(i<pts.length&&pts[i].t<from)i++;
   return pts.slice(Math.max(0,i-1));});
 }else{
  var cfg=MKP_KR[period];
  p=mkJson('https://api.kraken.com/0/public/OHLC?pair='+m.pair+'&interval='+cfg[0]+'&since='+Math.floor((now-cfg[1])/1000)).then(function(res){
   if(res.error&&res.error.length)throw new Error(res.error[0]);
   var rows=[],k,r=res.result||{};for(k in r)if(Array.isArray(r[k])){rows=r[k];break;}
   return rows.map(function(x){return{t:x[0]*1000,v:Number(x[4])};}).filter(function(x){return isFinite(x.v);});});
 }
 return p.then(function(pts){mkpCache[key]={t:Date.now(),pts:pts};return pts;});
}
function mkpLoad(){
 var m=mkMeta(mkP.id);if(!m)return;
 var tok=++mkpReq;mkP.state='loading';mkP.pts=null;mkP.draw=null;
 mkLoadSeries(m,mkP.period).then(function(pts){
  if(tok!==mkpReq)return;mkP.pts=pts;mkP.state=pts.length>1?'ok':'empty';renderPages();
 }).catch(function(e){
  if(tok!==mkpReq)return;mkP.state='err';renderPages();
 });
 renderPages();
}
function mkpEnter(id){
 if(mkP.id===id)return;
 var m=mkMeta(id);mkP.id=id;
 if(mkPeriods(m).indexOf(mkP.period)<0)mkP.period='1M';
 mkpLoad();
}
function setMarketPeriod(p){if(p===mkP.period)return;mkP.period=p;mkpLoad();}
function mkDate(t,period){
 var d=new Date(t);
 if(period==='1H')return d.toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'});
 if(period==='1D')return d.toLocaleString('uk-UA',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
 return d.toLocaleDateString('uk-UA',{day:'numeric',month:'short',year:'numeric'});
}
function mkDown(pts){
 var n=pts.length,st=Math.ceil(n/260),o=[],i;
 for(i=0;i<n;i+=st)o.push(pts[i]);
 if(o[o.length-1]!==pts[n-1])o.push(pts[n-1]);
 return o;
}
function mkChartHtml(pts,up){
 var W=340,H=210,pd=22,mn=Infinity,mx=-Infinity,i;
 for(i=0;i<pts.length;i++){if(pts[i].v<mn)mn=pts[i].v;if(pts[i].v>mx)mx=pts[i].v;}
 var rg=mx-mn||1,col=up?'#66d896':'#ff7d83';
 var xy=pts.map(function(p,k){return(k/(pts.length-1)*W).toFixed(1)+' '+(pd+(H-2*pd)*(1-(p.v-mn)/rg)).toFixed(1);});
 var d='M'+xy.join(' L');
 var grid='';for(i=0;i<3;i++){var gy=(pd+(H-2*pd)*i/2).toFixed(1);grid+='<line x1="0" x2="'+W+'" y1="'+gy+'" y2="'+gy+'" stroke="rgba(255,255,255,.08)" stroke-width="1" vector-effect="non-scaling-stroke"/>';}
 return'<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" data-pts="'+ptsAttr(xy.map(function(q){return q.split(' ');}))+'" data-vb="'+W+','+H+'" data-col="'+col+'" data-lw="4"><defs><linearGradient id="mpg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+col+'" stop-opacity=".32"/><stop offset="1" stop-color="'+col+'" stop-opacity="0"/></linearGradient></defs>'+grid+
  '<path d="'+d+' L'+W+' '+H+' L0 '+H+' Z" fill="url(#mpg)"/>'+lineSvg(d,col,2.2,' vector-effect="non-scaling-stroke"',true)+'</svg>'+
  '<span class="mx">'+esc(mkFmt(mx))+'</span><span class="mn">'+esc(mkFmt(mn))+'</span>';
}
function blocksMarket(){
 var m=mkMeta(nav.getState().params.marketId),o=[];
 if(!m)return[hdr('Пару не знайдено','',1)];
 var live=MK.data[m.id],pts=mkP.pts,ok=mkP.state==='ok'&&pts&&pts.length>1;
 var first=ok?pts[0].v:null,last=ok?pts[pts.length-1].v:(live&&isFinite(live.value)?live.value:null);
 var chg=ok&&first?(last-first)/first*100:null,up=chg==null||chg>=0;
 o.push(hdr(m.label,(m.name?m.name+' · ':'')+mkSource(m),1));
 var chips=mkPeriods(m).map(function(p){return'<button class="chip'+(p===mkP.period?' on':'')+'" data-act="mperiod" data-v="'+p+'">'+MKP_L[p]+'</button>';}).join('');
 var body;
 if(ok){mkP.draw=mkDown(pts);body='<div class="mchart" data-mkc="1">'+mkChartHtml(mkP.draw,up)+'</div><div class="mt"><span>'+esc(mkDate(pts[0].t,mkP.period))+'</span><span>'+esc(mkDate(pts[pts.length-1].t,mkP.period))+'</span></div>';}
 else{var msg=mkP.state==='loading'?'Завантаження…':mkP.state==='err'?'Не вдалося завантажити дані: перевірте мережу.':'Для цього періоду даних немає.';body='<div class="mchart"><div class="msg">'+esc(msg)+'</div></div><div class="mt"><span></span><span></span></div>';}
 o.push(B_('tile','<div class="lbl">'+esc(MKP_L[mkP.period])+'</div><div class="big">'+esc(last==null?'—':mkFmt(last))+'</div>'+
  (chg==null?'':'<div class="chg '+(chg<0?'neg':'')+'">'+esc(mkPct(chg))+'<span>за період</span></div>')+body+'<div class="mper">'+chips+'</div>'));
 if(ok){
  var mn=Infinity,mx=-Infinity;pts.forEach(function(p){if(p.v<mn)mn=p.v;if(p.v>mx)mx=p.v;});
  o.push(B_('tile','<div class="grid2"><div class="mini"><span class="lbl">Початок періоду</span><b>'+esc(mkFmt(first))+'</b></div><div class="mini"><span class="lbl">Зараз</span><b>'+esc(mkFmt(last))+'</b></div><div class="mini"><span class="lbl">Мінімум</span><b>'+esc(mkFmt(mn))+'</b></div><div class="mini"><span class="lbl">Максимум</span><b>'+esc(mkFmt(mx))+'</b></div></div>'));
 }
 o.push(B_('tile','<div class="lbl">Звідки дані</div><div class="cap">'+(m.kind==='crypto'?'Kraken (api.kraken.com), публічні свічки. Для періодів до року свічки від 1 хвилини до доби, для 5 років тижневі.':'Frankfurter (api.frankfurter.dev), офіційні щоденні курси ЄЦБ. Годинних і внутрішньоденних даних немає, тому періоди 1 год і 1 день недоступні.')+' Дані можуть мати затримку. Це не порада щодо інвестицій.</div>'));
 return o;
}
/* лінія й підказка при дотику до графіка (окремий елемент поза сторінками, щоб не перезнімати блок) */
function mcrossHide(){mcrossEl.style.display='none';}
function mcrossAt(e){
 var el=e.target.closest&&e.target.closest('.mchart[data-mkc]');
 if(!el||!mkP.draw){mcrossHide();return;}
 var r=frect(el),fr=clamp((e.clientX-r.left)/r.width,0,1),dr=mkP.draw,p=dr[Math.round(fr*(dr.length-1))];
 var x=r.left+fr*r.width,lab=mcrossEl.lastChild;
 mcrossEl.style.display='block';mcrossEl.style.left=x+'px';mcrossEl.style.top=r.top+'px';mcrossEl.style.height=r.height+'px';
 lab.textContent=mkFmt(p.v)+' · '+mkDate(p.t,mkP.period);
 lab.style.left=(clamp(x,90,VW-90)-x)+'px';
}
root.addEventListener('pointerdown',mcrossAt);
root.addEventListener('pointermove',function(e){if(mcrossEl.style.display==='block'||e.buttons||e.pointerType==='touch')mcrossAt(e);});
root.addEventListener('pointerup',mcrossHide);root.addEventListener('pointercancel',mcrossHide);
