function LG(a,b){if(window.__vfLog)try{window.__vfLog(a,b);}catch(e){}}   /* запис у журнал запуску (src/early-log.js) */
LG('main','старт основного коду');
/* математика в тексті: «500 плюс 800 мінус 300 плюс 12 помножити на 3» → 1036 (спершу множення й ділення) */
var CALC_NUM='\\d{1,3}(?:\\s\\d{3})+(?:[.,]\\d+)?|\\d+(?:[.,]\\d+)?';
var CALC_OPW='плюс|додати|мінус|минус|відняти|помножити на|помножить на|множити на|ділити на|поділити на|розділити на|разделить на|поделить на|делить на|умножить на|умножити на|plus|minus|times|multiplied by|divided by';
var CALC_RE=new RegExp('('+CALC_NUM+')((?:\\s*(?:(?:'+CALC_OPW+')|[+*×/÷]|\\s[-−–xхX:]\\s)\\s*(?:'+CALC_NUM+'))+)','giu');
function calcOp(t){t=t.toLowerCase();if(/^(плюс|додати|plus|\+)$/.test(t))return'+';if(/^(мінус|минус|відняти|minus|-|−|–)$/.test(t))return'-';if(/^(ділити|поділити|розділити|разделить|поделить|делить|divided|\/|÷|:)/.test(t))return'/';return'*';}
function calcText(text){
 var str=String(text==null?'':text);
 return str.replace(CALC_RE,function(m){
  var parts=m.match(new RegExp(CALC_NUM+'|'+CALC_OPW+'|[+*×/÷\\-−–xхX:]','giu'));if(!parts||parts.length<3)return m;
  var nums=[],ops=[];
  parts.forEach(function(p,i){if(i%2===0)nums.push(parseFloat(p.replace(/\s/g,'').replace(',','.')));else ops.push(calcOp(p));});
  if(nums.length!==ops.length+1||nums.some(function(n){return!isFinite(n);}))return m;
  var n2=[nums[0]],o2=[];
  for(var i=0;i<ops.length;i++){if(ops[i]==='*'||ops[i]==='/'){var a=n2.pop(),b=nums[i+1];if(ops[i]==='/'&&b===0)return m;n2.push(ops[i]==='*'?a*b:a/b);}else{o2.push(ops[i]);n2.push(nums[i+1]);}}
  var r=n2[0];for(var j=0;j<o2.length;j++)r=o2[j]==='+'?r+n2[j+1]:r-n2[j+1];
  r=Math.abs(Math.round(r*100)/100);return String(r);
 });
}
var BAL_TREND=0;   /* тренд загального балансу: 1 вгору, -1 вниз, 0 рівно (колір віджета й сітки) */
/* ===== 0. Логіка Voice Finance (finance-core / navigation / application) ===== */
function mkStore(kind){
 try{var s=window[kind];s.setItem('__vf','1');s.removeItem('__vf');return s;}
 catch(e){var m={};return{getItem:function(k){return k in m?m[k]:null},setItem:function(k,v){m[k]=String(v)},removeItem:function(k){delete m[k]}};}
}
var mkErr=null,mkTried=false,uiReady=false;
function mktChanged(){if(uiReady)renderTicker();}
var L=VF.createVoiceFinanceLogic({storage:mkStore('localStorage'),sessionStorage:mkStore('sessionStorage'),storageKey:'voice-finance-glass-v1',initialScreen:'home',
 onMarketData:function(){mktChanged();},onMarketError:function(e){mkErr=e;}});
var app=L.application,fin=L.finance,nav=L.navigation,MK=L.markets;
window.__vf=L;

function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]});}
function money(n,c){return VF.formatMoney(n,c||'PLN');}
function mv(n,c){return VF.formatMovement(n,c||'PLN');}
var CAT_COL=['#ff7d83','#66d896','#7aa7ff','#ffc46b','#c38bff','#5fd4e8','#ff9f6b','#9be15d','#f08bd0'];
function hashCol(id){var h=0,s=String(id);for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return CAT_COL[h%CAT_COL.length];}
function rgba(hex,a){var n=parseInt(hex.slice(1),16);return'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+a+')';}
var COIN_SVG='<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"><ellipse cx="12" cy="6" rx="7" ry="2.6"/><path d="M5 6v4c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6M5 10v4c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-4M5 14v4c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-4"/></svg>',PLUS_SVG='<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
function icon(name,col){var c=col||hashCol(name);return'<i class="ic" style="background:'+rgba(c,.2)+';color:'+c+'">'+esc(String(name||'•').trim().charAt(0).toUpperCase())+'</i>';}
function catName(id){var c=fin.categoryById(id);return c&&c.name?c.name:'Інше';}
function chev(){return'<svg viewBox="0 0 12 12"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg>';}
function curSym(c){return c;}

/* ===== сторінки ===== */
var PAGE_IDS=['insights','debts','home','balanceAnalysis','accountDetail','flowDetail','people','person','marketDetail'];
var NP=PAGE_IDS.length;
var PAGE_OF={};PAGE_IDS.forEach(function(n,i){PAGE_OF[n]=i;});
var root=document.getElementById('pages'),pg=[],inn=[];
PAGE_IDS.forEach(function(id){
 var s=document.createElement('section');s.className='page';s.dataset.p=id;s.innerHTML='<div class="inner'+(PAGE_IDS.indexOf(id)<3?' g4':'')+'"></div>';
 root.appendChild(s);pg.push(s);inn.push(s.firstChild);
});

function setBlocks(i,list){
 list=list.concat([B_('egg','<button class="eggd" data-act="egg" aria-label="Крапля"></button><button class="eggg" data-act="game" aria-label="Мінігра «Успіх»">↗</button>')]);   /* пасхалка внизу кожної сторінки */
 var host=inn[i],ch=host.children,k;
 for(k=0;k<list.length;k++){
  var it=list[k],sig=it.c+'|'+it.h,el=ch[k];
  if(!el){el=document.createElement('div');el.className=it.c;el.innerHTML=it.h;el.dataset.sig=sig;host.appendChild(el);}
  else if(el.dataset.sig!==sig){el.className=it.c;el.innerHTML=it.h;el.dataset.sig=sig;}
 }
 while(host.children.length>list.length)host.removeChild(host.lastChild);
 if(i<3&&typeof wlApply==='function')wlApply(i);
}
function B_(c,h){return{c:c,h:h};}

function todayStr(){return new Date().toLocaleDateString('uk-UA',{weekday:'long',day:'numeric',month:'long'});}
/* ---- скляні лінії графіків і прогрес-барів. ВІДМІНИТИ: у Налаштуваннях кнопка «Скляні лінії графіків»,
   або назавжди — замінити GLINES_DEFAULT на false. Усі стилі під html.glines у style.css ---- */
var GLINES_DEFAULT=true;
var GLINES=(function(){try{var v=localStorage.getItem('vf-glines');return v===null?GLINES_DEFAULT:v==='1';}catch(e){return GLINES_DEFAULT;}})();
document.documentElement.classList.toggle('glines',GLINES);
function glinesLabel(){return'Скляні лінії графіків: '+(GLINES?'увімкнено':'вимкнено');}
function setGlassLines(on){GLINES=!!on;try{localStorage.setItem('vf-glines',on?'1':'0');}catch(e){}document.documentElement.classList.toggle('glines',GLINES);LG('ui','скляні лінії: '+(GLINES?'увімк.':'вимк.'));tlAllStale();renderPages();renderTicker();}
/* скло під графіком: 1 — А (уся площа під лінією), 2 — Б (смуга під лінією), 0 — вимкнено. Перемикач у Налаштуваннях */
/* райдужний живий ореол по контуру екрана (під склом), можна вимкнути в налаштуваннях */
/* слід від жесту: повзунки в налаштуваннях (яскравість, ширина, тривалість) */
var FGS=(function(){var d={a:50,i:56,w:62,l:30,am:0,ah:0,as:100,av:100,tg:0,tw:1};try{var j=JSON.parse(localStorage.getItem('vf-fg')||'null');if(j)for(var k in d)if(typeof j[k]==='number')d[k]=j[k];}catch(e){}return d;})();
function setFGS(k,v){FGS[k]=v;try{localStorage.setItem('vf-fg',JSON.stringify(FGS));}catch(e){}}
var AURA=(function(){try{var v=localStorage.getItem('vf-aura');return v===null?1:+v?1:0;}catch(e){return 1;}})();
function fgGlowLabel(){return'Світіння під пальцем: '+(FGS.tg?'увімкнено':'вимкнено');}
function fgWaveLabel(){return'Хвилі за пальцем: '+(FGS.tw?'увімкнено':'вимкнено');}
function bfxLabel(){var o=false;try{o=localStorage.getItem('vf-bfx')==='0';}catch(e){}return'Заставка завантаження: '+(o?'вимкнена':'увімкнена')+' (з наступного запуску)';}
function auraModeLabel(){return'Колір ободка: '+(FGS.am?'за балансом (зелений / червоний)':'райдужний');}
function auraLabel(){return'Райдужний ореол екрана: '+(AURA?'увімкнено':'вимкнено');}
function toggleAura(){AURA=AURA?0:1;try{localStorage.setItem('vf-aura',String(AURA));}catch(e){}LG('ui',auraLabel());}
var AREA_MODE=(function(){try{var v=localStorage.getItem('vf-area');return v===null?0:+v||0;}catch(e){return 0;}})();
/* кольорове скло: повзунки в налаштуваннях (насиченість і яскравість значків, сила кольору балансу) */
var CG=(function(){var d={is:40,ib:45,bal:45,gt:65,gsat:50,gbr:50,wh:200,ws:0,wv:100,mh:200,ms:0,mv:100};try{var j=JSON.parse(localStorage.getItem('vf-cg')||'null');if(j)for(var k in d)if(typeof j[k]==='number')d[k]=j[k];}catch(e){}return d;})();
function applyCG(){var st=document.documentElement.style;st.setProperty('--cgs',(CG.is/100*2.5).toFixed(2));st.setProperty('--cgb',(.45+CG.ib*.009).toFixed(2));}
function setCG(k,v){CG[k]=v;try{localStorage.setItem('vf-cg',JSON.stringify(CG));}catch(e){}applyCG();}
applyCG();
function areaLabel(){return'Скло під графіком: '+(AREA_MODE===1?'площа (А)':AREA_MODE===2?'смуга (Б)':'вимкнено');}
function cycleArea(){AREA_MODE=AREA_MODE===1?2:AREA_MODE===2?0:1;try{localStorage.setItem('vf-area',String(AREA_MODE));}catch(e){}LG('ui',areaLabel());dirty=true;}
function lineSvg(d,col,w,ex,glass){
 if(GLINES&&glass&&GLASS_LINE_OK)return'';   /* лінію малює WebGL-шар як скляну трубку (tiles.js) */
 return'<path d="'+d+'" fill="none" stroke-linejoin="round" stroke-linecap="round"'+(ex||'')+' stroke="'+col+'" stroke-width="'+w+'"/>';
}
function ptsAttr(xy){var st=Math.max(1,Math.ceil(xy.length/40)),o=[];for(var i=0;i<xy.length;i+=st)o.push(xy[i]);if(o[o.length-1]!==xy[xy.length-1])o.push(xy[xy.length-1]);return o.map(function(p){return(+p[0]).toFixed(1)+','+(+p[1]).toFixed(1);}).join(' ');}
function spark(points,id){
 var v=(points||[]).map(function(p){return p.value;}).filter(isFinite);
 if(v.length<2)v=[0,0];
 var mn=Math.min.apply(null,v),mx=Math.max.apply(null,v),rg=mx-mn||1,W=320,H=84,pad=6,col=v[v.length-1]>=v[0]?'#66d896':'#ff7d83',scol=v[v.length-1]>=v[0]?'#0fe468':'#ff2e42';
 var xy=v.map(function(y,i){return[(i/(v.length-1))*W,pad+(H-2*pad)*(1-(y-mn)/rg)];});
 var d=xy.map(function(p,i){return(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1);}).join(' ');
 return'<svg class="spark" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" data-pts="'+ptsAttr(xy)+'" data-vb="'+W+','+H+'" data-col="'+col+'" data-lw="4.2"><defs><linearGradient id="g'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+scol+'" stop-opacity=".26"/><stop offset="1" stop-color="'+scol+'" stop-opacity="0"/></linearGradient></defs><path d="'+d+' L'+W+' '+H+' L0 '+H+' Z" fill="url(#g'+id+')"/>'+lineSvg(d,col,2.4,'',true)+'</svg>';
}
function txRow(t,first){
 var cat=catName(t.category),title=t.client||(t.note&&t.note.length<34?t.note:cat),inc=t.type==='income';
 return'<button class="row'+(first?' first':'')+'" data-act="tx" data-id="'+esc(t.id)+'">'+icon(cat,hashCol(t.category))+'<div class="rc"><b>'+esc(title)+'</b><span>'+esc(cat)+' · '+esc(VF.dateLabel(t.date))+'</span></div><em class="'+(inc?'in':'')+'">'+(inc?'+':'−')+esc(money(t.amount,t.currency))+'</em></button>';
}
function debtRow(d,first,act){
 return'<button class="row'+(first?' first':'')+(d.paid?' paid':'')+'" data-act="'+(act||'dperson')+'" data-id="'+esc(d.id)+'">'+icon(d.person,hashCol(d.person))+'<div class="rc"><b>'+esc(d.person)+(d.urgent&&!d.paid?' · терміново':'')+'</b><span>'+esc(d.note||(d.direction==='owed'?'Я винен':'Мені винні'))+' · '+esc(VF.dateLabel(d.date))+'</span></div><em class="'+(d.direction==='receivable'?'in':'')+'">'+esc(money(d.amount,d.currency))+'</em></button>';
}
var SEARCH_SVG='<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>';
function searchBlock(kind,ph){return B_('srch','<label style="display:contents">'+SEARCH_SVG+'<input data-search="'+kind+'" type="search" placeholder="'+ph+'" autocomplete="off" autocorrect="off" enterkeyhint="search"></label>');}
function hdr(title,sub,back){return B_('hdr',(back?'<button class="back" data-act="back">‹</button>':'')+'<div><h1>'+esc(title)+'</h1>'+(sub?'<div class="sub">'+esc(sub)+'</div>':'')+'</div>');}
function pctTxt(p){return(Math.round(p*10)/10).toLocaleString('uk-UA')+'%';}

/* ---- закріплена бігуча строка курсів (дані: Frankfurter для валют, Kraken для крипто; нічого не вигадується) ---- */
var MK_COPIES=6,tickerEl=document.getElementById('ticker'),tickerTrk=tickerEl.firstChild,mkSpark={};
try{mkSpark=JSON.parse(localStorage.getItem('voice-finance-glass-spark')||'{}')||{};}catch(e){mkSpark={};}
function mkSaveSpark(){try{localStorage.setItem('voice-finance-glass-spark',JSON.stringify(mkSpark));}catch(e){}}
function mkFmt(v){v=Number(v);return v.toLocaleString('uk-UA',{minimumFractionDigits:v<10?2:0,maximumFractionDigits:v<10?4:2});}
function mkPct(c){c=Number(c)||0;return(c>=0?'+':'−')+Math.abs(c).toFixed(2).replace('.',',')+'%';}
function mkSource(m){return m&&m.kind==='crypto'?'Kraken':'Frankfurter (ЄЦБ)';}
function mkWhen(u){if(!u)return'';return String(u).length>10?new Date(u).toLocaleString('uk-UA',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):u;}
function mkSeries(id,m){var s=mkSpark[id];if(s&&s.v&&s.v.length>2)return s.v;return m&&m.history&&m.history.length>2?m.history:null;}
function sparkMini(v,up){
 if(!v)return'<svg class="sp" viewBox="0 0 54 26" width="54" height="26"></svg>';
 var mn=Math.min.apply(null,v),mx=Math.max.apply(null,v),rg=mx-mn||1,W=54,H=26,p=3;
 var pts=v.map(function(y,i){return(i/(v.length-1)*W).toFixed(1)+','+(p+(H-2*p)*(1-(y-mn)/rg)).toFixed(1);}).join(' ');
 return'<svg class="sp" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'">'+lineSvg('M'+pts.split(' ').join(' L'),up?'#66d896':'#ff7d83',1.8,'')+'</svg>';
}
function renderTicker(){
 var ids=MK.selection,d=MK.data,items=ids.filter(function(id){return d[id]&&isFinite(d[id].value);}).map(function(id){
  var m=d[id],neg=m.change<0;
  return'<span class="ti" data-mk="'+esc(id)+'"><span class="tc"><b>'+esc(m.label)+'</b><span class="tp"><span>'+esc(mkFmt(m.value))+'</span><i class="'+(neg?'neg':'')+'">'+esc(mkPct(m.change))+'</i></span></span>'+sparkMini(mkSeries(id,m),!neg)+'</span>';});
 var html,loop='';
 if(!items.length){
  var msg=!ids.length?'Курси не вибрано: Додатково → Налаштування → Валюти в бігучій строці':mkErr&&mkTried?'Курси недоступні: немає зв’язку з джерелом':'Завантаження курсів…';
  html='<div class="tmsg">'+esc(msg)+'</div>';
 }else{var one=items.join(''),all='';for(var i=0;i<MK_COPIES;i++)all+=one;html=all;loop='1';}
 if(tickerTrk._h===html)return;
 tickerTrk._h=html;tickerTrk._ver=(tickerTrk._ver||0)+1;tickerTrk.innerHTML=html;if(loop)tickerTrk.dataset.loop=loop;else delete tickerTrk.dataset.loop;
}
/* ---- Дім ---- */
function monthStart(d){return new Date(d.getFullYear(),d.getMonth(),1);}
function monthSpend(cat,d){d=d||new Date();var a=monthStart(d),b=new Date(d.getFullYear(),d.getMonth()+1,1),sum=0;
 fin.getState().transactions.forEach(function(t){if(t.type!=='expense'||t.currency!=='PLN')return;if(cat&&t.category!==cat)return;var x=new Date(t.date);if(x>=a&&x<b)sum+=t.amount;});return sum;}
function forecastMonth(){var d=new Date(),days=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(),spent=monthSpend(null,d),day=Math.max(1,d.getDate()+d.getHours()/24),proj=spent/day*days;return{spent:spent,proj:proj,days:days,left:days-d.getDate(),limit:fin.getState().goal};}
var MONTHS_UA=['січ','лют','бер','квіт','трав','черв','лип','серп','вер','жовт','лист','груд'];
function nlQuery(q){
 var x=String(q||'').toLowerCase().replace(/[’'?!.,]/g,' ');if(!/(скільки|сколько|how much|ile)/.test(x))return null;
 var now=new Date(),y=now.getFullYear(),m=now.getMonth(),label='цього місяця',found=false;
 if(/минул|прошл|last month/.test(x)){m--;if(m<0){m=11;y--;}label='минулого місяця';found=true;}
 MONTHS_UA.forEach(function(st,i){if(!found&&new RegExp('(^|\\s)'+st).test(x)&&!/^скільк/.test(st)){m=i;if(i>now.getMonth())y=now.getFullYear()-1;else y=now.getFullYear();label='у '+['січні','лютому','березні','квітні','травні','червні','липні','серпні','вересні','жовтні','листопаді','грудні'][i];found=true;}});
 var all=/за весь час|загалом|всього|усього/.test(x);if(all)label='за весь час';
 var inc=/зароб|дохід|доход|отрим/.test(x);
 var stop=/^(скільки|сколько|я|на|за|в|у|у|витратив|витратила|витрачено|потратив|грошей|було|цього|минулого|місяця|місяці|весь|час|зароб\S*|отрим\S*|дохід|доходу|how|much|ile|for|on|in|загалом|всього|усього)$/;
 var words=x.split(/\s+/).filter(function(w){return w&&!stop.test(w)&&!MONTHS_UA.some(function(st){return w.indexOf(st)===0;});});
 var stems=words.map(function(w){return VF.foldText(w).slice(0,Math.max(3,Math.min(5,w.length-1)));});
 var a=all?new Date(0):new Date(y,m,1),b=all?new Date(8.64e15):new Date(y,m+1,1),sum=0,list=[];
 fin.getState().transactions.forEach(function(t){if(t.type!==(inc?'income':'expense'))return;var dt=new Date(t.date);if(dt<a||dt>=b)return;
  var hay=VF.foldText([t.note,t.client,catName(t.category)].join(' '));if(stems.length&&!stems.every(function(st){return hay.indexOf(st)>=0;}))return;sum+=t.amount;list.push(t);});
 return{sum:sum,list:list,label:label,what:words.join(' '),inc:inc};
}
function blocksHome(){
 var ix=app.getState().interaction,t=fin.totals(),g=fin.goals(),pts=fin.financialSeries('balance','1M');
 var first=pts.length?pts[0].value:t.balance,last=pts.length?pts[pts.length-1].value:first,ch=last-first,pc=first?ch/Math.abs(first)*100:0;
 /* колір інтерфейсу — за ОСТАННЬОЮ зміною графіка загального балансу (останній крок угору чи вниз), а не за рівнем відносно нуля чи за місяць */
 var lm=0;for(var bi=pts.length-1;bi>0&&!lm;bi--){var dv=pts[bi].value-pts[bi-1].value;if(Math.abs(dv)>.005)lm=dv>0?1:-1;}
 BAL_TREND=lm||(ch>0?1:ch<0?-1:0);
 var accs=fin.activeAccounts(),shown=ix.accountsExpanded?accs:accs.slice(0,4),nq=nlQuery(ix.homeQuery),tx=nq?nq.list.slice(-30).reverse():fin.recentTransactions(ix.homeQuery);
 var o=[];
 o.push(hdr('Гарного дня!',todayStr()));
 o.push(searchBlock('home','Пошук або «скільки на каву в жовтні»'));
 if(nq)o.push(B_('tile','<div class="lbl">'+(nq.inc?'Отримано':'Витрачено')+(nq.what?' · '+esc(nq.what):'')+' · '+esc(nq.label)+'</div><div class="big">'+esc(money(nq.sum))+'</div><div class="cap">Операцій: '+nq.list.length+'</div>'));
 var tpls=fin.getState().templates||[];
 if(tpls.length)o.push(B_('tools tpl','<div class="lbl" style="width:100%;margin-bottom:2px">Швидкі операції</div>'+tpls.map(function(p){return'<button class="pillb'+(p.type==='income'?'':' ac')+'" data-act="tpl" data-id="'+esc(p.id)+'">'+esc(p.name)+' · '+esc(money(p.amount,p.currency))+'</button>';}).join('')));
 o.push(B_('tile bal '+(BAL_TREND>0?'up':BAL_TREND<0?'dn':''),'<div data-act="balance"><div class="lbl">Загальний баланс</div><div class="brow"><div class="bl"><div class="big">'+esc(money(t.balance))+'</div><div class="chg '+(ch<0?'neg':'')+'">'+esc(mv(ch))+'<span>('+esc(pctTxt(pc))+') за 30 днів</span></div></div><div class="chw">'+spark(pts,'h')+'</div><i class="chev">›</i></div></div>'+
  '<div class="split"><button data-act="flow" data-v="income"><i class="dot up">↑</i><div><span class="lbl">Доходи</span><b>'+esc(money(t.income))+'</b></div></button><span class="vd"></span><button data-act="flow" data-v="expense"><i class="dot dn">↓</i><div><span class="lbl">Витрати</span><b>'+esc(money(t.expense))+'</b></div></button></div>'));
 o.push(B_('accs','<div class="th"><h2>Рахунки</h2>'+(accs.length>4?'<button data-act="accs">'+(ix.accountsExpanded?'Згорнути':'Усі ›')+'</button>':'')+'</div><div class="arow">'+shown.map(function(a){var cash=a.accountType==='cash'||a.type==='cash',nm=a.displayName||a.bankName||'Рахунок',neg=a.currentBalance<0;return'<button class="ab" data-act="acc" data-id="'+esc(a.id)+'"><i class="aic"'+(cash?'':' style="color:'+hashCol(a.id)+'"')+'>'+(cash?COIN_SVG:esc(String(nm).trim().charAt(0).toUpperCase()))+'</i><span class="an">'+esc(nm)+'</span><span class="aa'+(neg?' neg':'')+'">'+esc(money(a.currentBalance,a.currency))+'</span></button>';}).join('')+'<button class="ab" data-act="addacc"><i class="aic plus">'+PLUS_SVG+'</i><span class="an mu">Додати</span></button></div>'));
 o.push(B_('tile','<div class="th"><h2>'+(ix.homeQuery?'Результати':'Останні операції')+'</h2><button data-act="alltx">Усі</button></div>'+
  (tx.length?tx.map(function(x,i){return txRow(x,i===0);}).join(''):'<div class="empty">'+(ix.homeQuery?'Нічого не знайдено.':'Операцій поки немає. Натисніть «Ввід» і напишіть, наприклад: <b>кава 25 зл</b>.')+'</div>')));
 o.push(B_('tile','<div class="lbl">Місячний ліміт витрат</div><div class="mid">'+esc(money(g.limit))+'</div><div class="bar"><i style="width:'+g.percent.toFixed(1)+'%"></i></div><div class="cap">Витрачено '+esc(money(g.expense))+' · '+esc(pctTxt(g.percent))+' ліміту</div>'));
 o.push(B_('tile','<div class="lbl">Накопичення</div><div class="mid">'+esc(money(g.savings))+'</div><div class="cap">Доходи мінус витрати за весь період.</div>'));
 return o;
}
/* ---- Аналітика: цілі → аналітика ---- */
function blocksInsights(){
 var g=fin.goals(),s=fin.insights(),o=[],tot=s.totals,net=tot.income-tot.expense;
 o.push(hdr('Аналітика','Цілі та підсумки'));
 o.push(B_('sec','Цілі'));
 o.push(B_('tile','<div class="lbl">Місячний ліміт витрат</div><div class="big">'+esc(money(g.limit))+'</div><div class="bar"><i style="width:'+g.percent.toFixed(1)+'%"></i></div><div class="cap">Витрачено '+esc(money(g.expense))+' · '+esc(pctTxt(g.percent))+'</div>'));
 o.push(B_('tile','<div class="lbl">Накопичення</div><div class="big">'+esc(money(g.savings))+'</div><div class="cap">Поточний баланс: рахунки плюс операції без рахунку.</div>'));
 var fc=forecastMonth(),over=fc.proj-fc.limit;
 o.push(B_('tile','<div class="lbl">Прогноз витрат на кінець місяця</div><div class="big gnum" style="color:'+(over>0?'var(--ac)':'var(--gr)')+'" data-col="'+(over>0?'var(--ac)':'var(--gr)')+'">'+esc(money(fc.proj))+'</div><div class="bar"><i style="width:'+Math.min(100,fc.limit?fc.proj/fc.limit*100:0).toFixed(1)+'%;background:'+(over>0?'var(--ac)':'var(--gr)')+'" data-col="'+(over>0?'var(--ac)':'var(--gr)')+'"></i></div><div class="cap">'+(over>0?'За поточного темпу ліміт буде перевищено на '+esc(money(over)):'Вистачить: запас '+esc(money(-over)))+'. Залишилось днів: '+fc.left+'.</div>'));
 var bc=fin.getState().categories.filter(function(c){return c.budget>0;});
 o.push(B_('tile','<div class="th"><h2>Бюджети категорій</h2><button data-act="budgets">Налаштувати</button></div>'+(bc.length?bc.map(function(c){var sp=monthSpend(c.id),p=sp/c.budget*100,col=p>=100?'var(--ac)':p>=80?'#ffb547':'var(--gr)';return'<div class="cat"><span class="n">'+esc(c.name)+'</span><span class="v">'+esc(money(sp))+' / '+esc(money(c.budget))+'</span><div class="b"><i style="width:'+Math.min(100,p).toFixed(1)+'%;background:'+col+'" data-col="'+col+'"></i></div></div>';}).join(''):'<div class="empty">Бюджетів ще немає. Задайте суму на місяць для будь-якої категорії.</div>')));
 var rc=fin.getState().recurring||[],rcTot=rc.reduce(function(a,r){return a+(r.type==='expense'?r.amount:0);},0);
 o.push(B_('tile','<div class="th"><h2>Повторювані платежі</h2><button data-act="recurring">Керувати</button></div>'+(rc.length?rc.map(function(r,i){return'<div class="row'+(i?'':' first')+'">'+icon(r.name,hashCol(r.category))+'<div class="rc"><b>'+esc(r.name)+'</b><span>щомісяця '+r.day+' числа · '+esc(catName(r.category))+'</span></div><em class="'+(r.type==='income'?'in':'')+'">'+(r.type==='income'?'+':'−')+esc(money(r.amount,r.currency))+'</em></div>';}).join('')+'<div class="cap" style="margin-top:8px">Разом витрат на місяць: '+esc(money(rcTot))+'</div>':'<div class="empty">Додайте підписки, оренду чи зарплату — операції створюватимуться самі в потрібний день.</div>')));
 o.push(B_('sec','Аналітика'));
 o.push(B_('tile','<div class="lbl">Чистий результат</div><div class="mid" style="color:'+(net<0?'var(--ac)':'var(--gr)')+'">'+esc(mv(net))+'</div><div class="grid2" style="margin-top:12px"><button class="mini" data-act="flow" data-v="income"><span class="lbl">Доходи</span><b>'+esc(money(tot.income))+'</b></button><button class="mini" data-act="flow" data-v="expense"><span class="lbl">Витрати</span><b>'+esc(money(tot.expense))+'</b></button></div>'));
 o.push(B_('tile','<button data-act="debts" style="display:block;width:100%"><div class="th"><h2>Борги</h2><span class="lbl">Відкрити ›</span></div><div class="grid2"><div class="mini"><span class="lbl">Я винен</span><b>'+esc(money(s.debts.owed))+'</b></div><div class="mini"><span class="lbl">Мені винні</span><b>'+esc(money(s.debts.receivable))+'</b></div></div><div class="cap">Термінових: '+s.debts.urgent+' · сплачених: '+s.debts.paid+'</div></button>'));
 var mx=Math.max.apply(null,s.categories.map(function(c){return c.amount;}).concat([1]));
 o.push(B_('tile','<div class="th"><h2>Витрати за категоріями</h2></div>'+(s.categories.length?s.categories.map(function(c){var col=hashCol(c.id);return'<button class="cat" data-act="cat" data-id="'+esc(c.id)+'" style="width:100%"><span class="n">'+esc(c.name)+'</span><span class="b"><i style="width:'+(c.amount/mx*100).toFixed(1)+'%;background:'+col+'"></i></span><span class="a">'+esc(money(c.amount))+'</span></button>';}).join(''):'<div class="empty">Витрат у PLN ще немає.</div>')));
 o.push(B_('tile','<div class="th"><h2>Доходи за клієнтами</h2></div>'+(s.clients.length?s.clients.slice(0,6).map(function(c,i){return'<div class="row'+(i?'':' first')+'">'+icon(c.name,hashCol(c.name))+'<div class="rc"><b>'+esc(c.name)+'</b></div><em class="in">+'+esc(money(c.amount))+'</em></div>';}).join(''):'<div class="empty">Доходи з указаним клієнтом з’являться тут.</div>')));
 return o;
}
/* ---- Борги ---- */
var GTITLE={owed:'Я винен',receivable:'Мені винні',urgent:'Термінові'};
function blocksDebts(){
 var ix=app.getState().interaction,t=fin.debtTotals(),grp=fin.debtGroups({query:ix.debtQuery,sort:ix.debtSort}),o=[];
 o.push(hdr('Борги','Хто кому винен'));
 o.push(B_('tile','<div class="grid2"><button class="mini" data-act="people" data-v="owed"><span class="lbl">Я винен</span><b style="color:var(--ac)">'+esc(money(t.owed))+'</b></button><button class="mini" data-act="people" data-v="receivable"><span class="lbl">Мені винні</span><b style="color:var(--gr)">'+esc(money(t.receivable))+'</b></button></div><div class="cap">Термінових: '+t.urgent+' · сплачених: '+t.paid+'</div>'));
 o.push(searchBlock('debt','Пошук боргів'));
 o.push(B_('tools','<button class="pillb dd" data-act="sort"><span>'+(ix.debtSort==='name-desc'?'Я → А':'А → Я')+'</span>'+chev()+'</button><button class="pillb ac" data-act="newdebt">+ Борг</button>'));
 grp.forEach(function(g){
  var open=ix.debtView===g.key,n=g.items.length;
  o.push(B_('tile','<button class="th" data-act="group" data-v="'+g.key+'" style="width:100%"><h2>'+GTITLE[g.key]+' · '+n+'</h2><span class="lbl">'+(open?'Згорнути':'Розгорнути')+'</span></button>'+
   (open?(g.open.length?g.open.map(function(d,i){return debtRow(d,i===0);}).join(''):'<div class="empty">Відкритих боргів немає.</div>')+(g.paid.length?'<div class="lbl" style="margin:14px 0 2px">Сплачені</div>'+g.paid.map(function(d,i){return debtRow(d,i===0);}).join(''):''):'')));
 });
 return o;
}
/* ---- деталі ---- */
function periodBtn(cur){return'<button class="pillb dd" data-act="period"><span>'+esc(cur)+'</span>'+chev()+'</button>';}
function chartTile(title,big,sub,pts,id,cur,neg){return B_(id==='b'?'tile bal '+(neg?'dn':'up'):'tile','<div class="th"><div><div class="lbl">'+esc(title)+'</div></div>'+periodBtn(cur)+'</div><div class="big">'+esc(big)+'</div>'+(sub?'<div class="chg '+(neg?'neg':'')+'">'+sub+'</div>':'')+spark(pts,id)+'<div class="cap">'+(pts&&pts.length>1?'':'Замало точок для графіка за цей період.')+'</div>');}
function txTile(title,list,empty){return B_('tile','<div class="th"><h2>'+esc(title)+'</h2></div>'+(list.length?list.slice(0,40).map(function(x,i){return txRow(x,i===0);}).join(''):'<div class="empty">'+empty+'</div>'));}
function blocksBalance(m){
 return[hdr('Баланс','Загальний графік',1),chartTile('Поточний',money(m.current),esc(mv(m.change)),m.points,'b',m.periods.balance,m.change<0),
  B_('tile','<div class="grid2"><div class="mini"><span class="lbl">Мінімум</span><b>'+esc(isFinite(m.min)?money(m.min):'—')+'</b></div><div class="mini"><span class="lbl">Максимум</span><b>'+esc(isFinite(m.max)?money(m.max):'—')+'</b></div><div class="mini"><span class="lbl">Доходи</span><b style="color:var(--gr)">'+esc(money(m.income))+'</b></div><div class="mini"><span class="lbl">Витрати</span><b style="color:var(--ac)">'+esc(money(m.expense))+'</b></div></div>'),
  B_('tile','<div class="th"><h2>Рахунки</h2></div>'+(m.accounts.length?m.accounts.map(function(a,i){return'<button class="row'+(i?'':' first')+'" data-act="acc" data-id="'+esc(a.id)+'">'+icon(a.displayName||a.bankName,hashCol(a.id))+'<div class="rc"><b>'+esc(a.displayName||a.bankName)+'</b><span>'+esc(a.bankName||'Рахунок')+'</span></div><em>'+esc(money(a.currentBalance,a.currency))+'</em></button>';}).join(''):'<div class="empty">Рахунків немає.</div>'))];
}
function blocksAccount(m){
 var a=m.account;if(!a)return[hdr('Рахунок','',1),B_('tile','<div class="empty">Рахунок не знайдено.</div>')];
 return[hdr(a.displayName||a.bankName,a.bankName||'Рахунок',1),chartTile('Поточний баланс',money(a.currentBalance,a.currency),m.metrics.change==null?'':esc(mv(m.metrics.change,a.currency)),m.points,'a',m.periods.account,(m.metrics.change||0)<0),
  B_('tile','<div class="grid2"><div class="mini"><span class="lbl">Мінімум</span><b>'+esc(m.metrics.min==null?'—':money(m.metrics.min,a.currency))+'</b></div><div class="mini"><span class="lbl">Максимум</span><b>'+esc(m.metrics.max==null?'—':money(m.metrics.max,a.currency))+'</b></div></div>'),
  txTile('Операції рахунку',m.transactions,'Прив’язаних операцій немає.')];
}
function blocksFlow(m){
 var inc=m.type==='income';
 return[hdr(inc?'Доходи':'Витрати','Накопичувально за період',1),chartTile(inc?'Усього доходів':'Усього витрат',money(m.total),'',m.points,'f',m.periods.flow,false),txTile('Операції',m.transactions,'Операцій за цей період немає.')];
}
function blocksPeople(m){
 var owed=m.direction==='owed';
 return[hdr(owed?'Кредитори':'Клієнти',owed?'Кому я винен':'Хто винен мені',1),B_('tile',(m.people.length?m.people.map(function(p,i){var tot=p.open.filter(function(d){return d.currency==='PLN';}).reduce(function(s,d){return s+d.amount;},0);return'<button class="row'+(i?'':' first')+'" data-act="person" data-v="'+esc(m.direction)+'" data-name="'+esc(p.name)+'">'+icon(p.name,hashCol(p.name))+'<div class="rc"><b>'+esc(p.name)+'</b><span>відкритих: '+p.open.length+' · сплачених: '+p.paid.length+'</span></div><em class="'+(owed?'':'in')+'">'+esc(money(tot))+'</em></button>';}).join(''):'<div class="empty">Тут поки нікого немає.</div>'))];
}
function blocksPerson(m){
 var owed=m.direction==='owed';
 return[hdr(m.name||'Профіль',owed?'Я винен':'Винен мені',1),B_('tile','<div class="grid2"><div class="mini"><span class="lbl">Відкрито</span><b style="color:'+(owed?'var(--ac)':'var(--gr)')+'">'+esc(money(m.openTotal))+'</b></div><div class="mini"><span class="lbl">Сплачено</span><b>'+esc(money(m.paidTotal))+'</b></div></div>'),
  B_('tile','<div class="th"><h2>Борги</h2></div>'+(m.items.length?m.items.map(function(d,i){return debtRow(d,i===0,'dedit');}).join(''):'<div class="empty">Записів немає.</div>'))];
}

var rendered={};
function renderPages(){
 var st=nav.getState(),cur=st.screen;
 setBlocks(0,blocksInsights());setBlocks(1,blocksDebts());setBlocks(2,blocksHome());
 if(PAGE_OF[cur]>2){
  var m=cur==='marketDetail'?null:app.pageModel(),i=PAGE_OF[cur];
  var bl=cur==='balanceAnalysis'?blocksBalance(m):cur==='accountDetail'?blocksAccount(m):cur==='flowDetail'?blocksFlow(m):cur==='people'?blocksPeople(m):cur==='person'?blocksPerson(m):cur==='marketDetail'?blocksMarket():[hdr('Недоступно','',1)];
  setBlocks(i,bl);
 }
}
