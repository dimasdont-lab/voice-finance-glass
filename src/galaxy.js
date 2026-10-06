/* ---------- Скупчення галактик (пасхалка після чорної діри) ----------
   Скляна кнопка із зірками з'являється вгорі праворуч, коли чорна діра все засмоктала. Тап — 3D-карта скупчення: 9 різних галактик
   (спіральна з 4 рукавами, з баром, еліптична, лінзоподібна, кільцева, пластівцева, 2-рукавна, неправильна, карликова), у кожної
   своя чорна діра (промінь крокує по викривленому простору: відхилення світла, тінь, фотонне кільце, диск, що крутиться, ефект Доплера),
   зорі обертаються навколо ядра, а ядра галактик притягуються (базовий N-тіл із м'яким потенціалом): зорі відчувають приливне притягання
   сусідів, а при зближенні галактики гальмують одна одну й зливаються (чорні діри теж). Кнопка швидкості прискорює час, і наприкінці все
   зливається в одну величезну галактику. Керування: орбіта (1 палець — обертання, 2 — масштаб і зсув, тап по галактиці — перелетіти до неї),
   «Далі ›» — до сусідньої, політ (палець — напрям, кількість пальців — швидкість). Вихід — приглушена скляна кнопка з логотипом в тому ж куті.
   Скляні кнопки малює шейдер скла (другий прохід основного полотна), значки зірок — DOM із світінням і блиманням. */
var GX={on:0,inited:0,mode:'orbit',cv:null,g:null,raf:0,N:0,buf:null,qbuf:null,pS:null,pH:null,uS:{},uH:{},
 yaw:.55,pit:.5,dist:60,tgt:[0,0,0],off:[0,0,0],cam:[0,0,0],spd:0,ptr:{},vy:0,vp:0,lastTap:0,sv:0,t0:0,last:0,btn:null,exit:null,pills:null,m1:null,m2:null,m3:null,m4:null,fadeRaf:0,
 G:[],sel:0,sp:0,T:0,flyT:0,distT:60,info:null,infoKey:'',doneMsg:0};
var GX_RS=1,GX_RIN=3,GX_ROUT=10.5,GX_RB=15,GX_SPD=[1,8,30,120],GX_NG=9,GX_GM=300;

function gxRng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

/* ---------- DOM ---------- */
function gxDom(){
 if(GX.btn)return;
 var st=document.createElement('style');
 st.textContent=
 '#gal{position:fixed;left:0;top:0;width:100%;height:100%;z-index:19;display:none;touch-action:none;background:#02030a;opacity:0;transition:opacity .5s}'+
 'html.lv #gal{position:absolute;height:var(--appH,100%)}'+
 '.gxb{position:fixed;z-index:36;border:0;background:none;padding:0;margin:0;display:none;opacity:0;transition:opacity .4s;-webkit-tap-highlight-color:transparent;color:#fff}'+
 '#gxbtn,#gxexit{right:14px;top:calc(max(env(safe-area-inset-top,0px),14px) + 10px);width:64px;height:64px;border-radius:32px}'+
 '#gxbtn svg{width:46px;height:46px;display:block;margin:9px}'+
 '#gxbtn svg path{transform-box:fill-box;transform-origin:center;animation:gxTw 1.7s ease-in-out infinite;filter:drop-shadow(0 0 3px currentColor) drop-shadow(0 0 7px currentColor)}'+
 '#gxbtn svg path:nth-child(2){animation-delay:.35s;animation-duration:2.1s}#gxbtn svg path:nth-child(3){animation-delay:.8s;animation-duration:1.4s}#gxbtn svg path:nth-child(4){animation-delay:1.1s;animation-duration:1.9s}#gxbtn svg path:nth-child(5){animation-delay:.55s;animation-duration:2.4s}'+
 '@keyframes gxTw{0%,100%{opacity:.35;transform:scale(.72)}45%{opacity:1;transform:scale(1.12)}}'+
 '#gxexit img{width:40px;height:40px;margin:12px;border-radius:10px;display:block;opacity:.5;filter:brightness(.62) saturate(.8)}'+
 '#gxmodes{position:fixed;z-index:36;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 26px);display:flex;justify-content:center;gap:8px;pointer-events:none}'+
 '.gxm{position:relative;width:84px;height:44px;border-radius:22px;font-size:14px;font-weight:650;pointer-events:auto;color:rgba(255,255,255,.55);transition:color .25s}'+
 '.gxm.on{color:#fff}'+
 '#gxinfo{position:fixed;z-index:35;left:16px;top:calc(max(env(safe-area-inset-top,0px),14px) + 22px);max-width:56%;color:rgba(255,255,255,.82);font-size:15px;font-weight:600;line-height:1.25;text-shadow:0 1px 8px rgba(0,0,0,.8);display:none;pointer-events:none}'+
 '#gxinfo small{display:block;font-size:12px;font-weight:500;color:rgba(255,255,255,.55)}';
 document.head.appendChild(st);
 var cv=document.createElement('canvas');cv.id='gal';document.body.appendChild(cv);GX.cv=cv;
 var logo=boot&&boot.logo&&boot.logo.querySelector('img');
 var b=document.createElement('button');b.id='gxbtn';b.className='gxb';b.setAttribute('aria-label','Карта галактик');
 var sp=function(x,y,s,c){var a=s,b=s*.26;return'<path style="color:'+c+'" fill="currentColor" d="M'+x+' '+(y-a)+' L'+(x+b)+' '+(y-b)+' L'+(x+a)+' '+y+' L'+(x+b)+' '+(y+b)+' L'+x+' '+(y+a)+' L'+(x-b)+' '+(y+b)+' L'+(x-a)+' '+y+' L'+(x-b)+' '+(y-b)+'Z"/>';};
 b.innerHTML='<svg viewBox="0 0 48 48">'+sp(17,17,11,'#8fd8ff')+sp(33,13,7,'#ff8fd0')+sp(34,32,10,'#ffd98f')+sp(14,35,7,'#a6ffb0')+sp(24,25,5,'#c2a8ff')+'</svg>';
 document.body.appendChild(b);GX.btn=b;
 var e=document.createElement('button');e.id='gxexit';e.className='gxb';e.setAttribute('aria-label','Вийти з галактик');
 e.innerHTML='<img alt="" src="'+(logo?logo.src:'')+'">';document.body.appendChild(e);GX.exit=e;
 var pl=document.createElement('div');pl.id='gxmodes';
 pl.innerHTML='<button class="gxb gxm on" id="gxm1" style="position:relative;display:block">Орбіта</button><button class="gxb gxm" id="gxm2" style="position:relative;display:block">Політ</button><button class="gxb gxm" id="gxm3" style="position:relative;display:block">Далі ›</button><button class="gxb gxm" id="gxm4" style="position:relative;display:block">×1</button>';
 document.body.appendChild(pl);GX.pills=pl;GX.m1=pl.children[0];GX.m2=pl.children[1];GX.m3=pl.children[2];GX.m4=pl.children[3];pl.style.display='none';
 var inf=document.createElement('div');inf.id='gxinfo';document.body.appendChild(inf);GX.info=inf;
 b.addEventListener('click',function(ev){ev.stopPropagation();gxEnter();});
 e.addEventListener('click',function(ev){ev.stopPropagation();gxExit();});
 GX.m1.addEventListener('click',function(ev){ev.stopPropagation();gxMode('orbit');});
 GX.m2.addEventListener('click',function(ev){ev.stopPropagation();gxMode('fly');});
 GX.m3.addEventListener('click',function(ev){ev.stopPropagation();gxNext();});
 GX.m4.addEventListener('click',function(ev){ev.stopPropagation();gxSpeed();});
}
/* плавне з'явлення/зникнення скляних кнопок (шейдер береться з FBL[i].a) */
function gxFade(list,to,done){
 cancelAnimationFrame(GX.fadeRaf);
 var t0=performance.now(),from=list.map(function(f){return f.a;});
 (function step(){var k=Math.min(1,(performance.now()-t0)/380);list.forEach(function(f,i){f.a=from[i]+(to-from[i])*k;f.el.style.opacity=f.a;});dirty=true;
  if(k<1)GX.fadeRaf=requestAnimationFrame(step);else if(done)done();})();
}
function gxShowBtn(on){
 gxDom();
 if(on){
  if(GX.on)return;
  GX.btn.style.display='block';var f={el:GX.btn,a:0,rad:1};fbSet([f]);requestAnimationFrame(function(){gxFade([f],1);});
 }else{
  if(GX.on)gxExit(true);
  var f2=FBL.filter(function(x){return x.el===GX.btn;});
  if(f2.length)gxFade(f2,0,function(){GX.btn.style.display='none';fbSet([]);});
 }
}

/* ---------- WebGL ---------- */
function gxProg(g,vs,fs){
 function sh(t,s){var o=g.createShader(t);g.shaderSource(o,s);g.compileShader(o);if(!g.getShaderParameter(o,g.COMPILE_STATUS)){LG('galaxy','шейдер: '+g.getShaderInfoLog(o));return null;}return o;}
 var p=g.createProgram(),a=sh(g.VERTEX_SHADER,vs),b=sh(g.FRAGMENT_SHADER,fs);if(!a||!b)return null;
 g.attachShader(p,a);g.attachShader(p,b);g.bindAttribLocation(p,0,'a_p');g.bindAttribLocation(p,1,'a_c');g.bindAttribLocation(p,2,'a_s');g.linkProgram(p);
 if(!g.getProgramParameter(p,g.LINK_STATUS)){LG('galaxy','лінк: '+g.getProgramInfoLog(p));return null;}return p;
}
/* зорі: положення рахуються в шейдері з полярних координат у системі галактики (обертання), ядро галактики — із CPU-фізики; приливне притягання сусідів */
var GX_VS_STAR=[
'attribute vec3 a_p;attribute vec4 a_c;attribute vec3 a_s;',
'uniform vec3 u_cam,u_fwd,u_right,u_up;uniform float u_tan,u_asp,u_t,u_ps,u_hz,u_E,u_T;uniform vec2 u_hc;',
'uniform vec4 u_gp[9];uniform vec3 u_cen[9];uniform mat3 u_mat[9];',
'varying vec4 v_c;',
'void main(){',
' int gi=int(a_s.z+.5);vec4 gp=u_gp[gi];int ro=int(gp.x+.5);',
' float r=a_p.x;float ang=a_p.y+gp.y*(.9/pow(r+4.,.6))*u_T;',
' vec3 L=vec3(r*cos(ang),a_p.z,r*sin(ang));vec3 W=u_cen[ro]+u_mat[gi]*L;',
' vec3 dd=vec3(0.);for(int j=0;j<9;j++){if(j==ro)continue;vec4 gj=u_gp[j];if(gj.w<.5||int(gj.x+.5)!=j)continue;vec3 D=u_cen[j]-W;float d2=dot(D,D)+400.;dd+=D*inversesqrt(d2)*(gj.z*1.1*r*r/d2);}',   /* приливне притягання сусідніх галактик */
' float dl=length(dd);dd*=min(1.,r*.85/(dl+1e-3));W+=dd;',
' vec3 rel=W-u_cam;float z=dot(rel,u_fwd);',
' if(z<.3){gl_Position=vec4(3.,3.,0.,1.);gl_PointSize=0.;v_c=vec4(0.);return;}',
' vec2 n=vec2(dot(rel,u_right)/(z*u_tan*u_asp),dot(rel,u_up)/(z*u_tan));',
' if(z>u_hz){vec2 d=(n-u_hc)*vec2(u_asp,1.);float rr=length(d)+1e-4;float r2=.5*(rr+sqrt(rr*rr+4.*u_E*u_E));n=u_hc+d/rr*r2/vec2(u_asp,1.);}',   /* зорі за дірою: гравітаційна лінза (кільце Ейнштейна) */
' gl_Position=vec4(n,0.,1.);',
' float tw=.7+.3*sin(u_t*a_s.y+a_s.y*40.);',
' gl_PointSize=clamp(a_s.x*u_ps*(30./z+.7),1.,22.*u_ps);',
' v_c=vec4(a_c.rgb*a_c.a*tw*clamp(34./z,.45,1.8),1.);}'].join('\n');
var GX_FS_STAR=['precision mediump float;varying vec4 v_c;',
'void main(){vec2 d=gl_PointCoord*2.-1.;float r=dot(d,d);if(r>1.)discard;float a=exp(-r*3.4);gl_FragColor=vec4(v_c.rgb*a,a);}'].join('\n');
var GX_VS_HOLE='attribute vec3 a_p;uniform vec4 u_box;varying vec2 v_n;void main(){v_n=u_box.xy+a_p.xy*u_box.zw;gl_Position=vec4(v_n,0.,1.);}';
var GX_FS_HOLE=[
'precision highp float;',
'uniform vec3 u_cam,u_fwd,u_right,u_up;uniform float u_tan,u_asp,u_t,u_rs,u_rin,u_rout,u_rb;varying vec2 v_n;',
'float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
'float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}',
'vec3 ramp(float t){t=clamp(t,0.,1.);vec3 a=vec3(.35,.04,.02),b=vec3(1.,.42,.06),c=vec3(1.,.9,.72);return t<.5?mix(a,b,t*2.):mix(b,c,(t-.5)*2.);}',
'void main(){',
' vec3 rd=normalize(u_fwd+v_n.x*u_asp*u_tan*u_right+v_n.y*u_tan*u_up);vec3 ro=u_cam;',
' float b=dot(ro,rd),c=dot(ro,ro)-u_rb*u_rb,hh=b*b-c;',
' if(hh<0.){gl_FragColor=vec4(0.);return;}',
' hh=sqrt(hh);float t0=max(0.,-b-hh),t1=-b+hh;if(t1<=0.){gl_FragColor=vec4(0.);return;}',
' vec3 p=ro+rd*t0,v=rd;vec3 col=vec3(0.);float tr=1.,rmin=1e9;bool cap=false;',
' for(int i=0;i<64;i++){',
'  float r=length(p);rmin=min(rmin,r);',
'  if(r<u_rs){cap=true;break;}',
'  float dt=clamp(.12*r,.05,u_rb*.07);',
'  vec3 L=cross(p,v);float h2=dot(L,L);',
'  vec3 acc=-1.5*u_rs*h2*p/(r*r*r*r*r);',                                   /* відхилення світла: Шварцшильд */
'  vec3 pn=p+v*dt;v=normalize(v+acc*dt);',
'  if(p.y*pn.y<0.){float f=p.y/(p.y-pn.y);vec3 ip=mix(p,pn,f);float rr=length(ip.xz);',
'   if(rr>u_rin&&rr<u_rout){',
'    float phi=atan(ip.z,ip.x);float om=2.8/pow(rr,1.5);float ph2=phi-u_t*om;',   /* диференціальне обертання: внутрішня маса крутиться швидше */
'    float n1=vn(vec2(ph2*3.,rr*1.1)),n2=vn(vec2(ph2*9.,rr*3.2));',
'    float streak=.38+.75*n1+.5*n2;',
'    float w=smoothstep(u_rin,u_rin*1.18,rr)*(1.-smoothstep(u_rout*.7,u_rout,rr));',
'    float temp=pow(u_rin/rr,.8);',
'    vec3 vd=normalize(vec3(-ip.z,0.,ip.x));float dop=1.+.7*dot(vd,-v);',   /* ефект Доплера: бік, що наближається, яскравіший */
'    float em=w*streak*dop*dop*dop;',
'    col+=tr*ramp(temp*(.62+.5*dop))*em*1.7;',
'    tr*=1.-clamp(w*(.5+.4*n1),0.,.9);',
'   }}',
'  p=pn;if(length(p)>u_rb*1.01&&dot(p,v)>0.)break;',
' }',
' float ring=exp(-pow((rmin-u_rs*1.62)/(u_rs*.2),2.));',                       /* фотонне кільце */
' col+=tr*vec3(1.,.82,.58)*ring*.95;',
' float alpha=cap?1.:clamp(1.-tr+ring*.55,0.,1.);if(cap)col=vec3(0.);',
' gl_FragColor=vec4(col,alpha);}'].join('\n');

/* ---------- склад скупчення: типи галактик, зорі, фізика ---------- */
var GX_TYPES=[
 {n:'Дім',t:0,R:50,N:26000,m:30,s:1.0,spin:1,tint:[1,1,1]},
 {n:'Вир',t:6,R:62,N:12000,m:26,s:.95,spin:-1,tint:[.9,1,1.05]},
 {n:'Мандрівник',t:1,R:64,N:12000,m:24,s:.9,spin:1,tint:[1.05,.95,1]},
 {n:'Бурштин',t:2,R:72,N:12000,m:30,s:1.2,spin:.25,tint:[1.1,.98,.85]},
 {n:'Лінза',t:3,R:52,N:9000,m:18,s:.8,spin:-1,tint:[1,1,.95]},
 {n:'Обруч',t:4,R:46,N:8500,m:16,s:.75,spin:1,tint:[.85,1,1.1]},
 {n:'Пластівці',t:5,R:42,N:8000,m:14,s:.7,spin:-1,tint:[1,.92,1.05]},
 {n:'Клякса',t:7,R:36,N:5500,m:10,s:.6,spin:1,tint:[1,1,1]},
 {n:'Іскра',t:8,R:24,N:3500,m:7,s:.5,spin:1,tint:[.8,.95,1.15]}
];
function gxGalaxy(){
 var rnd=gxRng(20261005),G=[],total=0,i;GX_TYPES.forEach(function(q){total+=q.N;});
 var data=new Float32Array(total*10),o=0;
 var pal=[[.55,.75,1],[.7,.62,1],[1,.55,.85],[.6,1,.88],[1,.85,.55],[.8,.9,1]],warm=[[1,.8,.5],[1,.88,.62],[1,.72,.42],[.95,.9,.78]];
 function gs(){return(rnd()+rnd()+rnd()+rnd()-2)*.866;}
 function norm(v){var l=Math.hypot(v[0],v[1],v[2])||1;return[v[0]/l,v[1]/l,v[2]/l];}
 function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
 var GMs=0;GX_TYPES.forEach(function(q){GMs+=q.m;});
 for(i=0;i<GX_TYPES.length;i++){
  var q=GX_TYPES[i],Rg=q.R,gi=i,tn=q.tint,sk=Rg/40,pos,vel;
  /* орієнтація диска: головна — як раніше; решта випадкова */
  var Y=i===0?[0,1,0]:norm([rnd()-.5,.55+rnd()*.8,rnd()-.5]),X=norm(cross(Y,[rnd()-.5,rnd()-.5,rnd()-.5+.3])),Z=cross(X,Y);
  var d=130+rnd()*150,th0=rnd()*6.2832,ph0=Math.acos(rnd()*2-1),dir=norm([Math.sin(ph0)*Math.cos(th0),Math.cos(ph0)*.55,Math.sin(ph0)*Math.sin(th0)]);
  pos=i===0?[0,0,0]:[dir[0]*d,dir[1]*d,dir[2]*d];
  var tv=norm(cross(dir,[0,1,0])),vc=Math.sqrt(GX_GM/d)*.2;vel=i===0?[0,0,0]:[tv[0]*vc-dir[0]*vc*.08,tv[1]*vc-dir[1]*vc*.08,tv[2]*vc-dir[2]*vc*.08];
  G.push({name:q.n,type:q.t,R:Rg,m:q.m,sc:q.s,spin:q.spin,pos:pos,vel:vel,basis:[X[0],X[1],X[2],Y[0],Y[1],Y[2],Z[0],Z[1],Z[2]],root:i,alive:1});
  function put(r,th,y,c,br,sz){data[o++]=r;data[o++]=th;data[o++]=y;data[o++]=Math.min(1.4,c[0]*tn[0]);data[o++]=Math.min(1.4,c[1]*tn[1]);data[o++]=Math.min(1.4,c[2]*tn[2]);data[o++]=br;data[o++]=sz;data[o++]=1+rnd()*4;data[o++]=gi;}
  function putXYZ(x,y,z,c,br,sz){put(Math.hypot(x,z),Math.atan2(z,x),y,c,br,sz);}
  function arm(){return pal[rnd()<.78?(rnd()*4)|0:4];}
  function bulgeStar(rr){var u=rnd()*6.2832,v=rnd()*2-1,s=Math.sqrt(1-v*v);putXYZ(Math.cos(u)*s*rr,v*rr*.6,Math.sin(u)*s*rr,[1,.78+rnd()*.15,.5+rnd()*.2],.4+rnd()*rnd()*1.5,.6+rnd()*rnd()*1.3);}
  function haloStar(){var rr=Rg*(.4+rnd()*1.2),u2=rnd()*6.2832,v3=rnd()*2-1,s2=Math.sqrt(1-v3*v3);putXYZ(Math.cos(u2)*s2*rr,v3*rr*.8,Math.sin(u2)*s2*rr,rnd()<.5?[.8,.85,1]:pal[(rnd()*pal.length)|0],.25+rnd()*rnd(),.5+rnd()*.9);}
  function knot(r,th){putXYZ(Math.cos(th)*r,gs()*sk*.8,Math.sin(th)*r,[1,.45+rnd()*.2,.7],.2+rnd()*.25,5+rnd()*6);}   /* рожеві зоряні області (HII) */
  var n=q.N,k;
  for(k=0;k<n;k++){
   var kk=rnd(),r,th,y;
   if(q.t===0||q.t===6){   /* спіраль: 4 рукави (Дім) або 2 тугі (Вир) */
    var arms=q.t===0?4:2,wind=(q.t===0?.27:.4)/sk,ar=((rnd()*arms)|0)*6.2832/arms;
    if(kk<.52){r=Math.min(Rg*.88,-Math.log(1-rnd()*.985)*Rg*.27+Rg*.14);th=ar+r*wind+gs()*(.26+.012*r/sk);y=gs()*sk*(.5+.9*Math.exp(-r/(18*sk)));putXYZ(Math.cos(th)*r,y,Math.sin(th)*r,arm(),.35+rnd()*rnd()*1.7,(.55+rnd()*rnd()*1.6));}
    else if(kk<.72)bulgeStar(Math.abs(gs())*Rg*.2+Rg*.07);
    else if(kk<.9)haloStar();
    else if(kk<.955){r=Rg*(.18+rnd()*.7);th=ar+r*wind+gs()*.25;putXYZ(Math.cos(th)*r,gs()*1.2*sk,Math.sin(th)*r,pal[(rnd()*5)|0],.16+rnd()*.16,6+rnd()*7);}
    else{r=Rg*(.25+rnd()*.6);knot(r,ar+r*wind+gs()*.15);}
   }else if(q.t===1){      /* спіраль з баром */
    var ba=.7;
    if(kk<.2){var xx=(rnd()*2-1)*Rg*.44,zz=gs()*Rg*.045;putXYZ(Math.cos(ba)*xx-Math.sin(ba)*zz,gs()*sk*.7,Math.sin(ba)*xx+Math.cos(ba)*zz,warm[(rnd()*4)|0],.45+rnd()*rnd()*1.4,.6+rnd()*rnd()*1.3);}
    else if(kk<.7){r=Rg*.42+(-Math.log(1-rnd()*.98))*Rg*.22;var side=rnd()<.5?0:Math.PI;th=ba+side+(r-Rg*.42)*(2.6/Rg)+gs()*.22;if(r>Rg*.95)continue;putXYZ(Math.cos(th)*r,gs()*sk*.6,Math.sin(th)*r,arm(),.35+rnd()*rnd()*1.6,.55+rnd()*rnd()*1.5);}
    else if(kk<.85)bulgeStar(Math.abs(gs())*Rg*.13+Rg*.05);
    else if(kk<.95)haloStar();
    else{r=Rg*(.45+rnd()*.4);knot(r,ba+(rnd()<.5?0:Math.PI)+(r-Rg*.42)*(2.6/Rg));}
   }else if(q.t===2){      /* еліптична: гладка тепла хмара */
    var rr=Rg*.3*Math.pow(-Math.log(1-rnd()*.995),.75),u3=rnd()*6.2832,v4=rnd()*2-1,s3=Math.sqrt(1-v4*v4);
    putXYZ(Math.cos(u3)*s3*rr,v4*rr*.72,Math.sin(u3)*s3*rr,warm[(rnd()*4)|0],.3+rnd()*rnd()*1.3,.55+rnd()*rnd()*1.2);
   }else if(q.t===3){      /* лінзоподібна: диск без рукавів + булдж */
    if(kk<.58){r=Math.min(Rg*.9,-Math.log(1-rnd()*.985)*Rg*.26+Rg*.05);th=rnd()*6.2832;putXYZ(Math.cos(th)*r,gs()*sk*.5,Math.sin(th)*r,warm[(rnd()*4)|0],.3+rnd()*rnd()*1.4,.55+rnd()*rnd()*1.3);}
    else if(kk<.9)bulgeStar(Math.abs(gs())*Rg*.2+Rg*.05);else haloStar();
   }else if(q.t===4){      /* кільцева: блакитне кільце + ядро */
    if(kk<.56){r=Rg*.62+gs()*Rg*.055;th=rnd()*6.2832;putXYZ(Math.cos(th)*r,gs()*sk*.5,Math.sin(th)*r,rnd()<.7?pal[0]:pal[3],.5+rnd()*rnd()*1.8,.6+rnd()*rnd()*1.5);}
    else if(kk<.82)bulgeStar(Math.abs(gs())*Rg*.12+Rg*.03);
    else if(kk<.94){r=-Math.log(1-rnd()*.98)*Rg*.2;th=rnd()*6.2832;putXYZ(Math.cos(th)*r,gs()*sk*.4,Math.sin(th)*r,warm[(rnd()*4)|0],.2+rnd()*.5,.5+rnd()*.7);}
    else haloStar();
   }else if(q.t===5){      /* пластівцева: безліч коротких уривків рукавів */
    if(kk<.7){var seg=(rnd()*16)|0,sr=rnd(),s0=gxRng(seg*977+gi*131),r0=Rg*(.2+s0()*.7),a0=s0()*6.2832;th=a0+(sr-.5)*.9;r=r0*Math.exp((sr-.5)*.28);putXYZ(Math.cos(th)*r,gs()*sk*.5,Math.sin(th)*r+gs()*.6,arm(),.3+rnd()*rnd()*1.5,.55+rnd()*rnd()*1.4);}
    else if(kk<.88){r=-Math.log(1-rnd()*.98)*Rg*.22;th=rnd()*6.2832;putXYZ(Math.cos(th)*r,gs()*sk*.5,Math.sin(th)*r,warm[(rnd()*4)|0],.25+rnd()*.7,.5+rnd()*.9);}
    else bulgeStar(Math.abs(gs())*Rg*.14+Rg*.05);
   }else if(q.t===7){      /* неправильна: клаптики */
    var bl=(rnd()*6)|0,sb=gxRng(bl*313+77),bx=(sb()-.5)*Rg*1.1,bz=(sb()-.5)*Rg*1.1,bs=Rg*(.1+sb()*.16);
    putXYZ(bx+gs()*bs,gs()*bs*.7,bz+gs()*bs,rnd()<.6?pal[(rnd()*4)|0]:warm[(rnd()*4)|0],.3+rnd()*rnd()*1.6,.6+rnd()*rnd()*1.5);
   }else{                  /* компактна карликова */
    var rr2=Math.abs(gs())*Rg*.42+Rg*.02,u4=rnd()*6.2832,v5=rnd()*2-1,s4=Math.sqrt(1-v5*v5);
    putXYZ(Math.cos(u4)*s4*rr2,v5*rr2*.8,Math.sin(u4)*s4*rr2,rnd()<.7?pal[0]:pal[5],.5+rnd()*rnd()*1.8,.6+rnd()*rnd()*1.4);
   }
  }
  /* зорі, пропущені через continue, лишаються нулями: прибираємо їх далеко за кадр */
 }
 /* нульові записи (r=0, яскравість 0) нешкідливі: яскравість 0 */
 var K=GX_GM/GMs;G.forEach(function(g){g.m*=K;});
 GX.G=G;GX.N=total;GX.GM=GX_GM;return data;
}
/* приблизний N-тіл ядер: м'який потенціал, динамічне тертя при зближенні, злиття ядер і чорних дір */
function gxPhys(dts){
 var G=GX.G,steps=Math.max(1,Math.min(24,Math.ceil(dts/.15))),h=dts/steps,eps=18,s,i,j,q;
 for(s=0;s<steps;s++){
  for(i=0;i<G.length;i++){var a=G[i];if(!a.alive)continue;var ax=0,ay=0,az=0;
   for(j=0;j<G.length;j++){var b=G[j];if(i===j||!b.alive)continue;var dx=b.pos[0]-a.pos[0],dy=b.pos[1]-a.pos[1],dz=b.pos[2]-a.pos[2],d2=dx*dx+dy*dy+dz*dz+eps*eps,id=b.m/(d2*Math.sqrt(d2));ax+=dx*id;ay+=dy*id;az+=dz*id;}
   a.ac=[ax,ay,az];}
  for(i=0;i<G.length;i++){var c=G[i];if(!c.alive)continue;for(q=0;q<3;q++){c.vel[q]+=c.ac[q]*h;c.pos[q]+=c.vel[q]*h;}}
  for(i=0;i<G.length;i++){var A=G[i];if(!A.alive)continue;
   for(j=i+1;j<G.length;j++){var B=G[j];if(!B.alive||!A.alive)continue;
    var d=Math.hypot(A.pos[0]-B.pos[0],A.pos[1]-B.pos[1],A.pos[2]-B.pos[2]),rs=A.R+B.R;
    if(d<rs*.9){var mm=A.m+B.m,f=1-Math.exp(-.9*h);for(q=0;q<3;q++){var vc=(A.m*A.vel[q]+B.m*B.vel[q])/mm;A.vel[q]+=(vc-A.vel[q])*f;B.vel[q]+=(vc-B.vel[q])*f;}}
    if(d<rs*.22){var big=A.m>=B.m?A:B,sm=big===A?B:A,m2=A.m+B.m;
     for(q=0;q<3;q++){var np=(A.m*A.pos[q]+B.m*B.pos[q])/m2,nv=(A.m*A.vel[q]+B.m*B.vel[q])/m2;big.pos[q]=np;big.vel[q]=nv;}
     big.m=m2;big.R=Math.sqrt(A.R*A.R+B.R*B.R)*.9;big.sc=Math.cbrt(A.sc*A.sc*A.sc+B.sc*B.sc*B.sc);sm.alive=0;
     var smi=G.indexOf(sm),bgi=G.indexOf(big);G.forEach(function(g){if(g.root===smi)g.root=bgi;});
     LG('galaxy','злиття: «'+sm.name+'» → «'+big.name+'», лишилось '+gxRoots().length);}}}
 }
}
function gxRoots(){var r=[],i;for(i=0;i<GX.G.length;i++)if(GX.G[i].alive)r.push(i);return r;}
function gxInit(){
 if(GX.inited)return true;
 var g=GX.cv.getContext('webgl',{antialias:false,alpha:false,powerPreference:'high-performance'});if(!g){LG('galaxy','WebGL недоступний');return false;}
 GX.g=g;GX.pS=gxProg(g,GX_VS_STAR,GX_FS_STAR);GX.pH=gxProg(g,GX_VS_HOLE,GX_FS_HOLE);if(!GX.pS||!GX.pH)return false;
 ['u_cam','u_fwd','u_right','u_up','u_tan','u_asp','u_t','u_ps','u_hz','u_E','u_hc','u_T','u_gp','u_cen','u_mat'].forEach(function(n){GX.uS[n]=g.getUniformLocation(GX.pS,n);});
 ['u_cam','u_fwd','u_right','u_up','u_tan','u_asp','u_t','u_rs','u_rin','u_rout','u_rb','u_box'].forEach(function(n){GX.uH[n]=g.getUniformLocation(GX.pH,n);});
 GX.buf=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,GX.buf);g.bufferData(g.ARRAY_BUFFER,gxGalaxy(),g.STATIC_DRAW);
 GX.qbuf=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,GX.qbuf);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,0,1,-1,0,-1,1,0,1,1,0]),g.STATIC_DRAW);
 GX.gpA=new Float32Array(36);GX.cenA=new Float32Array(27);GX.matA=new Float32Array(81);
 GX.inited=1;LG('galaxy','готово: '+GX.N+' зірок, '+GX.G.length+' галактик');return true;
}
function gxBasis(){
 var F=[Math.cos(GX.pit)*Math.sin(GX.yaw),-Math.sin(GX.pit),Math.cos(GX.pit)*Math.cos(GX.yaw)];
 var rx=-F[2],rz=F[0],rl=Math.hypot(rx,rz)||1;rx/=rl;rz/=rl;var R2=[rx,0,rz];
 var U=[R2[1]*F[2]-R2[2]*F[1],R2[2]*F[0]-R2[0]*F[2],R2[0]*F[1]-R2[1]*F[0]];
 return{F:F,R:R2,U:U};
}
function gxCenter(i){var g=GX.G[i];return g?g.pos:[0,0,0];}
function gxUpload(){
 var G=GX.G,i;for(i=0;i<GX_NG;i++){var g=G[i];GX.gpA[i*4]=g.root;GX.gpA[i*4+1]=g.spin;GX.gpA[i*4+2]=g.alive?g.m:0;GX.gpA[i*4+3]=g.alive;
  GX.cenA[i*3]=g.pos[0];GX.cenA[i*3+1]=g.pos[1];GX.cenA[i*3+2]=g.pos[2];for(var q=0;q<9;q++)GX.matA[i*9+q]=g.basis[q];}
}
function gxInfo(){
 var r=gxRoots(),g=GX.G[GX.sel],key=GX.sel+'|'+r.length;if(key===GX.infoKey)return;GX.infoKey=key;
 GX.info.innerHTML=(g?g.name:'')+'<small>Галактик: '+r.length+(r.length===1?' · усі злились':'')+'</small>';
 if(r.length===1&&!GX.doneMsg){GX.doneMsg=1;toast('Усі галактики злились в одну');}
}
function gxFrame(t){
 GX.raf=0;if(!GX.on)return;
 var g=GX.g,dt=Math.min(.05,Math.max(.001,(t-GX.last)/1000));GX.last=t;
 var dpr=Math.min(2,window.devicePixelRatio||1),w=Math.round(innerWidth*dpr),h=Math.round(innerHeight*dpr);
 if(GX.cv.width!==w||GX.cv.height!==h){GX.cv.width=w;GX.cv.height=h;}
 /* час і фізика */
 var sd=dt*GX_SPD[GX.sp];GX.T+=sd;gxPhys(sd);
 if(!GX.G[GX.sel].alive)GX.sel=GX.G[GX.sel].root;
 /* інерція обертання */
 if(GX.mode==='orbit'||GX.mode==='fly'){GX.yaw+=GX.vy*dt;GX.pit=Math.max(-1.5,Math.min(1.5,GX.pit+GX.vp*dt));var dm=Math.exp(-dt*(Object.keys(GX.ptr).length?18:3.2));GX.vy*=dm;GX.vp*=dm;}
 var B=gxBasis(),F=B.F;
 if(GX.mode==='fly'){
  var n=Object.keys(GX.ptr).length,tgt=n===0?0:n===1?14:n===2?46:130;GX.spd+=(tgt-GX.spd)*Math.min(1,dt*2.2);
  for(var q=0;q<3;q++)GX.cam[q]+=F[q]*GX.spd*dt;
 }else{
  var cs=gxCenter(GX.sel),k4=Math.min(1,dt*(GX.flyT>0?3.2:9));
  for(var q3=0;q3<3;q3++)GX.tgt[q3]+=(cs[q3]+GX.off[q3]-GX.tgt[q3])*k4;
  if(GX.flyT>0){GX.flyT-=dt;GX.dist+=(GX.distT-GX.dist)*Math.min(1,dt*2.6);}
  for(var q2=0;q2<3;q2++)GX.cam[q2]=GX.tgt[q2]-F[q2]*GX.dist;
 }
 gxUpload();gxInfo();
 var cam=GX.cam,asp=w/h,tan=Math.tan(.5*.96);
 g.viewport(0,0,w,h);g.clearColor(.006,.008,.018,1);g.clear(g.COLOR_BUFFER_BIT);
 /* яка діра зараз найбільша на екрані — вона лінзує зорі за собою */
 var roots=gxRoots(),i,best=-1,bestRho=0,holes=[];
 for(i=0;i<roots.length;i++){var G0=GX.G[roots[i]],rel=[G0.pos[0]-cam[0],G0.pos[1]-cam[1],G0.pos[2]-cam[2]],z=rel[0]*F[0]+rel[1]*F[1]+rel[2]*F[2];
  var hx0=(rel[0]*B.R[0]+rel[1]*B.R[1]+rel[2]*B.R[2]),hy0=(rel[0]*B.U[0]+rel[1]*B.U[1]+rel[2]*B.U[2]);
  var rho=z>.3?GX_RB*G0.sc/(z*tan):0;holes.push({i:roots[i],z:z,hc:z>.3?[hx0/(z*tan*asp),hy0/(z*tan)]:[9,9],rho:rho,d:Math.hypot(rel[0],rel[1],rel[2])});
  if(rho>bestRho){bestRho=rho;best=holes.length-1;}}
 var hz=1e9,hc=[9,9],E=0;if(best>=0){var hb=holes[best];hz=hb.z;hc=hb.hc;E=2.6*GX_RS*GX.G[hb.i].sc/(hb.z*tan);}
 g.enable(g.BLEND);g.blendFunc(g.ONE,g.ONE);
 g.useProgram(GX.pS);var u=GX.uS;
 g.uniform3fv(u.u_cam,cam);g.uniform3fv(u.u_fwd,F);g.uniform3fv(u.u_right,B.R);g.uniform3fv(u.u_up,B.U);
 g.uniform1f(u.u_tan,tan);g.uniform1f(u.u_asp,asp);g.uniform1f(u.u_t,(t/1000)%1000);g.uniform1f(u.u_ps,h/812);g.uniform1f(u.u_hz,hz);g.uniform1f(u.u_E,E);g.uniform2fv(u.u_hc,hc);g.uniform1f(u.u_T,GX.T);
 g.uniform4fv(u.u_gp,GX.gpA);g.uniform3fv(u.u_cen,GX.cenA);g.uniformMatrix3fv(u.u_mat,false,GX.matA);
 g.bindBuffer(g.ARRAY_BUFFER,GX.buf);
 g.enableVertexAttribArray(0);g.enableVertexAttribArray(1);g.enableVertexAttribArray(2);
 g.vertexAttribPointer(0,3,g.FLOAT,false,40,0);g.vertexAttribPointer(1,4,g.FLOAT,false,40,12);g.vertexAttribPointer(2,3,g.FLOAT,false,40,28);
 g.drawArrays(g.POINTS,0,GX.N);
 /* чорні діри: від дальніх до ближніх; промінь рахується в системі галактики (її площа диска) */
 holes.sort(function(a,b){return b.d-a.d;});
 g.blendFunc(g.ONE,g.ONE_MINUS_SRC_ALPHA);g.useProgram(GX.pH);var v=GX.uH;
 g.bindBuffer(g.ARRAY_BUFFER,GX.qbuf);g.disableVertexAttribArray(1);g.disableVertexAttribArray(2);g.enableVertexAttribArray(0);g.vertexAttribPointer(0,3,g.FLOAT,false,12,0);
 for(i=0;i<holes.length;i++){var H=holes[i],G1=GX.G[H.i],s1=G1.sc,rb=GX_RB*s1;
  var inside=H.d<=rb*1.02;if(!inside&&(H.z<=.3||H.rho<.004))continue;
  var rel2=[cam[0]-G1.pos[0],cam[1]-G1.pos[1],cam[2]-G1.pos[2]],bs=G1.basis;
  function toL(a){return[bs[0]*a[0]+bs[1]*a[1]+bs[2]*a[2],bs[3]*a[0]+bs[4]*a[1]+bs[5]*a[2],bs[6]*a[0]+bs[7]*a[1]+bs[8]*a[2]];}
  var cl=toL(rel2),fl=toL(F),rl=toL(B.R),ul=toL(B.U);
  var box=inside?[0,0,1,1]:[Math.max(-1,Math.min(1,H.hc[0])),Math.max(-1,Math.min(1,H.hc[1])),Math.min(1.2,H.rho*1.08/asp),Math.min(1.2,H.rho*1.08)];
  g.uniform3f(v.u_cam,cl[0]/s1,cl[1]/s1,cl[2]/s1);g.uniform3fv(v.u_fwd,fl);g.uniform3fv(v.u_right,rl);g.uniform3fv(v.u_up,ul);
  g.uniform1f(v.u_tan,tan);g.uniform1f(v.u_asp,asp);g.uniform1f(v.u_t,(t/1000)%1000);g.uniform1f(v.u_rs,GX_RS);g.uniform1f(v.u_rin,GX_RIN);g.uniform1f(v.u_rout,GX_ROUT);g.uniform1f(v.u_rb,GX_RB);
  g.uniform4f(v.u_box,box[0],box[1],box[2],box[3]);
  g.drawArrays(g.TRIANGLE_STRIP,0,4);
 }
 g.disable(g.BLEND);
 GX.raf=requestAnimationFrame(gxFrame);
}

/* ---------- керування ---------- */
function gxPtrs(){var a=[],k;for(k in GX.ptr)a.push(GX.ptr[k]);return a;}
function gxReset(){GX.yaw=.55;GX.pit=.5;GX.sel=GX.G[0].alive?0:GX.G[0].root;GX.dist=62;GX.distT=62;GX.flyT=0;GX.off=[0,0,0];GX.tgt=gxCenter(GX.sel).slice();GX.vy=GX.vp=0;if(GX.mode==='fly')gxMode('orbit');}
function gxMode(m){
 if(m===GX.mode)return;
 var B=gxBasis();
 if(m==='fly'){GX.cam=[GX.tgt[0]-B.F[0]*GX.dist,GX.tgt[1]-B.F[1]*GX.dist,GX.tgt[2]-B.F[2]*GX.dist];GX.spd=0;}
 else{   /* повернення на орбіту: найближча галактика стає ціллю */
  var roots=gxRoots(),bi=roots[0],bd=1e9,i;for(i=0;i<roots.length;i++){var c=gxCenter(roots[i]),dd=Math.hypot(c[0]-GX.cam[0],c[1]-GX.cam[1],c[2]-GX.cam[2]);if(dd<bd){bd=dd;bi=roots[i];}}
  var cc=gxCenter(bi),vx=GX.cam[0]-cc[0],vy2=GX.cam[1]-cc[1],vz=GX.cam[2]-cc[2],cl=Math.hypot(vx,vy2,vz)||1;
  GX.sel=bi;GX.off=[0,0,0];GX.tgt=cc.slice();GX.dist=Math.max(4,Math.min(600,cl));GX.distT=GX.dist;GX.yaw=Math.atan2(-vx,-vz);GX.pit=Math.asin(Math.max(-1,Math.min(1,vy2/cl)));}
 GX.mode=m;GX.m1.classList.toggle('on',m==='orbit');GX.m2.classList.toggle('on',m==='fly');
 FBL.forEach(function(f){if(f.el===GX.m1)f.a=m==='orbit'?1:.55;if(f.el===GX.m2)f.a=m==='fly'?1:.55;});dirty=true;
}
function gxFlyTo(i){   /* плавний переліт орбітальної камери до галактики i */
 if(GX.mode==='fly')gxMode('orbit');
 GX.sel=i;GX.off=[0,0,0];GX.flyT=1.6;GX.distT=Math.max(26,GX.G[i].R*2.4);GX.infoKey='';
}
function gxNext(){
 var r=gxRoots();if(!r.length)return;var k=r.indexOf(GX.sel);gxFlyTo(r[(k+1)%r.length]);
}
function gxSpeed(){
 GX.sp=(GX.sp+1)%GX_SPD.length;GX.m4.textContent='×'+GX_SPD[GX.sp];dirty=true;
}
function gxPick(x,y){   /* найближча до тапу галактика на екрані (в межах 70 px) */
 var cam=GX.cam,B=gxBasis(),F=B.F,asp=innerWidth/innerHeight,tan=Math.tan(.5*.96),r=gxRoots(),bi=-1,bd=70,i;
 if(GX.mode==='orbit'){var cs=gxCenter(GX.sel);for(i=0;i<3;i++)cam=[GX.tgt[0]-F[0]*GX.dist,GX.tgt[1]-F[1]*GX.dist,GX.tgt[2]-F[2]*GX.dist];}
 for(i=0;i<r.length;i++){var c=gxCenter(r[i]),rel=[c[0]-cam[0],c[1]-cam[1],c[2]-cam[2]],z=rel[0]*F[0]+rel[1]*F[1]+rel[2]*F[2];if(z<.3)continue;
  var nx=(rel[0]*B.R[0]+rel[1]*B.R[1]+rel[2]*B.R[2])/(z*tan*asp),ny=(rel[0]*B.U[0]+rel[1]*B.U[1]+rel[2]*B.U[2])/(z*tan);
  var sx=(nx*.5+.5)*innerWidth,sy=(.5-ny*.5)*innerHeight,d=Math.hypot(sx-x,sy-y),rad=Math.max(0,GX.G[r[i]].R/(z*tan)*innerHeight*.5);
  var dd=Math.max(0,d-rad*.6);if(dd<bd){bd=dd;bi=r[i];}}
 return bi;
}
function gxBind(){
 var cv=GX.cv;
 cv.addEventListener('pointerdown',function(e){
  e.preventDefault();try{cv.setPointerCapture(e.pointerId);}catch(x){}
  GX.ptr[e.pointerId]={x:e.clientX,y:e.clientY,px:e.clientX,py:e.clientY,sx:e.clientX,sy:e.clientY,t0:performance.now(),mv:0};GX.vy=GX.vp=0;
  var now=performance.now();if(Object.keys(GX.ptr).length===1){if(now-GX.lastTap<300){gxReset();GX.ptr[e.pointerId].mv=99;}GX.lastTap=now;}
 });
 cv.addEventListener('pointermove',function(e){
  var p=GX.ptr[e.pointerId];if(!p)return;e.preventDefault();
  var ps=gxPtrs(),n=ps.length,dx=e.clientX-p.x,dy=e.clientY-p.y;p.mv+=Math.abs(dx)+Math.abs(dy);
  if(n===1){
   GX.yaw+=dx*(GX.mode==='fly'?-.0046:-.0058);GX.pit=Math.max(-1.5,Math.min(1.5,GX.pit+dy*.0058*(GX.mode==='fly'?-1:1)));
   GX.vy=(dx*(GX.mode==='fly'?-.0046:-.0058))*60;GX.vp=(dy*.0058*(GX.mode==='fly'?-1:1))*60;
  }else if(n>=2&&GX.mode==='orbit'){
   var a=ps[0],b=ps[1],d0=Math.hypot(a.x-b.x,a.y-b.y);p.x=e.clientX;p.y=e.clientY;var d1=Math.hypot(a.x-b.x,a.y-b.y);
   if(d0>8&&d1>8){GX.dist=Math.max(3.2,Math.min(600,GX.dist*d0/d1));GX.flyT=0;}
   var B=gxBasis(),k=GX.dist*.0016*(innerHeight/812),cx=dx/2,cy=dy/2;   /* зсув центру орбіти двома пальцями */
   for(var q=0;q<3;q++)GX.off[q]-=(B.R[q]*cx-B.U[q]*cy)*k;
  }
  p.px=p.x;p.py=p.y;p.x=e.clientX;p.y=e.clientY;
 });
 function up(e){
  var p=GX.ptr[e.pointerId];
  if(p&&e.type==='pointerup'&&p.mv<10&&performance.now()-p.t0<380&&Object.keys(GX.ptr).length===1&&GX.mode==='orbit'){var pk=gxPick(e.clientX,e.clientY);if(pk>=0&&pk!==GX.sel)gxFlyTo(pk);}
  delete GX.ptr[e.pointerId];
 }
 cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
 cv.addEventListener('wheel',function(e){e.preventDefault();GX.dist=Math.max(3.2,Math.min(600,GX.dist*Math.exp(e.deltaY*.0012)));GX.flyT=0;},{passive:false});
}

/* ---------- вхід і вихід ---------- */
function gxEnter(){
 if(GX.on)return;
 gxDom();if(!gxInit()){toast('Карта галактик недоступна на цьому пристрої');return;}
 if(!GX.bound){gxBind();GX.bound=1;}
 GX.on=1;lensClearAll();GX.sv=scrimT;scrimT=1;dirty=true;   /* скло кнопок заломлює чорне тло, а не сітку */
 GX.mode='orbit';GX.m1.classList.add('on');GX.m2.classList.remove('on');gxReset();GX.cam=[0,0,0];GX.spd=0;GX.infoKey='';
 var cv=GX.cv;cv.style.display='block';requestAnimationFrame(function(){cv.style.opacity=1;});
 var fb=[{el:GX.exit,a:0,rad:1},{el:GX.m1,a:0,rad:1},{el:GX.m2,a:0,rad:1},{el:GX.m3,a:0,rad:1},{el:GX.m4,a:0,rad:1}];
 GX.exit.style.display='block';GX.pills.style.display='flex';GX.m1.style.display='block';GX.m2.style.display='block';GX.m3.style.display='block';GX.m4.style.display='block';GX.info.style.display='block';
 fbSet(fb);GX.btn.style.opacity=0;GX.btn.style.display='none';
 gxFade(fb,1,function(){fb[2].a=.55;dirty=true;});
 GX.t0=performance.now();GX.last=GX.t0;if(!GX.raf)GX.raf=requestAnimationFrame(gxFrame);
 LG('galaxy','вхід у карту скупчення');
}
function gxExit(silent){
 if(!GX.on)return;
 GX.on=0;GX.ptr={};scrimT=GX.sv||0;dirty=true;GX.info.style.display='none';
 var cv=GX.cv;cv.style.opacity=0;setTimeout(function(){if(!GX.on)cv.style.display='none';},520);
 var list=FBL.slice();
 gxFade(list,0,function(){GX.exit.style.display='none';GX.pills.style.display='none';fbSet([]);
  if(!silent&&BH.ph===3){GX.btn.style.display='block';var f={el:GX.btn,a:0,rad:1};fbSet([f]);gxFade([f],1);}});
 LG('galaxy','вихід з карти скупчення');
}

window.__gx=function(ds){if(ds){gxPhys(ds);GX.T+=ds;}return{T:Math.round(GX.T),roots:gxRoots().length,sel:GX.sel,g:GX.G.map(function(g){return[g.name,g.alive,Math.round(g.pos[0]),Math.round(g.pos[1]),Math.round(g.pos[2]),Math.round(g.m)];})};};
