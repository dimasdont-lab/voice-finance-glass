/* ===== 7. Скляні віджети: окремий WebGL-шар під текстом. Малює фон із сіткою й плитки з заломленням сітки.
   Вкладене скло: кнопки «Доходи/Витрати», міні-картки (шар 1) і круглі значки стрілок (шар 2) — окреме скло поверх скла віджета ===== */
var TGC=document.getElementById('glt'),tgl=null,TGU={},TL=[],tlStale=[],tgSig='',tgW=0,tgH=0,tgS=0,tgOK=false,tgShown=false,TMAX=40;
var tgR=new Float32Array(TMAX*4),tgM=new Float32Array(TMAX*4);
var TILE_R={tile:28,srch:24},NEST=[['.split>button',20,1],['.mini',20,1],['.dot',15,2]];
var TFS=['#ifdef GL_FRAGMENT_PRECISION_HIGH','precision highp float;','#else','precision mediump float;','#endif',
'uniform vec2 u_res;uniform vec2 u_vp;uniform vec2 u_go;uniform float u_cell;uniform float u_isl;uniform vec3 u_gcol;uniform float u_s;uniform float u_n;uniform float u_br;uniform vec4 u_r[40];uniform vec4 u_m[40];',
'float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}',
GLSL_BG,
'float edgeRim(vec2 p){vec2 c=u_vp*.5,q0=p-c;float d=sdRB(q0,c,62.);float r=0.;',
' if(d<0.){float t=clamp(-d/22.,0.,1.);vec2 q=abs(q0)-c+62.;vec2 nn=((q.x>0.&&q.y>0.)?normalize(q):(q.x>q.y?vec2(1.,0.):vec2(0.,1.)))*sign(q0);',
'  float sp=pow(max(dot(nn,normalize(vec2(-.6,-.8))),0.),3.)+.5*pow(max(dot(nn,normalize(vec2(.6,.8))),0.),3.);r+=pow(1.-t,3.)*(.05+.18*sp);}',
' if(u_isl>.5){vec2 qi=p-vec2(c.x,29.5);float di=sdRB(qi,vec2(63.,18.5),18.5);',
'  r+=.26*exp(-pow((di-1.2)/1.6,2.))+.07*pow(1.-clamp(di/20.,0.,1.),2.)*step(0.,di);}',
' return r;}',
/* скло однієї форми: R — центр і піврозміри, M — (радіус, відтінок, прозорість, шар) */
'vec4 glassAt(vec2 px,vec4 R,vec4 M,float dm){',
' float Q=M.x;float m=(M.w>.5?18.:36.)*u_s;float t=clamp(-dm/(.6*m),0.,1.);float e=1.5;',
' vec2 n=normalize(vec2(sdRB(px+vec2(e,0.)-R.xy,R.zw,Q)-sdRB(px-vec2(e,0.)-R.xy,R.zw,Q),sdRB(px+vec2(0.,e)-R.xy,R.zw,Q)-sdRB(px-vec2(0.,e)-R.xy,R.zw,Q))+1e-5);',
' vec2 of=n*pow(1.-t,2.2)*.6*m;float ab=.07*(.35+pow(1.-t,1.5));float zm=M.w>.5?.96:.93;',
' vec2 za=R.xy+((px-of*(1.+ab))-R.xy)*zm,zb=R.xy+((px-of)-R.xy)*zm,zc=R.xy+((px-of*(1.-ab))-R.xy)*zm;',
' vec3 ci=vec3(gradBg(za/u_s).r,gradBg(zb/u_s).g,gradBg(zc/u_s).b);',
' ci=mix(ci,M.y>0.?vec3(.03,.34,.15):vec3(.45,.05,.08),min(.45,abs(M.y)*.20));',
' float rim=pow(1.-t,3.);float sp=pow(max(dot(n,normalize(vec2(-.6,-.8))),0.),3.)+.5*pow(max(dot(n,normalize(vec2(.6,.8))),0.),3.);',
' ci+=vec3(rim*(.02+.09*sp));ci*=u_br;',
' return vec4(ci,clamp(-dm/(1.5*u_s)+.5,0.,1.)*M.z);}',
'void main(){',
' vec2 px=vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y);vec2 p=px/u_s;',
' float bl=-1.,pl=-1.,dB=1e5,dP=1e5,dn=1e5,aN=1.;vec4 RB=vec4(0.),MB=vec4(1.,0.,1.,0.),RP=RB,MP=MB;',
' for(int i=0;i<40;i++){if(float(i)>=u_n)break;vec4 r=u_r[i];vec4 m=u_m[i];float d=sdRB(px-r.xy,r.zw,m.x);',
'  if(m.w<.5&&d<dn){dn=d;aN=m.z;}',
'  if(d<1.5*u_s){if(m.w>=bl){pl=bl;RP=RB;MP=MB;dP=dB;bl=m.w;RB=r;MB=m;dB=d;}else if(m.w>=pl){pl=m.w;RP=r;MP=m;dP=d;}}}',
' vec3 col=gradBg(p)+vec3(edgeRim(p));float sw=26.*u_s;',
' float sh=dn>0.?1.-clamp(dn/sw,0.,1.):0.;col*=1.-.16*sh*sh*aN;',
' if(pl>-.5){vec4 g=glassAt(px,RP,MP,dP);col=mix(col,g.rgb,g.a);}',
' if(bl>-.5){vec4 g=glassAt(px,RB,MB,dB);col=mix(col,g.rgb,g.a);}',
' gl_FragColor=vec4(col,1.);}'].join('\n');
(function(){
 try{tgl=TGC.getContext('webgl',{alpha:false,antialias:false,powerPreference:'high-performance'});}catch(e){}
 if(!tgl)return;
 function cs(t,q){var o=tgl.createShader(t);tgl.shaderSource(o,q);tgl.compileShader(o);if(!tgl.getShaderParameter(o,tgl.COMPILE_STATUS)){console.error(tgl.getShaderInfoLog(o));return null;}return o;}
 var v=cs(tgl.VERTEX_SHADER,VS),f=cs(tgl.FRAGMENT_SHADER,TFS);if(!v||!f)return;
 var p=tgl.createProgram();tgl.attachShader(p,v);tgl.attachShader(p,f);tgl.bindAttribLocation(p,0,'p');tgl.linkProgram(p);
 if(!tgl.getProgramParameter(p,tgl.LINK_STATUS)){console.error(tgl.getProgramInfoLog(p));return;}
 tgl.useProgram(p);
 var b=tgl.createBuffer();tgl.bindBuffer(tgl.ARRAY_BUFFER,b);tgl.bufferData(tgl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),tgl.STATIC_DRAW);
 tgl.enableVertexAttribArray(0);tgl.vertexAttribPointer(0,2,tgl.FLOAT,false,0,0);
 ['u_res','u_vp','u_go','u_cell','u_isl','u_gcol','u_s','u_n','u_br','u_r','u_m'].forEach(function(n){TGU[n]=tgl.getUniformLocation(p,n);});
 tgOK=true;LG('glt','шар скла плиток: WebGL ok');
})();
function tileRadius(el){for(var k in TILE_R)if(el.classList.contains(k))return TILE_R[k];return 0;}
function offIn(el,host){var x=0,y=0,e=el;while(e&&e!==host){x+=e.offsetLeft;y+=e.offsetTop;e=e.offsetParent;}return e===host?[x,y]:null;}
function tlMeasure(i){
 var host=inn[i],ch=host.children,list=[];
 for(var k=0;k<ch.length;k++){var el=ch[k],r=tileRadius(el);if(!r)continue;
  var hot=el.classList.contains('bal')?(el.classList.contains('dn')?-1:el.classList.contains('up')?1:0):0;
  var bcx=el.offsetLeft+el.offsetWidth/2,bcy=el.offsetTop+el.offsetHeight/2;
  list.push({el:el,blk:el,bcx:bcx,bcy:bcy,l:el.offsetLeft,t:el.offsetTop,w:el.offsetWidth,h:el.offsetHeight,r:r,hot:hot,lv:0});
  if(el.classList.contains('tile'))NEST.forEach(function(q){[].forEach.call(el.querySelectorAll(q[0]),function(c){
   var o=offIn(c,host);if(!o||!c.offsetWidth)return;
   var h2=hot;if(q[2]===2)h2=c.classList.contains('up')?1.6:c.classList.contains('dn')?-1.6:hot;
   list.push({el:c,blk:el,bcx:bcx,bcy:bcy,l:o[0],t:o[1],w:c.offsetWidth,h:c.offsetHeight,r:q[1],hot:h2,lv:q[2]});});});
 }
 TL[i]=list;tlStale[i]=0;
}
function tlAllStale(){for(var i=0;i<NP;i++)tlStale[i]=1;}
window.addEventListener('resize',tlAllStale);
setTimeout(tlAllStale,1200);setTimeout(tlAllStale,3500);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(tlAllStale);
function drawTiles(){
 if(!VW||!VH)return;
 var rp=rec.pg,v=rp.v>.003?rp.v:0,k=v?kOf(v):1,n=0,sig=[ca.toFixed(3),VW,VH,S,gOX.toFixed(1),gOY.toFixed(1),GCOL.map(function(x){return x.toFixed(3);}).join(':'),v.toFixed(3),rp.ox.toFixed(1),rp.oy.toFixed(1),rp.tx.toFixed(1),rp.ty.toFixed(1)],i,j;
 for(i=0;i<NP&&n<TMAX;i++){
  var o=i-ca;if(Math.abs(o)>=1)continue;
  if(tlStale[i]||!TL[i])tlMeasure(i);
  var yy=sy[i];sig.push(i,yy.toFixed(2));
  var list=TL[i];
  for(j=0;j<list.length&&n<TMAX;j++){
   var t=list[j],ia=t.blk._ia,cx=t.l+t.w/2,cy=t.t+t.h/2,hw=t.w/2,hh=t.h/2,rr=t.r;
   if(ia){cx=t.bcx+(cx-t.bcx)*ia.s+ia.x;cy=t.bcy+(cy-t.bcy)*ia.s+ia.y;hw*=ia.s;hh*=ia.s;rr*=ia.s;}   /* поява віджета: вкладені форми рухаються разом із блоком */
   cx+=o*VW;cy-=yy;
   if(v){cx=rp.ox+rp.tx*v+k*(cx-rp.ox);cy=rp.oy+rp.ty*v+k*(cy-rp.oy);hw*=k;hh*=k;rr*=k;}
   if(cx+hw<-40||cx-hw>VW+40||cy+hh<-40||cy-hh>VH+40)continue;
   tgR[n*4]=cx*S;tgR[n*4+1]=cy*S;tgR[n*4+2]=hw*S;tgR[n*4+3]=hh*S;
   tgM[n*4]=Math.min(rr*S,hw*S,hh*S);tgM[n*4+1]=t.hot;tgM[n*4+2]=ia?ia.a:1;tgM[n*4+3]=t.lv;n++;
   sig.push(cx.toFixed(1),cy.toFixed(1),hw.toFixed(1),hh.toFixed(1),ia?ia.a.toFixed(2):'');
  }
 }
 var key=sig.join(',');
 if(key===tgSig&&tgW)return;
 tgSig=key;
 var W=Math.round(VW*S),H=Math.round(VH*S);
 if(W!==tgW||H!==tgH||S!==tgS){tgW=W;tgH=H;tgS=S;TGC.width=W;TGC.height=H;tgl.viewport(0,0,W,H);}
 tgl.uniform2f(TGU.u_res,W,H);tgl.uniform2f(TGU.u_vp,VW,VH);tgl.uniform1f(TGU.u_s,S);tgl.uniform2f(TGU.u_go,gOX,gOY);tgl.uniform1f(TGU.u_isl,ISL);tgl.uniform1f(TGU.u_cell,gridCell());tgl.uniform3f(TGU.u_gcol,GCOL[0],GCOL[1],GCOL[2]);tgl.uniform1f(TGU.u_n,n);tgl.uniform1f(TGU.u_br,1-RD*v);
 tgl.uniform4fv(TGU.u_r,tgR);tgl.uniform4fv(TGU.u_m,tgM);
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
  var side=Math.floor(Math.random()*4),r=Math.random()-.5,dx=0,dy=0;
  if(side===0){dx=-VW*.85;dy=r*260;}else if(side===1){dx=VW*.85;dy=r*260;}else if(side===2){dy=VH*.55;dx=r*260;}else{dy=-VH*.45;dx=r*260;}
  return{el:it.el,dx:dx,dy:dy,delay:.1+rank*.1+Math.random()*.16,dur:.9+Math.random()*.25};
 });
 intro.on=1;intro.t0=t;
}
function introStep(t){
 var tt=(t-intro.t0)/1000,done=true;
 intro.items.forEach(function(it){
  var p=Math.max(0,Math.min(1,(tt-it.delay)/it.dur)),e=1-Math.pow(1-p,3.4),st=it.el.style;
  if(p<1)done=false;
  var x=it.dx*(1-e),y=it.dy*(1-e),sc=.78+.22*e,al=Math.min(1,p*2.2);
  st.transform=p<1?'translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0) scale('+sc.toFixed(3)+')':'';
  st.filter=p<1?'blur('+(18*(1-e)).toFixed(1)+'px) brightness('+(.3+.7*e).toFixed(2)+')':'';
  st.opacity=al<1?al.toFixed(2):'';
  it.el._ia=p<1?{x:x,y:y,s:sc,a:al}:null;
 });
 if(done){intro.on=0;intro.items=[];}
}
