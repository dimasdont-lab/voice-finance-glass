/* ===== 6. Інтерфейс: події, аркуші, скляні меню, синхронізація зі станом логіки ===== */
var sheetsEl=document.getElementById('sheets'),scrimEl=document.getElementById('scrim'),toastEl=document.getElementById('toast');
var SHEET_KINDS=['transaction','debt','input','transactionList','settings','categories','manualAccount','markets','marketSheet','confirmWipe','budgets','recurring','game'];
var CURS=['PLN','EUR','USD','GBP'],curSheet=null,lastScreen='',toastT=0;

function toast(msg){toastEl.textContent=msg;toastEl.classList.add('on');clearTimeout(toastT);toastT=setTimeout(function(){toastEl.classList.remove('on');},2200);}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function curLabel(items,v){for(var i=0;i<items.length;i++)if(items[i].v===v)return items[i].l;return items.length?items[0].l:'';}

/* ---------- меню ---------- */
function showMenu(kind,html,box,ax,ay,r){
 MN.ready=0;MN.want=1;var el=menu.el;el.className=kind;el.innerHTML=html;el.style.display='block';
 el.style.left=box.x+'px';el.style.top=box.y+'px';el.style.width=box.w+'px';el.style.height=box.h+'px';
 menu.mode=kind==='more'?'slide':'grow';menu.slide=box.w+10;
 menu.kind=kind;menu.tx=box.x;menu.ty=box.y;menu.tw=box.w;menu.th=box.h;menu.r=r;menu.ax=ax;menu.ay=ay;menu.on=1;
 menu.shade.style.display='block';
 el.scrollTop=0;dirty=true;
}
function closeMenu(){if(!menu.on)return;var k=menu.kind;menu.on=0;dirty=true;if(k==='more'&&nav.getState().overlays.some(function(o){return o.kind==='more';}))nav.closeOverlay('more');}
menu.shade.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();if(menu.kind==='more'){app.closePanel('more');}else closeMenu();});

function moreHtml(){
 var m=app.moreModel(),h='';
 h+='<div class="drh"><h2>Додатково</h2><button class="drx" data-m="mclose" aria-label="Закрити">✕</button></div>';
 h+='<div class="qa"><button class="gbtn" data-m="newtx">Операція</button><button class="gbtn" data-m="newdebt">Борг</button><button class="gbtn" data-m="newacc">Рахунок</button></div>';
 h+='<div class="gcard"><div class="mh mhl"><span>Категорії</span><button data-m="mcats">Усі ›</button></div>';
 h+=m.categories.map(function(c){var col=hashCol(c.id);return'<button class="mr" data-m="mcat" data-id="'+esc(c.id)+'">'+icon(c.name,col)+'<span class="t">'+esc(c.name)+'</span><span class="v">'+esc(money(c.amount))+'</span></button>';}).join('');
 function people(title,list,dir){
  var s='<div class="gcard"><div class="mh mhl"><span>'+title+'</span><button data-m="mpeople" data-v="'+dir+'">Усі ›</button></div>';
  s+=list.length?list.map(function(p){var tot=p.open.filter(function(d){return d.currency==='PLN';}).reduce(function(a,d){return a+d.amount;},0);return'<button class="mr" data-m="mperson" data-v="'+dir+'" data-name="'+esc(p.name)+'">'+icon(p.name,hashCol(p.name))+'<span class="t">'+esc(p.name)+'</span><span class="v">'+esc(money(tot))+'</span></button>';}).join(''):'<div class="mr" style="opacity:.6"><span class="t">Поки нікого</span></div>';
  return s+'</div>';
 }
 h+='</div>';h+=people('Клієнти',m.clients,'receivable');h+=people('Кредитори',m.creditors,'owed');
 h+='<div class="gcard"><div class="mh mhl"><span>Операції</span><button data-m="malltx">Усі ›</button></div>'+fin.recentTransactions('').slice(0,4).map(function(x){var inc=x.type==='income',cn=catName(x.category);return'<button class="mr" data-m="mtx" data-id="'+esc(x.id)+'">'+icon(cn,hashCol(x.category))+'<span class="t">'+esc(x.client||(x.note&&x.note.length<28?x.note:cn))+'</span><span class="v">'+(inc?'+':'−')+esc(money(x.amount,x.currency))+'</span></button>';}).join('')+'</div><button class="gbtn" data-m="msettings">Налаштування</button><button class="gbtn red" data-m="mwipe">Стерти всі записи</button>';
 return h;
}
function openMore(){
 var w=Math.round(VW*.75),el=menu.el;vsBind(el);   /* бокова скляна сторінка: 70% ширини, на всю висоту, радіус екрана iPhone */
 el.className='more';el.innerHTML=moreHtml();el.style.display='block';
 el.style.paddingTop='22px';el.style.paddingBottom='22px';
 var lf=(DKP.side==='r');showMenu('more',el.innerHTML,{x:lf?0:VW-w,y:45,w:w,h:VH-75},lf?0:VW,VH/2,62);menu.left=lf;if(lf)menu.slide=-(w+10);   /* док справа — панель виїжджає зліва направо */
 menu.shade.style.bottom='0';menu.shade.style.height='auto';
}
function openDropdown(anchor,items,cur,cb){
 var r=frect(anchor),ih=46,w=clamp(Math.max(r.width+28,200),200,VW-24),h=Math.min(items.length*ih+12,VH-90);
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
 if(m==='mclose'){app.closePanel('more');}
 else if(m==='newtx'){nav.closeOverlay('more');app.openTransaction();}
 else if(m==='newdebt'){nav.closeOverlay('more');app.openDebt();}
 else if(m==='newacc'){nav.closeOverlay('more');app.openManualAccount('manual');}
 else if(m==='mcat'){nav.closeOverlay('more');app.openCategory(id);}
 else if(m==='mperson')nav.openPerson(v,name);
 else if(m==='mpeople')nav.openPeople(v);
 else if(m==='malltx'){nav.closeOverlay('more');app.openAllTransactions();}
 else if(m==='mcats'){nav.closeOverlay('more');nav.openOverlay('categories');}
 else if(m==='mtx'){nav.closeOverlay('more');app.editTransaction(id);}
 else if(m==='msettings')nav.openOverlay('settings');
 else if(m==='mwipe'){var wr=frect(b);growAnchor={x:wr.left+wr.width/2,y:wr.top+wr.height/2};nav.openOverlay('confirmWipe');}
});

/* ---------- сторінки: делегування подій ---------- */
function periodTarget(){var s=nav.getState().screen;return s==='accountDetail'?'account':s==='flowDetail'?'flow':'balance';}
root.addEventListener('click',function(e){
 var t=e.target.closest('[data-act]');if(!t)return;
 var a=t.dataset.act,id=t.dataset.id,v=t.dataset.v;
 try{
  if(a==='back'){if(FLD.id)closeFolder();else app.back();}
  else if(a==='fopen')openFolder(id);
  else if(a==='tx')app.editTransaction(id);
  else if(a==='balance')nav.navigate('balanceAnalysis');
  else if(a==='wnew')app.openTransaction();
  else if(a==='game'){var gr=t.getBoundingClientRect();growAnchor={x:gr.left+gr.width/2,y:gr.top+gr.height/2};nav.openOverlay('game');gmMount();}
  else if(a==='egg'){var er=t.getBoundingClientRect(),ex=er.left+er.width/2,ey=er.top-30;if(BH.ph===3)lensSpawn(ex,ey);else if(BH.ph)return;else if(lensAlive()){lensClearAll();LG('egg','лінза сховалась');}else lensSpawnOne(ex,ey);}
  else if(a==='tpl'){var tx0=fin.useTemplate(id);toast('Додано: '+(tx0.note||'')+' '+money(tx0.amount,tx0.currency));}
  else if(a==='budgets')nav.openOverlay('budgets');
  else if(a==='recurring')nav.openOverlay('recurring');
  else if(a==='flow'){var fr=frect(t);growAnchor={x:fr.left+fr.width/2,y:fr.top+fr.height/2};nav.openOverlay('transactionList',{type:v==='expense'?'expense':'income'});}
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

/* налаштування: заголовок розділу і повзунок (підпис зверху, повзунок на всю ширину під ним) */
function SEC(t){return'<div class="sec2">'+esc(t)+'</div>';}
function RNG(kind,k,label,max){var o=kind==='cg'?CG:FGS;return'<div class="fr rng"><label>'+esc(label)+'</label><input type="range" min="0" max="'+max+'" data-'+kind+'="'+k+'" value="'+o[k]+'"></div>';}
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
 if(kind==='marketSheet')return marketSheetHtml(ov.data&&ov.data.marketId);
 if(kind==='game')return gmHtml();
 if(kind==='budgets'){var cs2=fin.getState().categories;return'<div class="sh"><span style="min-width:70px"></span><h3>Бюджети</h3><button class="ok" data-s="cancel">Закрити</button></div><div class="mkinfo" style="padding:0 0 8px">Сума на місяць. Порожньо — без бюджету. Після 80% прийде попередження.</div>'+cs2.map(function(c){return'<div class="fr"><label>'+esc(c.name)+' <span style="opacity:.6">(цього місяця '+esc(money(monthSpend(c.id)))+')</span></label><input data-bud="'+esc(c.id)+'" inputmode="decimal" autocomplete="off" value="'+(c.budget?esc(c.budget):'')+'" placeholder="—"></div>';}).join('')+'<button class="btnw pri" data-s="savebud">Зберегти бюджети</button>';}
 if(kind==='recurring'){var rl=fin.getState().recurring||[],cl2=fin.getState().categories;return'<div class="sh"><span style="min-width:70px"></span><h3>Повторювані</h3><button class="ok" data-s="cancel">Закрити</button></div>'+(rl.length?rl.map(function(r,i){return'<div class="row'+(i?'':' first')+'">'+icon(r.name,hashCol(r.category))+'<div class="rc"><b>'+esc(r.name)+'</b><span>'+r.day+' числа · '+esc(money(r.amount,r.currency))+'</span></div><button data-s="delrec" data-id="'+esc(r.id)+'" style="color:var(--ac);font-weight:600;padding:8px">Видалити</button></div>';}).join(''):'<div class="empty">Поки порожньо.</div>')+
  '<div class="mkinfo" style="padding:14px 0 4px">Новий платіж</div><div class="fr"><label>Назва</label><input data-rc="name" placeholder="Netflix, оренда, зарплата" autocomplete="off"></div><div class="fr"><label>Сума, zł</label><input data-rc="amount" inputmode="decimal" autocomplete="off"></div><div class="fr"><label>День місяця</label><input data-rc="day" inputmode="numeric" value="1" autocomplete="off"></div>'+
  '<div class="fr"><label>Категорія</label><select data-rc="category">'+cl2.map(function(c){return'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>';}).join('')+'</select></div><div class="fr"><label>Тип</label><select data-rc="type"><option value="expense">Витрата</option><option value="income">Дохід</option></select></div><button class="btnw pri" data-s="addrec">Додати платіж</button>';}
 if(kind==='confirmWipe')return'<div class="cw"><h3>Стерти всі дані?</h3><p>Ви насправді хочете видалити всі операції, борги, клієнтів і рахунки? Баланси почнуться з нуля. Це не можна скасувати.</p><div class="cwr"><button class="btnw" data-s="cancel">Не стирати</button><button class="btnw dng" data-s="wipeyes">Так, стерти все</button></div></div>';
 if(kind==='transactionList'){
  var cid=ov.data&&ov.data.categoryId,ty=ov.data&&ov.data.type,list=cid?fin.transactions({category:cid}):ty?fin.transactions({type:ty,limit:100}):fin.transactions({limit:100});
  return'<div class="sh"><span style="min-width:70px"></span><h3>'+esc(cid?catName(cid):ty?(ty==='income'?'Доходи':'Витрати'):'Усі операції')+'</h3><button class="ok" data-s="cancel">Закрити</button></div>'+
   (list.length?list.slice(0,100).map(function(x,i){return txRow(x,i===0).replace('data-act="tx"','data-s="tx"');}).join(''):'<div class="empty">Операцій немає.</div>');
 }
 if(kind==='settings'){
  var g=fin.getState().goal;
  return'<div class="sh"><span style="min-width:70px"></span><h3>Налаштування</h3><button class="ok" data-s="cancel">Закрити</button></div>'+
   SEC('Бюджет і рахунки')+'<div class="fr"><label>Місячний ліміт, zł</label><input data-g="goal" inputmode="decimal" value="'+esc(g)+'" autocomplete="off"></div>'+
   '<button class="btnw" data-s="goal">Зберегти ліміт</button><button class="btnw" data-s="cats">Категорії</button><button class="btnw" data-s="acc">Додати рахунок</button><button class="btnw" data-s="cash">Додати готівку</button><button class="btnw" data-s="markets">Валюти в бігучій строці</button>'+
   SEC('Графіки')+'<button class="btnw" data-s="glines">'+glinesLabel()+'</button><button class="btnw" data-s="area">'+areaLabel()+'</button>'+
   SEC('Скло віджетів')+RNG('cg','is','Значки: насиченість',100)+RNG('cg','ib','Значки: яскравість',100)+RNG('cg','bal','Віджет балансу: сила кольору',100)+
   RNG('cg','gt','Бари, цифри й графіки: сила кольору',100)+RNG('cg','gsat','Бари, цифри й графіки: насиченість',100)+RNG('cg','gbr','Бари, цифри й графіки: яскравість',100)+
   SEC('Віджети на головній')+WG_LIST.map(function(w){return'<button class="btnw" data-s="wg" data-v="'+w.id+'">'+esc(wgLabel(w))+'</button>';}).join('')+'<div class="mkinfo" style="padding:2px 4px 6px">Розмір віджета: затисніть його, з’явиться ручка в куті. Повільно відпустіть — він стане в сітку.</div>'+
   SEC('Скло вікон (налаштування, списки)')+RNG('cg','wh','Колір: відтінок, °',360)+RNG('cg','ws','Колір: інтенсивність',100)+RNG('cg','wv','Яскравість скла',200)+
   SEC('Скло панелі «Додатково»')+RNG('cg','mh','Колір: відтінок, °',360)+RNG('cg','ms','Колір: інтенсивність',100)+RNG('cg','mv','Яскравість скла',200)+
   SEC('Ободок екрана')+'<button class="btnw" data-s="aura">'+auraLabel()+'</button><button class="btnw" data-s="auramode">'+auraModeLabel()+'</button>'+
   RNG('fg','a','Інтенсивність (прозорість)',200)+RNG('fg','ah','Відтінок (зсув, °)',360)+RNG('fg','as','Насиченість',200)+RNG('fg','av','Яскравість',200)+
   SEC('Слід пальця')+'<button class="btnw" data-s="fgwave">'+fgWaveLabel()+'</button><button class="btnw" data-s="fgglow">'+fgGlowLabel()+'</button>'+RNG('fg','i','Інтенсивність',200)+RNG('fg','w','Ширина',100)+RNG('fg','l','Тривалість',100)+
   SEC('Завантаження')+'<button class="btnw" data-s="bfx">'+bfxLabel()+'</button><div class="mkinfo" style="padding:2px 4px 6px">Дотик до екрана завантаження пропускає заставку.</div>'+
   '<button class="btnw" data-s="cgreset">Скинути кольори скла, ободка й сліду</button>'+
   SEC('Синхронізація між пристроями (шифрована)')+
   '<div class="fr"><label>Ключ синхронізації (однаковий на всіх пристроях)</label><input data-sy="key" autocomplete="off" autocapitalize="characters" spellcheck="false" value="'+esc(syGetKey())+'" placeholder="XXXX-XXXX-XXXX-XXXX"></div>'+
   '<button class="btnw" data-s="syncgen">Створити новий ключ</button><button class="btnw" data-s="syncexp">Зашифрувати й поділитися даними</button>'+
   '<div class="fr"><label>Код з іншого пристрою</label><textarea data-sy="code" rows="3" autocomplete="off" spellcheck="false" placeholder="VFSYNC1...."></textarea></div>'+
   '<button class="btnw" data-s="syncmerge">Об’єднати з кодом (додати нове)</button><button class="btnw" data-s="syncreplace">Замінити мої дані даними з коду</button>'+
   SEC('Автосинхронізація в реальному часі (приватний GitHub Gist)')+
   '<div class="fr"><label>GitHub-токен (право gist)</label><input data-sy="tok" type="password" autocomplete="off" value="'+esc(SYN.tok)+'"></div>'+
   '<div class="fr"><label>ID gist (на першому пристрої порожньо)</label><input data-sy="gid" autocomplete="off" spellcheck="false" value="'+esc(SYN.id)+'"></div>'+
   '<button class="btnw" data-s="synon">'+(SYN.on?'Вимкнути автосинхронізацію':'Увімкнути автосинхронізацію')+'</button><div class="mkinfo" data-sy-st style="padding:4px 0 8px">'+esc(synSt||(SYN.on?'Увімкнено':'Вимкнено'))+'</div>'+
   '<div class="mkinfo" style="padding:4px 0 8px">Дані шифруються на пристрої (AES-256-GCM, ключ із вашого ключа); код можна безпечно надіслати собі в Нотатки чи месенджер. Видалення при об’єднанні не переноситься.</div>'+
   SEC('Дані')+'<button class="btnw" data-s="csv">Експорт операцій у CSV</button><button class="btnw" data-s="export">Експорт JSON</button><button class="btnw" data-s="seed">Додати тестові дані для перегляду</button><button class="btnw dng" data-s="clear">Очистити операції та борги</button><div class="err" data-err></div>'+
   SEC('Діагностика')+'<button class="btnw" data-s="logshare">Поділитися журналом запуску</button><button class="btnw" data-s="logcopy">Скопіювати журнал запуску</button>'+
   '<div class="mkinfo" style="padding-top:10px">Збірка: '+esc(window.__VF_BUILD||'?')+(navigator.standalone&&window.__vfFirstH&&screen.height-window.__vfFirstH>=40?'<br><span style="color:var(--ac)">Цей запуск почався з вікном '+window.__vfFirstH+' замість '+screen.height+': iOS відкрив застосунок з геометрією старої іконки. Видаліть іконку з робочого столу, оновіть сторінку в Safari й додайте іконку знову.</span>':'')+'</div>'+
   '';
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
var sendAnchor=null,growAnchor=null;
function curSheetOn(){return !!curSheet&&sheetP.on===1;}
function layoutSheet(){
 if(!curSheet)return;
 var el=curSheet.el,body=curSheet.body,m=vvm(),kb=(VH-(m.t+m.h))>100,w=Math.min(VW-20,520);
 /* вікно ринку тримається найближчої точки тікера: під ним, над ним або збоку */
 var place=curSheet.kind==='marketSheet'?TKP.side:'',lx=null,tkh=tkThick();
 if(place==='l'){var l0=TKP.x+TKV/2+10;w=Math.min(520,VW-l0-10);lx=l0;}else if(place==='r'){w=Math.min(520,TKP.x-TKV/2-20);lx=TKP.x-TKV/2-10-w;}
 var bottom=m.t+m.h-10-(kb?0:SAFE.b);if(place==='b')bottom=Math.min(bottom,TKP.y-tkh/2-10);
 var topMin=place==='t'?TKP.y+tkh/2+10:Math.max(SAFE.t,14),maxH=Math.max(200,bottom-topMin-(place==='t'?0:60));
 var sb=body.scrollTop,se=el.scrollTop;   /* висота auto на мить скидає прокрутку в 0 — запам'ятовуємо й повертаємо */
 el.style.width=w+'px';el.style.height='auto';body.style.height='auto';
 var h=Math.min(body.scrollHeight,maxH);
 el.style.height=h+'px';body.style.height='100%';
 if(sb)body.scrollTop=sb;if(se)el.scrollTop=se;
 var left=lx!==null?lx:m.l+(m.w-w)/2,top=bottom-h;if(place==='t')top=topMin;else if(place==='l'||place==='r')top=Math.max(Math.max(SAFE.t,14),Math.min(bottom-h,tkPA.y-h/2));
 el.style.left=left+'px';el.style.top=top+'px';
 sheetP.tx=left;sheetP.ty=top;sheetP.tw=w;sheetP.th=h;sheetP.rise=VH-top+24;
 SH.x=left;SH.y=top;dirty=true;
}
if(window.visualViewport)window.visualViewport.addEventListener('resize',function(){layoutSheet();});
function showSheet(top){
 var key=top?top.key:'';
 if(curSheet&&curSheet.key===key){
  if(top&&!/^(transaction|debt|manualAccount|markets)/.test(top.kind)){var html=sheetHtml(top.kind,top.ov);if(html!==curSheet.html){var st0=curSheet.body.scrollTop,se=curSheet.el.scrollTop;curSheet.html=html;curSheet.body.innerHTML=html;layoutSheet();curSheet.body.scrollTop=st0;curSheet.el.scrollTop=se;sheetStale();}}
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
 var anc=top.kind==='input'?sendAnchor:((top.kind==='transactionList'||top.kind==='marketSheet'||top.kind==='confirmWipe'||top.kind==='game')&&growAnchor)?growAnchor:null,grow=!!anc;growAnchor=null;
 sheetP.mode=grow?'grow':'rise';
 if(grow){sheetP.ax=anc.x;sheetP.ay=anc.y;}
 sheetP.kind=top.kind;
 layoutSheet();
 if(!swap){sheetP.s=0;sheetP.vs=0;}
 sheetP.on=1;
 scrimEl.classList.add('on');scrimT=0;sheetOn=1;dirty=true;
 SH.el=body;sheetStale();vsBind(body);
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
  else if(s==='mper')setMarketPeriod(t.dataset.v);
  else if(s==='savebud'){[].forEach.call(curSheet.body.querySelectorAll('[data-bud]'),function(i){fin.setCategoryBudget(i.dataset.bud,i.value.trim());});toast('Бюджети збережено');app.back();}
  else if(s==='addrec'){var g2=function(k){var e=curSheet.body.querySelector('[data-rc="'+k+'"]');return e?e.value:'';};fin.saveRecurring({name:g2('name'),amount:g2('amount'),day:g2('day'),category:g2('category'),type:g2('type'),currency:'PLN'});fin.runDueRecurring();toast('Платіж додано');}
  else if(s==='delrec'){fin.deleteRecurring(t.dataset.id);}
  else if(s==='csv'){exportCsv();}
  else if(s==='wipeyes'){fin.resetAll({confirmed:true});LG('ui','повний скид даних');app.back();toast('Усі записи стерто');}
  else if(s==='logshare')logShare();
  else if(s==='synon')synToggle();
  else if(s==='syncgen')syGen();
  else if(s==='syncexp')syExport();
  else if(s==='syncmerge')syImport('merge');
  else if(s==='syncreplace')syImport('replace');
  else if(s==='logcopy')logCopy();
  else if(s==='cgreset'){setCG('is',40);setCG('ib',45);setCG('bal',45);setCG('gt',65);setCG('gsat',50);setCG('gbr',50);setCG('wh',200);setCG('ws',0);setCG('wv',100);setCG('mh',200);setCG('ms',0);setCG('mv',100);setFGS('a',50);setFGS('ah',0);setFGS('as',100);setFGS('av',100);setFGS('i',56);setFGS('w',62);setFGS('l',30);[].forEach.call(curSheet.body.querySelectorAll('[data-fg]'),function(i){i.value=FGS[i.dataset.fg];});[].forEach.call(curSheet.body.querySelectorAll('[data-cg]'),function(i){i.value=CG[i.dataset.cg];});tlAll();}
  else if(s==='bfx'){try{localStorage.setItem('vf-bfx',localStorage.getItem('vf-bfx')==='0'?'1':'0');}catch(e){}t.textContent=bfxLabel();}
  else if(s==='wg'){var wq=WG_LIST.find(function(q){return q.id===t.dataset.v;});wgToggle(t.dataset.v);t.textContent=wgLabel(wq);sheetStale();}
  else if(s==='fgwave'){setFGS('tw',FGS.tw?0:1);t.textContent=fgWaveLabel();LG('ui',fgWaveLabel());}
  else if(s==='fgglow'){setFGS('tg',FGS.tg?0:1);t.textContent=fgGlowLabel();LG('ui',fgGlowLabel());}
  else if(s==='auramode'){setFGS('am',FGS.am?0:1);t.textContent=auraModeLabel();LG('ui',auraModeLabel());}
  else if(s==='aura'){toggleAura();t.textContent=auraLabel();sheetStale();}
  else if(s==='area'){cycleArea();t.textContent=areaLabel();sheetStale();}
  else if(s==='glines'){setGlassLines(!GLINES);t.textContent=glinesLabel();sheetStale();}
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
 var r=frect(sendBtn);sendAnchor={x:r.left+r.width/2,y:r.top+r.height/2};
 if(String(val).trim()){try{app.submitInput(calcText(val));}catch(err){console.error(err);}}
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
 if(FLD.id&&n.screen!==FLD.scr){FLD.id=null;}if(FLD.id)sel=9;else if(pi!==undefined)sel=pi;
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
function scrollParent(n,stop){while(n&&n!==stop){if(n.scrollHeight>n.clientHeight+2){var o=getComputedStyle(n).overflowY;if(o==='auto'||o==='scroll'||n._vs)return n;}n=n.parentNode;}return stop&&stop.scrollHeight>stop.clientHeight+2&&(stop._vs||/auto|scroll/.test(getComputedStyle(stop).overflowY))?stop:null;}
function gStart(P,x,y,t,tg){
 if(!P.on)return;if(tg&&tg.closest&&tg.closest('input[type=range]'))return;TG.atBot=false;
 TG.P=P;TG.x0=x;TG.y0=y;TG.t0=t;TG.ty=y;TG.tt=t;TG.vy=0;TG.drag=0;TG.moved=false;
 TG.lx=x;TG.sc=scrollParent(tg,P.el);TG.top0=TG.sc?TG.sc.scrollTop:0;
 TG.atBot=!TG.sc||(TG.sc.scrollTop+TG.sc.clientHeight>=TG.sc.scrollHeight-2);   /* жест почався вже внизу списку */
}
function gMove(x,y,t){
 var P=TG.P;if(!P)return;
 var dx=x-TG.x0,dy=y-TG.y0;TG.lx=x;
 if(!TG.drag){if(Math.hypot(dx,dy)<7)return;TG.drag=1;TG.moved=true;P.dragging=1;}
 var dt=Math.max(1,t-TG.tt);TG.vy=.6*TG.vy+.4*(y-TG.ty)/dt;TG.ty=y;TG.tt=t;
 var atTop=!TG.sc||TG.sc.scrollTop<=0&&TG.top0<=0,tg=P.tgt,pull=dy>14&&atTop&&dy>=Math.abs(dx)*1.6;   /* намір закрити: явно вниз, не по діагоналі, після невеликої «мертвої зони» */
 var sh=P===sheetP,mre=P===menu&&menu.kind==='more',sk=sh?.22:mre?.33:1;if(mre){var scB=TG.sc&&TG.sc.scrollTop+TG.sc.clientHeight>=TG.sc.scrollHeight-2,scT=!TG.sc||TG.sc.scrollTop<=0;pull=false;if(!((scT&&dy>0)||(scB&&dy<0)))dy=0;sk=.12;}var X=rb(dx)*sk,Y=pull?dy*(sh?.42:.8):rb(dy)*sk;   /* вікно налаштувань іде за пальцем ледь-ледь */
 tg.x=pull?dx*(sh?.06:mre?.05:.15):X;tg.y=Y;
 var ek=sh?.4:mre?.33:1,ex=Math.min(14*ek,Math.abs(tg.x)*.5*ek),ey=Math.min(16*ek,Math.abs(tg.y)*(pull?.18:.5)*ek);
 tg.sx=(ex-.5*ey)/Math.max(60,P.tw);tg.sy=(ey-.5*ex)/Math.max(60,P.th);
 P.pull=pull;
}
function gEnd(){
 var P=TG.P;if(!P)return;
 var dy=TG.ty-TG.y0,atTop=!TG.sc||TG.top0<=0;
 var scr=!!TG.sc&&TG.sc.scrollHeight>TG.sc.clientHeight+2;   /* у вікні є що прокручувати — вимагаємо виразнішого жесту */
 var close=TG.drag&&P.pull&&!(P===menu&&menu.kind==='more')&&atTop&&(dy>(scr?150:110)||(dy>(scr?100:60)&&TG.vy>1));
 var dxe=TG.lx-TG.x0,closeX=P===menu&&menu.kind==='more'&&TG.drag&&(menu.left?-dxe:dxe)>70&&Math.abs(dxe)>Math.abs(dy)*1.4;   /* свайп зліва направо закриває «Додатково» */
 var openSet=P===menu&&menu.kind==='more'&&TG.atBot&&TG.drag&&dy<-190&&!P.pull&&Math.abs(TG.lx-TG.x0)<60;   /* ще раз гортаємо вниз, коли список уже в упор — налаштування */
 P.dragging=0;P.pull=false;P.tgt.x=P.tgt.y=P.tgt.sx=P.tgt.sy=0;TG.P=null;dirty=true;
 if(closeX){TG.moved=true;try{app.closePanel('more');}catch(e){}return;}
 if(openSet){TG.moved=true;try{nav.openOverlay('settings');}catch(e){}return;}
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

/* ---------- свайп від лівого краю праворуч або від правого краю ліворуч — «назад».
   Працює лише там, де є куди повертатись (вікно, меню або детальна сторінка); на вкладках дока свайп перегортає вкладки ---------- */
var EB={on:0,x0:0,y0:0,t0:0,dx:0,P:null,side:1};
function canBack(){var st=nav.getState();return st.overlays.length>0||PAGE_OF[st.screen]>2||menu.on||!!FLD.id;}
document.addEventListener('touchstart',function(e){
 var t=e.touches[0];if(e.touches.length!==1||mode===1){EB.on=0;return;}
 var side=t.clientX<=26?1:t.clientX>=VW-26?-1:0;
 if(!side||!canBack()){EB.on=0;return;}
 EB.on=1;EB.side=side;EB.x0=t.clientX;EB.y0=t.clientY;EB.t0=e.timeStamp;EB.dx=0;
 EB.P=(menu.on&&menu.kind==='dd')?menu:(sheetP.on&&curSheet)?sheetP:menu.on?menu:null;
},{passive:true});
document.addEventListener('touchmove',function(e){
 if(!EB.on)return;var t=e.touches[0];if(!t)return;var dx=t.clientX-EB.x0,dy=t.clientY-EB.y0;
 if(Math.abs(dy)>Math.abs(dx)*1.2&&Math.abs(dy)>16){EB.on=0;if(EB.P){EB.P.tgt.x=0;}return;}
 EB.dx=dx;var sd=dx*EB.side;if(EB.P&&sd>0){EB.P.tgt.x=EB.side*Math.min(90,sd*.45);}
},{passive:true});
function edgeEnd(e){
 if(!EB.on)return;EB.on=0;
 var sd=EB.dx*EB.side,dt=Math.max(1,e.timeStamp-EB.t0);
 if(EB.P)EB.P.tgt.x=0;
 if(sd>70||(sd>34&&sd/dt>.55)){TG.moved=true;LG('swipe','назад від '+(EB.side>0?'лівого':'правого')+' краю');
  try{if(menu.on&&menu.kind==='dd')closeMenu();else if(FLD.id)closeFolder();else app.back();}catch(err){console.error(err);}
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
var tkPA={x:0,y:0},tkG=VF.createTickerGesture(),tkOff=0,tkPress=null,tkPause=0,tkLast=0,tkReady=false,tkVel=0,tkPX=0,tkPT=0,
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
 if(r){tkPause=r.resumeAt;if(r.openMarketId){tkVel=0;try{growAnchor={x:tkPA.x,y:tkPA.y};mkpEnter(r.openMarketId);nav.openOverlay('marketSheet',{marketId:r.openMarketId});}catch(err){console.error(err);}}}
}
/* строка закріплена поза сторінками: горизонтальне перетягування не скролить сторінку (touch-action:none) */
tickerEl.addEventListener('pointerdown',function(e){
 var it=tkHit(e);
 tkG.start({x:tkAx(e),marketId:it?it.dataset.mk:'',offset:tkOff});tkPress={id:e.pointerId};tkVel=0;tkPX=tkAx(e);tkPT=e.timeStamp;tkPA={x:e.clientX,y:e.clientY};
 try{tickerEl.setPointerCapture(e.pointerId);}catch(_){}
});
tickerEl.addEventListener('pointermove',function(e){
 if(!tkPress||e.pointerId!==tkPress.id)return;
 var r=tkG.move({x:tkAx(e)});if(r)tkOff=r.offset;
 var dtm=e.timeStamp-tkPT;if(dtm>0){tkVel=.6*tkVel+.4*(-(tkAx(e)-tkPX)/dtm*1000);}
 tkPX=tkAx(e);tkPT=e.timeStamp;
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

/* діагностика: ?debug у адресі або довге натискання (1,4 с) на тікер. Панель із розмірами + кнопки «Поділитися журналом» / «Копіювати» */
var hud=null,hudPre=null,hudT=0;
function logText(){return window.__vfExport?window.__vfExport():'(журнал недоступний)';}
function fallbackCopy(txt){var ta=document.createElement('textarea');ta.value=txt;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';document.body.appendChild(ta);ta.select();ta.setSelectionRange(0,txt.length);var ok=false;try{ok=document.execCommand('copy');}catch(e){}ta.remove();toast(ok?'Журнал скопійовано':'Не вдалося скопіювати');}
function logCopy(){var txt=logText();LG('export','копіювання, символів '+txt.length);if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){toast('Журнал скопійовано');},function(){fallbackCopy(txt);});}else fallbackCopy(txt);}
function logShare(){
 var txt=logText(),f=null;LG('export','поділитися, символів '+txt.length);
 try{f=new File([txt],'voice-finance-log.txt',{type:'text/plain'});}catch(e){}
 if(f&&navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f],title:'Журнал запуску'}).catch(function(){});}
 else if(navigator.share){navigator.share({title:'Журнал запуску',text:txt}).catch(function(){});}
 else logCopy();
}
function hudToggle(){
 if(hud){clearInterval(hudT);hud.remove();hud=null;try{localStorage.removeItem('vf-debug');}catch(e){}LG('hud','вимкнено');return;}
 try{localStorage.setItem('vf-debug','1');}catch(e){}
 LG('hud','увімкнено');hudOn();
}
function hudOn(){
 if(hud)return;
 hud=document.createElement('div');hud.style.cssText='position:fixed;left:6px;right:6px;top:calc(env(safe-area-inset-top,0px) + 70px);z-index:99;pointer-events:none';
 hudPre=document.createElement('pre');hudPre.style.cssText='margin:0;padding:6px 8px;border-radius:8px;background:rgba(0,0,0,.8);color:#9f9;font:11px/1.35 ui-monospace,Menlo,monospace;white-space:pre-wrap';
 var bar=document.createElement('div');bar.style.cssText='display:flex;gap:6px;margin-top:6px;pointer-events:auto';
 [['Поділитися журналом',logShare],['Копіювати',logCopy],['Сховати',hudToggle]].forEach(function(b){var e=document.createElement('button');e.textContent=b[0];e.style.cssText='flex:1;height:34px;border-radius:17px;background:rgba(40,40,48,.95);color:#fff;font:600 12px var(--f);text-align:center;border:1px solid rgba(255,255,255,.15)';e.addEventListener('click',function(ev){ev.stopPropagation();b[1]();});bar.appendChild(e);});
 hud.appendChild(hudPre);hud.appendChild(bar);document.body.appendChild(hud);
 hudT=setInterval(function(){
  var vv=window.visualViewport,b=bgEl.getBoundingClientRect(),d=dock.getBoundingClientRect(),c=cv.getBoundingClientRect(),rl=0;
  try{rl=sessionStorage.getItem('vf-rl')?1:0;}catch(e){}
  hudPre.textContent=['збірка '+(window.__VF_BUILD||'?'),
   'standalone '+(navigator.standalone?'yes':'no')+' / dm '+(matchMedia('(display-mode: standalone)').matches?'sa':'br'),
   'inner '+innerWidth+'x'+innerHeight+'  outer '+outerWidth+'x'+outerHeight+'  screen '+screen.width+'x'+screen.height,
   'vv '+(vv?Math.round(vv.width)+'x'+Math.round(vv.height)+' top '+Math.round(vv.offsetTop):'-')+'  html '+document.documentElement.clientHeight+'  scrollY '+Math.round(scrollY)+'  SO '+SO,
   'safe '+SAFE.t+'/'+SAFE.b+'  island '+ISL+'  cell '+gridCell().toFixed(1),
   'bg top '+Math.round(b.top)+' h '+Math.round(b.height)+'  VH '+Math.round(VH),
   'dock(raw) '+Math.round(d.top)+'..'+Math.round(d.bottom)+'  DR '+Math.round(DR.top)+'  dockY '+(dockY===null?'-':dockY.toFixed(1)),
   'gl(raw) '+Math.round(c.top)+'..'+Math.round(c.bottom),
   'lay '+(boot.lay?1:0)+' nz '+(boot.nz||0)+' rl '+rl+'  перший кадр h '+window.__vfFirstH+'  рядків '+(window.__vfLines?window.__vfLines.length:0),
   'vp(t,h,vv): '+vpLog.map(function(x){return x.join(',');}).join(' | ')].join('\n');
 },400);
}
var lpT=0,lpP=null;
tickerEl.addEventListener('pointerdown',function(e){clearTimeout(lpT);lpP=[e.clientX,e.clientY];lpT=setTimeout(hudToggle,1400);});
tickerEl.addEventListener('pointermove',function(e){if(lpP&&Math.hypot(e.clientX-lpP[0],e.clientY-lpP[1])>12)clearTimeout(lpT);});
['pointerup','pointercancel'].forEach(function(n){tickerEl.addEventListener(n,function(){clearTimeout(lpT);});});
if(/[?&]debug/.test(location.search)||(function(){try{return localStorage.getItem('vf-debug');}catch(e){return null;}})())hudOn();
LG('main','інтерфейс ініціалізовано');
/* автооновлення: iOS тримає сторінку в кеші до 10 хв; при запуску беремо свіжу копію без кешу, і якщо збірка новіша — один раз перезавантажуємось за новою адресою */
(function(){
 try{if(sessionStorage.getItem('vf-upd'))return;}catch(e){}
 function chk(){
  if(boot.on){setTimeout(chk,400);return;}
  var base=location.pathname.replace(/[^\/]*$/,'');
  fetch(base+'version.txt?check='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.text();}).then(function(t){
   var v=String(t).trim();if(!v||v===window.__VF_BUILD)return;
   LG('update','є нова збірка '+v+' (зараз '+window.__VF_BUILD+'): перезавантаження');
   try{sessionStorage.setItem('vf-upd','1');}catch(e){}
   if(window.__vfSave)window.__vfSave();
   location.replace(location.pathname+'?b='+encodeURIComponent(v));
  }).catch(function(e){LG('update','перевірка оновлення не вдалась: '+e);});
 }
 chk();
})();

/* утримання на операції або боргу: меню «Редагувати / Видалити» (видалення з підтвердженням) */
var LP={t:0,el:null,x:0,y:0,fired:0};
root.addEventListener('pointerdown',function(e){
 var r=e.target.closest&&e.target.closest('[data-act=tx],[data-act=dperson],[data-act=dedit]');if(!r)return;
 LP.el=r;LP.x=e.clientX;LP.y=e.clientY;LP.fired=0;clearTimeout(LP.t);
 LP.t=setTimeout(function(){if(LP.el!==r)return;LP.fired=1;longPress(r);},520);
});
root.addEventListener('pointermove',function(e){if(LP.el&&Math.hypot(e.clientX-LP.x,e.clientY-LP.y)>8){clearTimeout(LP.t);LP.el=null;}});
['pointerup','pointercancel'].forEach(function(n){root.addEventListener(n,function(){clearTimeout(LP.t);LP.el=null;});});
root.addEventListener('click',function(e){if(LP.fired){LP.fired=0;e.stopPropagation();e.preventDefault();}},true);
function longPress(r){
 var a=r.dataset.act,id=r.dataset.id,isTx=a==='tx';LG('ui','утримання: '+a+' '+id);
 openDropdown(r,isTx?[{v:'edit',l:'Редагувати'},{v:'tpl',l:'Зберегти як шаблон'},{v:'del',l:'Видалити'}]:[{v:'edit',l:'Редагувати'},{v:'del',l:'Видалити'}],'',function(v){
  if(v==='tpl'){var tx1=fin.getState().transactions.find(function(q){return q.id===id;});if(tx1){fin.saveTemplate({name:tx1.client||tx1.note||catName(tx1.category),type:tx1.type,amount:tx1.amount,currency:tx1.currency,category:tx1.category,accountId:tx1.accountId,client:tx1.client,note:tx1.note});toast('Шаблон збережено — він на головній');}return;}
  if(v==='edit'){try{if(isTx)app.editTransaction(id);else app.editDebt(id);}catch(err){toast(err.message||'Помилка');}return;}
  setTimeout(function(){openDropdown(r,[{v:'yes',l:isTx?'Так, видалити операцію':'Так, видалити борг'},{v:'no',l:'Скасувати'}],'',function(v2){
   if(v2!=='yes')return;
   try{if(isTx)fin.deleteTransaction(id);else fin.deleteDebt(id);toast('Видалено');}catch(err){toast(err.message||'Помилка');}
  });},250);
 });
}
/* трекпад/колесо над тікером — прокручує тікер */
tickerEl.addEventListener('wheel',function(e){e.preventDefault();tkOff+=e.deltaX+e.deltaY;tkVel=0;tkPause=performance.now()+700;},{passive:false});

/* текст у віджетах стискається під ширину свого боксу й ніколи не виходить за межі */
var FIT_SEL='.big,.mid,.split b,.mini b,.aa',fitQ=0;
function fitAll(){   /* виконується синхронно після зміни DOM, до малювання; читання й запис розділені (без зайвих перерахунків макету) */
 fitQ=0;var els=[].slice.call(root.querySelectorAll(FIT_SEL));
 els.forEach(function(el){if(el.style.fontSize)el.style.fontSize='';});
 var need=els.map(function(el){var w=el.clientWidth;return w?[w,el.scrollWidth]:null;});
 els.forEach(function(el,i){var n=need[i];if(n&&n[1]>n[0]+.5){var fs=parseFloat(getComputedStyle(el).fontSize)||16;el.style.fontSize=Math.max(10,Math.floor(fs*n[0]/n[1]*10)/10-.1)+'px';}});
}
function fitSoon(){if(!fitQ)fitQ=requestAnimationFrame(fitAll);}
new MutationObserver(function(){fitAll();tlAllStale();dirty=true;}).observe(root,{childList:true,subtree:true,characterData:true});
window.addEventListener('resize',fitSoon);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fitSoon);
fitSoon();

/* повзунки кольорового скла */
document.getElementById('sheets').addEventListener('input',function(e){var t=e.target;if(t.dataset&&t.dataset.cg){setCG(t.dataset.cg,+t.value);tlAll();}if(t.dataset&&t.dataset.fg)setFGS(t.dataset.fg,+t.value);});

/* ---------- синхронізація між пристроями: шифрований код (AES-256-GCM, PBKDF2) ---------- */
var SYE=new TextEncoder(),SYD=new TextDecoder();
function syGetKey(){try{return localStorage.getItem('vf-synckey')||'';}catch(e){return'';}}
function sySetKey(k){try{localStorage.setItem('vf-synckey',k);}catch(e){}}
function b64u(u){var s='';for(var i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function unb64u(t){t=t.replace(/-/g,'+').replace(/_/g,'/');while(t.length%4)t+='=';var s=atob(t),u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;}
function syKeyFrom(pass,salt){return crypto.subtle.importKey('raw',SYE.encode(pass),'PBKDF2',false,['deriveKey']).then(function(km){return crypto.subtle.deriveKey({name:'PBKDF2',salt:salt,iterations:250000,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);});}
function syEncrypt(pass,obj){var salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 return syKeyFrom(pass,salt).then(function(k){return crypto.subtle.encrypt({name:'AES-GCM',iv:iv},k,SYE.encode(JSON.stringify(obj)));}).then(function(ct){return'VFSYNC1.'+b64u(salt)+'.'+b64u(iv)+'.'+b64u(new Uint8Array(ct));});}
function syDecrypt(pass,code){var p=String(code).trim().split('.');if(p[0]!=='VFSYNC1'||p.length!==4)return Promise.reject(new Error('Це не код синхронізації'));
 return syKeyFrom(pass,unb64u(p[1])).then(function(k){return crypto.subtle.decrypt({name:'AES-GCM',iv:unb64u(p[2])},k,unb64u(p[3]));}).then(function(pt){return JSON.parse(SYD.decode(pt));},function(){throw new Error('Невірний ключ або код пошкоджено');});}
function syField(n){var e=curSheet&&curSheet.body.querySelector('[data-sy="'+n+'"]');return e?e.value:'';}
function syNeedKey(){var k=syField('key').trim().toUpperCase();if(k.length<8){toast('Спершу введіть або створіть ключ (мінімум 8 символів)');return'';}sySetKey(k);return k;}
function syGen(){var A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',r=crypto.getRandomValues(new Uint8Array(16)),k='';for(var i=0;i<16;i++){k+=A[r[i]%32];if(i%4===3&&i<15)k+='-';}
 var e=curSheet.body.querySelector('[data-sy="key"]');if(e)e.value=k;sySetKey(k);sheetStale();toast('Ключ створено. Збережіть його: на інших пристроях введіть такий самий');}
function syExport(){var k=syNeedKey();if(!k)return;var st=fin.getState();
 syEncrypt(k,{app:'voice-finance-glass',v:1,at:new Date().toISOString(),data:{transactions:st.transactions,debts:st.debts,accounts:st.accounts,categories:st.categories,balanceSnapshots:st.balanceSnapshots}}).then(function(code){
  LG('sync','експорт, символів '+code.length);
  if(navigator.share){navigator.share({text:code,title:'Voice Finance — код синхронізації'}).catch(function(){});}
  else if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(code).then(function(){toast('Код скопійовано');},function(){toast('Не вдалося скопіювати');});}
 }).catch(function(e){toast('Помилка шифрування: '+(e.message||e));});}
function syImport(mode){var k=syNeedKey();if(!k)return;var code=syField('code');if(!code.trim()){toast('Вставте код з іншого пристрою');return;}
 syDecrypt(k,code).then(function(o){if(!o||o.app!=='voice-finance-glass'||!o.data)throw new Error('Невідомий формат коду');
  var r=fin.importSnapshot(o.data,{mode:mode});LG('sync','імпорт '+mode+' '+JSON.stringify(r));
  toast(mode==='merge'?'Додано: операцій '+r.transactions+', боргів '+r.debts+', рахунків '+r.accounts:'Дані замінено: операцій '+r.transactions);
 }).catch(function(e){toast(e.message||String(e));});}

/* колесо/трекпад: ще раз вниз у кінці панелі «Додатково» відкриває налаштування */
var MW={acc:0,t:0,bot:false};
menu.el.addEventListener('wheel',function(e){if(menu.kind!=='more'||!menu.on)return;var s=menu.el,atB=s.scrollTop+s.clientHeight>=s.scrollHeight-2;
 if(e.timeStamp-MW.t>450){MW.acc=0;MW.bot=atB;}MW.t=e.timeStamp;
 if(MW.bot&&atB&&e.deltaY>0){MW.acc+=e.deltaY;if(MW.acc>420){MW.acc=0;MW.bot=false;try{nav.openOverlay('settings');}catch(er){}}}else if(!atB)MW.bot=false;},{passive:true});

/* ---------- м’яке натискання на будь-який віджет чи кнопку: пружина масштабу + легка віддача сусідів ---------- */
var PRS=new Map(),PRraf=0,PRlast=0,PRd=null;
function prKick(){if(!PRraf){PRlast=performance.now();PRraf=requestAnimationFrame(prStep);}}
function prSt(el){if(el.classList&&el.classList.contains('wfd'))return{s:1,v:0,ts:1,dx:0,dy:0,vx:0,vy:0,tdx:0,tdy:0};var s=el._ps;if(!s){s=el._ps={s:1,v:0,ts:1,dx:0,dy:0,vx:0,vy:0,tdx:0,tdy:0};PRS.set(el,s);}return s;}
function prStep(t){
 PRraf=0;var dt=Math.min(.033,Math.max(.001,(t-PRlast)/1000)),sg=0;PRlast=t;
 PRS.forEach(function(s,el){
  for(var q=0;q<2;q++){var h=dt/2;s.v+=(430*(s.ts-s.s)-23*s.v)*h;s.s+=s.v*h;s.vx+=(430*(s.tdx-s.dx)-26*s.vx)*h;s.dx+=s.vx*h;s.vy+=(430*(s.tdy-s.dy)-26*s.vy)*h;s.dy+=s.vy*h;}
  if(Math.abs(s.s-1)<.0008&&Math.abs(s.v)<.012&&Math.abs(s.dx)<.03&&Math.abs(s.dy)<.03&&s.ts===1&&!s.tdx&&!s.tdy){el.style.scale='';el.style.translate='';el._ps=null;PRS.delete(el);}
  else{el.style.scale=s.s.toFixed(4);el.style.translate=s.dx.toFixed(2)+'px '+s.dy.toFixed(2)+'px';sg+=s.s+s.dx*.013+s.dy*.017;}
 });
 PRSIG=sg.toFixed(4);dirty=true;
 if(PRS.size)prKick();
}
function prNudge(el,mag){
 var p=el.parentElement;if(!p)return;var r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,lim=Math.max(r.width,r.height)*1.9+60;
 [].forEach.call(p.children,function(c){if(c===el||c.nodeType!==1||!c.offsetWidth)return;var q=c.getBoundingClientRect(),dx=q.left+q.width/2-cx,dy=q.top+q.height/2-cy,d=Math.hypot(dx,dy);if(d<1||d>lim)return;
  var k=mag*(1-d/lim),s=prSt(c);if(Math.abs(dx)>Math.abs(dy)*1.4){s.tdx=dx/d*k*1.6;s.tdy=0;}else if(Math.abs(dy)>Math.abs(dx)*1.4){s.tdy=dy/d*k*1.6;s.tdx=0;}else{s.tdx=dx/d*k;s.tdy=dy/d*k;}
  PRd.nb.push(c);});
}
function prDown(e){
 if(e.button>0||!e.target.closest)return;
 var t=e.target;if(t.closest('input,textarea,select,#dock,#send,#inp,#ticker,.sw,[data-cg]'))return;
 var el=t.closest('button,[data-act],.pillb,.mr,.btnw'),tile=t.closest('.tile');
 if(el&&tile&&el.tagName==='DIV'&&el.parentElement&&el.parentElement.classList.contains('tile'))el=tile;   /* віджет-ціле (напр. баланс) */
 else if(!el&&tile&&tile.querySelector('[data-act]')&&0)el=tile;
 if(!el)return;
 prUp(true);
 var r=el.getBoundingClientRect(),small=Math.min(r.width,r.height)<64&&r.width<120,big=r.width>220&&r.height>110,s=el.classList.contains('tile')?.985:big?.985:r.width>200?.972:small?.9:.94;
 PRd={el:el,tile:null,x:e.clientX,y:e.clientY,t:performance.now(),nb:[]};
 var st=prSt(el);st.ts=s;
 if(el!==tile&&tile&&!el.classList.contains('mr')){var ts=prSt(tile);ts.ts=.993;PRd.tile=tile;}
 prNudge(el,small?3:el.classList.contains('tile')?2.4:1.8);
 prKick();
}
function prUp(now){
 var d=PRd;if(!d)return;PRd=null;
 var rel=function(){[d.el,d.tile].concat(d.nb).forEach(function(c){var s=c&&c._ps;if(s){s.ts=1;s.tdx=0;s.tdy=0;}});prKick();};
 var w=now?0:Math.max(0,90-(performance.now()-d.t));
 if(w>0)setTimeout(rel,w);else rel();
}
document.addEventListener('pointerdown',prDown,true);
['pointerup','pointercancel'].forEach(function(n){document.addEventListener(n,function(){prUp(false);},true);});
document.addEventListener('pointermove',function(e){if(PRd&&Math.hypot(e.clientX-PRd.x,e.clientY-PRd.y)>9)prUp(true);},true);

function mkSheetRefresh(){if(!curSheet||curSheet.kind!=='marketSheet')return;var h=sheetHtml('marketSheet',{data:{marketId:mkP.id}});if(h!==curSheet.html){var st0=curSheet.body.scrollTop;curSheet.html=h;curSheet.body.innerHTML=h;layoutSheet();curSheet.body.scrollTop=st0;sheetStale();}}

/* ---------- автосинхронізація: знімок усіх даних шифрується ключем і лежить у приватному gist; останній запис перемагає ---------- */
var SYN=(function(){var d={on:0,id:'',tok:'',dev:'',at:0,init:0};try{var j=JSON.parse(localStorage.getItem('vf-gist')||'null');if(j)d=Object.assign(d,j);}catch(e){}if(!d.dev)d.dev=Math.random().toString(36).slice(2,10);return d;})();
var synBusy=0,synPT=0,synApplying=0,synSt='',synTick=0;
function synSave(){try{localStorage.setItem('vf-gist',JSON.stringify(SYN));}catch(e){}}
function synStat(m){synSt=m;var e=curSheet&&curSheet.body.querySelector('[data-sy-st]');if(e)e.textContent=m;}
function synApi(method,path,body){return fetch('https://api.github.com'+path,{method:method,headers:{'Authorization':'Bearer '+SYN.tok,'Accept':'application/vnd.github+json','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}).then(function(r){if(!r.ok)throw new Error('GitHub '+r.status);return r.json();});}
function synPayload(){var st=fin.getState();return{app:'voice-finance-glass',v:2,dev:SYN.dev,at:Date.now(),data:{transactions:st.transactions,debts:st.debts,accounts:st.accounts,categories:st.categories,balanceSnapshots:st.balanceSnapshots}};}
function synPush(){
 if(!SYN.on||synBusy)return;var key=syGetKey();if(!key||!SYN.tok)return;synBusy=1;var pl=synPayload();
 return syEncrypt(key,pl).then(function(code){var body={files:{'vf-sync.txt':{content:code}}};
  if(!SYN.id){body.public=false;body.description='Voice Finance sync';return synApi('POST','/gists',body).then(function(g){SYN.id=g.id;});}
  return synApi('PATCH','/gists/'+SYN.id,body);
 }).then(function(){SYN.at=pl.at;synSave();synBusy=0;synStat('Синхронізовано '+new Date().toLocaleTimeString('uk-UA'));}).catch(function(e){synBusy=0;synStat('Помилка надсилання: '+(e.message||e));});
}
function synPull(first){
 if(!SYN.on||!SYN.id||synBusy||synPT)return Promise.resolve();var key=syGetKey();if(!key||!SYN.tok)return Promise.resolve();synBusy=1;
 return synApi('GET','/gists/'+SYN.id).then(function(g){var f=g.files&&g.files['vf-sync.txt'];if(!f||!f.content)return null;return syDecrypt(key,f.content);}).then(function(o){
  synBusy=0;if(!o||!o.data)return;
  if(first){synApplying=1;try{fin.importSnapshot(o.data,{mode:'merge'});}finally{synApplying=0;}SYN.at=o.at;synSave();return;}
  if(o.dev!==SYN.dev&&o.at>SYN.at){synApplying=1;try{fin.importSnapshot(o.data,{mode:'replace'});}finally{synApplying=0;}SYN.at=o.at;synSave();synStat('Оновлено з іншого пристрою '+new Date().toLocaleTimeString('uk-UA'));}
 }).catch(function(e){synBusy=0;synStat('Помилка отримання: '+(e.message||e));});
}
function synToggle(){
 if(SYN.on){SYN.on=0;synSave();synStat('Вимкнено');return;}
 var key=syGetKey();if(!key){toast('Спершу створіть ключ синхронізації вище');return;}
 SYN.tok=syField('tok').trim();SYN.id=syField('gid').trim();if(!SYN.tok){toast('Введіть GitHub-токен');return;}
 SYN.on=1;SYN.at=0;synSave();synStat('Підключення…');
 var go=function(){return synPush().then(function(){synStat('Увімкнено. ID gist: '+SYN.id);});};
 if(SYN.id)synPull(true).then(go);else go();
}
fin.subscribe(function(ev){if(!SYN.on||synApplying||/^sync:/.test(ev.type))return;clearTimeout(synPT);synPT=setTimeout(function(){synPT=0;synPush();},2000);});
setInterval(function(){if(SYN.on&&!document.hidden)synPull(false);},8000);
document.addEventListener('visibilitychange',function(){if(SYN.on&&!document.hidden)synPull(false);});

/* ---------- світіння за пальцем: суцільний насичений лазерний слід кольору балансу; малюється в текстуру, яку скло плиток заломлює ---------- */
var FGc=null,FGp=[],FGraf=0,FGdown=false;
function fgPal(t){var f=((t%1)+1)%1*4,A=[[255,66,133],[148,77,255],[46,140,255],[255,153,66]],i=Math.floor(f),u=f-i;u=u*u*(3-2*u);var a=A[i%4],b=A[(i+1)%4];return[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u];}
function fgAdd(x,y,brk){var now=performance.now(),pv=FGp.length?FGp[FGp.length-1]:null,v=0;if(pv&&!brk){v=Math.hypot(x-pv.x,y-pv.y)/Math.max(1,now-pv.t);v=pv.v*.65+v*.35;}FGp.push({x:x,y:y,t:now,b:!!brk,v:v});if(FGp.length>90)FGp.shift();kickFg();}
/* яскравість сліду від швидкості пальця (v у пікселях за мс): звичайний скрол (~0.7) ≈ 37%, дуже швидкий рух (3+) ≈ 95%, майже стоячий палець ≈ 12% */
function fgSpd(v){return .12+.83*Math.pow(Math.min(1,(v||0)/3),.83);}
function kickFg(){if(!FGraf)FGraf=requestAnimationFrame(fgStep);}
function fgStep(){
 FGraf=0;var now=performance.now(),LIFE=500+FGS.l*20,IN=FGS.i/100,BR=30+FGS.w*.75;
 FGp=FGp.filter(function(p){return now-p.t<LIFE;});
 /* шлях → рівномірні вершини (не більше 24), шейдер з'єднує їх у суцільну лінію */
 var pts=[],i,len=0;for(i=1;i<FGp.length;i++)if(!FGp[i].b)len+=Math.hypot(FGp[i].x-FGp[i-1].x,FGp[i].y-FGp[i-1].y);
 var step=Math.max(BR*.45,len/22),acc=step;
 for(i=0;i<FGp.length;i++){var b=FGp[i],ageB=1-(now-b.t)/LIFE;
  if(i>0&&!b.b){var a=FGp[i-1],ageA=1-(now-a.t)/LIFE,d=Math.hypot(b.x-a.x,b.y-a.y),u=0;
   while(acc<=d){u=acc/d;pts.push([a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u,ageA+(ageB-ageA)*u,b.v,a.t+(b.t-a.t)*u]);acc+=step;}acc-=d;}
  else{pts.push([b.x,b.y,ageB,b.v,b.t,1]);acc=step;}}   /* 1 — початок штриха */
 if(FGp.length){var L=FGp[FGp.length-1];pts.push([L.x,L.y,1-(now-L.t)/LIFE,L.v,L.t]);}
 if(pts.length>24){pts=pts.slice(pts.length-24);pts[0][5]=1;}
 /* просте згладжування: ковзне середнє [¼ ½ ¼] у межах штриха, кінці лишаються на місці */
 for(var sm=0;sm<2;sm++){var sp=pts.map(function(q){return q.slice();});for(i=1;i<pts.length-1;i++){if(pts[i][5]||pts[i+1][5])continue;sp[i][0]=(pts[i-1][0]+2*pts[i][0]+pts[i+1][0])/4;sp[i][1]=(pts[i-1][1]+2*pts[i][1]+pts[i+1][1])/4;}pts=sp;}
 var n=0,x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
 for(i=0;i<pts.length;i++){var q=pts[i],al=Math.pow(Math.max(0,q[2]),1.4),r=BR*(1-Math.min(1,q[3]/3)*.3)*(.55+.45*q[2]);if(al<.01||r<1){if(i+1<pts.length)pts[i+1][5]=1;continue;}
  var pc=fgPal(q[4]/3800+q[0]/900);FGu[n*4]=q[0];FGu[n*4+1]=q[1];FGu[n*4+2]=r*.55;FGu[n*4+3]=al*IN*1.4*fgSpd(q[3])*(q[5]||!n?-1:1);FGcu[n*3]=pc[0]/255*.78;FGcu[n*3+1]=pc[1]/255*.78;FGcu[n*3+2]=pc[2]/255*.78;n++;
  x0=Math.min(x0,q[0]-r*1.5);y0=Math.min(y0,q[1]-r*1.5);x1=Math.max(x1,q[0]+r*1.5);y1=Math.max(y1,q[1]+r*1.5);}   /* світіння сягає √5·0.55r ≈ 1.23r, з запасом */
 FGn=n;FGbb=n?[x0,y0,x1,y1]:null;
 FGact=n>0?1:0;FGgen++;dirty=true;
 if(FGp.length||FGdown)FGraf=requestAnimationFrame(fgStep);else{FGgen++;}
}
var WK={x:0,y:0,t:0};function wakeAt(x,y){if(GX.on||(BH.ph&&BH.ph!==3))return;var now=performance.now(),d=Math.hypot(x-WK.x,y-WK.y);if(d<44&&now-WK.t<200)return;var v=d/Math.max(8,now-WK.t);WK.x=x;WK.y=y;WK.t=now;rippleAdd(x,y,Math.max(.22,Math.min(.8,.22+v*.3)));}
/* підсвічування сітки під пальцем: k швидко росте, коли палець на екрані, і повільно гасне після відпускання */
var FGLraf=0;
function flKick(){if(!FGLraf)FGLraf=requestAnimationFrame(flStep);}
function flStep(){FGLraf=0;var tg=FGL.down?1:0;FGL.k+=(tg-FGL.k)*(tg?.34:.075);FGL.x+=(FGL.tx-FGL.x)*.5;FGL.y+=(FGL.ty-FGL.y)*.5;
 if(!FGL.down&&FGL.k<.004){FGL.k=0;dirty=true;return;}dirty=true;FGLraf=requestAnimationFrame(flStep);}
document.addEventListener('pointerdown',function(e){if(!GX.on&&FGS.tw&&!(e.target.closest&&e.target.closest('input,textarea'))){FGL.down=1;FGL.x=FGL.tx=e.clientX;FGL.y=FGL.ty=e.clientY;flKick();}},true);
document.addEventListener('pointermove',function(e){if(FGL.down){FGL.tx=e.clientX;FGL.ty=e.clientY;}},true);
['pointerup','pointercancel'].forEach(function(n){document.addEventListener(n,function(){FGL.down=0;flKick();},true);});
document.addEventListener('pointerdown',function(e){if(!GX.on&&(!BH.ph||BH.ph===3)&&FGS.tw){rippleAdd(e.clientX,e.clientY,1);WK.x=e.clientX;WK.y=e.clientY;WK.t=performance.now();}if(e.target.closest&&e.target.closest('input,textarea'))return;FGdown=true;if(!FGS.tg)return;fgAdd(e.clientX,e.clientY,true);},true);
document.addEventListener('pointermove',function(e){if(!(FGdown||e.buttons))return;if(FGS.tw)wakeAt(e.clientX,e.clientY);if(!FGS.tg)return;var ev=e.getCoalescedEvents?e.getCoalescedEvents():null;if(ev&&ev.length){ev.forEach(function(q){fgAdd(q.clientX,q.clientY,false);});}else fgAdd(e.clientX,e.clientY,false);},true);
['pointerup','pointercancel'].forEach(function(n){document.addEventListener(n,function(){FGdown=false;kickFg();},true);});

/* голосовий ввід прибрано: стерти його сліди на пристрої (налаштування, запобіжники, кеш моделей Whisper) */
(function(){try{['vf-voice','vf-voice-busy','vf-voice-crashes'].forEach(function(k){localStorage.removeItem(k);});}catch(e){}
 try{if(window.caches)caches.delete('transformers-cache');}catch(e){}})();

/* утримання на шаблоні — видалити шаблон */
root.addEventListener('contextmenu',function(e){var b=e.target.closest&&e.target.closest('[data-act=tpl]');if(!b)return;e.preventDefault();openDropdown(b,[{v:'del',l:'Видалити шаблон'},{v:'no',l:'Скасувати'}],'',function(v){if(v==='del')fin.deleteTemplate(b.dataset.id);});});
(function(){var tt=0,tb=null;root.addEventListener('pointerdown',function(e){var b=e.target.closest&&e.target.closest('[data-act=tpl]');if(!b)return;tb=b;clearTimeout(tt);tt=setTimeout(function(){if(tb!==b)return;LP.fired=1;openDropdown(b,[{v:'del',l:'Видалити шаблон'},{v:'no',l:'Скасувати'}],'',function(v){if(v==='del')fin.deleteTemplate(b.dataset.id);});},560);});
 ['pointerup','pointercancel','pointermove'].forEach(function(n){root.addEventListener(n,function(e){if(n==='pointermove'&&e.buttons===0)return;if(n!=='pointermove'||Math.abs(e.movementX)+Math.abs(e.movementY)>6){clearTimeout(tt);tb=null;}});});})();
/* повторювані платежі: при запуску і при поверненні до застосунку */
function runRecurring(){try{var made=fin.runDueRecurring();if(made.length){LG('ui','повторювані: створено '+made.length);toast('Автоматично додано: '+made.map(function(t){return t.note+' '+money(t.amount,t.currency);}).join(', '));}}catch(e){console.error(e);}}
setTimeout(runRecurring,2500);document.addEventListener('visibilitychange',function(){if(!document.hidden)runRecurring();});
/* попередження бюджету після нової операції: 80% і 100% */
fin.subscribe(function(ev){if(ev.type!=='transaction:save')return;var tx2=ev.state.transactions.find(function(q){return q.id===ev.detail.id;});if(!tx2||tx2.type!=='expense')return;
 var c=ev.state.categories.find(function(q){return q.id===tx2.category;});if(!c||!c.budget)return;var sp=monthSpend(c.id),p=sp/c.budget*100;
 if(p>=100)toast('Бюджет «'+c.name+'» перевищено: '+money(sp)+' з '+money(c.budget));else if(p>=80)toast('Бюджет «'+c.name+'»: використано '+Math.round(p)+'%');});
/* експорт у CSV (Excel, Numbers, Google Таблиці) */
function exportCsv(){
 var st=fin.getState(),q=function(v){v=String(v==null?'':v);return/[";,\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
 var rows=[['Дата','Тип','Сума','Валюта','Категорія','Клієнт','Нотатка','Рахунок']];
 st.transactions.slice().sort(function(a,b){return new Date(a.date)-new Date(b.date);}).forEach(function(t){var acc=st.accounts.find(function(a){return a.id===t.accountId;});
  rows.push([new Date(t.date).toISOString().slice(0,16).replace('T',' '),t.type==='income'?'Дохід':'Витрата',String(t.amount).replace('.',','),t.currency,catName(t.category),t.client,t.note,acc?(acc.displayName||acc.bankName):'']);});
 var csv='\ufeff'+rows.map(function(r){return r.map(q).join(';');}).join('\r\n'),name='voice-finance-'+new Date().toISOString().slice(0,10)+'.csv';
 var f=null;try{f=new File([csv],name,{type:'text/csv'});}catch(e){}
 if(f&&navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f],title:'Операції'}).catch(function(){});return;}
 var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);
}

/* ---------- пасхалка «чорна діра»: утримання на краплі внизу сторінки ----------
   Діра з'являється в центрі, всмоктує по спіралі блоки сторінки (DOM + їхнє скло через _ps), док, бігучий рядок і полотно скла;
   ободок світла гасне й затягується лінзою; лишається діра на сітці, потім стискається — лишається фон і дисторсія по краях.
   Повторний тап — усе вилітає назад на свої місця. Дані не змінюються. */
var BHI=[],BHraf=0,BHt0=0,BHR0=46;
function bhEase(x){return x<=0?0:x>=1?1:x*x*(3-2*x);}
function bhBack(x){x=Math.max(0,Math.min(1,x));var c=1.4;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2);}
function bhCollect(){
 BHI=[];var hx=BH.x,hy=BH.y,mx=1;
 var add=function(el,css){if(!el)return;var r=el.getBoundingClientRect();if(r.width<1||(css&&(r.bottom<0||r.top>VH))||r.right<-VW*1.4||r.left>VW*2.4)return;   /* віджети сторінок беремо всі, навіть поза екраном (прокручені) */var bx=r.left+r.width/2,by=r.top+r.height/2,d=Math.hypot(bx-hx,by-hy);mx=Math.max(mx,d);
  var st0=el.style;BHI.push({el:el,css:css,nb:!css&&BH.pg.some(function(j){return inn[j].contains(el);}),bx:bx,by:by,d:d,a0:Math.atan2(by-hy,bx-hx),o0:{opacity:st0.opacity,visibility:st0.visibility,transformOrigin:st0.transformOrigin}});if(css){el.style.transformOrigin=(hx-r.left).toFixed(1)+'px '+(hy-r.top).toFixed(1)+'px';}};
 /* сторінка й сусідні вкладки (ліва/права серед головних трьох; якщо сусіда немає — лише наявний) */
 BH.pg=[];if(sel<=2){for(var j=0;j<=2;j++)if(j!==sel)BH.pg.push(j);}
 BH.po=BH.pg.length?.34:1;
 BH.pg.forEach(function(j){pg[j].style.visibility='visible';pg[j].style.transform='translate3d('+((j-sel)*BH.po*100)+'%,0,0)';});
 [sel].concat(BH.pg).forEach(function(j){[].forEach.call(inn[j].children,function(el){if(!el.classList.contains('egg'))add(el,0);});});   /* крапля лишається */
 add(tickerEl,1);add(document.getElementById('dock'),1);add(cv,1);
 /* док і його скло на полотні мають рухатись разом: однакова затримка */
 var dk=BHI.find(function(i){return i.el.id==='dock';});
 BHI.forEach(function(i){i.dl=.25+1.7*(i.d/mx)+(i.nb?.12:0);if(i.el===cv&&dk)i.dl=dk.dl;});
}
function bhApply(i,e,fade){   /* e: 0 — на місці, 1 — у діру (e вже прискорений) */
 var s=Math.max(.001,Math.pow(1-e,1.2)),op=(1-bhEase((e-.8)/.2))*(fade==null?1:fade);
 if(i.css){var sx=s*(1+1.3*e),sy=s*(1-.35*e);i.el.style.scale=sx.toFixed(4)+' '+sy.toFixed(4);i.el.style.rotate=(Math.pow(e,1.5)*420).toFixed(2)+'deg';i.el.style.opacity=op.toFixed(3);return;}
 var rr=Math.pow(1-e,1.15),th=1.7*(1/(rr+.09)-1/1.09)+1.1*e,ph=i.a0+th;
 var dx=BH.x+Math.cos(ph)*i.d*rr-i.bx,dy=BH.y+Math.sin(ph)*i.d*rr-i.by;
 var st=1+2.6*Math.pow(e,1.1),sr=1-.62*e,sn=Math.abs(Math.sin(ph)),cs=Math.abs(Math.cos(ph)),jx=sr+(st-sr)*sn,jy=sr+(st-sr)*cs;   /* витяг вздовж орбіти */
 i.el._ps={s:s,jx:jx,jy:jy,dx:dx,dy:dy};i.el.style.scale=(s*jx).toFixed(4)+' '+(s*jy).toFixed(4);i.el.style.translate=dx.toFixed(2)+'px '+dy.toFixed(2)+'px';i.el.style.opacity=op.toFixed(3);
}
function bhClear(){BHI.forEach(function(i){var st=i.el.style;st.scale='';st.translate='';st.rotate='';st.opacity=i.o0.opacity;st.visibility=i.o0.visibility;st.transformOrigin=i.o0.transformOrigin;if(!i.css)i.el._ps=null;});BHI=[];}   /* повертаємо власні стилі рушія (напр. opacity полотна) */
function bhStep(t){
 BHraf=0;var u=(t-BHt0)/1000,sig=0;
 if(BH.ph===1){                      /* всмоктування */
  var gr=bhEase(u/.6);BH.r=BHR0*gr;BH.k=gr;
  var eat=0;BHI.forEach(function(i){var e=Math.pow(Math.max(0,Math.min(1,(u-i.dl)/2.7)),2.5);bhApply(i,e,i.nb?bhEase(u/.35):null);sig+=e;if(e>=1)eat++;});
  BH.r=BHR0*(.88+.3*eat/Math.max(1,BHI.length))*gr;
  BH.au=1-bhEase((u-2.6)/1.4);
  if(u>5.5){var sh=bhEase((u-5.5)/.8);BH.r=BHR0*1.18*(1-sh);BH.k=1-sh;}
  if(u>=6.3){BH.ph=3;BH.r=0;BH.k=0;BH.au=0;hide=1;
   BHI.forEach(function(i){if(i.el===cv){var st=cv.style;st.scale='';st.rotate='';st.opacity=i.o0.opacity;st.visibility=i.o0.visibility;}else i.el.style.visibility='hidden';});
   gxShowBtn(1);bhEggShow(1);LG('egg','чорна діра: усе всмоктано — пауза (хвилі, крапля, лінза; подвійний тап — повернути)');}
 }else if(BH.ph===2){               /* вилітання назад */
  var g2=bhEase(u/.35);BH.r=BHR0*g2;BH.k=g2;
  BHI.forEach(function(i){var p=(u-.3-i.dl*.45)/1.0;if(p>0)i.el.style.visibility=i.o0.visibility;bhApply(i,p<=0?1:1-bhBack(p),i.nb?(1-bhEase((u-1.2)/.4)):null);sig+=p;});
  BH.au=bhEase((u-.8)/.8);
  if(u>1.5){var s2=bhEase((u-1.5)/.5);BH.r=BHR0*(1-s2);BH.k=1-s2;}
  if(u>=2.4){BH.ph=0;BH.r=0;BH.k=0;BH.au=1;bhClear();BH.pg.forEach(function(j){pstyle[j]=null;});BH.pg=[];BH.po=1;tlAll();LG('egg','чорна діра: усе повернулось');}
 }
 PRSIG='bh'+sig.toFixed(3)+BH.r.toFixed(2);dirty=true;
 if(BH.ph===1||BH.ph===2)BHraf=requestAnimationFrame(bhStep);
}
function bhStart(){
 if(BH.ph)return;BH.x=VW/2;BH.y=VH*.46;BH.r=0;BH.k=0;BH.au=1;
 lensClearAll();
 bhCollect();BH.ph=1;BHt0=performance.now();LG('egg','чорна діра: всмоктування ('+BHI.length+' елементів)');BHraf=requestAnimationFrame(bhStep);
}
window.__bhDemo=function(){if(BH.ph===3)bhBackOut();else bhStart();};   /* тестовий виклик для перевірки в браузері */
function bhEggShow(on){var eg=inn[sel]&&inn[sel].querySelector('.egg');if(!eg)return;
 if(!on){eg.style.translate='';return;}var r=eg.getBoundingClientRect();eg.style.translate='0 '+((VH-170)-(r.top+r.height/2)).toFixed(1)+'px';}   /* крапля поточної сторінки — над низом екрана */
function bhBackOut(){gxShowBtn(0);bhEggShow(0);hide=0;var ci=BHI.find(function(i){return i.el===cv;});if(ci)bhApply(ci,1);lensClearAll();BH.ph=2;BHt0=performance.now();LG('egg','чорна діра: вилітання');BHraf=requestAnimationFrame(bhStep);}
/* поки діра працює, інтерфейс не реагує; коли все всмоктано — будь-який тап повертає */
var BHdt={t:0,x:0,y:0};
function bhOnLens(e){return !!lensHit(e);}
window.addEventListener('pointerdown',function(e){if(BH.ph!==3||GX.on)return;if((e.target.closest&&e.target.closest('.eggd,.gxb,#gxmodes,#gal'))||bhOnLens(e))return;
 var now=performance.now();if(now-BHdt.t<330&&Math.hypot(e.clientX-BHdt.x,e.clientY-BHdt.y)<40){BHdt.t=0;bhBackOut();e.stopPropagation();return;}BHdt.t=now;BHdt.x=e.clientX;BHdt.y=e.clientY;},true);
['pointerdown','pointermove','pointerup','touchstart','touchmove'].forEach(function(n){document.addEventListener(n,function(e){if(BH.ph!==3)return;if(e.target.closest&&e.target.closest('.eggd,.gxb,#gxmodes,#gal'))return;e.stopPropagation();},true);});   /* у паузі сторінка не гортається й вкладки не перемикаються */
['pointerdown','click','touchstart'].forEach(function(n){window.addEventListener(n,function(e){if(!BH.ph||BH.ph===3)return;e.stopPropagation();if(e.cancelable)e.preventDefault();},{capture:true,passive:false});});
/* активація: 13 тапів підряд по скляній лінзі (пауза між тапами до 0.8 с); лічильник — у lensTap (engine.js) */
var BHtap={n:0,t:0};
function lensTap(){if(BH.ph)return false;var now=performance.now();BHtap.n=now-BHtap.t<800?BHtap.n+1:1;BHtap.t=now;
 if(BHtap.n>=13){BHtap.n=0;LG('egg','13 тапів по лінзі');bhStart();return true;}return false;}

/* ---------- накопичення хвилі: утримання пальця на фоні (без руху) стягує сітку; при відпусканні — велика м'яка хвиля ---------- */
(function(){var t0=0,raf=0,hapT=0,hapEl=null;
 /* тактильна віддача, що наростає: Android — navigator.vibrate; iPhone 17.4+ — клік по прихованому перемикачу <input type=checkbox switch> (спроба, залежить від версії iOS) */
 function buzz(s){
  try{if(navigator.vibrate){navigator.vibrate(Math.round(5+s*22));return;}}catch(e){}
  try{if(!hapEl){var l=document.createElement('label');l.style.cssText='position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none';var i=document.createElement('input');i.type='checkbox';i.setAttribute('switch','');l.appendChild(i);document.body.appendChild(l);hapEl=l;}hapEl.click();}catch(e){}
 }
 var rraf=0,rs0=0,rt0=0;
 function relStep(){rraf=0;var tt=(performance.now()-rt0)/1000;if(tt>.9||CH.on){CH.rel=0;if(!CH.on)CH.s=0;dirty=true;return;}
  CH.s=rs0*Math.exp(-5.2*tt)*Math.cos(12.5*tt);dirty=true;rraf=requestAnimationFrame(relStep);}
 function relStart(s){rs0=s;rt0=performance.now();CH.rel=1;CH.s=s;if(!rraf)rraf=requestAnimationFrame(relStep);}
 function chStep(){raf=0;if(!CH.on)return;var now=performance.now(),h=(now-t0)/1000;
  CH.s=h<.2?0:Math.min(1,(h-.2)/1.5);
  if(CH.drag){CH.x+=(CH.tx-CH.x)*.28;CH.y+=(CH.ty-CH.y)*.28;}   /* стягнута точка тягнеться за пальцем із легким запізненням */
  if(CH.s>.02&&now>hapT){buzz(CH.s);hapT=now+Math.max(38,230-190*CH.s);}   /* частота росте разом із зарядом */
  dirty=true;raf=requestAnimationFrame(chStep);}
 document.addEventListener('pointerdown',function(e){
  if(GX.on||(BH.ph&&BH.ph!==3)||!FGS.tw||WF.drag)return;var tg=e.target;
  if(tg.closest&&tg.closest('input,textarea,select,#dock,#ticker,.eggd,.gxb,#gxmodes,#gal,#wfh'))return;
  CH.rel=0;CH.on=1;CH.drag=0;CH.x=CH.tx=e.clientX;CH.y=CH.ty=e.clientY;CH.s=0;t0=performance.now();hapT=0;if(!raf)raf=requestAnimationFrame(chStep);},true);
 document.addEventListener('pointermove',function(e){if(!CH.on)return;
  CH.tx=e.clientX;CH.ty=e.clientY;CH.drag=1;},true);   /* точка стягування завжди йде за пальцем */
  ['pointerup','pointercancel'].forEach(function(n){document.addEventListener(n,function(e){if(!CH.on)return;var s=CH.s,x=n==='pointerup'?e.clientX:CH.x,y=n==='pointerup'?e.clientY:CH.y;CH.on=0;CH.drag=0;dirty=true;
  if(n!=='pointerup'||s<=.05){CH.s=0;return;}
  CH.x=x;CH.y=y;relStart(s);   /* відпускання стартує з тієї ж деформації: стягнуте плавно відскакує в хвилю */
  if(n==='pointerup'&&s>.05){rippleAdd(x,y,1+8*s);try{if(navigator.vibrate)navigator.vibrate(30);}catch(e2){}LG('egg','накопичена хвиля '+Math.round(s*100)+'%'+(CH.tx!==x?' (перетягнута)':''));}},true);});
})();

/* ---------- віджет, що від'єднується: довгий тап по віджету — його можна тягнути й кидати (невагомість, відскок від країв, желе);
   поки від'єднаний, його кнопки неактивні; подвійний тап — повертається на місце ---------- */
var WFL=[],WFraf=0,WFlast=0,WFcur=null;
/* ---- розкладка віджетів: ширина в колонках (1–4), мінімальна висота й порядок — на пристрої (localStorage), не у фінансових даних ---- */
var WL=(function(){try{return JSON.parse(localStorage.getItem('vf-widgets')||'{}')||{};}catch(e){return{};}})();
function wlSave(){try{localStorage.setItem('vf-widgets',JSON.stringify(WL));}catch(e){}}
function wlKey(el){var hh=el.querySelector('h2,.lbl,.mh,.big'),tx=((hh&&hh.textContent)||'').trim().slice(0,28)||el.className;return[].indexOf.call(inn,el.parentNode)+':'+tx;}
function wuUnit(n){n=n||4;return Math.max(24,(VW-32-(n-1)*12)/n);}   /* висота й ширина одноколонкового віджета: мінімальна висота всіх віджетів */
function wlApply(i){var host=inn[i];if(!host||(i>2&&i!==9)||!WL)return;var NC=i===9?FLD.cols:4,WU=wuUnit(NC);host._wu=WU;host.style.setProperty('--wu',WU.toFixed(1)+'px');var ch=host.children,chg=false,k;
 for(k=0;k<ch.length;k++){var el=ch[k],tile=el.classList.contains('tile'),dd=tile?WL[wlKey(el)]:null;
  var ds=(dd&&dd.s)?dd.s:(el.classList.contains('ws1')?1:el.classList.contains('ws2')?2:4),gc=ds<4||NC!==4?'span '+Math.max(1,Math.min(NC,Math.round(ds*NC/4))):'',mh=(dd&&dd.h)?dd.h+'px':'',od=String((dd&&dd.o!=null)?dd.o:k*10);
  if(el._gc!==gc||el._mh!==mh||el._od!==od||el._nc!==NC){el._nc=NC;el._gc=gc;el._mh=mh;el._od=od;el.classList.toggle('cmp',!!(dd&&dd.h&&dd.h<=WU*1.35)||(NC>5&&!el.classList.contains('acw')));el.style.gridColumn=gc;if(el.classList.contains('acw'))el.style.aspectRatio=ds===1?'1':'auto';el.style.minHeight=mh;el.style.order=od;chg=true;}}
 if(chg){needSync[i]=1;tlStale[i]=1;dirty=true;}try{wgFill();}catch(e){}}
for(var wli=0;wli<3;wli++)wlApply(wli);
/* м'яке опускання віджета в сітку: стає на місце найближчого, решта розсуваються */
function wfSlot(w){
 var el=w.el,host=el.parentNode,pi=[].indexOf.call(inn,host);if(pi<0||(pi>2&&pi!==9))return false;
 var tiles=[].filter.call(host.children,function(x){return x.classList.contains('tile');}),r0=el.getBoundingClientRect(),cx=r0.left+r0.width/2,cy=r0.top+r0.height/2;
 var best=null,bd=1e9;tiles.forEach(function(x){if(x===el)return;var r=x.getBoundingClientRect(),dd=Math.hypot(r.left+r.width/2-cx,r.top+r.height/2-cy);if(dd<bd){bd=dd;best=x;}});
 if(!best)return false;
 var ord=tiles.slice().sort(function(m,n){return(+m.style.order||0)-(+n.style.order||0);}),slots=ord.map(function(x){return+x.style.order||0;});
 ord.splice(ord.indexOf(el),1);var bi=ord.indexOf(best),rb=best.getBoundingClientRect(),after=cy>rb.top+rb.height/2||(Math.abs(cy-(rb.top+rb.height/2))<rb.height/3&&cx>rb.left+rb.width/2);
 ord.splice(bi+(after?1:0),0,el);
 ord.forEach(function(x,k){x.style.order=String(slots[k]);x._od=String(slots[k]);var key=wlKey(x);WL[key]=Object.assign(WL[key]||{},{o:slots[k]});});
 wlSave();needSync[pi]=1;tlStale[pi]=1;
 var r1=el.getBoundingClientRect();w.dx+=(r0.left+r0.width/2)-(r1.left+r1.width/2);w.dy+=(r0.top+r0.height/2)-(r1.top+r1.height/2);   /* візуально лишається там, де відпустили, й пружиною їде в нове місце */
 return true;
}
/* ручка зміни розміру: скляна кнопка шейдера на куті віджета, що літає */
var WRH=null,WRZ=null;
function wrhEnsure(){
 if(WRH)return WRH;var d=document.createElement('div');d.id='wfh';d.setAttribute('aria-label','Змінити розмір');
 d.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M10 19 19 10M15 19l4-4"/></svg>';document.body.appendChild(d);WRH=d;
 d.addEventListener('pointerdown',function(e){var w=WFcur;if(!w)return;e.stopPropagation();e.preventDefault();try{d.setPointerCapture(e.pointerId);}catch(_){}
  var host=w.el.parentNode,cs=getComputedStyle(host);WRZ={w:w,id:e.pointerId,x0:e.clientX,y0:e.clientY,w0:w.el.offsetWidth,h0:w.el.offsetHeight,iw:host.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),pi:[].indexOf.call(inn,host)};});
 d.addEventListener('pointermove',function(e){var Z=WRZ;if(!Z||e.pointerId!==Z.id)return;e.preventDefault();
  var NC=Z.pi===9?FLD.cols:4,cell=(Z.iw-(NC-1)*12)/NC,span=Math.max(1,Math.min(NC,Math.round((Z.w0+e.clientX-Z.x0+12)/(cell+12)))),h=Math.max(wuUnit(NC),Math.round(Z.h0+e.clientY-Z.y0)),key=wlKey(Z.w.el);
  WL[key]=Object.assign(WL[key]||{},{s:Math.max(1,Math.min(4,Math.round(span*4/NC))),h:h});wlApply(Z.pi);wfKick();});
 ['pointerup','pointercancel'].forEach(function(n){d.addEventListener(n,function(e){if(!WRZ||e.pointerId!==WRZ.id)return;WRZ=null;wlSave();LG('egg','розмір віджета збережено');});});
 return d;
}
var WAD=null;
function wadEnsure(){if(WAD)return WAD;var d=document.createElement('button');d.id='wfadd';d.setAttribute('aria-label','Додати');d.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';document.body.appendChild(d);WAD=d;d.addEventListener('click',function(e){e.stopPropagation();wgAddMenu(d);});d.addEventListener('pointerdown',function(e){e.stopPropagation();});return d;}
function wrhPlace(){
 if(!WFL.length||!WFcur||WFL.indexOf(WFcur)<0){if(WRH&&WRH.style.display!=='none'){WRH.style.display='none';if(WAD)WAD.style.display='none';if(!GX.on)fbSet([]);}return;}
 var d=wrhEnsure(),a=wadEnsure(),r=WFcur.el.getBoundingClientRect();d.style.display='flex';d.style.left=Math.min(VW-40,Math.max(4,r.right-34))+'px';d.style.top=Math.min(VH-40,Math.max(4,r.bottom-34))+'px';
 a.style.display='flex';a.style.left=((DKP.side==='l'?DKV+DKMV+16:16))+'px';a.style.top=(DKP.side==='b'?DR.top-62:VH-66)+'px';
 if(!GX.on)fbSet([{el:d,a:1,rad:.5},{el:a,a:1,rad:1}]);
}
function wfFind(t){for(var i=0;i<WFL.length;i++)if(WFL[i].el.contains(t))return WFL[i];return null;}
function wfDetach(el,x,y){
 CH.on=0;CH.s=0;CH.drag=0;CH.rel=0;dirty=true;   /* заряд від утримання на віджеті скасовується: pointerup відкріпленого віджета до нього не доходить */
 if(PRS.has(el)){PRS.delete(el);el.style.scale='';el.style.translate='';}   /* анімація натискання більше не керує цим віджетом */
 var w=wfFind(el);if(!w){w={el:el,dx:0,dy:0,vx:0,vy:0,ex:0,ey:0,evx:0,evy:0,home:0,taps:0,lt:0};WFL.push(w);
  w.z=el.style.zIndex;w.pos=el.style.position;el.style.position='relative';el.style.zIndex='6';el.classList.add('wfd');LG('egg','віджет від\'єднано');}
 WFcur=w;WF.drag={w:w,x0:x,y0:y,dx0:w.dx,dy0:w.dy,lx:x,ly:y,lt:performance.now(),mv:0};w.vx=w.vy=0;w.evx-=1.5;w.evy-=1.5;wfKick();
}
/* віджети, над якими висить від'єднаний, притлумлюються; прямокутники від'єднаних — для шару скла */
function wfUnder(){
 WF.rects=WFL.map(function(w){var r=w.el.getBoundingClientRect();return[r.left,r.top,r.right,r.bottom];});
 [].forEach.call(inn[sel]?inn[sel].children:[],function(b){if(b.classList.contains('wfd'))return;var r=b.getBoundingClientRect();
  var ov=WF.rects.some(function(q){var ix=Math.min(r.right,q[2])-Math.max(r.left,q[0]),iy=Math.min(r.bottom,q[3])-Math.max(r.top,q[1]);return ix>20&&iy>20;});
  b.classList.toggle('wfu',ov);});
}
function wfAttach(w){var el=w.el,st=el.style;st.translate='';st.scale='';st.zIndex=w.z;st.position=w.pos;el._ps=null;el.classList.remove('wfd');WFL.splice(WFL.indexOf(w),1);wfUnder();WF.n=WFL.length;LG('egg','віджет повернувся');}
function wfKick(){if(!WFraf){WFlast=performance.now();WFraf=requestAnimationFrame(wfStep);}}
function wfStep(t){
 WFraf=0;var dt=Math.min(.033,Math.max(.001,(t-WFlast)/1000)),sig=0,mv=0;WFlast=t;
 WFL.slice().forEach(function(w){
  var el=w.el,r=el.getBoundingClientRect(),hcx=r.left+r.width/2-w.dx,hcy=r.top+r.height/2-w.dy,hw=el.offsetWidth/2,hh=el.offsetHeight/2,n=3,h=dt/n;
  for(var k=0;k<n;k++){
   var dr=WF.drag&&WF.drag.w===w;
   if(w.home){w.vx+=(-140*w.dx-18*w.vx)*h;w.vy+=(-140*w.dy-18*w.vy)*h;w.dx+=w.vx*h;w.dy+=w.vy*h;}
   else if(!dr){var fr=Math.exp(-h*.3);w.vx*=fr;w.vy*=fr;w.dx+=w.vx*h;w.dy+=w.vy*h;
    var cx=hcx+w.dx,cy=hcy+w.dy;
    if(cx-hw<0&&w.vx<0||cx+hw>VW&&w.vx>0){if(cx-hw<0)w.dx+=hw-cx;else w.dx-=cx+hw-VW;var vn=Math.abs(w.vx);w.vx=-w.vx*.82;w.evx-=Math.min(5,vn*.004);w.evy+=Math.min(3,vn*.002);}
    if(cy-hh<0&&w.vy<0||cy+hh>VH&&w.vy>0){if(cy-hh<0)w.dy+=hh-cy;else w.dy-=cy+hh-VH;var vn2=Math.abs(w.vy);w.vy=-w.vy*.82;w.evy-=Math.min(5,vn2*.004);w.evx+=Math.min(3,vn2*.002);}}
   /* желе: розтяг уздовж переважного напрямку руху + пружини з малим згасанням */
   var sp=Math.hypot(w.vx,w.vy),tx=0,ty=0;if(sp>40){var st=Math.min(.07,sp*.00004);if(Math.abs(w.vx)>Math.abs(w.vy)){tx=st;ty=-st*.5;}else{ty=st;tx=-st*.5;}}
   w.evx+=(-300*(w.ex-tx)-7*w.evx)*h;w.ex+=w.evx*h;w.evy+=(-300*(w.ey-ty)-7*w.evy)*h;w.ey+=w.evy*h;
   w.ex=Math.max(-.22,Math.min(.22,w.ex));w.ey=Math.max(-.22,Math.min(.22,w.ey));
  }
  var jx=1+w.ex-w.ey*.4,jy=1+w.ey-w.ex*.4;
  el._ps={s:1,jx:jx,jy:jy,dx:w.dx,dy:w.dy};el.style.translate=w.dx.toFixed(2)+'px '+w.dy.toFixed(2)+'px';el.style.scale=jx.toFixed(4)+' '+jy.toFixed(4);
  sig+=w.dx*.01+w.dy*.013+jx+jy;
  var moving=(WF.drag&&WF.drag.w===w)||Math.abs(w.vx)+Math.abs(w.vy)>.6||Math.abs(w.ex)+Math.abs(w.ey)+Math.abs(w.evx)*.02+Math.abs(w.evy)*.02>.002;
  if(w.home&&Math.abs(w.dx)+Math.abs(w.dy)<.4&&Math.abs(w.vx)+Math.abs(w.vy)<3&&Math.abs(w.ex)+Math.abs(w.ey)<.003){wfAttach(w);return;}
  if(!moving){w.vx=w.vy=0;}else mv=1;
 });
 WF.n=WFL.length;WF.mv=mv;wfUnder();wrhPlace();PRSIG='wf'+sig.toFixed(3)+(WRZ?'z':'');dirty=true;
 if(mv)WFraf=requestAnimationFrame(wfStep);
}
(function(){
 var tm=0,dn=null;
 /* довгий тап по віджету (крім рядків операцій/боргів і шаблонів — у них своє меню) */
 root.addEventListener('pointerdown',function(e){
  if(BH.ph||wfFind(e.target))return;var tg=e.target;
  if(tg.closest('[data-act=tx],[data-act=dperson],[data-act=dedit],[data-act=tpl],input,textarea,select,.eggd'))return;
  var b=tg.closest('.tile,.srch');if(!b||!b.parentNode||[].indexOf.call(inn,b.parentNode)<0)return;
  dn={b:b,x:e.clientX,y:e.clientY};clearTimeout(tm);
  tm=setTimeout(function(){if(!dn)return;var d=dn;dn=null;WF.sup=1;setTimeout(function(){WF.sup=0;},600);wfDetach(d.b,d.x,d.y);},520);});
 root.addEventListener('pointermove',function(e){if(dn&&Math.hypot(e.clientX-dn.x,e.clientY-dn.y)>8){clearTimeout(tm);dn=null;}});
 ['pointerup','pointercancel'].forEach(function(n){root.addEventListener(n,function(){clearTimeout(tm);dn=null;});});
 /* жести на від'єднаному віджеті: перетягування, кидок, подвійний тап; кнопки всередині неактивні */
 window.addEventListener('pointerdown',function(e){if(BH.ph)return;var w=wfFind(e.target);if(!w)return;e.stopPropagation();if(e.cancelable)e.preventDefault();
  var now=performance.now();if(now-w.lt<320&&Math.hypot(e.clientX-w.lx,e.clientY-w.ly)<30){w.home=1;w.lt=0;WF.drag=null;LG('egg','подвійний тап — віджет додому');wfKick();return;}
  WFcur=w;w.lt=now;w.lx=e.clientX;w.ly=e.clientY;w.home=0;WF.drag={w:w,x0:e.clientX,y0:e.clientY,dx0:w.dx,dy0:w.dy,lx:e.clientX,ly:e.clientY,lt:now,mv:0};w.vx=w.vy=0;wfKick();},true);
 window.addEventListener('pointermove',function(e){var D=WF.drag;if(!D)return;e.stopPropagation();if(e.cancelable)e.preventDefault();
  var now=performance.now(),w=D.w,dtm=Math.max(1,now-D.lt)/1000,k=Math.min(1,dtm*18);
  w.vx+=((e.clientX-D.lx)/dtm-w.vx)*k;w.vy+=((e.clientY-D.ly)/dtm-w.vy)*k;D.mv+=Math.abs(e.clientX-D.lx)+Math.abs(e.clientY-D.ly);D.lx=e.clientX;D.ly=e.clientY;D.lt=now;
  w.dx=D.dx0+e.clientX-D.x0;w.dy=D.dy0+e.clientY-D.y0;wfKick();},true);
 ['pointerup','pointercancel'].forEach(function(n){window.addEventListener(n,function(e){var D=WF.drag;if(!D)return;e.stopPropagation();WF.drag=null;var w=D.w;
  if(performance.now()-D.lt>90){w.vx*=.2;w.vy*=.2;}var sp=Math.hypot(w.vx,w.vy);if(sp>3000){w.vx*=3000/sp;w.vy*=3000/sp;}
  if(D.mv<6){w.evx-=1.2;w.evy+=1.2;}
  else if(sp<160){try{if(wfSlot(w)){w.home=1;w.vx=w.vy=0;LG('egg','віджет опущено в сітку');}}catch(err){console.error(err);}}   /* повільне відпускання — стає в сітку; кидок — летить */
  wfKick();},true);});
 window.addEventListener('click',function(e){if(WF.sup||wfFind(e.target)){e.stopPropagation();e.preventDefault();}},true);
 ['touchstart','touchmove'].forEach(function(n){window.addEventListener(n,function(e){var t=e.touches[0];if(!t)return;if(WF.drag||(n==='touchstart'&&wfFind(e.target))){if(e.cancelable)e.preventDefault();e.stopPropagation();}},{capture:true,passive:false});});
})();

/* ---------- мінігра «Успіх»: несправжня біржа, угоди завжди в плюс ----------
   Баланс гри випадковий (4 725–99 999 $) при кожному відкритті і живе лише в пам'яті цього вікна:
   жодних викликів finance-core, нічого не зберігається, з балансом застосунку не пов'язаний. */
var GM=null;
function gmFmt(v,d){var a=Math.abs(v),s=a>=1e12?(a/1e12).toFixed(2)+' трлн':a>=1e9?(a/1e9).toFixed(2)+' млрд':a>=1e6?(a/1e6).toFixed(2)+' млн':a.toLocaleString('uk-UA',{minimumFractionDigits:d==null?2:d,maximumFractionDigits:d==null?2:d});return(v<0?'−':'')+s;}
function gmPairs(){var c=VF.marketCatalog(),by={};c.forEach(function(m){by[m.id]=m;});var ids=(MK.selection||[]).filter(function(id){return by[id];});if(!ids.length)ids=c.slice(0,6).map(function(m){return m.id;});
 return ids.map(function(id){var d=MK.data[id];return{id:id,label:by[id].label,px:d&&isFinite(d.value)&&d.value>0?d.value:null};});}
function gmHtml(){
 var ps=gmPairs();
 return'<div class="sh"><span style="min-width:70px"></span><h3>Успіх ↗</h3><button class="ok" data-s="cancel">Закрити</button></div><div class="gm">'+
  '<div class="gmhd"><div><div class="lbl">Баланс гри · не ваші гроші</div><div class="gmbal" id="gmBal">—</div></div><div class="gmpnl" id="gmPnl"></div></div>'+
  '<div class="gmrow"><select id="gmPair">'+ps.map(function(p){return'<option value="'+esc(p.id)+'">'+esc(p.label)+'</option>';}).join('')+'</select><b id="gmPx">—</b></div>'+
  '<div class="gmrow gmtf">'+['1м','5м','15м','1г'].map(function(t,i){return'<button class="chip'+(i===0?' on':'')+'" data-gtf="'+[1,5,15,60][i]+'">'+t+'</button>';}).join('')+'</div><div class="gmrow"><button class="chip on" data-gmode="line">Лінія</button><button class="chip" data-gmode="candle">Свічки</button></div>'+
  '<canvas id="gmCv"></canvas>'+
  '<div class="gmrow"><span class="lbl">Сума</span>'+[10,25,50,100].map(function(p){return'<button class="chip'+(p===25?' on':'')+'" data-gamt="'+p+'">'+p+'%</button>';}).join('')+'</div>'+
  '<div class="gmrow"><span class="lbl">Плече</span>'+[10,50,100].map(function(l){return'<button class="chip'+(l===50?' on':'')+'" data-glev="'+l+'">×'+l+'</button>';}).join('')+'</div>'+
  '<div class="cwr"><button class="btnw gmlong" data-gm="long">Лонг ↑</button><button class="btnw dng" data-gm="short">Шорт ↓</button></div>'+
  '<div class="gmpos" id="gmPos"></div>'+
  '<div class="mkinfo" style="padding:14px 0 4px">Останні операції</div><div id="gmOps"><div class="empty">Ще жодної угоди. Тут завжди тільки плюс.</div></div>'+
 '</div>';
}
/* історія: хвилинні свічки випадковим блуканням, що закінчуються на справжній поточній ціні */
function gmHistory(px){var n=2880,c=[],p=px,i;var walk=[p];for(i=0;i<n;i++){p=p/(1+(Math.random()-.5)*.0028);walk.push(p);}walk.reverse();
 for(i=0;i<n;i++){var o=walk[i],cl=walk[i+1],h=Math.max(o,cl)*(1+Math.random()*.0009),l=Math.min(o,cl)*(1-Math.random()*.0009);c.push({o:o,h:h,l:l,c:cl});}return c;}
function gmSetPair(id){var p=gmPairs().find(function(q){return q.id===id;})||gmPairs()[0];if(!p)return;
 var px=p.px||({btc:65000,eth:3200}[String(p.id).toLowerCase().split(/[^a-z]/)[0]]||100);
 GM.pid=p.id;GM.label=p.label;GM.c=gmHistory(px);GM.sub=0;GM.pos=null;GM.real=!!p.px;}
function gmMount(){
 var tries=0;(function wait(){var cv=document.getElementById('gmCv');if(!cv){if(++tries<60)requestAnimationFrame(wait);return;}
  GM={bal:Math.round((4725+Math.random()*(99999-4725))*100)/100,tf:1,mode:'line',amt:25,lev:50,ops:[],pos:null,dirty:1};
  gmSetPair(document.getElementById('gmPair').value);LG('egg','мінігра «Успіх»: баланс гри '+GM.bal+' $');
  clearInterval(gmMount.iv);gmMount.iv=setInterval(gmTick,100);gmDraw();gmUi();})();
}
/* шлях угоди: напрям завжди правильний (лонг вгору, шорт вниз), але висота, тривалість, форма й шум щоразу випадкові —
   то крихітна свічка, то середня, то раптовий великий пробій; всередині шляху бувають відкати, кінець завжди в плюс */
function gmPath(){
 var r=Math.random(),mag,N;
 if(r<.14){mag=.012+Math.random()*.045;N=8+((Math.random()*10)|0);}          /* великий пробій */
 else if(r<.46){mag=.0005+Math.random()*.0013;N=18+((Math.random()*30)|0);}  /* крихітний рух */
 else{mag=.0019+Math.random()*.0065;N=22+((Math.random()*46)|0);}            /* середній */
 var ease=.4+Math.random()*2,amp=mag*(.25+Math.random()*.8),W=[0],s=0,i,p=[];
 for(i=1;i<=N;i++){s+=(Math.random()+Math.random()-1)*2;W.push(s);}
 var t0=.12+Math.random()*.7,w=.05+Math.random()*.12,A=mag*(Math.random()<.55?1:-.7)*Math.random()*.9;
 for(i=0;i<=N;i++){var t=i/N;p.push(mag*Math.pow(t,ease)+amp*1.7*(W[i]-t*W[N])/Math.sqrt(N)+A*Math.exp(-Math.pow((t-t0)/w,2))*(1-t));}
 p[0]=0;p[N]=mag;return{p:p,N:N,mag:mag};
}
function gmTick(){
 var cv=document.getElementById('gmCv');if(!cv||!GM){clearInterval(gmMount.iv);GM=null;return;}
 var last=GM.c[GM.c.length-1],p=last.c,P=GM.pos,np;
 if(P){
  if(P.k<=P.path.N){np=P.entry*(1+P.dir*P.path.p[P.k])*(1+(Math.random()-.5)*.00014);P.k++;}
  else{np=P.entry*(1+P.dir*P.path.mag);var pnl=P.stake*P.lev*P.path.mag;GM.bal+=pnl;
   GM.ops.unshift({side:P.dir>0?'LONG':'SHORT',pair:GM.label,lev:P.lev,stake:P.stake,pnl:pnl,mag:P.path.mag});if(GM.ops.length>30)GM.ops.pop();GM.pos=null;
   LG('egg','«Успіх»: '+(P.dir>0?'лонг':'шорт')+' ×'+P.lev+' рух '+(P.path.mag*100).toFixed(2)+'% +'+Math.round(pnl)+' $');}
 }else{var z=(Math.random()+Math.random()+Math.random()-1.5)*2;np=p*(1+z*.00042*(Math.random()<.05?3.5:1));}
 np=Math.max(p*.5,np);
 GM.sub++;if(GM.sub>=10){GM.sub=0;GM.c.push({o:np,h:np,l:np,c:np});if(GM.c.length>4000)GM.c.shift();}
 else{last.c=np;last.h=Math.max(last.h,np);last.l=Math.min(last.l,np);}
 gmDraw();gmUi();
}
function gmCandles(){var k=GM.tf,src=GM.c,out=[],st=src.length%k;for(var i=st;i<src.length;i+=k){var g=src.slice(i,i+k);if(!g.length)continue;
 out.push({o:g[0].o,c:g[g.length-1].c,h:Math.max.apply(null,g.map(function(q){return q.h;})),l:Math.min.apply(null,g.map(function(q){return q.l;}))});}return out.slice(-48);}
function gmDraw(){
 var cv=document.getElementById('gmCv');if(!cv)return;var w=cv.clientWidth||300,h=cv.clientHeight||220,dpr=Math.min(3,window.devicePixelRatio||1);
 if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}
 var x=cv.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);
 var cs=gmCandles();if(cs.length<2)return;var lo=Infinity,hi=-Infinity;cs.forEach(function(q){lo=Math.min(lo,q.l);hi=Math.max(hi,q.h);});if(GM.pos){lo=Math.min(lo,GM.pos.entry);hi=Math.max(hi,GM.pos.entry);}
 var pad=(hi-lo)*.12||1;lo-=pad;hi+=pad;var R=56,cw=(w-R)/cs.length,Y=function(v){return 8+(h-16)*(1-(v-lo)/(hi-lo));};
 x.strokeStyle='rgba(255,255,255,.06)';x.lineWidth=1;for(var g=1;g<4;g++){x.beginPath();x.moveTo(0,h*g/4);x.lineTo(w-R,h*g/4);x.stroke();}
 var up=cs[cs.length-1].c>=cs[0].o,col=up?'#66d896':'#ff7d83';
 if(GM.mode==='candle'){cs.forEach(function(q,i){var cx=i*cw+cw/2,g2=q.c>=q.o;x.strokeStyle=x.fillStyle=g2?'#66d896':'#ff7d83';x.beginPath();x.moveTo(cx,Y(q.h));x.lineTo(cx,Y(q.l));x.stroke();
  var y0=Y(Math.max(q.o,q.c)),y1=Y(Math.min(q.o,q.c));x.fillRect(cx-cw*.32,y0,cw*.64,Math.max(1,y1-y0));});}
 else{x.beginPath();cs.forEach(function(q,i){var px=i*cw+cw/2,py=Y(q.c);i?x.lineTo(px,py):x.moveTo(px,py);});x.strokeStyle=col;x.lineWidth=2.2;x.lineJoin='round';x.stroke();
  x.lineTo((cs.length-.5)*cw,h);x.lineTo(cw/2,h);x.closePath();var gr=x.createLinearGradient(0,0,0,h);gr.addColorStop(0,up?'rgba(102,216,150,.28)':'rgba(255,125,131,.28)');gr.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gr;x.fill();}
 var lp=cs[cs.length-1].c,ly=Y(lp);x.setLineDash([4,4]);x.strokeStyle='rgba(255,255,255,.35)';x.beginPath();x.moveTo(0,ly);x.lineTo(w-R,ly);x.stroke();
 if(GM.pos){var ey=Y(GM.pos.entry);x.strokeStyle='rgba(255,210,90,.7)';x.beginPath();x.moveTo(0,ey);x.lineTo(w-R,ey);x.stroke();}
 x.setLineDash([]);x.fillStyle=col;x.font='600 11px -apple-system,system-ui,sans-serif';x.fillText(gmFmt(lp,lp<10?4:2),w-R+4,ly+4);
 x.fillStyle='rgba(255,255,255,.4)';x.fillText(gmFmt(hi,hi<10?4:2),w-R+4,14);x.fillText(gmFmt(lo,lo<10?4:2),w-R+4,h-6);
}
function gmUi(){
 if(!GM)return;var $=function(id){return document.getElementById(id);};var lp=GM.c[GM.c.length-1].c;
 if($('gmBal'))$('gmBal').textContent=gmFmt(GM.bal)+' $';
 if($('gmPx'))$('gmPx').textContent=gmFmt(lp,lp<10?4:2)+(GM.real?'':' (умовна)');
 var P=GM.pos,el=$('gmPos');
 if(el){if(P){var mv=(lp-P.entry)*P.dir/P.entry,pnl=P.stake*P.lev*mv;el.innerHTML='<b class="'+(P.dir>0?'in':'out')+'">'+(P.dir>0?'LONG':'SHORT')+' ×'+P.lev+'</b> · вхід '+gmFmt(P.entry,P.entry<10?4:2)+' · <b class="'+(pnl>=0?'in':'out')+'">'+(pnl>=0?'+':'')+gmFmt(pnl)+' $</b>';}else el.textContent='';}
 var ops=$('gmOps');if(ops&&ops._n!==GM.ops.length){ops._n=GM.ops.length;
  if(GM.ops.length)ops.innerHTML=GM.ops.map(function(o){return'<div class="gmop"><b class="'+(o.side==='LONG'?'in':'out')+'">'+o.side+' ×'+o.lev+'</b><span>'+esc(o.pair)+' · '+(o.mag*100).toFixed(2)+'% · ставка '+gmFmt(o.stake)+' $</span><em class="in">+'+gmFmt(o.pnl)+' $</em></div>';}).join('');}
}
document.getElementById('sheets').addEventListener('click',function(e){
 if(!GM)return;var t=e.target.closest('[data-gm],[data-gtf],[data-gmode],[data-gamt],[data-glev]');if(!t)return;
 var sel=function(attr){[].forEach.call(t.parentNode.querySelectorAll('['+attr+']'),function(b){b.classList.toggle('on',b===t);});};
 if(t.dataset.gtf){GM.tf=+t.dataset.gtf;sel('data-gtf');}
 else if(t.dataset.gmode){GM.mode=t.dataset.gmode;sel('data-gmode');}
 else if(t.dataset.gamt){GM.amt=+t.dataset.gamt;sel('data-gamt');}
 else if(t.dataset.glev){GM.lev=+t.dataset.glev;sel('data-glev');}
 else if(t.dataset.gm&&!GM.pos){var lp=GM.c[GM.c.length-1].c,stake=GM.bal*GM.amt/100;GM.pos={dir:t.dataset.gm==='long'?1:-1,entry:lp,stake:stake,lev:GM.lev,k:0,path:gmPath()};}
 gmDraw();gmUi();
});
document.getElementById('sheets').addEventListener('change',function(e){if(GM&&e.target.id==='gmPair'){gmSetPair(e.target.value);gmDraw();gmUi();}});
