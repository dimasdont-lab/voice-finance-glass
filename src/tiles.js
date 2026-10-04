/* ===== 7. Скляні віджети: окремий WebGL-шар під текстом. Малює фон із сіткою й плитки з заломленням сітки.
   Вкладене скло: кнопки «Доходи/Витрати», міні-картки (шар 1), круглі значки (шар 2), заповнення прогрес-барів (шар 3, свій колір).
   Скляні лінії графіків: ланцюжки капсул (до 4 ліній), колір лінії, заломлення сітки. Вимикаються разом із GLINES ===== */
var TGC=document.getElementById('glt'),tgl=null,TGU={},TL=[],TLL=[],tlStale=[],tgSig='',tgW=0,tgH=0,tgS=0,tgOK=false,tgShown=false,TMAX=40,NSEG=0,NLN=4;
var GLASS_LINE_OK=false;
var tgR=new Float32Array(TMAX*4),tgM=new Float32Array(TMAX*4),tgC=new Float32Array(TMAX*4);
var TILE_R={tile:28,srch:24},NEST=[['.split>button',20,1],['.mini',20,1],['.dot',15,2]];
function mkTFS(nseg){return['#ifdef GL_FRAGMENT_PRECISION_HIGH','precision highp float;','#else','precision mediump float;','#endif',
'uniform vec2 u_res;uniform vec2 u_vp;uniform vec2 u_go;uniform float u_cell;uniform float u_isl;uniform vec3 u_gcol;uniform float u_s;uniform float u_n;uniform float u_br;uniform vec4 u_r[40];uniform vec4 u_m[40];uniform vec4 u_c[40];',
nseg?'uniform vec4 u_sg['+nseg+'];uniform vec4 u_lb[4];uniform vec4 u_li[4];uniform vec4 u_lc[4];uniform float u_nl;':'',
'float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}',
GLSL_BG,
'float edgeRim(vec2 p){vec2 c=u_vp*.5,q0=p-c;float d=sdRB(q0,c,62.);float r=0.;',
' if(d<0.){float t=clamp(-d/22.,0.,1.);vec2 q=abs(q0)-c+62.;vec2 nn=((q.x>0.&&q.y>0.)?normalize(q):(q.x>q.y?vec2(1.,0.):vec2(0.,1.)))*sign(q0);',
'  float sp=pow(max(dot(nn,normalize(vec2(-.6,-.8))),0.),3.)+.5*pow(max(dot(nn,normalize(vec2(.6,.8))),0.),3.);r+=pow(1.-t,3.)*(.05+.18*sp);}',
' if(u_isl>.5){vec2 qi=p-vec2(c.x,29.5);float di=sdRB(qi,vec2(63.,18.5),18.5);',
'  r+=.26*exp(-pow((di-1.2)/1.6,2.))+.07*pow(1.-clamp(di/20.,0.,1.),2.)*step(0.,di);}',
' return r;}',
/* скло однієї форми: R — центр і піврозміри, M — (радіус, відтінок, прозорість, шар), C — власний колір (rgb, сила) */
'vec4 glassAt(vec2 px,vec4 R,vec4 M,vec4 C,float dm){',
' float Q=M.x;float m=(M.w>.5?18.:36.)*u_s;float t=clamp(-dm/(.6*m),0.,1.);float e=1.5;',
' vec2 n=normalize(vec2(sdRB(px+vec2(e,0.)-R.xy,R.zw,Q)-sdRB(px-vec2(e,0.)-R.xy,R.zw,Q),sdRB(px+vec2(0.,e)-R.xy,R.zw,Q)-sdRB(px-vec2(0.,e)-R.xy,R.zw,Q))+1e-5);',
' vec2 of=n*pow(1.-t,2.2)*.6*m;float ab=.07*(.35+pow(1.-t,1.5));float zm=M.w>.5?.96:.93;',
' vec2 za=R.xy+((px-of*(1.+ab))-R.xy)*zm,zb=R.xy+((px-of)-R.xy)*zm,zc=R.xy+((px-of*(1.-ab))-R.xy)*zm;',
' vec3 ci=vec3(gradBg(za/u_s).r,gradBg(zb/u_s).g,gradBg(zc/u_s).b);',
' ci=mix(ci,M.y>0.?vec3(.03,.34,.15):vec3(.45,.05,.08),min(.45,abs(M.y)*.20));',
' if(C.a>0.)ci=mix(ci,C.rgb,C.a)*(.8+.3*t);',
' float rim=pow(1.-t,3.);float sp=pow(max(dot(n,normalize(vec2(-.6,-.8))),0.),3.)+.5*pow(max(dot(n,normalize(vec2(.6,.8))),0.),3.);',
' ci+=vec3(rim*((C.a>0.?.08:.02)+(C.a>0.?.3:.09)*sp));ci*=u_br;',
' return vec4(ci,clamp(-dm/(1.5*u_s)+.5,0.,1.)*M.z);}',
/* скляна трубка лінії графіка: d — відстань до поверхні, n — напрям від осі, r — радіус */
'vec4 lineGlass(vec2 px,float d,vec2 n,float r,vec4 col){',
' float t=clamp(-d/r,0.,1.);vec2 of=n*pow(1.-t,1.6)*r*1.3;float ab=.12*(.35+pow(1.-t,1.5));',
' vec3 ci=vec3(gradBg((px-of*(1.+ab))/u_s).r,gradBg((px-of)/u_s).g,gradBg((px-of*(1.-ab))/u_s).b);',
' ci=mix(ci,col.rgb,.62)*(.72+.4*t);',
' float sp=pow(max(dot(n,normalize(vec2(-.6,-.8))),0.),2.);ci+=vec3(pow(1.-t,2.)*(.08+.4*sp));',
' return vec4(ci*u_br,clamp(-d/(1.2*u_s)+.5,0.,1.)*col.a);}',
'void main(){',
' vec2 px=vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y);vec2 p=px/u_s;',
' float bl=-1.,pl=-1.,dB=1e5,dP=1e5,dn=1e5,aN=1.;vec4 RB=vec4(0.),MB=vec4(1.,0.,1.,0.),CB=vec4(0.),RP=RB,MP=MB,CP=CB;',
' for(int i=0;i<40;i++){if(float(i)>=u_n)break;vec4 r=u_r[i];vec4 m=u_m[i];float d=sdRB(px-r.xy,r.zw,m.x);',
'  if(m.w<.5&&d<dn){dn=d;aN=m.z;}',
'  if(d<1.5*u_s){if(m.w>=bl){pl=bl;RP=RB;MP=MB;CP=CB;dP=dB;bl=m.w;RB=r;MB=m;CB=u_c[i];dB=d;}else if(m.w>=pl){pl=m.w;RP=r;MP=m;CP=u_c[i];dP=d;}}}',
' vec3 col=gradBg(p)+vec3(edgeRim(p));float sw=26.*u_s;',
' float sh=dn>0.?1.-clamp(dn/sw,0.,1.):0.;col*=1.-.16*sh*sh*aN;',
' if(pl>-.5){vec4 g=glassAt(px,RP,MP,CP,dP);col=mix(col,g.rgb,g.a);}',
' if(bl>-.5){vec4 g=glassAt(px,RB,MB,CB,dB);col=mix(col,g.rgb,g.a);}',
nseg?(' for(int l=0;l<4;l++){if(float(l)>=u_nl)break;vec4 bb=u_lb[l];if(px.x<bb.x||px.y<bb.y||px.x>bb.z||px.y>bb.w)continue;'+
'  vec4 li=u_li[l];float best=1e5;vec2 cp=px;'+
'  for(int i=0;i<'+nseg+';i++){float fi=float(i);if(fi<li.x)continue;if(fi>=li.x+li.y)break;vec4 sg=u_sg[i];vec2 pa=px-sg.xy,ba=sg.zw-sg.xy;'+
'   float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-4),0.,1.);vec2 q=sg.xy+ba*h;float dd=length(px-q);if(dd<best){best=dd;cp=q;}}'+
'  float d=best-li.z;if(d<1.5*u_s){vec4 g=lineGlass(px,d,normalize(px-cp+vec2(1e-5,0.)),li.z,u_lc[l]);col=mix(col,g.rgb,g.a);}}'):'',
' gl_FragColor=vec4(col,1.);}'].join('\n');}
(function(){
 try{tgl=TGC.getContext('webgl',{alpha:false,antialias:false,powerPreference:'high-performance'});}catch(e){}
 if(!tgl)return;
 var maxV=tgl.getParameter(tgl.MAX_FRAGMENT_UNIFORM_VECTORS)||0;
 NSEG=maxV>=420?128:maxV>=300?64:0;   /* ланки ліній у uniform-масиві: скільки дозволяє GPU */
 function cs(t,q){var o=tgl.createShader(t);tgl.shaderSource(o,q);tgl.compileShader(o);if(!tgl.getShaderParameter(o,tgl.COMPILE_STATUS)){console.error(tgl.getShaderInfoLog(o));return null;}return o;}
 var v=cs(tgl.VERTEX_SHADER,VS),f=cs(tgl.FRAGMENT_SHADER,mkTFS(NSEG));
 if(!f&&NSEG){NSEG=0;f=cs(tgl.FRAGMENT_SHADER,mkTFS(0));}
 if(!v||!f)return;
 var p=tgl.createProgram();tgl.attachShader(p,v);tgl.attachShader(p,f);tgl.bindAttribLocation(p,0,'p');tgl.linkProgram(p);
 if(!tgl.getProgramParameter(p,tgl.LINK_STATUS)){console.error(tgl.getProgramInfoLog(p));return;}
 tgl.useProgram(p);
 var b=tgl.createBuffer();tgl.bindBuffer(tgl.ARRAY_BUFFER,b);tgl.bufferData(tgl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),tgl.STATIC_DRAW);
 tgl.enableVertexAttribArray(0);tgl.vertexAttribPointer(0,2,tgl.FLOAT,false,0,0);
 ['u_res','u_vp','u_go','u_cell','u_isl','u_gcol','u_s','u_n','u_br','u_r','u_m','u_c','u_sg','u_lb','u_li','u_lc','u_nl'].forEach(function(n){TGU[n]=tgl.getUniformLocation(p,n);});
 tgOK=true;GLASS_LINE_OK=NSEG>0;
 LG('glt','шар скла плиток: WebGL ok, uniform-векторів '+maxV+', ланок ліній '+NSEG);
})();
var tgSG=new Float32Array(Math.max(4,NSEG*4)),tgLB=new Float32Array(16),tgLI=new Float32Array(16),tgLC=new Float32Array(16);
function tileRadius(el){for(var k in TILE_R)if(el.classList.contains(k))return TILE_R[k];return 0;}
function offIn(el,host){var x=0,y=0,e=el;while(e&&e!==host){x+=e.offsetLeft;y+=e.offsetTop;e=e.offsetParent;}return e===host?[x,y]:null;}
function hexRgb(c){c=String(c||'').trim();var m;if((m=c.match(/^#([0-9a-f]{6})$/i))){var n=parseInt(m[1],16);return[(n>>16)/255,((n>>8)&255)/255,(n&255)/255];}
 if((m=c.match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/)))return[m[1]/255,m[2]/255,m[3]/255];return null;}
function tlMeasure(i){
 var host=inn[i],ch=host.children,list=[],lines=[],gl=GLINES&&GLASS_LINE_OK,ir=null,kx=1,ky=1;
 for(var k=0;k<ch.length;k++){var el=ch[k],r=tileRadius(el);if(!r)continue;
  var hot=el.classList.contains('bal')?(el.classList.contains('dn')?-1:el.classList.contains('up')?1:0):0;
  var bcx=el.offsetLeft+el.offsetWidth/2,bcy=el.offsetTop+el.offsetHeight/2;
  list.push({el:el,blk:el,bcx:bcx,bcy:bcy,l:el.offsetLeft,t:el.offsetTop,w:el.offsetWidth,h:el.offsetHeight,r:r,hot:hot,lv:0,c:null});
  if(!el.classList.contains('tile'))continue;
  NEST.forEach(function(q){[].forEach.call(el.querySelectorAll(q[0]),function(c){
   var o=offIn(c,host);if(!o||!c.offsetWidth)return;
   var h2=hot;if(q[2]===2)h2=c.classList.contains('up')?1.6:c.classList.contains('dn')?-1.6:hot;
   list.push({el:c,blk:el,bcx:bcx,bcy:bcy,l:o[0],t:o[1],w:c.offsetWidth,h:c.offsetHeight,r:q[1],hot:h2,lv:q[2],c:null});});});
  if(!GLINES)continue;
  /* заповнення прогрес-барів — скло власного кольору */
  [].forEach.call(el.querySelectorAll('.bar i,.cat .b i'),function(c){
   var o=offIn(c,host);if(!o||c.offsetWidth<2)return;
   var col=hexRgb(c.getAttribute('data-col'))||hexRgb(c.style.backgroundColor)||[1,.42,.45];
   list.push({el:c,blk:el,bcx:bcx,bcy:bcy,l:o[0],t:o[1],w:c.offsetWidth,h:c.offsetHeight,r:c.offsetHeight/2,hot:0,lv:3,c:col});});
  /* лінії графіків: точки з data-pts у координатах viewBox → координати сторінки */
  if(gl)[].forEach.call(el.querySelectorAll('svg[data-pts]'),function(sv){
   if(!ir){ir=host.getBoundingClientRect();kx=ir.width/Math.max(1,host.offsetWidth);ky=ir.height/Math.max(1,host.offsetHeight);}
   var r2=sv.getBoundingClientRect(),l=(r2.left-ir.left)/kx,t=(r2.top-ir.top)/ky,w=r2.width/kx,h=r2.height/ky,vb=(sv.getAttribute('data-vb')||'1,1').split(',').map(Number);
   var pts=sv.getAttribute('data-pts').split(' ').map(function(s){var a=s.split(',');return[l+a[0]/vb[0]*w,t+a[1]/vb[1]*h];});
   if(pts.length>1)lines.push({blk:el,bcx:bcx,bcy:bcy,pts:pts,r:parseFloat(sv.getAttribute('data-lw'))||3,c:hexRgb(sv.getAttribute('data-col'))||[1,1,1]});});
 }
 TL[i]=list;TLL[i]=lines;tlStale[i]=0;
}
function tlAllStale(){for(var i=0;i<NP;i++)tlStale[i]=1;}
window.addEventListener('resize',tlAllStale);
setTimeout(tlAllStale,1200);setTimeout(tlAllStale,3500);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(tlAllStale);
function drawTiles(){
 if(!VW||!VH)return;
 var rp=rec.pg,v=rp.v>.003?rp.v:0,k=v?kOf(v):1,n=0,ns=0,nl=0,sig=[ca.toFixed(3),VW,VH,S,gOX.toFixed(1),gOY.toFixed(1),GCOL.map(function(x){return x.toFixed(3);}).join(':'),v.toFixed(3),rp.ox.toFixed(1),rp.oy.toFixed(1),rp.tx.toFixed(1),rp.ty.toFixed(1)],i,j;
 for(i=0;i<NP&&n<TMAX;i++){
  var o=i-ca;if(Math.abs(o)>=1)continue;
  if(tlStale[i]||!TL[i])tlMeasure(i);
  var yy=sy[i];sig.push(i,yy.toFixed(2));
  var tf=function(x,y,bcx,bcy,ia){if(ia){x=bcx+(x-bcx)*ia.s+ia.x;y=bcy+(y-bcy)*ia.s+ia.y;}x+=o*VW;y-=yy;if(v){x=rp.ox+rp.tx*v+k*(x-rp.ox);y=rp.oy+rp.ty*v+k*(y-rp.oy);}return[x,y];};
  var list=TL[i];
  for(j=0;j<list.length&&n<TMAX;j++){
   var t=list[j],ia=t.blk._ia,sc=(ia?ia.s:1)*k,c0=tf(t.l+t.w/2,t.t+t.h/2,t.bcx,t.bcy,ia),cx=c0[0],cy=c0[1],hw=t.w/2*sc,hh=t.h/2*sc,rr=t.r*sc;
   if(cx+hw<-40||cx-hw>VW+40||cy+hh<-40||cy-hh>VH+40)continue;
   tgR[n*4]=cx*S;tgR[n*4+1]=cy*S;tgR[n*4+2]=hw*S;tgR[n*4+3]=hh*S;
   tgM[n*4]=Math.min(rr*S,hw*S,hh*S);tgM[n*4+1]=t.hot;tgM[n*4+2]=ia?ia.a:1;tgM[n*4+3]=t.lv;
   if(t.c){tgC[n*4]=t.c[0];tgC[n*4+1]=t.c[1];tgC[n*4+2]=t.c[2];tgC[n*4+3]=.62;}else{tgC[n*4+3]=0;}
   n++;sig.push(cx.toFixed(1),cy.toFixed(1),hw.toFixed(1),hh.toFixed(1),ia?ia.a.toFixed(2):'');
  }
  var ll=TLL[i]||[];
  for(j=0;j<ll.length&&nl<NLN;j++){
   var L=ll[j],ia2=L.blk._ia,sc2=(ia2?ia2.s:1)*k,start=ns,mnx=1e9,mny=1e9,mxx=-1e9,mxy=-1e9,prev=null,q;
   for(q=0;q<L.pts.length&&ns<NSEG;q++){
    var pp=tf(L.pts[q][0],L.pts[q][1],L.bcx,L.bcy,ia2);
    mnx=Math.min(mnx,pp[0]);mny=Math.min(mny,pp[1]);mxx=Math.max(mxx,pp[0]);mxy=Math.max(mxy,pp[1]);
    if(prev){tgSG[ns*4]=prev[0]*S;tgSG[ns*4+1]=prev[1]*S;tgSG[ns*4+2]=pp[0]*S;tgSG[ns*4+3]=pp[1]*S;ns++;}
    prev=pp;
   }
   if(ns===start||mxx<-20||mnx>VW+20||mxy<-20||mny>VH+20){ns=start;continue;}
   var pad=(L.r*sc2+4);
   tgLB[nl*4]=(mnx-pad)*S;tgLB[nl*4+1]=(mny-pad)*S;tgLB[nl*4+2]=(mxx+pad)*S;tgLB[nl*4+3]=(mxy+pad)*S;
   tgLI[nl*4]=start;tgLI[nl*4+1]=ns-start;tgLI[nl*4+2]=L.r*sc2*S;
   tgLC[nl*4]=L.c[0];tgLC[nl*4+1]=L.c[1];tgLC[nl*4+2]=L.c[2];tgLC[nl*4+3]=ia2?ia2.a:1;
   nl++;sig.push('L',start,ns,mnx.toFixed(1),mny.toFixed(1));
  }
 }
 var key=sig.join(',');
 if(key===tgSig&&tgW)return;
 tgSig=key;
 var W=Math.round(VW*S),H=Math.round(VH*S);
 if(W!==tgW||H!==tgH||S!==tgS){tgW=W;tgH=H;tgS=S;TGC.width=W;TGC.height=H;tgl.viewport(0,0,W,H);}
 tgl.uniform2f(TGU.u_res,W,H);tgl.uniform2f(TGU.u_vp,VW,VH);tgl.uniform1f(TGU.u_s,S);tgl.uniform2f(TGU.u_go,gOX,gOY);tgl.uniform1f(TGU.u_isl,ISL);tgl.uniform1f(TGU.u_cell,gridCell());tgl.uniform3f(TGU.u_gcol,GCOL[0],GCOL[1],GCOL[2]);tgl.uniform1f(TGU.u_n,n);tgl.uniform1f(TGU.u_br,1-RD*v);
 tgl.uniform4fv(TGU.u_r,tgR);tgl.uniform4fv(TGU.u_m,tgM);tgl.uniform4fv(TGU.u_c,tgC);
 if(NSEG){tgl.uniform4fv(TGU.u_sg,tgSG);tgl.uniform4fv(TGU.u_lb,tgLB);tgl.uniform4fv(TGU.u_li,tgLI);tgl.uniform4fv(TGU.u_lc,tgLC);tgl.uniform1f(TGU.u_nl,nl);}
 tgl.drawArrays(tgl.TRIANGLE_STRIP,0,4);
 if(!tgShown){tgShown=true;TGC.style.display='block';document.documentElement.classList.add('gt');}
}

/* ---- поява віджетів під час розширення скляної форми: злітаються з країв екрана з розмиття й затемнення, знизу догори, у випадковому порядку ---- */
var intro={on:0,t0:0,items:[]};
function introStart(t){
 var host=inn[sel];if(!host)return;
 var ch=host.children,list=[],k;
 for(k=0;k<ch.length;k++){var el=ch[k];if(el.offsetTop-(sy[sel]||0)<VH+20)list.push({el:el,top:el.offsetTop});}
 list.sort(function(a,b){return b.top-a.top;});                       /* знизу вгору */
 intro.items=list.map(function(it,rank){
  /* старт за межами екрана з випадкового краю; летить по кривій (квадратична Безьє з випадковим вигином) */
  var side=Math.floor(Math.random()*4),r=Math.random()-.5,sx,sy0;
  if(side===0){sx=-VW*1.15;sy0=r*VH*.7;}else if(side===1){sx=VW*1.15;sy0=r*VH*.7;}else if(side===2){sy0=VH*1.05;sx=r*VW*1.2;}else{sy0=-VH*.95;sx=r*VW*1.2;}
  var len=Math.hypot(sx,sy0)||1,nx=-sy0/len,ny=sx/len,bend=(Math.random()<.5?-1:1)*(.3+Math.random()*.35)*len;
  return{el:it.el,sx:sx,sy:sy0,cx:sx*.5+nx*bend,cy:sy0*.5+ny*bend,rot:(Math.random()-.5)*16,
   delay:.45+rank*.16+Math.random()*.22,dur:1.25+Math.random()*.4};   /* починають, коли скло вже розгортається */
 });
 intro.on=1;intro.t0=t;
}
function introStep(t){
 var tt=(t-intro.t0)/1000,done=true;
 intro.items.forEach(function(it){
  var p=Math.max(0,Math.min(1,(tt-it.delay)/it.dur)),e=1-Math.pow(1-p,3),u=1-e,st=it.el.style;
  if(p<1)done=false;
  var x=u*u*it.sx+2*u*e*it.cx,y=u*u*it.sy+2*u*e*it.cy,sc=.7+.3*e,al=Math.min(1,p*3);
  st.transform=p<1?'translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0) rotate('+(it.rot*u).toFixed(2)+'deg) scale('+sc.toFixed(3)+')':'';
  st.filter=p<1?'blur('+(16*u).toFixed(1)+'px) brightness('+(.3+.7*e).toFixed(2)+')':'';
  st.opacity=al<1?al.toFixed(2):'';
  it.el._ia=p<1?{x:x,y:y,s:sc,a:al}:null;
 });
 if(done){intro.on=0;intro.items=[];}
}
