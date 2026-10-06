/* ===== Додаткові віджети головної сторінки. Дані беруться лише з finance-core (нічого не вигадується); нотатки — лише на пристрої.
   Увімкнення/вимкнення — у Налаштуваннях → «Віджети». Розмір змінюється в режимі польоту (ручка в куті); вміст підлаштовується
   контейнерними запитами CSS: шрифти масштабуються плавно, а коли стає тісно — ховаються другорядні елементи. ===== */
var WG_LIST=[
 {id:'clock',n:'Годинник і дата',s:2},{id:'today',n:'Можна витратити сьогодні',s:2},{id:'save',n:'Заощадження місяця',s:2},{id:'focus',n:'Головна витрата місяця',s:2},
 {id:'week',n:'Витрати за тиждень',s:4},{id:'upc',n:'Найближчі платежі',s:4},{id:'debt',n:'Хто винен',s:4},{id:'pair',n:'Курс валюти',s:2},
 {id:'pay',n:'Днів до доходу',s:2},{id:'quick',n:'Швидка операція',s:2},{id:'notes',n:'Нотатки',s:4},{id:'game',n:'Успіх',s:2}];
var WG=(function(){try{var j=JSON.parse(localStorage.getItem('vf-wg')||'null');if(Array.isArray(j))return j;}catch(e){}return WG_LIST.map(function(w){return w.id;});})();
function wgSave(){try{localStorage.setItem('vf-wg',JSON.stringify(WG));}catch(e){}}
function wgToggle(id){var i=WG.indexOf(id);if(i>=0)WG.splice(i,1);else WG.push(id);wgSave();renderPages();}
function wgLabel(w){return w.n+': '+(WG.indexOf(w.id)>=0?'показано':'сховано');}
function wgRing(p,col){p=Math.max(0,Math.min(100,p));return'<div class="wpb"><b>'+Math.round(p)+'%</b><div class="bar"><i style="width:'+p.toFixed(1)+'%;background:'+col+'" data-col="'+col+'"></i></div></div>';}   /* частка — скляний прогрес-бар */
function wgDay(d){return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();}
function wgNextDay(day){var n=new Date(),d=new Date(n.getFullYear(),n.getMonth(),Math.min(day,28)),t=new Date(n.getFullYear(),n.getMonth(),n.getDate());if(d<t)d=new Date(n.getFullYear(),n.getMonth()+1,Math.min(day,28));return{d:d,left:Math.round((d-t)/864e5)};}
function wgBlocks(){
 var st=fin.getState(),now=new Date(),o=[],ms=new Date(now.getFullYear(),now.getMonth(),1);
 function mon(type){var s=0;st.transactions.forEach(function(t){if(t.type===type&&t.currency==='PLN'&&new Date(t.date)>=ms)s+=t.amount;});return s;}
 WG.forEach(function(id){var w=WG_LIST.find(function(q){return q.id===id;});if(!w)return;var c='tile wg wg-'+id+(w.s===2?' ws2':''),h='';
  if(id==='clock'){h='<div class="lbl">Зараз</div><div class="big wclk" data-clk="1">'+now.toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'})+'</div><div class="cap">'+esc(todayStr())+'</div>';}
  else if(id==='today'){var fc=forecastMonth(),left=Math.max(1,fc.left+1),rest=fc.limit-fc.spent,per=rest/left;
   h='<div class="lbl">Можна сьогодні</div><div class="big" style="color:'+(per<0?'var(--ac)':'var(--gr)')+'">'+esc(money(Math.max(0,per)))+'</div><div class="bar"><i style="width:'+Math.min(100,fc.limit?fc.spent/fc.limit*100:0).toFixed(1)+'%"></i></div><div class="cap">Залишок ліміту '+esc(money(rest))+' на '+left+' дн.</div>';}
  else if(id==='save'){var inc=mon('income'),exp=mon('expense'),sv=inc-exp,p=inc>0?sv/inc*100:0;
   h='<div class="lbl">Заощаджено цього місяця</div><div class="wrow">'+wgRing(p,p>=0?'#66d896':'#ff7d83')+'<div class="wtx"><div class="mid" style="color:'+(sv<0?'var(--ac)':'var(--gr)')+'">'+esc(mv(sv))+'</div><div class="cap">від доходу '+esc(money(inc))+'</div></div></div>';}
  else if(id==='focus'){var by={},tot=0,top=null;st.transactions.forEach(function(t){if(t.type==='expense'&&t.currency==='PLN'&&new Date(t.date)>=ms){by[t.category]=(by[t.category]||0)+t.amount;tot+=t.amount;}});
   for(var k in by)if(!top||by[k]>by[top])top=k;
   h=top?'<div class="lbl">Найбільше на</div><div class="wrow">'+wgRing(by[top]/tot*100,hashCol(top))+'<div class="wtx"><div class="mid">'+esc(catName(top))+'</div><div class="cap">'+esc(money(by[top]))+' цього місяця</div></div></div>':'<div class="lbl">Найбільше на</div><div class="empty">Витрат ще немає</div>';}
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
