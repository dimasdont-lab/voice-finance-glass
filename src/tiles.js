/* ===== 7. Скляні віджети: окремий WebGL-шар під текстом. Малює фон із сіткою й плитки з заломленням сітки ===== */
var TGC=document.getElementById('glt'),tgl=null,TGU={},TL=[],tlStale=[],tgSig='',tgW=0,tgH=0,tgS=0,tgOK=false,tgShown=false,TMAX=24;
var tgAl=new Float32Array(TMAX),tgR=new Float32Array(TMAX*4),tgQ=new Float32Array(TMAX),tgHt=new Float32Array(TMAX);
var TILE_R={tile:28,srch:24};
var TFS=['#ifdef GL_FRAGMENT_PRECISION_HIGH','precision highp float;','#else','precision mediump float;','#endif',
'uniform vec2 u_res;uniform vec2 u_vp;uniform vec2 u_go;uniform float u_cell;uniform float u_isl;uniform float u_s;uniform float u_n;uniform float u_br;uniform vec4 u_r[24];uniform float u_q[24];uniform float u_h[24];uniform float u_al[24];',
'float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}',
GLSL_BG,
'float edgeRim(vec2 p){vec2 c=u_vp*.5,q0=p-c;float d=sdRB(q0,c,62.);float r=0.;',
' if(d<0.){float t=clamp(-d/22.,0.,1.);vec2 q=abs(q0)-c+62.;vec2 nn=((q.x>0.&&q.y>0.)?normalize(q):(q.x>q.y?vec2(1.,0.):vec2(0.,1.)))*sign(q0);',
'  float sp=pow(max(dot(nn,normalize(vec2(-.6,-.8))),0.),3.)+.5*pow(max(dot(nn,normalize(vec2(.6,.8))),0.),3.);r+=pow(1.-t,3.)*(.05+.18*sp);}',
' if(u_isl>.5){vec2 qi=p-vec2(c.x,29.5);float di=sdRB(qi,vec2(63.,18.5),18.5);',
'  r+=.26*exp(-pow((di-1.2)/1.6,2.))+.07*pow(1.-clamp(di/20.,0.,1.),2.)*step(0.,di);}',
' return r;}',
'void main(){',
' vec2 px=vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y);vec2 p=px/u_s;',
' float dm=1e5;vec4 R=vec4(0.);float Q=1.;float H=0.;float AL=1.;',
' for(int i=0;i<24;i++){if(float(i)>=u_n)break;float d=sdRB(px-u_r[i].xy,u_r[i].zw,u_q[i]);if(d<dm){dm=d;R=u_r[i];Q=u_q[i];H=u_h[i];AL=u_al[i];}}',
' vec3 base=gradBg(p)+vec3(edgeRim(p));float sw=26.*u_s;',
' if(dm>sw){gl_FragColor=vec4(base,1.);return;}',
' float sh=dm>0.?1.-clamp(dm/sw,0.,1.):0.;vec3 oc=base*(1.-.16*sh*sh*AL);',
' if(dm>1.5*u_s){gl_FragColor=vec4(oc,1.);return;}',
' float m=36.*u_s;float t=clamp(-dm/(.6*m),0.,1.);float e=1.5;',
' vec2 n=normalize(vec2(sdRB(px+vec2(e,0.)-R.xy,R.zw,Q)-sdRB(px-vec2(e,0.)-R.xy,R.zw,Q),sdRB(px+vec2(0.,e)-R.xy,R.zw,Q)-sdRB(px-vec2(0.,e)-R.xy,R.zw,Q))+1e-5);',
' vec2 of=n*pow(1.-t,2.2)*.6*m;float ab=.07*(.35+pow(1.-t,1.5));',
' vec2 za=R.xy+((px-of*(1.+ab))-R.xy)*.93,zb=R.xy+((px-of)-R.xy)*.93,zc=R.xy+((px-of*(1.-ab))-R.xy)*.93;',
' vec3 ci=vec3(gradBg(za/u_s).r,gradBg(zb/u_s).g,gradBg(zc/u_s).b);',
' ci=mix(ci,H>0.?vec3(.03,.34,.15):vec3(.45,.05,.08),abs(H)*.20);',
' float rim=pow(1.-t,3.);float sp=pow(max(dot(n,normalize(vec2(-.6,-.8))),0.),3.)+.5*pow(max(dot(n,normalize(vec2(.6,.8))),0.),3.);',
' ci+=vec3(rim*(.02+.09*sp));ci*=u_br;',
' float w=clamp(-dm/(1.5*u_s)+.5,0.,1.);gl_FragColor=vec4(mix(oc,ci,w*AL),1.);}'].join('\n');
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
 ['u_res','u_vp','u_go','u_cell','u_isl','u_s','u_n','u_br','u_r','u_q','u_h','u_al'].forEach(function(n){TGU[n]=tgl.getUniformLocation(p,n);});
 tgOK=true;
})();
function tileRadius(el){for(var k in TILE_R)if(el.classList.contains(k))return TILE_R[k];return 0;}
function tlMeasure(i){
 var ch=inn[i].children,list=[];
 for(var k=0;k<ch.length;k++){var el=ch[k],r=tileRadius(el);if(!r)continue;
  list.push({el:el,l:el.offsetLeft,t:el.offsetTop,w:el.offsetWidth,h:el.offsetHeight,r:r,hot:el.classList.contains('bal')?(el.classList.contains('dn')?-1:el.classList.contains('up')?1:0):0});}
 TL[i]=list;tlStale[i]=0;
}
function tlAllStale(){for(var i=0;i<NP;i++)tlStale[i]=1;}
window.addEventListener('resize',tlAllStale);
setTimeout(tlAllStale,1200);setTimeout(tlAllStale,3500);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(tlAllStale);
function drawTiles(){
 if(!VW||!VH)return;
 var rp=rec.pg,v=rp.v>.003?rp.v:0,k=v?kOf(v):1,n=0,sig=[ca.toFixed(3),VW,VH,S,gOX.toFixed(1),gOY.toFixed(1),v.toFixed(3),rp.ox.toFixed(1),rp.oy.toFixed(1),rp.tx.toFixed(1),rp.ty.toFixed(1)],i,j;
 for(i=0;i<NP&&n<TMAX;i++){
  var o=i-ca;if(Math.abs(o)>=1)continue;
  if(tlStale[i]||!TL[i])tlMeasure(i);
  var yy=sy[i];sig.push(i,yy.toFixed(2));
  var list=TL[i];
  for(j=0;j<list.length&&n<TMAX;j++){
   var t=list[j],ia=t.el._ia,cx=t.l+t.w/2+o*VW,cy=t.t+t.h/2-yy,hw=t.w/2,hh=t.h/2,rr=t.r;
   if(ia){cx+=ia.x;cy+=ia.y;hw*=ia.s;hh*=ia.s;rr*=ia.s;}
   if(v){cx=rp.ox+rp.tx*v+k*(cx-rp.ox);cy=rp.oy+rp.ty*v+k*(cy-rp.oy);hw*=k;hh*=k;rr*=k;}
   if(cx+hw<-40||cx-hw>VW+40||cy+hh<-40||cy-hh>VH+40)continue;
   tgR[n*4]=cx*S;tgR[n*4+1]=cy*S;tgR[n*4+2]=hw*S;tgR[n*4+3]=hh*S;tgQ[n]=Math.min(rr*S,hw*S,hh*S);tgHt[n]=t.hot;tgAl[n]=ia?ia.a:1;n++;
   sig.push(cx.toFixed(1),cy.toFixed(1),hw.toFixed(1),hh.toFixed(1),ia?ia.a.toFixed(2):'');
  }
 }
 var key=sig.join(',');
 if(key===tgSig&&tgW)return;
 tgSig=key;
 var W=Math.round(VW*S),H=Math.round(VH*S);
 if(W!==tgW||H!==tgH||S!==tgS){tgW=W;tgH=H;tgS=S;TGC.width=W;TGC.height=H;tgl.viewport(0,0,W,H);}
 tgl.uniform2f(TGU.u_res,W,H);tgl.uniform2f(TGU.u_vp,VW,VH);tgl.uniform1f(TGU.u_s,S);tgl.uniform2f(TGU.u_go,gOX,gOY);tgl.uniform1f(TGU.u_isl,ISL);tgl.uniform1f(TGU.u_cell,gridCell());tgl.uniform1f(TGU.u_n,n);tgl.uniform1f(TGU.u_br,1-RD*v);
 tgl.uniform4fv(TGU.u_r,tgR);tgl.uniform1fv(TGU.u_q,tgQ);tgl.uniform1fv(TGU.u_h,tgHt);tgl.uniform1fv(TGU.u_al,tgAl);
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
