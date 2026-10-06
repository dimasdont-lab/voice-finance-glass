/* ===== Додаткові віджети головної сторінки. Дані беруться лише з finance-core (нічого не вигадується); нотатки — лише на пристрої.
   Увімкнення/вимкнення — у Налаштуваннях → «Віджети». Розмір змінюється в режимі польоту (ручка в куті); вміст підлаштовується
   контейнерними запитами CSS: шрифти масштабуються плавно, а коли стає тісно — ховаються другорядні елементи. ===== */
var WG_LIST=[
 {id:'clock',n:'Годинник і дата',s:2},{id:'today',n:'Можна витратити сьогодні',s:2},{id:'save',n:'Заощадження місяця',s:2},{id:'focus',n:'Головна витрата місяця',s:2},
 {id:'week',n:'Витрати за тиждень',s:4},{id:'upc',n:'Найближчі платежі',s:4},{id:'debt',n:'Хто винен',s:4},{id:'pair',n:'Курс валюти',s:2},
 {id:'pay',n:'Днів до доходу',s:2},{id:'quick',n:'Швидка операція',s:2},{id:'notes',n:'Нотатки',s:4},{id:'game',n:'Успіх',s:2}];
var WG=(function(){try{var j=JSON.parse(localStorage.getItem('vf-wg')||'null');if(Array.isArray(j))return j;}catch(e){}return WG_LIST.map(function(w){return w.id;});})();
/* ---- папки: власний великий простір для віджетів; відкриваються «провалом» у просторі ---- */
var FOLDERS=(function(){try{var j=JSON.parse(localStorage.getItem('vf-folders')||'null');if(j&&typeof j==='object')return j;}catch(e){}return{};})();
function foldSave(){try{localStorage.setItem('vf-folders',JSON.stringify(FOLDERS));}catch(e){}}
function wgIdOf(el){var c=el.classList,i;for(i=0;i<c.length;i++)if(c[i].indexOf('wg-')===0)return c[i].slice(3);return'';}
function wgSizeOf(id){var w=WG_LIST.find(function(q){return q.id===id;});return w&&w.s===2?2:(id.indexOf('f:')===0?2:4);}
/* розкладка полотна: нові віджети кладуться на першому екрані «полиці» 4 колонки, далі користувач розставляє як хоче */
function foldLayout(F){F.pos=F.pos||{};var u=wuUnit(4),g=12,cols=[0,0,0,0],ch=false;
 F.wg.forEach(function(id){if(id.indexOf('f:')===0||F.pos[id])return;var ds=wgSizeOf(id),eh=ds===4?130:104,best=0,by=1e9,c,k;
  for(c=0;c<=4-ds;c++){var mh=0;for(k=c;k<c+ds;k++)mh=Math.max(mh,cols[k]);if(mh<by){by=mh;best=c;}}
  F.pos[id]={x:Math.round(16+best*(u+g)),y:230+by};for(k=best;k<best+ds;k++)cols[k]=by+eh+g;ch=true;});
 if(ch)foldSave();return F.pos;}
function blocksFolder(){var F=FOLDERS[FLD.id];if(!F)return[];var o=wgBlocks(F.wg);if(!F.wg.length)o.push(B_('tile','<div class="empty">Папка порожня. Затисніть будь-який віджет і натисніть «+» унизу ліворуч, щоб додати віджети.</div>'));return o;}
function fhdr(on){var h=document.getElementById('fhdr');if(!h){h=document.createElement('div');h.id='fhdr';h.innerHTML='<button data-fb="1">‹</button><span></span>';document.body.appendChild(h);h.firstChild.addEventListener('click',function(e){e.stopPropagation();closeFolder();});h.addEventListener('pointerdown',function(e){e.stopPropagation();});}
 if(on){h.lastChild.textContent=(FOLDERS[FLD.id]||{}).n||'';h.style.top=(tickerEl.offsetTop+tickerEl.offsetHeight+10)+'px';h.style.display='flex';}else h.style.display='none';}
function foldFx(k,ox,oy,s0){try{cv.style.transformOrigin=ox+'px '+oy+'px';var an=cv.animate(k>0?[{transform:'scale('+s0+')',opacity:0},{transform:'scale('+(s0+(1-s0)*.35)+')',opacity:1,offset:.25},{transform:'none',opacity:1}]:[{transform:'scale('+(1/s0)+')',opacity:0},{transform:'scale('+(1+(1/s0-1)*.4)+')',opacity:1,offset:.3},{transform:'none',opacity:1}],{duration:620,easing:'cubic-bezier(.22,.8,.2,1)'});an.onfinish=function(){cv.style.transformOrigin='';};}catch(e){}}
function foldClamp(){var z=FLD.zoom,mx=Math.max(0,(FLD.cw||VW*3)*z-VW);FLD.px=Math.max(0,Math.min(mx,FLD.px));var ms=maxScroll(9);sy[9]=Math.max(0,Math.min(ms,sy[9]));}
function foldZoomAt(z1,cx,cy){z1=Math.max(.35,Math.min(1.8,z1));var k=z1/(FLD.zoom||1);FLD.px=(FLD.px+cx)*k-cx;sy[9]=(sy[9]+cy)*k-cy;FLD.zoom=z1;inn[9].style.zoom=z1.toFixed(3);needSync[9]=1;tlStale[9]=1;foldClamp();dirty=true;}
function openFolder(id,srcEl){if(!FOLDERS[id])return;var F=FOLDERS[id],r=srcEl?srcEl.getBoundingClientRect():{left:VW/2,top:VH/2,width:0,height:0},ox=r.left+r.width/2,oy=r.top+r.height/2,s0=.3;
 FLD.id=id;FLD.scr=nav.getState().screen;FLD.zoom=1;FLD.px=0;sel=9;ca=9;sy[9]=0;foldLayout(F);renderPages();inn[9].style.zoom='1';fhdr(true);foldFx(1,ox,oy,s0);dirty=true;LG('egg','папка: '+F.n);}
function closeFolder(){if(!FLD.id)return;FLD.id=null;sel=2;ca=2;renderPages();fhdr(false);foldFx(-1,VW/2,VH*.3,.3);dirty=true;}
function foldAdd(){var n=Object.keys(FOLDERS).length+1,nm='Папка '+n;try{var r=window.prompt('Назва папки',nm);if(r===null)return;nm=(r||nm).trim().slice(0,24)||nm;}catch(e){}var id='k'+Date.now().toString(36);FOLDERS[id]={n:nm,wg:[]};foldSave();WG.push('f:'+id);wgSave();renderPages();}
function wgCur(){return FLD.id&&FOLDERS[FLD.id]?FOLDERS[FLD.id].wg:WG;}
function wgPut(id){var L=wgCur();if(L.indexOf(id)>=0){toast('Цей віджет уже тут');return;}L.push(id);if(FLD.id)foldSave();else wgSave();renderPages();}
/* кнопка «+»: маленька випливашка «Віджети / Папку», далі список віджетів */
function wgAddMenu(anchor){
 var items=[{v:'w',l:'Віджети'}];if(!FLD.id)items.push({v:'f',l:'Папку'});
 openDropdown(anchor,items,'',function(v){
  if(v==='f')foldAdd();
  else setTimeout(function(){openDropdown(anchor,WG_LIST.map(function(w){return{v:w.id,l:w.n};}),'',function(id){wgPut(id);});},260);});
}
/* масштаб папки щипком: більше/менше колонок — віджети стискаються й перебудовуються */
(function(){var P={},pan=null;function d(){var k=Object.keys(P);if(k.length<2)return 0;var a=P[k[0]],b=P[k[1]];return Math.hypot(a.x-b.x,a.y-b.y);}
 function mid(){var k=Object.keys(P),a=P[k[0]],b=P[k[1]];return{x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
 root.addEventListener('pointerdown',function(e){if(!FLD.id)return;P[e.pointerId]={x:e.clientX,y:e.clientY};if(Object.keys(P).length===2){FLD.d0=d();FLD.z0=FLD.zoom;pan=null;}else pan={x:e.clientX};},true);
 root.addEventListener('pointermove',function(e){if(!FLD.id||!P[e.pointerId])return;var p=P[e.pointerId],dx=e.clientX-p.x;p.x=e.clientX;p.y=e.clientY;
  if(Object.keys(P).length>=2&&FLD.d0){var m=mid();foldZoomAt(FLD.z0*d()/Math.max(20,FLD.d0),m.x,m.y);return;}
  if(pan&&!WF.drag&&!WRZ&&!WFL.length){FLD.px-=dx;foldClamp();dirty=true;}},true);
 ['pointerup','pointercancel'].forEach(function(n){root.addEventListener(n,function(e){delete P[e.pointerId];if(Object.keys(P).length<2)FLD.d0=0;if(!Object.keys(P).length)pan=null;},true);});})();
function wgSave(){try{localStorage.setItem('vf-wg',JSON.stringify(WG));}catch(e){}}
function wgToggle(id){if(id.indexOf('f:')===0)return;var i=WG.indexOf(id);if(i>=0)WG.splice(i,1);else WG.push(id);wgSave();renderPages();}
function wgLabel(w){return w.n+': '+(WG.indexOf(w.id)>=0?'показано':'сховано');}
function wgRing(p,col){p=Math.max(0,Math.min(100,p));return'<div class="wpb"><b>'+Math.round(p)+'%</b><div class="bar"><i style="width:'+p.toFixed(1)+'%;background:'+col+'" data-col="'+col+'"></i></div></div>';}   /* частка — скляний прогрес-бар */
function wgDay(d){return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();}
function wgNextDay(day){var n=new Date(),d=new Date(n.getFullYear(),n.getMonth(),Math.min(day,28)),t=new Date(n.getFullYear(),n.getMonth(),n.getDate());if(d<t)d=new Date(n.getFullYear(),n.getMonth()+1,Math.min(day,28));return{d:d,left:Math.round((d-t)/864e5)};}
function wgBlocks(list){
 var st=fin.getState(),now=new Date(),o=[],ms=new Date(now.getFullYear(),now.getMonth(),1);
 function mon(type){var s=0;st.transactions.forEach(function(t){if(t.type===type&&t.currency==='PLN'&&new Date(t.date)>=ms)s+=t.amount;});return s;}
 list.forEach(function(id){
  if(id.indexOf('f:')===0){var F=FOLDERS[id.slice(2)];if(!F)return;var fp=foldLayout(F),fids=F.wg.filter(function(q){return q.indexOf('f:')!==0;}),fb=wgBlocks(fids),ux=wuUnit(4),minX=1e9,minY=1e9,maxX=0,maxY=0;
   fids.forEach(function(q){var P=fp[q];if(!P)return;var ds=wgSizeOf(q),ww=ds*ux+(ds-1)*12;minX=Math.min(minX,P.x);minY=Math.min(minY,P.y);maxX=Math.max(maxX,P.x+ww);maxY=Math.max(maxY,P.y+(ds===4?130:104));});
   var bw=Math.max(60,maxX-minX),bh=Math.max(60,maxY-minY),ms=Math.min(132/bw,96/bh),mini=fb.map(function(b2,q2){var P=fp[fids[q2]]||{x:minX,y:minY},ds=wgSizeOf(fids[q2]);return'<div class="'+b2.c+'" style="position:absolute;left:'+(P.x-minX)+'px;top:'+(P.y-minY)+'px;width:'+(ds*ux+(ds-1)*12)+'px">'+b2.h.replace(/<button/g,'<div').replace(/<\/button>/g,'</div>').replace(/<textarea[^>]*>[^<]*<\/textarea>/g,'<div class="wnotes"></div>')+'</div>';}).join('');
   o.push(B_('tile wg wg-folder ws2','<button class="fbx" data-act="fopen" data-id="'+esc(id.slice(2))+'"><div class="fmini"><div class="fgm" style="width:'+bw+'px;height:'+bh+'px;transform:scale('+ms.toFixed(4)+')">'+mini+'</div></div><div class="fnm">'+esc(F.n)+'</div></button>'));return;}
  var w=WG_LIST.find(function(q){return q.id===id;});if(!w)return;var c='tile wg wg-'+id+(w.s===2?' ws2':''),h='';
  if(id==='clock'){h='<div class="lbl">Зараз</div><div class="big wclk" data-clk="1">'+now.toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'})+'</div><div class="cap">'+esc(todayStr())+'</div>';}
  else if(id==='today'){var fc=forecastMonth(),left=Math.max(1,fc.left+1),rest=fc.limit-fc.spent,per=rest/left;
   h='<div class="lbl">Можна сьогодні</div><div class="big" style="color:'+(per<0?'var(--ac)':'var(--gr)')+'">'+esc(money(Math.max(0,per)))+'</div><div class="bar"><i style="width:'+Math.min(100,fc.limit?fc.spent/fc.limit*100:0).toFixed(1)+'%"></i></div><div class="cap">Залишок ліміту '+esc(money(rest))+' на '+left+' дн.</div>';}
  else if(id==='save'){var inc=mon('income'),exp=mon('expense'),sv=inc-exp,p=inc>0?sv/inc*100:0,sc=sv<0?'#ff7d83':'#66d896';
   h='<div class="fl1"><span class="lbl">Заощаджено</span><b class="fv" style="color:'+(sv<0?'var(--ac)':'var(--gr)')+'">'+esc(mv(sv))+'</b></div><div class="bar"><i style="width:'+Math.max(0,Math.min(100,p)).toFixed(1)+'%;background:'+sc+'" data-col="'+sc+'"></i></div><div class="cap fp">'+Math.round(p)+'% від доходу '+esc(money(inc))+'</div>';}
  else if(id==='focus'){var by={},tot=0,top=null;st.transactions.forEach(function(t){if(t.type==='expense'&&t.currency==='PLN'&&new Date(t.date)>=ms){by[t.category]=(by[t.category]||0)+t.amount;tot+=t.amount;}});
   for(var k in by)if(!top||by[k]>by[top])top=k;
   h=top?'<div class="fl1"><span class="lbl">Найбільше на</span><b class="fv">'+esc(catName(top))+'</b></div><div class="bar"><i style="width:'+(by[top]/tot*100).toFixed(1)+'%;background:'+hashCol(top)+'" data-col="'+hashCol(top)+'"></i></div><div class="cap fp">'+Math.round(by[top]/tot*100)+'% · '+esc(money(by[top]))+'</div>':'<div class="fl1"><span class="lbl">Найбільше на</span></div><div class="empty">Витрат ще немає</div>';}
  else if(id==='week'){var days=[],mx=1,i;for(i=6;i>=0;i--){var d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i);days.push({d:d,k:wgDay(d),s:0});}
   st.transactions.forEach(function(t){if(t.type!=='expense'||t.currency!=='PLN')return;var k=wgDay(new Date(t.date));days.forEach(function(q){if(q.k===k)q.s+=t.amount;});});
   days.forEach(function(q){mx=Math.max(mx,q.s);});var sum=days.reduce(function(a,q){return a+q.s;},0);
   h='<div class="th"><h2>Витрати за тиждень</h2><span class="lbl">'+esc(money(sum))+'</span></div><div class="wbars">'+days.map(function(q){return'<div class="wb"><span class="bar wv"><i style="height:'+(q.s/mx*100).toFixed(1)+'%;width:100%"></i></span><em>'+['Нд','Пн','Вт','Ср','Чт','Пт','Сб'][q.d.getDay()]+'</em></div>';}).join('')+'</div>';}
  else if(id==='upc'){var rc=(st.recurring||[]).map(function(r){var nx=wgNextDay(r.day);return{r:r,n:nx};}).sort(function(a,b){return a.n.left-b.n.left;}).slice(0,3);
   h='<div class="th"><h2>Найближчі платежі</h2><button data-act="recurring">Усі</button></div>'+(rc.length?rc.map(function(q,i){var r=q.r;return'<div class="row'+(i?'':' first')+'">'+icon(r.name,hashCol(r.category))+'<div class="rc"><b>'+esc(r.name)+'</b><span>'+(q.n.left===0?'сьогодні':q.n.left===1?'завтра':'через '+q.n.left+' дн.')+'</span></div><em class="'+(r.type==='income'?'in':'')+'">'+(r.type==='income'?'+':'−')+esc(money(r.amount,r.currency))+'</em></div>';}).join(''):'<div class="empty">Повторюваних платежів ще немає.</div>');}
  else if(id==='debt'){var g=fin.debtGroups({}),rv=(g.find(function(x){return x.key==='receivable';})||{items:[]}).items.filter(function(d){return!d.paid;}).slice(0,3),dt=fin.debtTotals();
   h='<div class="th"><h2>Мені винні</h2><button data-act="debts">'+esc(money(dt.receivable))+'</button></div>'+(rv.length?rv.map(function(d,i){return debtRow(d,i===0);}).join(''):'<div class="empty">Ніхто нічого не винен.</div>');}
  else if(id==='pair'){var pid=(MK.selection||[])[0],m=pid&&MK.data[pid];
   h='<div class="lbl">'+esc(m?m.label:'Курс')+'</div>'+(m&&isFinite(m.value)?'<div class="big">'+esc(mkFmt(m.value))+'</div><div class="chg '+(m.change<0?'neg':'')+'">'+esc(mkPct(m.change))+'<span>'+esc(mkSource(m))+'</span></div>':'<div class="empty">Курс завантажується</div>');}
  else if(id==='pay'){var ri=(st.recurring||[]).filter(function(r){return r.type==='income';}).map(function(r){return{r:r,n:wgNextDay(r.day)};}).sort(function(a,b){return a.n.left-b.n.left;})[0];
   h='<div class="lbl">До доходу</div>'+(ri?'<div class="big">'+ri.n.left+' дн.</div><div class="cap">'+esc(ri.r.name)+' · '+esc(money(ri.r.amount,ri.r.currency))+'</div>':'<div class="empty">Додайте повторюваний дохід</div>');}
  else if(id==='quick'){var tp=(st.templates||[])[0];
   h='<div class="lbl">Швидка операція</div>'+(tp?'<button class="mini wq" data-act="tpl" data-id="'+esc(tp.id)+'"><b>'+esc(tp.name)+'</b><span class="lbl">'+esc(money(tp.amount,tp.currency))+'</span></button>':'<button class="mini wq" data-act="wnew"><b>+ Операція</b><span class="lbl">новий запис</span></button>');}
  else if(id==='notes'){h='<div class="th"><h2>Нотатки</h2></div><textarea class="wnotes" data-notes="1" rows="4" placeholder="Що не забути…"></textarea>';}
  else if(id==='game'){h='<button data-act="game" style="display:block;width:100%;text-align:left"><div class="lbl">Мінігра</div><div class="mid">Успіх ↗</div><div class="cap">Торгівля, що завжди в плюс</div></button>';}
  o.push(B_(c,h));});
 return o;
}
/* нотатки: зберігаються на пристрої; поле не перемальовується, поки в ньому пишуть */
function wgFill(){[].forEach.call(document.querySelectorAll('textarea[data-notes]'),function(t){if(document.activeElement===t)return;var v='';try{v=localStorage.getItem('vf-notes')||'';}catch(e){}if(t.value!==v)t.value=v;});}
document.addEventListener('input',function(e){var t=e.target;if(t&&t.dataset&&t.dataset.notes){try{localStorage.setItem('vf-notes',t.value);}catch(er){}}},true);
setInterval(function(){var s=new Date().toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'});[].forEach.call(document.querySelectorAll('[data-clk]'),function(e){if(e.textContent!==s)e.textContent=s;});},15000);
