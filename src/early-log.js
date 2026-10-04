/* Журнал запуску: стартує в <head> до основного коду. Записує розміри вікна щокадру (перші 8 с, лише зміни), події вікна,
   помилки, проби CSS-одиниць і безпечних зон. Зберігає останні 4 запуски в localStorage ('vf-log'); експорт через window.__vfExport(). */
(function(){
 var KEY='vf-log',MAXL=1500,sid=Date.now().toString(36),lines=[],ov=null,dbg=false;
 try{dbg=!!localStorage.getItem('vf-debug')||/[?&]debug/.test(location.search);}catch(e){}
 function ms(){return Math.round(performance.now());}
 function vvs(){var v=window.visualViewport;return v?Math.round(v.width)+'x'+Math.round(v.height)+'@'+Math.round(v.offsetTop):'-';}
 function snap(){var d=document.documentElement;return 'in '+innerWidth+'x'+innerHeight+' out '+outerWidth+'x'+outerHeight+' vv '+vvs()+' sy '+Math.round(window.scrollY||0)+' ch '+(d?d.clientHeight:'-');}
 function log(tag,msg){var s=ms()+' '+tag+(msg!==undefined&&msg!==''?' '+msg:'');lines.push(s);if(lines.length>MAXL)lines.splice(0,lines.length-MAXL);if(ov)ov.textContent=s+'\n'+snap();}
 function save(){try{var all=JSON.parse(localStorage.getItem(KEY)||'[]');all=all.filter(function(x){return x.id!==sid;});all.push({id:sid,at:new Date(Date.now()-performance.now()).toISOString(),lines:lines});while(all.length>4)all.shift();localStorage.setItem(KEY,JSON.stringify(all));}catch(e){}}
 function exportText(){save();var all=[];try{all=JSON.parse(localStorage.getItem(KEY)||'[]');}catch(e){}
  return 'Voice Finance Glass — журнал запуску (нові запуски зверху)\n\n'+all.slice().reverse().map(function(x){return '===== запуск '+x.at+' ('+x.id+') =====\n'+x.lines.join('\n');}).join('\n\n');}
 window.__vfLog=log;window.__vfSnap=snap;window.__vfSave=save;window.__vfExport=exportText;window.__vfLines=lines;
 window.__vfFirstH=innerHeight;
 var nav=(performance.getEntriesByType&&performance.getEntriesByType('navigation')[0])||{};
 var mv=document.querySelector('meta[name=viewport]'),ms2=document.querySelector('meta[name=apple-mobile-web-app-status-bar-style]');
 log('start','збірка '+(window.__VF_BUILD||'?'));
 log('ua',navigator.userAgent);
 log('env','standalone='+navigator.standalone+' display-mode='+(matchMedia('(display-mode: standalone)').matches?'standalone':matchMedia('(display-mode: fullscreen)').matches?'fullscreen':'browser')+' dpr='+devicePixelRatio+' screen='+screen.width+'x'+screen.height+' nav='+(nav.type||'?')+' vis='+document.visibilityState+' url='+location.pathname+location.search);
 log('meta','viewport="'+(mv?mv.getAttribute('content'):'-')+'" status-bar="'+(ms2?ms2.getAttribute('content'):'-')+'"');
 log('vp',snap());
 if(navigator.standalone&&screen.height-innerHeight>=40)log('ДІАГНОЗ','перший кадр: вікно '+innerHeight+' при екрані '+screen.height+' — iOS запустив застосунок з геометрією непрозорого статус-бару (іконка, ймовірно, збережена зі старим стилем)');
 ['resize','orientationchange','pageshow','pagehide','focus','blur','scroll','load'].forEach(function(n){
  window.addEventListener(n,function(e){log('ev:'+n,(e&&e.persisted!==undefined?'persisted='+e.persisted+' ':'')+snap());if(n==='pagehide')save();},true);});
 document.addEventListener('DOMContentLoaded',function(){log('ev:DOMContentLoaded',snap());},true);
 document.addEventListener('visibilitychange',function(){log('ev:visibility',document.visibilityState+' '+snap());if(document.visibilityState==='hidden')save();},true);
 if(window.visualViewport){visualViewport.addEventListener('resize',function(){log('vv:resize',snap());});visualViewport.addEventListener('scroll',function(){log('vv:scroll',snap());});}
 window.addEventListener('error',function(e){log('ПОМИЛКА',(e.message||'')+' @'+(e.filename||'').split('/').pop()+':'+(e.lineno||0)+':'+(e.colno||0));},true);
 window.addEventListener('unhandledrejection',function(e){log('ПОМИЛКА promise',String(e&&e.reason));});
 ['error','warn'].forEach(function(k){var o=console[k];console[k]=function(){try{log('console.'+k,[].map.call(arguments,function(a){return a&&a.stack?a.stack:String(a);}).join(' ').slice(0,600));}catch(e){}return o.apply(console,arguments);};});
 var n=0;['pointerdown','touchstart'].forEach(function(k){window.addEventListener(k,function(e){if(n++<12){var p=e.touches?e.touches[0]:e;log('ev:'+k,'x '+Math.round(p.clientX)+' y '+Math.round(p.clientY)+' '+snap());}},{capture:true,passive:true});});
 /* проби: безпечні зони, CSS-одиниці висоти, положення ключових елементів */
 function probe(when){
  if(!document.body)return;
  var q=document.createElement('div'),r={};q.style.cssText='position:fixed;left:0;top:0;width:0;visibility:hidden;pointer-events:none';document.body.appendChild(q);
  [['safeT','env(safe-area-inset-top,0px)'],['safeB','env(safe-area-inset-bottom,0px)'],['vh','100vh'],['svh','100svh'],['lvh','100lvh'],['dvh','100dvh'],['pct','100%']].forEach(function(x){q.style.height=x[1];r[x[0]]=q.offsetHeight;});
  q.remove();
  var els=['bg','pages','dock','gl','glt','ticker','boot'].map(function(id){var e=document.getElementById(id);if(!e)return id+':-';var b=e.getBoundingClientRect();return id+':'+Math.round(b.top)+'+'+Math.round(b.height)+(getComputedStyle(e).display==='none'?'(hidden)':'');}).join(' ');
  var lg=document.querySelector('#boot .blogo'),lb=lg?lg.getBoundingClientRect():null;
  log('probe@'+when,'safe '+r.safeT+'/'+r.safeB+' vh '+r.vh+' svh '+r.svh+' lvh '+r.lvh+' dvh '+r.dvh+' 100% '+r.pct+' | '+els+(lb?' logoC '+Math.round(lb.left+lb.width/2)+','+Math.round(lb.top+lb.height/2):'')+' | '+snap());
 }
 document.addEventListener('DOMContentLoaded',function(){probe('dcl');},true);
 [300,1000,2500,5000,9000].forEach(function(t){setTimeout(function(){probe(t+'ms');},t);});
 /* вибірка щокадру перші 8 с: пишемо лише зміни */
 var last='',fr=0,T0=performance.now();
 (function tick(){fr++;if(fr%4===1){var s=snap();if(s!==last){last=s;log('кадр#'+fr,s);}}if(performance.now()-T0<8000)requestAnimationFrame(tick);else log('вибірка-кінець','кадрів '+fr);})();
 var sv=setInterval(save,3000);setTimeout(function(){clearInterval(sv);save();},16000);
 /* живий рядок на екрані під час запуску (якщо діагностику ввімкнено) — для запису екрана */
 if(dbg){var mk=function(){if(ov||!document.body)return;ov=document.createElement('pre');ov.style.cssText='position:fixed;left:6px;right:6px;bottom:calc(env(safe-area-inset-bottom,0px) + 100px);z-index:100;margin:0;padding:5px 7px;border-radius:8px;background:rgba(0,0,0,.8);color:#ff0;font:10px/1.3 ui-monospace,Menlo,monospace;pointer-events:none;white-space:pre-wrap';document.body.appendChild(ov);ov.textContent=snap();};
  document.addEventListener('DOMContentLoaded',mk,true);setTimeout(mk,0);setTimeout(function(){if(ov){ov.remove();ov=null;}},12000);}
})();
