/* ===== Докладний журнал роботи: усе, що відбувається під час користування, щоб без екрана було видно, що рахується й малюється =====
   • усі дотики (Pointer і Touch): координати, сила (force), площа/радіус, нахил, швидкість; рух — не частіше за 90 мс на палець;
   • стан кадру раз на 500 мс: fps, навантаження, сторінка, прокрутка, масштаб/зсув полотна папки, режим редагування, док, тікер, вікна;
   • розкладка віджетів: при відкритті/закритті папки, відпусканні віджета, зміні розміру та кожні 2 с у режимі редагування — прямокутники всіх віджетів
     і розбіжності між очікуваною та фактичною позицією (саме так видно «стрибки» й «телепортацію»);
   • аномалії: NaN/Infinity у стані, віджети за межами полотна, різкі стрибки позиції між знімками, довгі кадри з причиною;
   • дії: кліки по [data-act]/[data-s]/[data-m], відкриття вікон і меню. ===== */
(function(){
 var TR={on:true,t:{},ptr:{},last:0,fr:0,t0:performance.now(),prev:{},jump:{}};
 try{if(localStorage.getItem('vf-trace')==='0')TR.on=false;}catch(e){}
 function R(n){return Math.round(n);}
 function F(n,d){return(+n).toFixed(d==null?2:d);}
 function lg(tag,msg){if(TR.on)LG(tag,msg);}
 function tgs(t){if(!t||!t.tagName)return'-';var s=t.tagName.toLowerCase();if(t.id)s+='#'+t.id;else if(t.className&&typeof t.className==='string')s+='.'+t.className.trim().split(/\s+/).slice(0,2).join('.');var a=t.closest&&t.closest('[data-act],[data-s],[data-m]');if(a&&a!==t){var d=a.dataset;s+='<'+(d.act?'act='+d.act:d.s?'s='+d.s:'m='+d.m)+'>';}else if(t.dataset&&(t.dataset.act||t.dataset.s||t.dataset.m)){var d2=t.dataset;s+='['+(d2.act||d2.s||d2.m)+']';}return s;}
 /* --- дотики --- */
 function ptrInfo(e){return'x '+R(e.clientX)+' y '+R(e.clientY)+' тиск '+F(e.pressure,2)+' w '+F(e.width,1)+' h '+F(e.height,1)+(e.tiltX?' tilt '+R(e.tiltX)+','+R(e.tiltY):'')+' '+(e.pointerType||'')+(e.isPrimary?' основний':'');}
 ['pointerdown','pointerup','pointercancel'].forEach(function(n){window.addEventListener(n,function(e){if(!TR.on)return;
  var id=e.pointerId,o=TR.ptr[id];
  if(n==='pointerdown'){TR.ptr[id]={x:e.clientX,y:e.clientY,t:performance.now(),lt:0,n:0,path:0,px:e.clientX,py:e.clientY};lg('дотик','↓ #'+id+' '+ptrInfo(e)+' ціль '+tgs(e.target)+' пальців '+Object.keys(TR.ptr).length);}
  else{var d=o?Math.hypot(e.clientX-o.x,e.clientY-o.y):0;lg('дотик',(n==='pointerup'?'↑':'✕')+' #'+id+' '+ptrInfo(e)+' тривалість '+(o?R(performance.now()-o.t):'?')+' мс, зсув '+R(d)+' px, шлях '+(o?R(o.path):'?')+' px, подій руху '+(o?o.n:'?')+' ціль '+tgs(e.target));delete TR.ptr[id];}
 },{capture:true,passive:true});});
 window.addEventListener('pointermove',function(e){if(!TR.on)return;var o=TR.ptr[e.pointerId];if(!o)return;var now=performance.now();o.n++;o.path+=Math.hypot(e.clientX-o.px,e.clientY-o.py);var dt=Math.max(1,now-(o.lt||o.t)),v=Math.hypot(e.clientX-o.px,e.clientY-o.py)/dt*1000;o.px=e.clientX;o.py=e.clientY;
  if(now-o.lt>90){o.lt=now;lg('рух','#'+e.pointerId+' '+ptrInfo(e)+' швидкість '+R(v)+' px/с');}},{capture:true,passive:true});
 /* Touch-події: iOS віддає силу (force) і радіуси контакту саме тут */
 var tl=0;
 ['touchstart','touchmove','touchend'].forEach(function(n){document.addEventListener(n,function(e){if(!TR.on)return;var now=performance.now();if(n==='touchmove'&&now-tl<90)return;tl=now;
  var s=[].map.call(e.touches.length?e.touches:e.changedTouches,function(t){return'#'+t.identifier+' f='+F(t.force||0,3)+' r='+F(t.radiusX||0,1)+'×'+F(t.radiusY||0,1)+' кут '+R(t.rotationAngle||0)+(t.altitudeAngle!=null?' alt '+F(t.altitudeAngle,2):'');}).join(' | ');
  lg('торкання',n+' пальців '+e.touches.length+' · '+s);},{capture:true,passive:true});});
 /* --- дії --- */
 document.addEventListener('click',function(e){if(!TR.on)return;var a=e.target.closest&&e.target.closest('[data-act],[data-s],[data-m],.mi,#wfadd,#wfh,#wfdel,#fhdr button');if(a)lg('клік',tgs(a)+' x '+R(e.clientX)+' y '+R(e.clientY));},true);
 /* --- розкладка віджетів --- */
 function rectsOf(i){var host=window.__inn&&window.__inn[i];if(!host)return'';return[].map.call(host.children,function(c){var r=c.getBoundingClientRect(),cs=c.className.replace(/tile|wg /g,'').trim().split(/\s+/).slice(0,2).join('.');return cs+'@'+R(r.left)+','+R(r.top)+' '+R(r.width)+'×'+R(r.height)+(c.style.translate?' tr['+c.style.translate+']':'')+(c.classList.contains('wfd')?' ВІДКРІПЛЕНО':'');}).join(' ; ');}
 TR.dump=function(why,i){var s=window.__trState?window.__trState():{};lg('розкладка',why+' стор.'+i+' | '+rectsOf(i)+' | '+JSON.stringify(s));};
 window.__trDump=TR.dump;
 /* --- стан кадру і аномалії --- */
 function sanity(st){var bad=[],k;for(k in st){var v=st[k];if(typeof v==='number'&&!isFinite(v))bad.push(k+'='+v);}return bad;}
 function rectNaN(el){var r=el.getBoundingClientRect();return!isFinite(r.left)||!isFinite(r.top)||!isFinite(r.width);}
 var lastFrame=performance.now(),slow=0,fcount=0;
 (function tick(t){requestAnimationFrame(tick);if(!TR.on)return;fcount++;var gap=t-lastFrame;lastFrame=t;if(gap>120){slow++;lg('довгий-кадр',R(gap)+' мс '+(window.__trCtx?window.__trCtx():''));}
  if(t-TR.last<500)return;TR.last=t;var st=window.__trState?window.__trState():null;if(!st)return;
  var bad=sanity(st);if(bad.length)lg('АНОМАЛІЯ','нечислове значення: '+bad.join(', '));
  var fps=R(1000*fcount/Math.max(1,(t-(TR.ft||t-500))));TR.ft=t;fcount=0;
  lg('стан','fps '+fps+' повільних '+slow+' '+JSON.stringify(st));slow=0;
  /* перевірка позицій віджетів у папці: фактичне положення на екрані проти очікуваного */
  if(st.fld&&window.__trExpect){var ex=window.__trExpect();ex.forEach(function(q){var key=q.id,dx=q.ax-q.ex,dy=q.ay-q.ey;if(Math.abs(dx)>6||Math.abs(dy)>6)lg('АНОМАЛІЯ','віджет «'+key+'» не там: очікувано '+R(q.ex)+','+R(q.ey)+' фактично '+R(q.ax)+','+R(q.ay)+' (Δ '+R(dx)+','+R(dy)+')'+(q.det?' [відкріплений]':''));
    var pv=TR.prev[key];if(pv&&Math.hypot(q.ax-pv.x,q.ay-pv.y)>260&&!q.det&&!st.anim)lg('АНОМАЛІЯ','віджет «'+key+'» стрибнув на '+R(Math.hypot(q.ax-pv.x,q.ay-pv.y))+' px за 0,5 с без руху користувача');TR.prev[key]={x:q.ax,y:q.ay};});}
  if(st.edit&&t-(TR.ld||0)>2000){TR.ld=t;TR.dump('редагування',st.page);}
 })(performance.now());
 window.__trToggle=function(on){TR.on=on;try{localStorage.setItem('vf-trace',on?'1':'0');}catch(e){}};
 window.__trOn=function(){return TR.on;};
 LG('trace','докладний журнал увімкнено');
})();
