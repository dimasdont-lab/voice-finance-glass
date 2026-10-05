/* ---------- Карта галактики (пасхалка після чорної діри) ----------
   Скляна кнопка із зірками з'являється вгорі праворуч, коли чорна діра все засмоктала. Тап — карта: ~36 тис. зірок-точок у 3D
   (одним викликом gl.POINTS, адитивно), у центрі чорна діра: промінь крокує по викривленому простору (бічне відхилення світла,
   тінь, фотонне кільце, акреційний диск, що крутиться), а зорі за дірою гравітаційно лінзуються. Керування: орбіта (1 палець — обертання,
   2 — масштаб і зсув) або політ (палець — напрям, кількість пальців — швидкість). Вихід — приглушена скляна кнопка з логотипом в тому ж куті.
   Скляні кнопки малює шейдер скла (другий прохід основного полотна), значки зірок — DOM із світінням і блиманням. */
var GX={on:0,inited:0,mode:'orbit',cv:null,g:null,raf:0,N:0,buf:null,qbuf:null,pS:null,pH:null,uS:{},uH:{},
 yaw:.55,pit:.5,dist:48,tgt:[0,0,0],cam:[0,0,0],spd:0,ptr:{},vy:0,vp:0,lastTap:0,sv:0,t0:0,last:0,btn:null,exit:null,pills:null,m1:null,m2:null,fadeRaf:0};
var GX_RS=1,GX_RIN=3,GX_ROUT=10.5,GX_RB=15;

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
 '#gxmodes{position:fixed;z-index:36;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 26px);display:flex;justify-content:center;gap:14px;pointer-events:none}'+
 '.gxm{position:relative;width:118px;height:46px;border-radius:23px;font-size:15px;font-weight:650;pointer-events:auto;color:rgba(255,255,255,.55);transition:color .25s}'+
 '.gxm.on{color:#fff}';
 document.head.appendChild(st);
 var cv=document.createElement('canvas');cv.id='gal';document.body.appendChild(cv);GX.cv=cv;
 var logo=boot&&boot.logo&&boot.logo.querySelector('img');
 var b=document.createElement('button');b.id='gxbtn';b.className='gxb';b.setAttribute('aria-label','Карта галактики');
 var sp=function(x,y,s,c){var a=s,b=s*.26;return'<path style="color:'+c+'" fill="currentColor" d="M'+x+' '+(y-a)+' L'+(x+b)+' '+(y-b)+' L'+(x+a)+' '+y+' L'+(x+b)+' '+(y+b)+' L'+x+' '+(y+a)+' L'+(x-b)+' '+(y+b)+' L'+(x-a)+' '+y+' L'+(x-b)+' '+(y-b)+'Z"/>';};
 b.innerHTML='<svg viewBox="0 0 48 48">'+sp(17,17,11,'#8fd8ff')+sp(33,13,7,'#ff8fd0')+sp(34,32,10,'#ffd98f')+sp(14,35,7,'#a6ffb0')+sp(24,25,5,'#c2a8ff')+'</svg>';
 document.body.appendChild(b);GX.btn=b;
 var e=document.createElement('button');e.id='gxexit';e.className='gxb';e.setAttribute('aria-label','Вийти з галактики');
 e.innerHTML='<img alt="" src="'+(logo?logo.src:'')+'">';document.body.appendChild(e);GX.exit=e;
 var pl=document.createElement('div');pl.id='gxmodes';
 pl.innerHTML='<button class="gxb gxm on" id="gxm1" style="position:relative;display:block">Орбіта</button><button class="gxb gxm" id="gxm2" style="position:relative;display:block">Політ</button>';
 document.body.appendChild(pl);GX.pills=pl;GX.m1=pl.children[0];GX.m2=pl.children[1];pl.style.display='none';
 b.addEventListener('click',function(ev){ev.stopPropagation();gxEnter();});
 e.addEventListener('click',function(ev){ev.stopPropagation();gxExit();});
 GX.m1.addEventListener('click',function(ev){ev.stopPropagation();gxMode('orbit');});
 GX.m2.addEventListener('click',function(ev){ev.stopPropagation();gxMode('fly');});
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
var GX_VS_STAR=[
'attribute vec3 a_p;attribute vec4 a_c;attribute vec2 a_s;',
'uniform vec3 u_cam,u_fwd,u_right,u_up;uniform float u_tan,u_asp,u_t,u_ps,u_hz,u_E;uniform vec2 u_hc;',
'varying vec4 v_c;',
'void main(){vec3 rel=a_p-u_cam;float z=dot(rel,u_fwd);',
' if(z<.3){gl_Position=vec4(3.,3.,0.,1.);gl_PointSize=0.;v_c=vec4(0.);return;}',
' vec2 n=vec2(dot(rel,u_right)/(z*u_tan*u_asp),dot(rel,u_up)/(z*u_tan));',
' if(z>u_hz){vec2 d=(n-u_hc)*vec2(u_asp,1.);float r=length(d)+1e-4;float r2=.5*(r+sqrt(r*r+4.*u_E*u_E));n=u_hc+d/r*r2/vec2(u_asp,1.);}',   /* зорі за дірою: гравітаційна лінза (кільце Ейнштейна) */
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

function gxGalaxy(){
 var N=36000,rnd=gxRng(20261005),data=new Float32Array(N*9),i,o=0;
 var pal=[[.55,.75,1],[.7,.62,1],[1,.55,.85],[.6,1,.88],[1,.85,.55],[.8,.9,1]];
 function put(x,y,z,c,br,sz){data[o++]=x;data[o++]=y;data[o++]=z;data[o++]=c[0];data[o++]=c[1];data[o++]=c[2];data[o++]=br;data[o++]=sz;data[o++]=1+rnd()*4;}
 function gs(){return(rnd()+rnd()+rnd()+rnd()-2)*.866;}
 for(i=0;i<N;i++){
  var k=rnd(),r,th,y,c,br,sz;
  if(k<.56){            /* диск зі спіральними рукавами */
   r=Math.min(40,-Math.log(1-rnd()*.985)*11+GX_ROUT*.55);var arm=(rnd()*4)|0;th=arm*1.5708+r*.27+gs()*(.28+.012*r);
   y=gs()*(.5+.9*Math.exp(-r/18));c=rnd()<.78?pal[(rnd()*4)|0]:pal[4];br=.35+rnd()*rnd()*1.7;sz=.55+rnd()*rnd()*1.6;
   put(Math.cos(th)*r,y,Math.sin(th)*r,c,br,sz);
  }else if(k<.78){      /* зоряна кулька-балдж довкола діри */
   r=Math.abs(gs())*8.5+GX_ROUT*.3;var u=rnd()*6.2832,v2=rnd()*2-1,s=Math.sqrt(1-v2*v2);y=v2*r*.6;
   c=[1,.78+rnd()*.15,.5+rnd()*.2];br=.4+rnd()*rnd()*1.5;sz=.6+rnd()*rnd()*1.3;put(Math.cos(u)*s*r,y,Math.sin(u)*s*r,c,br,sz);
  }else if(k<.96){      /* гало */
   r=16+rnd()*48;var u2=rnd()*6.2832,v3=rnd()*2-1,s2=Math.sqrt(1-v3*v3);
   c=rnd()<.5?[.8,.85,1]:pal[(rnd()*pal.length)|0];br=.25+rnd()*rnd();sz=.5+rnd()*.9;put(Math.cos(u2)*s2*r,v3*r*.8,Math.sin(u2)*s2*r,c,br,sz);
  }else{                /* великі м'які хмарки-туманності вздовж рукавів */
   r=8+rnd()*28;th=((rnd()*4)|0)*1.5708+r*.27+gs()*.25;c=pal[(rnd()*5)|0];put(Math.cos(th)*r,gs()*1.2,Math.sin(th)*r,c,.16+rnd()*.16,6+rnd()*7);
  }
 }
 GX.N=N;return data;
}
function gxInit(){
 if(GX.inited)return true;
 var g=GX.cv.getContext('webgl',{antialias:false,alpha:false,powerPreference:'high-performance'});if(!g){LG('galaxy','WebGL недоступний');return false;}
 GX.g=g;GX.pS=gxProg(g,GX_VS_STAR,GX_FS_STAR);GX.pH=gxProg(g,GX_VS_HOLE,GX_FS_HOLE);if(!GX.pS||!GX.pH)return false;
 var names=['u_cam','u_fwd','u_right','u_up','u_tan','u_asp','u_t','u_ps','u_hz','u_E','u_hc'];names.forEach(function(n){GX.uS[n]=g.getUniformLocation(GX.pS,n);});
 ['u_cam','u_fwd','u_right','u_up','u_tan','u_asp','u_t','u_rs','u_rin','u_rout','u_rb','u_box'].forEach(function(n){GX.uH[n]=g.getUniformLocation(GX.pH,n);});
 GX.buf=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,GX.buf);g.bufferData(g.ARRAY_BUFFER,gxGalaxy(),g.STATIC_DRAW);
 GX.qbuf=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,GX.qbuf);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,0,1,-1,0,-1,1,0,1,1,0]),g.STATIC_DRAW);
 GX.inited=1;LG('galaxy','готово: '+GX.N+' зірок');return true;
}
function gxBasis(){
 var F=[Math.cos(GX.pit)*Math.sin(GX.yaw),-Math.sin(GX.pit),Math.cos(GX.pit)*Math.cos(GX.yaw)];
 var rx=-F[2],rz=F[0],rl=Math.hypot(rx,rz)||1;rx/=rl;rz/=rl;var R2=[rx,0,rz];
 var U=[R2[1]*F[2]-R2[2]*F[1],R2[2]*F[0]-R2[0]*F[2],R2[0]*F[1]-R2[1]*F[0]];
 return{F:F,R:R2,U:U};
}
function gxFrame(t){
 GX.raf=0;if(!GX.on)return;
 var g=GX.g,dt=Math.min(.05,Math.max(.001,(t-GX.last)/1000));GX.last=t;
 var dpr=Math.min(2,window.devicePixelRatio||1),w=Math.round(innerWidth*dpr),h=Math.round(innerHeight*dpr);
 if(GX.cv.width!==w||GX.cv.height!==h){GX.cv.width=w;GX.cv.height=h;}
 /* інерція обертання */
 if(GX.mode==='orbit'||GX.mode==='fly'){GX.yaw+=GX.vy*dt;GX.pit=Math.max(-1.5,Math.min(1.5,GX.pit+GX.vp*dt));var dm=Math.exp(-dt*(Object.keys(GX.ptr).length?18:3.2));GX.vy*=dm;GX.vp*=dm;}
 var B=gxBasis(),F=B.F;
 if(GX.mode==='fly'){
  var n=Object.keys(GX.ptr).length,tgt=n===0?0:n===1?14:n===2?46:130;GX.spd+=(tgt-GX.spd)*Math.min(1,dt*2.2);
  for(var q=0;q<3;q++)GX.cam[q]+=F[q]*GX.spd*dt;
 }else{
  for(var q2=0;q2<3;q2++)GX.cam[q2]=GX.tgt[q2]-F[q2]*GX.dist;
 }
 var cam=GX.cam,asp=w/h,tan=Math.tan(.5*.96);
 g.viewport(0,0,w,h);g.clearColor(.006,.008,.018,1);g.clear(g.COLOR_BUFFER_BIT);
 var zh=-(cam[0]*F[0]+cam[1]*F[1]+cam[2]*F[2]);   /* глибина діри (початок координат) вздовж погляду */
 var hx=-(cam[0]*B.R[0]+cam[1]*B.R[1]+cam[2]*B.R[2]),hy=-(cam[0]*B.U[0]+cam[1]*B.U[1]+cam[2]*B.U[2]);
 var hc=zh>.3?[hx/(zh*tan*asp),hy/(zh*tan)]:[9,9],E=zh>.3?2.6*GX_RS/(zh*tan):0;
 g.enable(g.BLEND);g.blendFunc(g.ONE,g.ONE);
 g.useProgram(GX.pS);var u=GX.uS;
 g.uniform3fv(u.u_cam,cam);g.uniform3fv(u.u_fwd,F);g.uniform3fv(u.u_right,B.R);g.uniform3fv(u.u_up,B.U);
 g.uniform1f(u.u_tan,tan);g.uniform1f(u.u_asp,asp);g.uniform1f(u.u_t,(t/1000)%1000);g.uniform1f(u.u_ps,h/812);g.uniform1f(u.u_hz,zh);g.uniform1f(u.u_E,E);g.uniform2fv(u.u_hc,hc);
 g.bindBuffer(g.ARRAY_BUFFER,GX.buf);
 g.enableVertexAttribArray(0);g.enableVertexAttribArray(1);g.enableVertexAttribArray(2);
 g.vertexAttribPointer(0,3,g.FLOAT,false,36,0);g.vertexAttribPointer(1,4,g.FLOAT,false,36,12);g.vertexAttribPointer(2,2,g.FLOAT,false,36,28);
 g.drawArrays(g.POINTS,0,GX.N);
 /* чорна діра: прямокутник довкола проекції сфери обмеження */
 var camR=Math.hypot(cam[0],cam[1],cam[2]),box=[0,0,1,1];
 if(camR>GX_RB*1.02&&zh>.3){var rad=GX_RB*1.08/(zh*tan);box=[Math.max(-1,Math.min(1,hc[0])),Math.max(-1,Math.min(1,hc[1])),Math.min(1.2,rad/asp),Math.min(1.2,rad)];}
 if(camR>GX_RB*1.02&&zh<=.3){box=null;}
 if(box){
  g.blendFunc(g.ONE,g.ONE_MINUS_SRC_ALPHA);g.useProgram(GX.pH);var v=GX.uH;
  g.uniform3fv(v.u_cam,cam);g.uniform3fv(v.u_fwd,F);g.uniform3fv(v.u_right,B.R);g.uniform3fv(v.u_up,B.U);
  g.uniform1f(v.u_tan,tan);g.uniform1f(v.u_asp,asp);g.uniform1f(v.u_t,(t/1000)%1000);g.uniform1f(v.u_rs,GX_RS);g.uniform1f(v.u_rin,GX_RIN);g.uniform1f(v.u_rout,GX_ROUT);g.uniform1f(v.u_rb,GX_RB);
  g.uniform4f(v.u_box,box[0],box[1],box[2],box[3]);
  g.bindBuffer(g.ARRAY_BUFFER,GX.qbuf);g.disableVertexAttribArray(1);g.disableVertexAttribArray(2);g.enableVertexAttribArray(0);g.vertexAttribPointer(0,3,g.FLOAT,false,12,0);
  g.drawArrays(g.TRIANGLE_STRIP,0,4);
 }
 g.disable(g.BLEND);
 GX.raf=requestAnimationFrame(gxFrame);
}

/* ---------- керування ---------- */
function gxPtrs(){var a=[],k;for(k in GX.ptr)a.push(GX.ptr[k]);return a;}
function gxReset(){GX.yaw=.55;GX.pit=.5;GX.dist=48;GX.tgt=[0,0,0];GX.vy=GX.vp=0;if(GX.mode==='fly')gxMode('orbit');}
function gxMode(m){
 if(m===GX.mode)return;
 var B=gxBasis();
 if(m==='fly'){GX.cam=[GX.tgt[0]-B.F[0]*GX.dist,GX.tgt[1]-B.F[1]*GX.dist,GX.tgt[2]-B.F[2]*GX.dist];GX.spd=0;}
 else{var cl=Math.hypot(GX.cam[0],GX.cam[1],GX.cam[2])||1;GX.tgt=[0,0,0];GX.dist=Math.max(4,Math.min(220,cl));GX.yaw=Math.atan2(-GX.cam[0],-GX.cam[2]);GX.pit=Math.asin(Math.max(-1,Math.min(1,GX.cam[1]/cl)));}
 GX.mode=m;GX.m1.classList.toggle('on',m==='orbit');GX.m2.classList.toggle('on',m==='fly');
 FBL.forEach(function(f){if(f.el===GX.m1)f.a=m==='orbit'?1:.55;if(f.el===GX.m2)f.a=m==='fly'?1:.55;});dirty=true;
}
function gxBind(){
 var cv=GX.cv;
 cv.addEventListener('pointerdown',function(e){
  e.preventDefault();try{cv.setPointerCapture(e.pointerId);}catch(x){}
  GX.ptr[e.pointerId]={x:e.clientX,y:e.clientY,px:e.clientX,py:e.clientY};GX.vy=GX.vp=0;
  var now=performance.now();if(Object.keys(GX.ptr).length===1){if(now-GX.lastTap<300){gxReset();}GX.lastTap=now;}
 });
 cv.addEventListener('pointermove',function(e){
  var p=GX.ptr[e.pointerId];if(!p)return;e.preventDefault();
  var ps=gxPtrs(),n=ps.length,dx=e.clientX-p.x,dy=e.clientY-p.y;
  if(n===1){
   GX.yaw+=dx*(GX.mode==='fly'?-.0046:-.0058);GX.pit=Math.max(-1.5,Math.min(1.5,GX.pit+dy*.0058*(GX.mode==='fly'?-1:1)));
   GX.vy=(dx*(GX.mode==='fly'?-.0046:-.0058))*60;GX.vp=(dy*.0058*(GX.mode==='fly'?-1:1))*60;
  }else if(n>=2&&GX.mode==='orbit'){
   var a=ps[0],b=ps[1],d0=Math.hypot(a.x-b.x,a.y-b.y);p.x=e.clientX;p.y=e.clientY;var d1=Math.hypot(a.x-b.x,a.y-b.y);
   if(d0>8&&d1>8)GX.dist=Math.max(3.2,Math.min(230,GX.dist*d0/d1));
   var B=gxBasis(),k=GX.dist*.0016*(innerHeight/812),cx=dx/2,cy=dy/2;   /* зсув центру орбіти двома пальцями */
   for(var q=0;q<3;q++)GX.tgt[q]-=(B.R[q]*cx-B.U[q]*cy)*k;
  }
  p.px=p.x;p.py=p.y;p.x=e.clientX;p.y=e.clientY;
 });
 function up(e){delete GX.ptr[e.pointerId];}
 cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
 cv.addEventListener('wheel',function(e){e.preventDefault();GX.dist=Math.max(3.2,Math.min(230,GX.dist*Math.exp(e.deltaY*.0012)));},{passive:false});
}

/* ---------- вхід і вихід ---------- */
function gxEnter(){
 if(GX.on)return;
 gxDom();if(!gxInit()){toast('Галактика недоступна на цьому пристрої');return;}
 if(!GX.bound){gxBind();GX.bound=1;}
 GX.on=1;lensClearAll();GX.sv=scrimT;scrimT=1;dirty=true;   /* скло кнопок заломлює чорне тло, а не сітку */
 GX.mode='orbit';GX.m1.classList.add('on');GX.m2.classList.remove('on');gxReset();GX.cam=[0,0,0];GX.spd=0;
 var cv=GX.cv;cv.style.display='block';requestAnimationFrame(function(){cv.style.opacity=1;});
 var fb=[{el:GX.exit,a:0,rad:1},{el:GX.m1,a:0,rad:1},{el:GX.m2,a:0,rad:1}];
 GX.exit.style.display='block';GX.pills.style.display='flex';GX.m1.style.display='block';GX.m2.style.display='block';
 var oldBtn=FBL.filter(function(x){return x.el===GX.btn;});
 fbSet(fb);GX.btn.style.opacity=0;GX.btn.style.display='none';
 gxFade(fb,1,function(){fb[2].a=.55;dirty=true;});
 GX.t0=performance.now();GX.last=GX.t0;if(!GX.raf)GX.raf=requestAnimationFrame(gxFrame);
 LG('galaxy','вхід у карту галактики');
}
function gxExit(silent){
 if(!GX.on)return;
 GX.on=0;GX.ptr={};scrimT=GX.sv||0;dirty=true;
 var cv=GX.cv;cv.style.opacity=0;setTimeout(function(){if(!GX.on)cv.style.display='none';},520);
 var list=FBL.slice();
 gxFade(list,0,function(){GX.exit.style.display='none';GX.pills.style.display='none';fbSet([]);
  if(!silent&&BH.ph===3){GX.btn.style.display='block';var f={el:GX.btn,a:0,rad:1};fbSet([f]);gxFade([f],1);}});
 LG('galaxy','вихід з карти галактики');
}
