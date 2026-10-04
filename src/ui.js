/* ===== 6. Інтерфейс: події, аркуші, скляні меню, синхронізація зі станом логіки ===== */
var sheetsEl=document.getElementById('sheets'),scrimEl=document.getElementById('scrim'),toastEl=document.getElementById('toast');
var SHEET_KINDS=['transaction','debt','input','transactionList','settings','categories','manualAccount','markets'];
var CURS=['PLN','EUR','USD','GBP'],curSheet=null,lastScreen='',toastT=0;

function toast(msg){toastEl.textContent=msg;toastEl.classList.add('on');clearTimeout(toastT);toastT=setTimeout(function(){toastEl.classList.remove('on');},2200);}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function curLabel(items,v){for(var i=0;i<items.length;i++)if(items[i].v===v)return items[i].l;return items.length?items[0].l:'';}

/* ---------- меню ---------- */
function showMenu(kind,html,box,ax,ay,r){
 var el=menu.el;el.className=kind;el.innerHTML=html;el.style.display='block';
 el.style.left=box.x+'px';el.style.top=box.y+'px';el.style.width=box.w+'px';el.style.height=box.h+'px';
 menu.kind=kind;menu.tx=box.x;menu.ty=box.y;menu.tw=box.w;menu.th=box.h;menu.r=r;menu.ax=ax;menu.ay=ay;menu.on=1;
 menu.shade.style.display='block';
 el.scrollTop=0;dirty=true;
}
function closeMenu(){if(!menu.on)return;var k=menu.kind;menu.on=0;dirty=true;if(k==='more'&&nav.getState().overlays.some(function(o){return o.kind==='more';}))nav.closeOverlay('more');}
menu.shade.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();if(menu.kind==='more'){app.closePanel('more');}else closeMenu();});

function moreHtml(){
 var m=app.moreModel(),h='';
 h+='<div class="qa"><button data-m="newtx">Операція</button><button data-m="newdebt">Борг</button><button data-m="newacc">Рахунок</button></div>';
 h+='<div class="mh">Категорії</div>';
 h+=m.categories.map(function(c){var col=hashCol(c.id);return'<button class="mr" data-m="mcat" data-id="'+esc(c.id)+'">'+icon(c.name,col)+'<span class="t">'+esc(c.name)+'</span><span class="v">'+esc(money(c.amount))+'</span></button>';}).join('');
 function people(title,list,dir){
  var s='<div class="mh">'+title+'</div>';
  s+=list.length?list.map(function(p){var tot=p.open.filter(function(d){return d.currency==='PLN';}).reduce(function(a,d){return a+d.amount;},0);return'<button class="mr" data-m="mperson" data-v="'+dir+'" data-name="'+esc(p.name)+'">'+icon(p.name,hashCol(p.name))+'<span class="t">'+esc(p.name)+'</span><span class="v">'+esc(money(tot))+'</span></button>';}).join(''):'<div class="mr" style="opacity:.6"><span class="t">Поки нікого</span></div>';
  return s+'<button class="mr" data-m="mpeople" data-v="'+dir+'"><span class="t" style="color:rgba(255,255,255,.75)">Усі ›</span></button>';
 }
 h+=people('Клієнти',m.clients,'receivable');h+=people('Кредитори',m.creditors,'owed');
 h+='<div class="mh">Додатково</div><button class="mr" data-m="malltx"><span class="t">Усі операції</span></button><button class="mr" data-m="msettings"><span class="t">Налаштування</span></button>';
 return h;
}
function openMore(){
 var w=Math.min(VW-28,360),el=menu.el;
 el.className='more';el.innerHTML=moreHtml();el.style.display='block';el.style.width=w+'px';el.style.height='auto';el.style.left='-9999px';
 var safeT=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--st'))||0;
 var avail=DR.top-14-12-Math.max(safeT,20),h=Math.min(el.scrollHeight,avail);
 var c=cells(),ax=c.cx(slotOf[3]),ay=DR.top+DR.height/2;
 showMenu('more',el.innerHTML,{x:DR.left+DR.width-w,y:DR.top-12-h,w:w,h:h},ax,ay,62);
 menu.shade.style.bottom='auto';menu.shade.style.height=Math.max(0,DR.top-4)+'px';
}
function openDropdown(anchor,items,cur,cb){
 var r=anchor.getBoundingClientRect(),ih=46,w=clamp(Math.max(r.width+28,200),200,VW-24),h=Math.min(items.length*ih+12,VH-90);
 var left=(r.left+r.width/2>VW/2)?r.right-w:r.left;left=clamp(left,12,VW-w-12);
 var top=r.bottom+8;if(top+h>VH-12)top=r.top-8-h;top=clamp(top,12,VH-h-12);
 menu.cb=cb;
 var html=items.map(function(it){return'<button class="mi'+(it.v===cur?' cur':'')+'" data-v="'+esc(it.v)+'"><span>'+esc(it.l)+'</span>'+(it.v===cur?'<svg viewBox="0 0 16 16"><path d="m3 8.5 3.2 3.2L13 4.8"/></svg>':'')+'</button>';}).join('');
 menu.shade.style.bottom='0';menu.shade.style.height='auto';
 showMenu('dd',html,{x:left,y:top,w:w,h:h},clamp(r.left+r.width/2,left+20,left+w-20),r.top+r.height/2,24);
 menu.el.style.overflowY=items.length*ih+12>h?'auto':'hidden';
}
menu.el.addEventListener('click',function(e){
 var b=e.target.closest('button');if(!b)return;
 if(menu.kind==='dd'){var v=b.dataset.v,cb=menu.cb;closeMenu();if(cb)cb(v);return;}
 var m=b.dataset.m;if(!m)return;
 var id=b.dataset.id,v=b.dataset.v,name=b.dataset.name;
 if(m==='newtx'){nav.closeOverlay('more');app.openTransaction();}
 else if(m==='newdebt'){nav.closeOverlay('more');app.openDebt();}
 else if(m==='newacc'){nav.closeOverlay('more');app.openManualAccount('manual');}
 else if(m==='mcat'){nav.closeOverlay('more');app.openCategory(id);}
 else if(m==='mperson')nav.openPerson(v,name);
 else if(m==='mpeople')nav.openPeople(v);
 else if(m==='malltx'){nav.closeOverlay('more');app.openAllTransactions();}
 else if(m==='msettings')nav.openOverlay('settings');
});

/* ---------- сторінки: делегування подій ---------- */
function periodTarget(){var s=nav.getState().screen;return s==='accountDetail'?'account':s==='flowDetail'?'flow':'balance';}
root.addEventListener('click',function(e){
 var t=e.target.closest('[data-act]');if(!t)return;
 var a=t.dataset.act,id=t.dataset.id,v=t.dataset.v;
 try{
  if(a==='back')app.back();
  else if(a==='tx')app.editTransaction(id);
  else if(a==='balance')nav.navigate('balanceAnalysis');
  else if(a==='flow')nav.openFlow(v);
  else if(a==='accs')app.toggleAccounts();
  else if(a==='addacc')app.openManualAccount('manual');
  else if(a==='acc')nav.openAccount(id);
  else if(a==='alltx')app.openAllTransactions();
  else if(a==='debts')nav.navigate('debts');
  else if(a==='cat')app.openCategory(id);
  else if(a==='people')nav.openPeople(v);
  else if(a==='group')app.setDebtView(v);
  else if(a==='newdebt')app.openDebt();
  else if(a==='dperson')app.openDebtPerson(id);
  else if(a==='person')nav.openPerson(v,t.dataset.name);
  else if(a==='dedit')app.editDebt(id);
  else if(a==='mperiod')setMarketPeriod(v);
  else if(a==='sort')openDropdown(t,[{v:'name-asc',l:'За іменем А → Я'},{v:'name-desc',l:'За іменем Я → А'}],app.getState().interaction.debtSort,function(x){app.setDebtSort(x);});
  else if(a==='period'){var tg=periodTarget();openDropdown(t,VF.PERIODS.map(function(p){return{v:p,l:p==='ALL'?'Весь час':p};}),app.getState().interaction.periods[tg],function(x){app.setPeriod(tg,x);});}
 }catch(err){console.error(err);toast(err.message||'Помилка');}
});
root.addEventListener('input',function(e){
 var el=e.target;if(!el.dataset||!el.dataset.search)return;
 app.setSearch(el.dataset.search,el.value);
 var blk=el.closest('.inner>div'),pi=pg.indexOf(el.closest('.page'));
 if(blk&&B[pi]){var k=[].indexOf.call(inn[pi].children,blk);if(B[pi][k])B[pi][k].stale=1;needSync[pi]=1;}
});

/* ---------- аркуші ---------- */
function fld(label,f,val,attrs){return'<div class="fr" data-row="'+f+'"><label>'+label+'</label><input data-f="'+f+'" value="'+esc(val)+'" '+(attrs||'')+' autocomplete="off"></div>';}
function ddRow(label,f,items,cur){return'<div class="fr"><span class="l">'+label+'</span><button class="dd" data-dd="'+f+'"><span>'+esc(curLabel(items,cur))+'</span>'+chev().replace('<svg','<svg')+'</button></div>';}
function head(title,ok){return'<div class="sh"><button class="cn" data-s="cancel">Скасувати</button><h3>'+title+'</h3>'+(ok?'<button class="ok" data-s="'+ok[0]+'">'+ok[1]+'</button>':'<span style="min-width:70px"></span>')+'</div>';}
function catItems(){return app.finance.getState().categories.map(function(c){return{v:c.id,l:c.name};});}
function accItems(){return[{v:'',l:'Без прив’язки'}].concat(fin.activeAccounts().map(function(a){return{v:a.id,l:(a.displayName||a.bankName)+' · '+a.currency};}));}
var CURITEMS=CURS.map(function(c){return{v:c,l:c};});

function sheetHtml(kind,ov){
 var ix=app.getState().interaction,f=ix.form;
 if(kind==='transaction'&&f){var v=f.values;
  return head(f.editingId?'Операція':'Нова операція',['save','Зберегти'])+
   '<div class="seg"><button data-seg="type" data-v="expense" class="'+(v.type!=='income'?'on':'')+'">Витрата</button><button data-seg="type" data-v="income" class="'+(v.type==='income'?'on':'')+'">Дохід</button></div>'+
   fld('Сума','amount',v.amount,'inputmode="decimal" placeholder="0"')+ddRow('Валюта','currency',CURITEMS,v.currency)+ddRow('Рахунок','accountId',accItems(),v.accountId)+ddRow('Категорія','category',catItems(),v.category)+
   '<div class="fr" data-row="client" style="'+(v.type==='income'?'':'display:none')+'"><label>Клієнт</label><input data-f="client" value="'+esc(v.client)+'" placeholder="Від кого" autocomplete="off"></div>'+
   fld('Нотатка','note',v.note,'placeholder="Необов’язково"')+'<div class="err" data-err></div>'+
   (f.editingId?'<button class="btnw dng" data-s="del">Видалити операцію</button>':'');
 }
 if(kind==='debt'&&f){var d=f.values;
  return head(f.editingId?'Борг':'Новий борг',['save','Зберегти'])+
   '<div class="seg"><button data-seg="direction" data-v="receivable" class="'+(d.direction==='receivable'?'on':'')+'">Мені винні</button><button data-seg="direction" data-v="owed" class="'+(d.direction!=='receivable'?'on':'')+'">Я винен</button></div>'+
   fld('Хто','person',d.person,'placeholder="Ім’я"')+fld('Сума','amount',d.amount,'inputmode="decimal" placeholder="0"')+ddRow('Валюта','currency',CURITEMS,d.currency)+fld('Нотатка','note',d.note,'placeholder="Необов’язково"')+
   '<div class="fr"><span class="l">Терміново</span><button class="sw'+(d.urgent?' on':'')+'" data-sw="urgent"></button></div><div class="fr"><span class="l">Сплачено</span><button class="sw'+(d.paid?' on':'')+'" data-sw="paid"></button></div>'+
   '<div class="err" data-err></div>'+(f.editingId?'<button class="btnw dng" data-s="del">Видалити борг</button>':'');
 }
 if(kind==='input'&&ix.parsedInput){var p=ix.parsedInput,isD=p.kind==='debt',h='';
  h+=head('Підтвердження',['confirm','Зберегти']);
  h+='<div class="pv"><div class="big">'+(p.amount?esc(money(p.amount,p.currency)):'Суму не розпізнано')+'</div>';
  h+='<div class="kv"><span>Тип</span><b>'+(isD?(p.direction==='receivable'?'Борг: мені винні':'Борг: я винен'):(p.type==='income'?'Дохід':'Витрата'))+'</b></div>';
  if(isD)h+='<div class="kv"><span>Хто</span><b>'+esc(p.person||'— вкажіть при редагуванні')+'</b></div>';
  else{h+='<div class="kv"><span>Категорія</span><b>'+esc(catName(p.category))+'</b></div>';if(p.merchant)h+='<div class="kv"><span>Магазин</span><b>'+esc(p.merchant)+'</b></div>';if(p.client)h+='<div class="kv"><span>Клієнт</span><b>'+esc(p.client)+'</b></div>';}
  h+='<div class="kv"><span>Текст</span><b>'+esc(p.note)+'</b></div><div class="note">Нічого не збережено, доки ви не підтвердите.</div></div><div class="err" data-err></div>';
  h+='<button class="btnw pri" data-s="confirm">Підтвердити</button><button class="btnw" data-s="edit">Редагувати</button>';
  return h;
 }
 if(kind==='transactionList'){
  var cid=ov.data&&ov.data.categoryId,list=cid?fin.transactions({category:cid}):fin.transactions({limit:100});
  return'<div class="sh"><span style="min-width:70px"></span><h3>'+esc(cid?catName(cid):'Усі операції')+'</h3><button class="ok" data-s="cancel">Закрити</button></div>'+
   (list.length?list.slice(0,100).map(function(x,i){return txRow(x,i===0).replace('data-act="tx"','data-s="tx"');}).join(''):'<div class="empty">Операцій немає.</div>');
 }
 if(kind==='settings'){
  var g=fin.getState().goal;
  return'<div class="sh"><span style="min-width:70px"></span><h3>Налаштування</h3><button class="ok" data-s="cancel">Закрити</button></div>'+
   '<div class="fr"><label>Місячний ліміт, zł</label><input data-g="goal" inputmode="decimal" value="'+esc(g)+'" autocomplete="off"></div>'+
   '<button class="btnw" data-s="goal">Зберегти ліміт</button>'+
   '<button class="btnw" data-s="markets">Валюти в бігучій строці</button><button class="btnw" data-s="cats">Категорії</button><button class="btnw" data-s="acc">Додати рахунок</button><button class="btnw" data-s="cash">Додати готівку</button>'+
   '<button class="btnw" data-s="export">Експорт JSON</button><button class="btnw" data-s="seed">Додати тестові дані для перегляду</button>'+
   '<button class="btnw dng" data-s="clear">Очистити операції та борги</button><div class="err" data-err></div>';
 }
 if(kind==='markets'){
  var msel=MK.selection,mcat=VF.marketCatalog(),mby={};mcat.forEach(function(m){mby[m.id]=m;});
  var mrow=function(m,on){return'<button class="mkr" data-mk="'+esc(m.id)+'" data-q="'+esc((m.label+' '+(m.name||'')).toLowerCase())+'"><span class="t">'+esc(m.label)+'</span><span class="d">'+esc(m.name||'')+'</span><i class="sw'+(on?' on':'')+'"></i></button>';};
  var mon=msel.filter(function(id){return mby[id];}).map(function(id){return mrow(mby[id],true);}).join('');
  var moff=mcat.filter(function(m){return msel.indexOf(m.id)<0;}).map(function(m){return mrow(m,false);}).join('');
  var mst=mkLast?'Останнє оновлення: '+new Date(mkLast).toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'}):mkErr?'Останнє оновлення не вдалося: перевірте мережу.':'Ще не оновлювалось.';
  return'<div class="sh"><span style="min-width:70px"></span><h3>Бігуча строка</h3><button class="ok" data-s="cancel">Закрити</button></div>'+
   '<div class="mkinfo"><b>Звідки дані.</b> Валюти: Frankfurter (api.frankfurter.dev), офіційні курси ЄЦБ, оновлюються раз на робочий день. Крипто: Kraken (api.kraken.com), публічний API. Безкоштовно, без ключів і без ваших даних. Курси беруться з інтернету під час роботи застосунку (оновлення раз на 5 хв), останні значення зберігаються на пристрої. Зміна: для валют за ~14 днів, для крипто від відкриття доби. Це не порада щодо інвестицій.<br>'+esc(mst)+'</div>'+
   '<div class="fr"><label>Пошук</label><input data-g="mksearch" placeholder="EUR, USD, BTC…" autocomplete="off" autocorrect="off" autocapitalize="off"></div>'+
   '<div class="mkh">Вибрані: <span data-mkcount>'+msel.length+'</span> з 20</div>'+mon+'<div class="mkh">Усі пари</div>'+moff+'<div class="err" data-err></div>';
 }
 if(kind==='categories'){
  var cs=fin.getState().categories;
  return'<div class="sh"><span style="min-width:70px"></span><h3>Категорії</h3><button class="ok" data-s="cancel">Закрити</button></div>'+
   cs.map(function(c,i){return'<div class="row'+(i?'':' first')+'">'+icon(c.name,hashCol(c.id))+'<div class="rc"><b>'+esc(c.name)+'</b></div><button data-s="delcat" data-id="'+esc(c.id)+'" style="color:var(--ac);font-weight:600;padding:8px">Видалити</button></div>';}).join('')+
   '<div class="fr" style="margin-top:8px"><label>Нова</label><input data-g="newcat" placeholder="Назва категорії" autocomplete="off"></div><button class="btnw pri" data-s="addcat">Додати категорію</button><div class="err" data-err></div>';
 }
 if(kind==='manualAccount'){
  var mt=ov.data||{};
  return head(mt.type==='cash'?'Готівка':'Новий рахунок',['macc','Додати'])+fld('Назва','maname',mt.name||'','placeholder="Наприклад, Основний"')+fld('Баланс','mabal','', 'inputmode="decimal" placeholder="0"')+ddRow('Валюта','macur',CURITEMS,'PLN')+'<div class="err" data-err></div>';
 }
 return'';
}
function topSheet(){
 var st=app.getState(),ovs=st.navigation.overlays,ix=st.interaction;
 for(var i=ovs.length-1;i>=0;i--){var o=ovs[i];
  if(SHEET_KINDS.indexOf(o.kind)<0)continue;
  if(o.kind==='input'&&!ix.parsedInput)continue;
  var form=(o.kind==='transaction'||o.kind==='debt')&&ix.form?ix.form.editingId||'new':'';
  return{kind:o.kind,ov:o,key:o.kind+':'+form+':'+(o.data&&o.data.categoryId||'')+(o.kind==='input'?':'+ix.inputText:'')};
 }
 return null;
}
var safeB=0,safeT=0;
(function(){var pr=document.createElement('div');pr.style.cssText='position:fixed;left:0;top:0;width:0;height:env(safe-area-inset-bottom,0px);visibility:hidden';document.body.appendChild(pr);safeB=pr.offsetHeight||0;
 pr.style.height='env(safe-area-inset-top,0px)';safeT=pr.offsetHeight||0;pr.remove();})();
var sendAnchor=null;
function curSheetOn(){return !!curSheet&&sheetP.on===1;}
function layoutSheet(){
 if(!curSheet)return;
 var el=curSheet.el,body=curSheet.body,m=vvm(),kb=(VH-(m.t+m.h))>100,w=Math.min(VW-20,520);
 var bottom=m.t+m.h-10-(kb?0:safeB),maxH=Math.max(200,bottom-Math.max(safeT,14)-10);
 el.style.width=w+'px';el.style.height='auto';body.style.height='auto';
 var h=Math.min(body.scrollHeight,maxH);
 el.style.height=h+'px';body.style.height='100%';
 var left=m.l+(m.w-w)/2,top=bottom-h;
 el.style.left=left+'px';el.style.top=top+'px';
 sheetP.tx=left;sheetP.ty=top;sheetP.tw=w;sheetP.th=h;sheetP.rise=VH-top+24;
 SH.x=left;SH.y=top;dirty=true;
}
if(window.visualViewport)window.visualViewport.addEventListener('resize',function(){layoutSheet();});
function showSheet(top){
 var key=top?top.key:'';
 if(curSheet&&curSheet.key===key){
  if(top&&!/^(transaction|debt|manualAccount|markets)/.test(top.kind)){var html=sheetHtml(top.kind,top.ov);if(html!==curSheet.html){curSheet.html=html;curSheet.body.innerHTML=html;layoutSheet();sheetStale();}}
  return;
 }
 SH.on=0;SH.ready=0;SH.el=null;clearTimeout(showSheet.t);
 if(!top){
  if(curSheet){sheetP.on=0;curSheet=null;}
  scrimEl.classList.remove('on');scrimT=0;sheetOn=0;dirty=true;return;
 }
 var swap=!!curSheet&&sheetP.on===1;
 if(sheetP.el&&sheetP.el.parentNode)sheetP.el.remove();
 var el=document.createElement('div');el.className='sheet';
 var body=document.createElement('div');body.className='sbody';
 var html=sheetHtml(top.kind,top.ov);body.innerHTML=html;el.appendChild(body);sheetsEl.appendChild(el);
 el.style.display='block';
 sheetP.el=el;curSheet={key:key,kind:top.kind,el:el,body:body,html:html};
 el.classList.remove('ghost');
 var grow=top.kind==='input'&&sendAnchor;
 sheetP.mode=grow?'grow':'rise';
 if(grow){sheetP.ax=sendAnchor.x;sheetP.ay=sendAnchor.y;}
 sheetP.kind=top.kind;
 layoutSheet();
 if(!swap){sheetP.s=0;sheetP.vs=0;}
 sheetP.on=1;
 scrimEl.classList.add('on');scrimT=.3;sheetOn=1;dirty=true;
 SH.el=body;sheetStale();
 showSheet.t=setTimeout(function(){if(curSheet&&curSheet.el===el){layoutSheet();SH.on=1;sheetStale();dirty=true;}},520);
}
scrimEl.addEventListener('pointerdown',function(e){e.preventDefault();try{app.back();}catch(err){console.error(err);}});

function formErr(msg){if(!curSheet)return;var e=curSheet.body.querySelector('[data-err]');if(e)e.textContent=msg||'';sheetStale();}
function setDDLabel(f,val){
 if(!curSheet)return;var b=curSheet.body.querySelector('[data-dd="'+f+'"] span');if(!b)return;
 var items=f==='currency'||f==='macur'?CURITEMS:f==='accountId'?accItems():catItems();b.textContent=curLabel(items,val);sheetStale();
}
var macur='PLN',delArm=0;
sheetsEl.addEventListener('input',function(e){
 var el=e.target;
 if(el.dataset.g==='mksearch'&&curSheet){var q=el.value.trim().toLowerCase();[].forEach.call(curSheet.body.querySelectorAll('.mkr'),function(r){r.style.display=(!q||r.dataset.q.indexOf(q)>=0)?'':'none';});}if(el.dataset.f){var p={};p[el.dataset.f]=el.value;try{app.updateForm(p);}catch(err){}}
 clearTimeout(sheetsEl._t);sheetsEl._t=setTimeout(sheetStale,260);
});
sheetsEl.addEventListener('click',function(e){
 var t=e.target.closest('button');if(!t||!curSheet)return;
 var s=t.dataset.s,ix=app.getState().interaction;
 try{
  if(t.dataset.mk){mkToggle(t);return;}
  if(t.dataset.seg){var p={};p[t.dataset.seg]=t.dataset.v;app.updateForm(p);
   [].forEach.call(t.parentNode.children,function(b){b.classList.toggle('on',b===t);});
   if(t.dataset.seg==='type'){var cr=curSheet.body.querySelector('[data-row="client"]');if(cr)cr.style.display=t.dataset.v==='income'?'':'none';}
   sheetStale();return;}
  if(t.dataset.sw){var cur=ix.form.values[t.dataset.sw],np={};np[t.dataset.sw]=!cur;app.updateForm(np);t.classList.toggle('on',!cur);sheetStale();return;}
  if(t.dataset.dd){
   var f=t.dataset.dd,items=f==='currency'||f==='macur'?CURITEMS:f==='accountId'?accItems():catItems();
   var cv=f==='macur'?macur:ix.form.values[f];
   openDropdown(t,items,cv,function(v){if(f==='macur'){macur=v;}else{var q={};q[f]=v;app.updateForm(q);}setDDLabel(f,v);});return;}
  if(s==='cancel')app.back();
  else if(s==='save'){app.saveForm();toast('Збережено');}
  else if(s==='del'){if(!delArm){delArm=1;t.textContent='Натисніть ще раз для видалення';sheetStale();setTimeout(function(){delArm=0;},3000);}else{delArm=0;app.deleteFormRecord();toast('Видалено');}}
  else if(s==='confirm'){var r=app.confirmInput();if(r&&r.id&&!r.person&&!r.paid&&r.type)toast('Збережено');else if(r&&r.id)toast('Збережено');}
  else if(s==='edit')app.editParsedInput();
  else if(s==='tx'){var rid=t.dataset.id;app.editTransaction(rid);}
  else if(s==='goal'){var gv=parseFloat(String(curSheet.body.querySelector('[data-g="goal"]').value).replace(',','.'));if(!(gv>0))throw new Error('Вкажіть ліміт більший за нуль');fin.setGoal(gv);toast('Ліміт збережено');}
  else if(s==='markets')nav.openOverlay('markets');
  else if(s==='cats')nav.openOverlay('categories');
  else if(s==='acc')app.openManualAccount('manual');
  else if(s==='cash')app.openManualAccount('cash');
  else if(s==='export')exportData();
  else if(s==='seed'){seedDemo();toast('Додано тестові дані');}
  else if(s==='clear'){if(!delArm){delArm=1;t.textContent='Натисніть ще раз: очистити все';sheetStale();setTimeout(function(){delArm=0;},3500);}else{delArm=0;app.clearData({confirmed:true});toast('Очищено');}}
  else if(s==='delcat'){fin.deleteCategory(t.dataset.id);}
  else if(s==='addcat'){var nm=curSheet.body.querySelector('[data-g="newcat"]').value;fin.addCategory(nm);}
  else if(s==='macc'){var vals={name:curSheet.body.querySelector('[data-f="maname"]').value,balance:curSheet.body.querySelector('[data-f="mabal"]').value,currency:macur};app.addManualAccount(vals);macur='PLN';toast('Рахунок додано');}
 }catch(err){formErr(err.message||String(err));}
});
/* поля manualAccount не входять у форму логіки — читаємо напряму; data-f потрібен лише transaction/debt */
function exportData(){
 try{var d=app.exportData(),b=new Blob([d.contents],{type:d.mimeType}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=d.fileName;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);}
 catch(err){formErr('Експорт недоступний у цьому вікні.');}
}
function seedDemo(){
 var a=fin.addManualAccount({name:'Основний рахунок',balance:6420,currency:'PLN'}),c=fin.addManualAccount({name:'Готівка',balance:380,currency:'PLN',type:'cash'});
 var T=[['expense',86.4,'groceries','','Biedronka — продукти',a.id],['expense',25,'food','','Кава',''],['expense',49.99,'subscriptions','','Netflix',a.id],['expense',132,'transport','','Uber',a.id],['expense',410,'home','','Оренда',a.id],['income',3200,'business','Marta','Монтаж ролика',a.id],['income',900,'business','Studio K','Кольорокорекція',a.id],['expense',18.5,'food','','Обід',c.id]];
 T.forEach(function(t){fin.saveTransaction({type:t[0],amount:t[1],category:t[2],client:t[3],note:t[4],accountId:t[5],currency:'PLN'});});
 fin.saveDebt({direction:'receivable',person:'Андрій',amount:1500,note:'Проєкт',urgent:true,currency:'PLN'});
 fin.saveDebt({direction:'receivable',person:'Марта',amount:700,note:'Аванс',currency:'PLN'});
 fin.saveDebt({direction:'owed',person:'Олег',amount:320,note:'Техніка',currency:'PLN'});
 fin.saveDebt({direction:'owed',person:'Ірина',amount:150,note:'Обід',paid:true,currency:'PLN'});
}
window.__seed=seedDemo;

/* ---------- введення (скляна крапля) ---------- */
function tapInput(){
 var ovs=nav.getState().overlays;
 if(ovs.some(function(o){return o.kind==='more';}))nav.closeOverlay('more');
 openInput();
 try{app.activateButton('input');}catch(err){console.error(err);}
}
function submitDrop(val){
 if(val===undefined)val=inp.value;
 inp.value='';updSend();
 var r=sendBtn.getBoundingClientRect();sendAnchor={x:r.left+r.width/2,y:r.top+r.height/2};
 if(String(val).trim()){try{app.submitInput(val);}catch(err){console.error(err);}}
 sendDown=false;inp.blur();
}
function onDropClosed(){
 var st=app.getState(),has=st.navigation.overlays.some(function(o){return o.kind==='input';});
 if(has&&!st.interaction.parsedInput){try{app.closePanel('input');}catch(err){console.error(err);}}
 else if(st.interaction.parsedInput)pendingSync=true;
}

/* ---------- синхронізація: стан логіки → екран ---------- */
function syncUI(){
 var st=app.getState(),n=st.navigation,ix=st.interaction;
 if(n.screen==='marketDetail')mkpEnter(n.params.marketId);
 var pi=PAGE_OF[n.screen];
 if(n.screen!==lastScreen){lastScreen=n.screen;if(pi>2)sy[pi]=0;}
 if(pi!==undefined)sel=pi;
 var more=n.overlays.some(function(o){return o.kind==='more';}),tab=more?3:(n.group==='insights'?0:n.group==='debts'?1:2);
 if(tab!==dockSel){dockSel=tab;dirty=true;}
 if(!drag)setOn(dockSel);
 renderPages();
 var inOv=n.overlays.some(function(o){return o.kind==='input';});
 if(inOv&&!ix.parsedInput){if(mode!==1&&ready)openInput();}
 else if(mode===1)closeInput();
 if(more&&!(menu.on&&menu.kind==='more'))openMore();
 else if(!more&&menu.on&&menu.kind==='more'){menu.on=0;dirty=true;}
 var top=topSheet();
 showSheet(top);
 dirty=true;
}
app.subscribe(function(){syncUI();});

/* ---------- старт ---------- */
window.addEventListener('resize',function(){if(menu.on&&menu.kind==='more')openMore();});
syncUI();
requestAnimationFrame(frame);
setTimeout(function(){cv.style.opacity=1;},4000);

/* ---------- кнопка «відправити» в полі вводу ---------- */
var sendBtn=document.getElementById('send'),sendDown=false,sendVal='';
function updSend(){sendBtn.classList.toggle('empty',!String(inp.value).trim());}
inp.addEventListener('input',updSend);updSend();
/* iOS переводить фокус на кнопку ще до click → поле б втратило фокус і крапля закрилась. Тому фокус не віддаємо (touchstart/mousedown preventDefault), а текст беремо в момент натискання. */
function sendPress(e){if(e.cancelable)e.preventDefault();e.stopPropagation();sendDown=true;sendVal=inp.value;}
sendBtn.addEventListener('touchstart',sendPress,{passive:false});
sendBtn.addEventListener('mousedown',sendPress);
sendBtn.addEventListener('pointerdown',function(e){e.stopPropagation();sendDown=true;sendVal=inp.value;});
var sendFired=false;
function doSend(){
 if(sendFired)return;sendFired=true;setTimeout(function(){sendFired=false;},450);
 var v=sendDown?(sendVal||inp.value):inp.value;sendDown=false;
 if(String(v).trim())submitDrop(v);
}
sendBtn.addEventListener('touchend',function(e){if(!sendDown)return;if(e.cancelable)e.preventDefault();doSend();},{passive:false});   /* preventDefault на touchstart гасить click, тому відправляємо на touchend */
sendBtn.addEventListener('touchcancel',function(){sendDown=false;});
sendBtn.addEventListener('click',function(e){e.preventDefault();doSend();});
setTimeout(function(){},0);
var _ss=sheetStale;sheetStale=function(){_ss();setTimeout(layoutSheet,0);};

/* ---------- жести на скляних вікнах: слідкування за пальцем, розтягування, свайп вниз закриває ---------- */
var TG={P:null,x0:0,y0:0,t0:0,ty:0,tt:0,vy:0,drag:0,moved:false,sc:null,top0:0};
function rb(d){return d/(1+Math.abs(d)/55)*.55;}
function scrollParent(n,stop){while(n&&n!==stop){if(n.scrollHeight>n.clientHeight+2){var o=getComputedStyle(n).overflowY;if(o==='auto'||o==='scroll')return n;}n=n.parentNode;}return stop&&stop.scrollHeight>stop.clientHeight+2&&/auto|scroll/.test(getComputedStyle(stop).overflowY)?stop:null;}
function gStart(P,x,y,t,tg){
 if(!P.on)return;
 TG.P=P;TG.x0=x;TG.y0=y;TG.t0=t;TG.ty=y;TG.tt=t;TG.vy=0;TG.drag=0;TG.moved=false;
 TG.sc=scrollParent(tg,P.el);TG.top0=TG.sc?TG.sc.scrollTop:0;
}
function gMove(x,y,t){
 var P=TG.P;if(!P)return;
 var dx=x-TG.x0,dy=y-TG.y0;
 if(!TG.drag){if(Math.hypot(dx,dy)<7)return;TG.drag=1;TG.moved=true;P.dragging=1;}
 var dt=Math.max(1,t-TG.tt);TG.vy=.6*TG.vy+.4*(y-TG.ty)/dt;TG.ty=y;TG.tt=t;
 var atTop=!TG.sc||TG.sc.scrollTop<=0&&TG.top0<=0,tg=P.tgt,pull=dy>14&&atTop&&dy>=Math.abs(dx)*1.6;   /* намір закрити: явно вниз, не по діагоналі, після невеликої «мертвої зони» */
 var X=rb(dx),Y=pull?dy*.8:rb(dy);
 tg.x=pull?dx*.15:X;tg.y=Y;
 var ex=Math.min(14,Math.abs(tg.x)*.5),ey=Math.min(16,Math.abs(tg.y)*(pull?.18:.5));
 tg.sx=(ex-.5*ey)/Math.max(60,P.tw);tg.sy=(ey-.5*ex)/Math.max(60,P.th);
 P.pull=pull;
}
function gEnd(){
 var P=TG.P;if(!P)return;
 var dy=TG.ty-TG.y0,atTop=!TG.sc||TG.top0<=0;
 var scr=!!TG.sc&&TG.sc.scrollHeight>TG.sc.clientHeight+2;   /* у вікні є що прокручувати — вимагаємо виразнішого жесту */
 var close=TG.drag&&P.pull&&atTop&&(dy>(scr?150:110)||(dy>(scr?100:60)&&TG.vy>1));
 P.dragging=0;P.pull=false;P.tgt.x=P.tgt.y=P.tgt.sx=P.tgt.sy=0;TG.P=null;dirty=true;
 if(close){TG.moved=true;
  if(P===menu){if(menu.kind==='more')app.closePanel('more');else closeMenu();}
  else{try{app.back();}catch(e){}}
 }
}
function bindG(el,getP){
 el.addEventListener('touchstart',function(e){var t=e.touches[0],P=getP();if(P&&e.touches.length===1)gStart(P,t.clientX,t.clientY,e.timeStamp,e.target);},{passive:true});
 el.addEventListener('touchmove',function(e){var t=e.touches[0];if(t)gMove(t.clientX,t.clientY,e.timeStamp);},{passive:true});
 el.addEventListener('touchend',gEnd);el.addEventListener('touchcancel',gEnd);
 el.addEventListener('pointerdown',function(e){if(e.pointerType!=='mouse')return;var P=getP();if(!P)return;gStart(P,e.clientX,e.clientY,e.timeStamp,e.target);
  var mv=function(ev){gMove(ev.clientX,ev.clientY,ev.timeStamp);},up=function(){window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);gEnd();};
  window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);});
}
bindG(menu.el,function(){return menu.on?menu:null;});
bindG(sheetsEl,function(){return(sheetP.on&&curSheet&&!(menu.on&&menu.kind==='dd'))?sheetP:null;});
/* клік після жесту не спрацьовує */
document.addEventListener('click',function(e){if(TG.moved&&(menu.el.contains(e.target)||sheetsEl.contains(e.target))){e.stopPropagation();e.preventDefault();TG.moved=false;}},true);
window.__dbg=function(){return{ms:menu.s,mo:menu.on,ss:sheetP.s,so:sheetP.on,rp:rec.pg.v,boot:boot.on,bp:boot.phase,fps:window.__fps||0,ca:ca,sel:sel};};

/* ---------- свайп зліва направо від краю — «назад», як в iOS ---------- */
var EB={on:0,x0:0,y0:0,t0:0,dx:0,P:null};
document.addEventListener('touchstart',function(e){
 var t=e.touches[0];if(e.touches.length!==1||t.clientX>26||mode===1){EB.on=0;return;}
 EB.on=1;EB.x0=t.clientX;EB.y0=t.clientY;EB.t0=e.timeStamp;EB.dx=0;
 EB.P=(menu.on&&menu.kind==='dd')?menu:(sheetP.on&&curSheet)?sheetP:menu.on?menu:null;
},{passive:true});
document.addEventListener('touchmove',function(e){
 if(!EB.on)return;var t=e.touches[0];if(!t)return;var dx=t.clientX-EB.x0,dy=t.clientY-EB.y0;
 if(Math.abs(dy)>Math.abs(dx)*1.2&&Math.abs(dy)>16){EB.on=0;if(EB.P){EB.P.tgt.x=0;}return;}
 EB.dx=dx;if(EB.P&&dx>0){EB.P.tgt.x=Math.min(90,dx*.45);}
},{passive:true});
function edgeEnd(e){
 if(!EB.on)return;EB.on=0;
 var dx=EB.dx,dt=Math.max(1,e.timeStamp-EB.t0);
 if(EB.P)EB.P.tgt.x=0;
 if(dx>70||(dx>34&&dx/dt>.55)){TG.moved=true;
  try{if(menu.on&&menu.kind==='dd')closeMenu();else app.back();}catch(err){console.error(err);}
 }
}
document.addEventListener('touchend',edgeEnd);document.addEventListener('touchcancel',function(){if(EB.on&&EB.P)EB.P.tgt.x=0;EB.on=0;});

/* ---------- бігуча строка: оновлення, вибір пар, авторух, перетягування, тап ---------- */
var mkBusy=false,mkAgain=false,mkLast=0,mkT=0;
function mkRefresh(){
 if(mkBusy){mkAgain=true;return;}
 mkBusy=true;mkErr=null;
 MK.loadMarketData().then(function(){mkLast=Date.now();}).catch(function(e){mkErr=e;}).then(function(){
  mkBusy=false;mkTried=true;renderTicker();mkLoadSpark();
  if(mkAgain){mkAgain=false;mkRefresh();}
 });
}
setInterval(function(){if(!document.hidden)mkRefresh();},300000);
document.addEventListener('visibilitychange',function(){if(!document.hidden&&Date.now()-mkLast>120000)mkRefresh();});
function mkToggle(btn){
 var id=btn.dataset.mk,sw=btn.querySelector('.sw'),on=sw.classList.contains('on');
 if(!on&&MK.selection.length>=20){toast('Максимум 20 пар у строці');return;}
 MK.toggleSelection(id,!on);
 sw.classList.toggle('on',!on);
 var c=curSheet&&curSheet.body.querySelector('[data-mkcount]');if(c)c.textContent=MK.selection.length;
 renderTicker();sheetStale();
 clearTimeout(mkT);mkT=setTimeout(mkRefresh,700);
}
function mkTapInfo(id){var m=MK.data[id];if(!m)return;toast(m.label+' · '+mkSource(m)+(m.updated?' · '+mkWhen(m.updated):''));}
var tkG=VF.createTickerGesture(),tkOff=0,tkPress=null,tkPause=0,tkLast=0,tkReady=false,tkVel=0,tkPX=0,tkPT=0,
    tkRM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches);
function tkLoop(t){
 requestAnimationFrame(tkLoop);
 var dt=Math.min(.05,Math.max(0,(t-tkLast)/1000));tkLast=t;
 if(!tkReady&&!boot.on){tkReady=true;tickerEl.classList.add('on');}
 var el=tickerTrk;
 if(!el.dataset.loop){if(el._tx){el._tx='';el.style.transform='';}return;}
 if(!tkPress){
  if(Math.abs(tkVel)>8){tkOff+=tkVel*dt;tkVel*=Math.exp(-dt*2.6);tkPause=t+700;}   /* інерція після відпускання */
  else{tkVel=0;if(!tkRM&&t>tkPause&&!document.hidden&&!boot.on)tkOff+=34*dt;}
 }
 var w=el.scrollWidth/MK_COPIES;if(w<20)return;
 var o=((tkOff%w)+w)%w,s='translate3d('+(-o).toFixed(1)+'px,0,0)';
 if(el._tx!==s){el._tx=s;el.style.transform=s;}
}
requestAnimationFrame(tkLoop);
function tkEnd(cancel,ts){
 if(!tkPress)return;var r=tkG.end({cancelled:cancel});tkPress=null;
 if(ts-tkPT>90)tkVel=0;                                   /* палець зупинився перед відпусканням — без інерції */
 tkVel=Math.max(-3000,Math.min(3000,tkVel));
 if(r){tkPause=r.resumeAt;if(r.openMarketId){tkVel=0;try{nav.openMarket(r.openMarketId);}catch(err){console.error(err);}}}
}
/* строка закріплена поза сторінками: горизонтальне перетягування не скролить сторінку (touch-action:none) */
tickerEl.addEventListener('pointerdown',function(e){
 var it=e.target.closest('[data-mk]');
 tkG.start({x:e.clientX,marketId:it?it.dataset.mk:'',offset:tkOff});tkPress={id:e.pointerId};tkVel=0;tkPX=e.clientX;tkPT=e.timeStamp;
 try{tickerEl.setPointerCapture(e.pointerId);}catch(_){}
});
tickerEl.addEventListener('pointermove',function(e){
 if(!tkPress||e.pointerId!==tkPress.id)return;
 var r=tkG.move({x:e.clientX});if(r)tkOff=r.offset;
 var dtm=e.timeStamp-tkPT;if(dtm>0){tkVel=.6*tkVel+.4*(-(e.clientX-tkPX)/dtm*1000);}
 tkPX=e.clientX;tkPT=e.timeStamp;
});
tickerEl.addEventListener('pointerup',function(e){if(tkPress&&e.pointerId===tkPress.id)tkEnd(false,e.timeStamp);});
tickerEl.addEventListener('pointercancel',function(e){if(tkPress&&e.pointerId===tkPress.id)tkEnd(true,e.timeStamp);});
/* міні-графіки: валюти беруть 14-денну історію з Frankfurter, крипто — денні закриття Kraken за ~30 днів */
function mkLoadSpark(){
 MK.selection.forEach(function(id){
  if(id.indexOf('crypto:')!==0)return;var s=mkSpark[id];if(s&&Date.now()-s.t<6*3600000)return;
  MK.loadMarketDetail(id).then(function(m){
   var h=m&&m.detailHistory;
   if(h&&h.length>2){mkSpark[id]={t:Date.now(),v:h.slice(-30).map(function(p){return p.value;})};mkSaveSpark();renderTicker();}
  }).catch(function(){});
 });
}
uiReady=true;renderTicker();
(function w(){if(boot.on)setTimeout(w,200);else mkRefresh();})();   /* мережа й важкі операції — після екрана завантаження, щоб анімація не рвалась */

/* діагностика: ?debug у адресі або довге натискання (1,4 с) на тікер. Показує розміри вікна, екрана, безпечних зон і положення дока */
var hud=null,hudT=0;
function hudToggle(){
 if(hud){clearInterval(hudT);hud.remove();hud=null;try{localStorage.removeItem('vf-debug');}catch(e){}return;}
 try{localStorage.setItem('vf-debug','1');}catch(e){}
 hudOn();
}
function hudOn(){
 if(hud)return;
 hud=document.createElement('pre');
 hud.style.cssText='position:fixed;left:6px;top:calc(env(safe-area-inset-top,0px) + 70px);z-index:99;margin:0;padding:6px 8px;border-radius:8px;background:rgba(0,0,0,.78);color:#9f9;font:11px/1.35 ui-monospace,Menlo,monospace;pointer-events:none;white-space:pre';
 document.body.appendChild(hud);
 var probe=function(side){var q=document.createElement('div');q.style.cssText='position:fixed;left:0;top:0;width:0;height:env(safe-area-inset-'+side+',0px);visibility:hidden';document.body.appendChild(q);var h=q.offsetHeight;q.remove();return h;};
 hudT=setInterval(function(){
  var vv=window.visualViewport,b=bgEl.getBoundingClientRect(),d=dock.getBoundingClientRect(),c=cv.getBoundingClientRect();
  hud.textContent=['standalone '+(navigator.standalone?'yes':'no')+' / dm '+(matchMedia('(display-mode: standalone)').matches?'sa':'br'),
   'inner '+innerWidth+'x'+innerHeight+'  outer '+outerWidth+'x'+outerHeight,'screen '+screen.width+'x'+screen.height+'  dpr '+devicePixelRatio,
   'vv '+(vv?Math.round(vv.width)+'x'+Math.round(vv.height)+' top '+Math.round(vv.offsetTop)+' sc '+vv.scale.toFixed(2):'-'),
   'safe top '+probe('top')+' bottom '+probe('bottom'),
   'bg top '+Math.round(b.top)+' h '+Math.round(b.height)+'  VH '+Math.round(VH),
   'dock top '+Math.round(d.top)+' bot '+Math.round(d.bottom)+' | DR '+Math.round(DR.top),
   'gl top '+Math.round(c.top)+' bot '+Math.round(c.bottom)+'  island '+ISL+' cell '+gridCell().toFixed(1),
   'html '+document.documentElement.clientHeight+' scrollY '+Math.round(scrollY),
   'dockY '+(dockY===null?'-':dockY.toFixed(1))+' lay '+(boot.lay?1:0)+' nz '+(boot.nz||0),
   'vp(t,h,vv): '+vpLog.map(function(x){return x.join(',');}).join(' | ')].join('\n');
 },400);
}
var lpT=0,lpP=null;
tickerEl.addEventListener('pointerdown',function(e){clearTimeout(lpT);lpP=[e.clientX,e.clientY];lpT=setTimeout(hudToggle,1400);});
tickerEl.addEventListener('pointermove',function(e){if(lpP&&Math.hypot(e.clientX-lpP[0],e.clientY-lpP[1])>12)clearTimeout(lpT);});
['pointerup','pointercancel'].forEach(function(n){tickerEl.addEventListener(n,function(){clearTimeout(lpT);});});
if(/[?&]debug/.test(location.search)||(function(){try{return localStorage.getItem('vf-debug');}catch(e){return null;}})())hudOn();
